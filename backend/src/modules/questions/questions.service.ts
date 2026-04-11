import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompaniesRepository } from '../companies/companies.repository';
import { CreateQuestionDto } from './dto/create-question.dto';
import { ListQuestionsQueryDto } from './dto/list-questions.query.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { UserContext } from '../authz/user-context';
import { normalizeQuestionPayload, normalizeTopicIds } from './question-payload';
import {
  QUESTION_ANSWER_PLAIN_LENGTH_LIMIT,
  QUESTION_TEXT_PLAIN_LENGTH_LIMIT,
  QuestionStructuredContent,
  joinQuestionStructuredContent,
  normalizeQuestionStructuredContent,
} from './question-structured-content';
import { toQuestionResponse } from './question-response';
import { toDifficultyRank } from './question-difficulty';
import { QuestionChangeRequestsRepository } from '../question-change-requests/question-change-requests.repository';
import { QuestionInterviewEncountersRepository } from './question-interview-encounters.repository';
import { QuestionsRepository } from './questions.repository';
import { TopicsRepository } from '../topics/topics.repository';
import { buildTopicSlug } from '../topics/topic-slug';

@Injectable()
export class QuestionsService {
  constructor(
    private readonly questionsRepository: QuestionsRepository,
    private readonly questionChangeRequestsRepository: QuestionChangeRequestsRepository,
    private readonly questionInterviewEncountersRepository: QuestionInterviewEncountersRepository,
    private readonly companiesRepository: CompaniesRepository,
    private readonly topicsRepository: TopicsRepository,
  ) {}

  async create(currentUser: UserContext, dto: CreateQuestionDto) {
    const topics = await this.requireTopics(dto.topicIds);
    const company = await this.requireCompany(dto.companyId ?? null);
    const payload = normalizeQuestionPayload(dto, topics, company);
    const created = await this.questionsRepository.create({
      text: payload.text,
      textContent: payload.textContent,
      answer: payload.answer,
      answerContent: payload.answerContent,
      difficulty: payload.difficultyRank,
      companyId: payload.companyId,
      topicIds: payload.topicIds,
    });

    return this.attachModerationStateToQuestion(currentUser, created);
  }

  async findAll(currentUser: UserContext, query: ListQuestionsQueryDto) {
    let topicFilter: { slug: string; name: string } | undefined;

    if (query.topic !== undefined) {
      const topicName = query.topic.trim();
      if (!topicName) {
        throw new BadRequestException('Query parameter topic cannot be empty');
      }

      topicFilter = {
        name: topicName,
        slug: buildTopicSlug(topicName),
      };
    }

    const questions = await this.questionsRepository.findAll({
      difficulty:
        query.difficulty !== undefined
          ? toDifficultyRank(query.difficulty)
          : undefined,
      topic: topicFilter,
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
    });

    return this.attachModerationStateToQuestions(currentUser, questions);
  }

  async findOne(currentUser: UserContext, id: string) {
    const found = await this.questionsRepository.findOne(id);

    if (!found) {
      throw new NotFoundException(`Question with id '${id}' not found`);
    }

    return this.attachModerationStateToQuestion(currentUser, found);
  }

  async update(currentUser: UserContext, id: string, dto: UpdateQuestionDto) {
    await this.ensureQuestionExists(id);
    await this.ensureNoPendingChangeRequest(id);

    const payload: {
      text?: string;
      textContent?: QuestionStructuredContent;
      answer?: string;
      answerContent?: QuestionStructuredContent;
      difficulty?: ReturnType<typeof toDifficultyRank>;
      companyId?: string | null;
      topicIds?: string[];
    } = {};

    if (dto.textContent !== undefined) {
      const normalizedTextContent = normalizeQuestionStructuredContent(dto.textContent, {
        fieldLabel: 'Question text',
        plainTextLimit: QUESTION_TEXT_PLAIN_LENGTH_LIMIT,
      });
      payload.textContent = normalizedTextContent;
      payload.text = joinQuestionStructuredContent(normalizedTextContent);
    }

    if (dto.answerContent !== undefined) {
      const normalizedAnswerContent = normalizeQuestionStructuredContent(dto.answerContent, {
        fieldLabel: 'Question answer',
        plainTextLimit: QUESTION_ANSWER_PLAIN_LENGTH_LIMIT,
      });
      payload.answerContent = normalizedAnswerContent;
      payload.answer = joinQuestionStructuredContent(normalizedAnswerContent);
    }

    if (dto.difficulty !== undefined) {
      payload.difficulty = toDifficultyRank(dto.difficulty);
    }

    if (dto.companyId !== undefined) {
      payload.companyId = (await this.requireCompany(dto.companyId))?.id ?? null;
    }

    if (dto.topicIds !== undefined) {
      payload.topicIds = (await this.requireTopics(dto.topicIds)).map(
        (topic) => topic.id,
      );
    }

    const updated = await this.questionsRepository.update(id, payload);
    return this.attachModerationStateToQuestion(currentUser, updated);
  }

  async remove(id: string) {
    await this.ensureQuestionExists(id);
    await this.ensureNoPendingChangeRequest(id);
    await this.questionsRepository.remove(id);
  }

  async markInterviewEncounter(currentUser: UserContext, id: string) {
    await this.ensureQuestionExists(id);
    await this.questionInterviewEncountersRepository.mark(id, currentUser.id);
    return this.questionInterviewEncountersRepository.getStateForQuestion(
      id,
      currentUser.id,
    );
  }

  async unmarkInterviewEncounter(currentUser: UserContext, id: string) {
    await this.ensureQuestionExists(id);
    await this.questionInterviewEncountersRepository.unmark(id, currentUser.id);
    return this.questionInterviewEncountersRepository.getStateForQuestion(
      id,
      currentUser.id,
    );
  }

  private async ensureQuestionExists(id: string) {
    const exists = await this.questionsRepository.exists(id);

    if (!exists) {
      throw new NotFoundException(`Question with id '${id}' not found`);
    }
  }

  private async ensureNoPendingChangeRequest(id: string) {
    if (
      await this.questionChangeRequestsRepository.hasPendingRequestForQuestion(id)
    ) {
      throw new ConflictException(
        `Question with id '${id}' already has pending change request`,
      );
    }
  }

  private async attachModerationStateToQuestion(
    currentUser: UserContext,
    question: Awaited<ReturnType<QuestionsRepository['findOne']>> extends infer T
      ? Exclude<T, null>
      : never,
  ) {
    const [decorated] = await this.attachModerationStateToQuestions(currentUser, [
      question,
    ]);

    return decorated;
  }

  private async attachModerationStateToQuestions(
    currentUser: UserContext,
    questions: Awaited<ReturnType<QuestionsRepository['findAll']>>,
  ) {
    const pendingStates =
      await this.questionChangeRequestsRepository.getPendingStatesForQuestions(
        questions.map((question) => question.id),
        currentUser.id,
      );
    const interviewStates =
      await this.questionInterviewEncountersRepository.getStatesForQuestions(
        questions.map((question) => question.id),
        currentUser.id,
      );

    return questions.map((question) =>
      toQuestionResponse(
        question,
        pendingStates.get(question.id) ?? {
          hasPendingChangeRequest: false,
          hasMyPendingChangeRequest: false,
        },
        interviewStates.get(question.id) ?? {
          count: 0,
          checkedByCurrentUser: false,
        },
      ),
    );
  }

  private async requireTopics(topicIds: string[]) {
    const normalizedTopicIds = normalizeTopicIds(topicIds);
    const topics = await this.topicsRepository.findByIds(normalizedTopicIds);

    if (topics.length !== normalizedTopicIds.length) {
      throw new BadRequestException('Some topics do not exist');
    }

    const topicsById = new Map(topics.map((topic) => [topic.id, topic]));

    return normalizedTopicIds.map((topicId) => {
      const topic = topicsById.get(topicId);

      if (!topic) {
        throw new BadRequestException('Some topics do not exist');
      }

      return topic;
    });
  }

  private async requireCompany(companyId: string | null | undefined) {
    if (companyId === undefined || companyId === null) {
      return null;
    }

    const normalizedCompanyId = companyId.trim();

    if (!normalizedCompanyId) {
      throw new BadRequestException('Question company is invalid');
    }

    const company = await this.companiesRepository.findById(normalizedCompanyId);

    if (!company) {
      throw new BadRequestException('Question company is invalid');
    }

    return {
      id: company.id,
      name: company.name,
    };
  }
}

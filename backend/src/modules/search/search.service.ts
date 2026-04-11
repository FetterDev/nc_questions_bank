import { Injectable } from '@nestjs/common';
import { UserContext } from '../authz/user-context';
import { QuestionChangeRequestsRepository } from '../question-change-requests/question-change-requests.repository';
import { QuestionInterviewEncountersRepository } from '../questions/question-interview-encounters.repository';
import {
  SearchQuestionsQueryDto,
  SearchSort,
} from './dto/search-questions.query.dto';
import { SearchRepository } from './search.repository';

@Injectable()
export class SearchService {
  constructor(
    private readonly searchRepository: SearchRepository,
    private readonly questionChangeRequestsRepository: QuestionChangeRequestsRepository,
    private readonly questionInterviewEncountersRepository: QuestionInterviewEncountersRepository,
  ) {}

  async searchQuestions(currentUser: UserContext, query: SearchQuestionsQueryDto) {
    const startedAt = Date.now();
    const result = await this.searchRepository.searchQuestions(query);
    const pendingStates =
      await this.questionChangeRequestsRepository.getPendingStatesForQuestions(
        result.items.map((item) => item.id),
        currentUser.id,
      );
    const interviewStates =
      await this.questionInterviewEncountersRepository.getStatesForQuestions(
        result.items.map((item) => item.id),
        currentUser.id,
      );

    return {
      items: result.items.map((item) => ({
        ...item,
        pendingChangeRequest: pendingStates.get(item.id) ?? {
          hasPendingChangeRequest: false,
          hasMyPendingChangeRequest: false,
        },
        interviewEncounter: interviewStates.get(item.id) ?? {
          count: 0,
          checkedByCurrentUser: false,
        },
      })),
      total: result.total,
      meta: {
        tookMs: Date.now() - startedAt,
        appliedFilters: {
          difficulty: query.difficulty ?? [],
          topicIds: query.topicIds ?? [],
          companyQuery: query.companyQuery?.trim() || null,
          sort: query.sort ?? SearchSort.RELEVANCE,
        },
      },
    };
  }
}

import type { components } from '../../sdk';

export type Question = components['schemas']['QuestionDto'];
export type QuestionStructuredContentSchema =
  components['schemas']['QuestionStructuredContentDto'];
export type QuestionCodeLanguage = NonNullable<
  QuestionStructuredContentSchema['language']
>;
export type QuestionTextContentBlock = {
  kind: 'text';
  content: string;
};
export type QuestionCodeContentBlock = {
  kind: 'code';
  content: string;
  language?: QuestionCodeLanguage;
};
export type QuestionStructuredContentBlock =
  | QuestionTextContentBlock
  | QuestionCodeContentBlock;
export type QuestionStructuredContent = QuestionStructuredContentBlock[];
export type SearchResponse = components['schemas']['SearchQuestionsResponseDto'];
export type DifficultyValue = Question['difficulty'];
export type DifficultyOption = {
  title: string;
  value: DifficultyValue;
};
export type PageSizeOption = {
  title: string;
  value: number;
};
export type EditorMode = 'create' | 'edit';

export type QuestionFormValues = {
  textContent: QuestionStructuredContent;
  answerContent: QuestionStructuredContent;
  difficulty: DifficultyValue;
  companyId: string | null;
  topicIds: string[];
};

import type {
  DifficultyOption,
  PageSizeOption,
  QuestionFormValues,
  QuestionCodeLanguage,
} from './questions.types';
import { createQuestionStructuredContent } from './questions.utils';

export const difficultyOptions: DifficultyOption[] = [
  { title: 'Junior', value: 'junior' },
  { title: 'Middle', value: 'middle' },
  { title: 'Senior', value: 'senior' },
  { title: 'Lead', value: 'lead' },
];

export const pageSizeOptions: PageSizeOption[] = [
  { title: '10 строк', value: 10 },
  { title: '20 строк', value: 20 },
  { title: '50 строк', value: 50 },
];

export const criterionWeightOptions = [
  { title: '1', value: 1 },
  { title: '2', value: 2 },
  { title: '3', value: 3 },
  { title: '4', value: 4 },
  { title: '5', value: 5 },
];

export const questionCodeLanguageOptions: Array<{
  title: string;
  value: QuestionCodeLanguage;
}> = [
  { title: 'JS', value: 'javascript' },
  { title: 'JSX', value: 'jsx' },
  { title: 'TS', value: 'typescript' },
  { title: 'TSX', value: 'tsx' },
  { title: 'HTML', value: 'html' },
  { title: 'CSS', value: 'css' },
  { title: 'Vue', value: 'vue' },
];

export const createEmptyForm = (): QuestionFormValues => ({
  textContent: createQuestionStructuredContent(),
  answerContent: createQuestionStructuredContent(),
  difficulty: 'middle',
  companyId: null,
  topicIds: [],
  competencyIds: [],
  evaluationCriteria: [],
});

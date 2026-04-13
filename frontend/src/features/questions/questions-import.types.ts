export type QuestionCsvImportRowSummary =
  | 'create'
  | 'update'
  | 'no_change'
  | 'error';

export type QuestionCsvImportCodeLanguage =
  | 'javascript'
  | 'jsx'
  | 'typescript'
  | 'tsx'
  | 'html'
  | 'css'
  | 'vue';

export type QuestionCsvImportDifficulty =
  | 'junior'
  | 'middle'
  | 'senior'
  | 'lead';

export type QuestionCsvImportNormalizedRow = {
  id: string | null;
  topics: string[];
  questionText: string;
  questionCode: string | null;
  questionCodeLanguage: QuestionCsvImportCodeLanguage | null;
  answerText: string;
  answerCode: string | null;
  answerCodeLanguage: QuestionCsvImportCodeLanguage | null;
  difficulty: QuestionCsvImportDifficulty | null;
  company: string | null;
};

export type QuestionCsvImportRow = {
  rowNumber: number;
  summary: QuestionCsvImportRowSummary;
  errors: string[];
  warnings: string[];
  normalized: QuestionCsvImportNormalizedRow;
};

export type QuestionCsvImportTotals = {
  totalRows: number;
  create: number;
  update: number;
  noChange: number;
  error: number;
  warning: number;
};

export type QuestionCsvImportReport = {
  applied: boolean;
  fileName: string;
  delimiter: ';' | ',';
  warnings: string[];
  topicsToCreate: string[];
  companiesToCreate: string[];
  totals: QuestionCsvImportTotals;
  rows: QuestionCsvImportRow[];
};

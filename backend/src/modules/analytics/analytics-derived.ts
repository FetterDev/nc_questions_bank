export type StackLevel = 'not_assessed' | 'junior' | 'middle' | 'senior' | 'lead';

export type StackLevelInput = {
  assessedCount: number;
  accuracy: number;
};

export type GrowthRecommendation = {
  kind: 'topic' | 'question' | 'growth_area';
  text: string;
  priority: number;
};

export type GrowthAreaProgressItem = {
  competencyId: string;
  name: string;
  slug: string;
  latestGrowthArea: string;
  firstSeenAt: string;
  lastSeenAt: string;
  totalGrowthPoints: number;
  resolvedCount: number;
  currentStatus: 'resolved' | 'in_progress';
  accuracy: number;
  entries: Array<{
    interviewId: string;
    criterionId: string;
    result: string;
    growthArea: string;
    assessedAt: string;
  }>;
};

export type GrowthRecommendationsInput = {
  weakTopics: Array<{
    topicId: string;
    name: string;
    slug: string;
    correctCount: number;
    partialCount: number;
    incorrectCount: number;
    accuracy: number;
  }>;
  failedQuestions: Array<{
    questionId: string;
    text: string;
    difficulty: string;
    lastResult: string;
  }>;
  growthAreaProgress: GrowthAreaProgressItem[];
};

export type ManagerReportInput = {
  generatedAt: Date;
  summary: {
    employeesCount: number;
    employeesWithAnswersCount: number;
    totalAnswers: number;
    averageAccuracy: number;
  };
  employees: Array<{
    user: {
      id: string;
      login: string;
      displayName: string;
      role: string;
    };
    stacks: Array<{
      id: string;
      name: string;
      slug: string;
    }>;
    stackLevels: Array<{
      stack: {
        id: string;
        name: string;
        slug: string;
      };
      assessedCount: number;
      accuracy: number;
      level: StackLevel;
    }>;
    summary: {
      totalAnswers: number;
      correctCount: number;
      partialCount: number;
      incorrectCount: number;
      accuracy: number;
      trainingSessionsCount: number;
      completedInterviewsCount: number;
      feedbackCount: number;
      lastActivityAt: string | null;
    };
    growthTopics: Array<{
      topicId: string;
      name: string;
      slug: string;
      correctCount: number;
      partialCount: number;
      incorrectCount: number;
      accuracy: number;
    }>;
  }>;
};

export function resolveStackLevel(input: StackLevelInput): StackLevel {
  if (input.assessedCount <= 0) {
    return 'not_assessed';
  }

  if (input.accuracy >= 90 && input.assessedCount >= 8) {
    return 'lead';
  }

  if (input.accuracy >= 75 && input.assessedCount >= 5) {
    return 'senior';
  }

  if (input.accuracy >= 55 && input.assessedCount >= 3) {
    return 'middle';
  }

  return 'junior';
}

export function buildGrowthRecommendations(
  input: GrowthRecommendationsInput,
): GrowthRecommendation[] {
  const recommendations: GrowthRecommendation[] = [];
  const weakTopic = [...input.weakTopics].sort(
    (left, right) =>
      right.incorrectCount +
        right.partialCount -
        left.incorrectCount -
        left.partialCount ||
      left.accuracy - right.accuracy,
  )[0];

  if (weakTopic) {
    recommendations.push({
      kind: 'topic',
      priority: 1,
      text: `Повторить тему ${weakTopic.name}: сейчас ${weakTopic.accuracy}% accuracy, ${weakTopic.incorrectCount} incorrect и ${weakTopic.partialCount} partial.`,
    });
  }

  const failedQuestion = [...input.failedQuestions].sort(
    (left, right) =>
      growthResultRank(right.lastResult) - growthResultRank(left.lastResult),
  )[0];

  if (failedQuestion) {
    recommendations.push({
      kind: 'question',
      priority: 2,
      text: `Разобрать вопрос "${trimForSentence(failedQuestion.text)}" и повторить похожие задачи уровня ${failedQuestion.difficulty}.`,
    });
  }

  const growthArea = [...input.growthAreaProgress].sort(
    (left, right) =>
      Number(left.currentStatus === 'resolved') -
        Number(right.currentStatus === 'resolved') ||
      right.totalGrowthPoints - left.totalGrowthPoints ||
      left.accuracy - right.accuracy,
  )[0];

  if (growthArea) {
    recommendations.push({
      kind: 'growth_area',
      priority: 3,
      text: `Закрыть зону роста "${trimForSentence(growthArea.latestGrowthArea)}" по навыку ${growthArea.name}.`,
    });
  }

  return recommendations;
}

export function buildManagerReport(input: ManagerReportInput) {
  const riskEmployees = [...input.employees]
    .filter((employee) => employee.summary.totalAnswers > 0)
    .sort(
      (left, right) =>
        left.summary.accuracy - right.summary.accuracy ||
        right.summary.incorrectCount +
          right.summary.partialCount -
          left.summary.incorrectCount -
          left.summary.partialCount ||
        left.user.displayName.localeCompare(right.user.displayName, 'ru-RU'),
    )
    .slice(0, 5)
    .map((employee) => ({
      user: employee.user,
      accuracy: employee.summary.accuracy,
      totalAnswers: employee.summary.totalAnswers,
      growthTopics: employee.growthTopics.slice(0, 3),
      stackLevels: employee.stackLevels,
    }));
  const recommendations = riskEmployees.slice(0, 3).map((employee) => {
    const topic = employee.growthTopics[0];
    const topicText = topic ? `, фокус: ${topic.name}` : '';

    return `${employee.user.displayName}: провести разбор результатов (${employee.accuracy}% accuracy${topicText}).`;
  });

  if (recommendations.length === 0) {
    recommendations.push('Нет сотрудников с достаточными данными для риск-отчета.');
  }

  return {
    generatedAt: input.generatedAt.toISOString(),
    summaryText: `${input.summary.employeesCount} сотрудников, ${input.summary.employeesWithAnswersCount} с данными, средняя успешность ${input.summary.averageAccuracy}%.`,
    riskEmployees,
    recommendations,
  };
}

function growthResultRank(value: string) {
  if (value === 'incorrect') {
    return 2;
  }

  if (value === 'partial') {
    return 1;
  }

  return 0;
}

function trimForSentence(value: string) {
  const normalized = value.replace(/\s+/g, ' ').trim();

  if (normalized.length <= 120) {
    return normalized;
  }

  return `${normalized.slice(0, 119).trimEnd()}…`;
}

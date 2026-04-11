import type { paths } from '../../sdk';

export type TrainingPreset =
  paths['/api/training/presets']['get']['responses'][200]['content']['application/json'][number];

export type TrainingParticipant =
  paths['/api/training/participants']['get']['responses'][200]['content']['application/json']['items'][number];

export type PrepareTrainingResponse =
  paths['/api/training/prepare']['post']['responses'][200]['content']['application/json'];

export type SaveTrainingResultsPayload =
  paths['/api/training/results']['post']['requestBody']['content']['application/json'];

export type SaveTrainingResultsResponse =
  paths['/api/training/results']['post']['responses'][201]['content']['application/json'];

export type TrainingHistoryListResponse =
  paths['/api/training/history']['get']['responses'][200]['content']['application/json'];

type TrainingHistorySessionRaw = TrainingHistoryListResponse['items'][number];

export type TrainingHistorySession = Omit<TrainingHistorySessionRaw, 'feedback'> & {
  feedback: string | null;
};

type TrainingHistoryDetailRaw =
  paths['/api/training/history/{id}']['get']['responses'][200]['content']['application/json'];

export type TrainingHistoryDetail = Omit<TrainingHistoryDetailRaw, 'feedback'> & {
  feedback: string | null;
};

export type TrainingQuestionItem = PrepareTrainingResponse['items'][number];
export type TrainingTopicBreakdown =
  PrepareTrainingResponse['meta']['topicBreakdown'][number];

export type TrainingResultStatus = SaveTrainingResultsPayload['status'];
export type TrainingResultValue = SaveTrainingResultsPayload['items'][number]['result'];
export type TrainingCardState = 'pending' | 'revealed' | TrainingResultValue;

export type TrainingPresetFormValues = {
  name: string;
  topicIds: string[];
};

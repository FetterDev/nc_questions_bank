import type { components, paths } from '../../sdk';

export type Stack = components['schemas']['StackDto'];
export type Competency = components['schemas']['CompetencyDto'];
export type ListStacksResponse = components['schemas']['ListStacksResponseDto'];
export type ListCompetenciesResponse =
  components['schemas']['ListCompetenciesResponseDto'];
export type CompetencyMatrix = components['schemas']['CompetencyMatrixUserResponseDto'];
export type ListCompetencyMatrixResponse =
  components['schemas']['ListCompetencyMatrixResponseDto'];
export type ListCompetencyMatrixQuery =
  NonNullable<paths['/api/competency-matrix']['get']['parameters']['query']>;

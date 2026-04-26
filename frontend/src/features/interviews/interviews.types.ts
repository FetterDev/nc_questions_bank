import type { paths } from '../../sdk';

type GeneratedInterviewCycle =
  paths['/api/interviews/cycles/{id}']['get']['responses'][200]['content']['application/json'];
type GeneratedInterviewItem = GeneratedInterviewCycle['interviews'][number];
type GeneratedAdminInterviewCalendar =
  paths['/api/interviews/admin-calendar']['get']['responses'][200]['content']['application/json'];
type GeneratedMyInterviewCalendar =
  paths['/api/interviews/my-calendar']['get']['responses'][200]['content']['application/json'];
type GeneratedMyInterviewCalendarItem = GeneratedMyInterviewCalendar['items'][number];
type GeneratedInterviewRuntime =
  paths['/api/interviews/{id}/runtime']['get']['responses'][200]['content']['application/json'];
type GeneratedInterviewHistory =
  paths['/api/interviews/my-history']['get']['responses'][200]['content']['application/json'];
type GeneratedInterviewDetail =
  paths['/api/interviews/{id}/detail']['get']['responses'][200]['content']['application/json'];

export type InterviewUser = {
  id: string;
  login: string;
  displayName: string;
};

export type InterviewPreset = {
  id: string;
  name: string;
};

export type InterviewItem = Omit<
  GeneratedInterviewItem,
  'plannedDate' | 'completedAt' | 'preset' | 'interviewer' | 'interviewee'
> & {
  plannedDate: string | null;
  completedAt: string | null;
  preset: InterviewPreset | null;
  interviewer: InterviewUser;
  interviewee: InterviewUser;
};

export type InterviewCycle = Omit<
  GeneratedInterviewCycle,
  'createdByAdmin' | 'interviews'
> & {
  createdByAdmin: InterviewUser;
  interviews: InterviewItem[];
};

export type InterviewCalendarActiveCycle = Omit<
  NonNullable<GeneratedAdminInterviewCalendar['activeCycle']>,
  'createdByAdmin' | 'interviews'
> & {
  createdByAdmin: InterviewUser;
  interviews: InterviewItem[];
};

export type CreateInterviewCyclePayload =
  paths['/api/interviews/cycles']['post']['requestBody']['content']['application/json'];

export type CreateInterviewPairPayload =
  paths['/api/interviews/cycles/{id}/pairs']['post']['requestBody']['content']['application/json'];

export type UpdateInterviewPayload = {
  interviewerId?: string | null;
  intervieweeId?: string | null;
  plannedDate?: string | null;
  presetId?: string | null;
  feedback?: string | null;
};

export type AdminInterviewCalendar = Omit<
  GeneratedAdminInterviewCalendar,
  'activeCycle' | 'items'
> & {
  activeCycle: InterviewCalendarActiveCycle | null;
  items: InterviewItem[];
};

export type MyInterviewCalendarItem = Omit<
  GeneratedMyInterviewCalendarItem,
  'plannedDate' | 'completedAt' | 'preset' | 'interviewer' | 'interviewee'
> & {
  plannedDate: string | null;
  completedAt: string | null;
  preset: InterviewPreset | null;
  interviewer: InterviewUser;
  interviewee: InterviewUser;
};

export type MyInterviewCalendar = Omit<GeneratedMyInterviewCalendar, 'items'> & {
  items: MyInterviewCalendarItem[];
};

export type InterviewRuntime = Omit<
  GeneratedInterviewRuntime,
  'interview' | 'counterpart'
> & {
  interview: InterviewItem;
  counterpart: InterviewUser;
};

export type InterviewHistory = Omit<GeneratedInterviewHistory, 'items'> & {
  items: InterviewItem[];
};

export type InterviewDetail = Omit<
  GeneratedInterviewDetail,
  'interview' | 'interviewer' | 'interviewee'
> & {
  interview: InterviewItem;
  interviewer: InterviewUser;
  interviewee: InterviewUser;
};

export type CompleteInterviewPayload =
  paths['/api/interviews/{id}/complete']['post']['requestBody']['content']['application/json'];

export type AdminInterviewDashboard =
  paths['/api/interviews/admin-dashboard']['get']['responses'][200]['content']['application/json'];

export type MyInterviewDashboard =
  paths['/api/interviews/my-dashboard']['get']['responses'][200]['content']['application/json'];

export type InterviewStatusValue = InterviewItem['status'];
export type InterviewRoleValue = MyInterviewCalendarItem['myRole'];

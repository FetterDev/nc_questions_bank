import { UserRole, UserStatus } from '@prisma/client';

export type UserContext = {
  id: string;
  login: string;
  email: string | null;
  displayName: string;
  role: UserRole;
  status: UserStatus;
};

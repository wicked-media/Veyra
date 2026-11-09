import type { PracticeArea, TaskPriority, TaskStatus } from "./domain";
import type { Role } from "./permissions";

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

export interface ApiSuccessBody<T> {
  data: T;
}

export interface ActorSummary {
  userId: string;
  name: string;
  email: string;
  role: Role;
  permissions: readonly string[];
}

export interface OrganisationSummary {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  matterNumberPrefix: string;
  financialYearStartMonth: number;
}

export interface MatterSummary {
  id: string;
  matterNumber: string;
  title: string;
  status: string;
  practiceArea: PracticeArea;
  clientId: string;
  clientName: string;
  responsibleName: string;
  restricted: boolean;
  openedAt: string;
  updatedAt: string;
}

export interface ClientSummary {
  id: string;
  displayName: string;
  type: string;
  status: string;
  riskRating: string;
  email: string | null;
  phone: string | null;
  openMatters: number;
}

export interface TaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueOn: string | null;
  matterId: string | null;
  matterNumber: string | null;
  matterTitle: string | null;
  assigneeName: string | null;
  assigneeUserId: string | null;
}

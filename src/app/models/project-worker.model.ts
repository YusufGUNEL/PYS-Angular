import { Project } from './project.model';
import { User } from './user.model';

export interface ProjectWorker {
  id: string;
  projectId: string;
  userId: string;
  projectRole: string;
  project?: Project;
  user?: User;
}

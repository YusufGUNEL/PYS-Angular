export interface ProjectStatus {
  id: string;
  statusName: string;
}

export interface Project {
  id: string;
  projectName: string;
  description?: string;
  mainImageUrl?: string;
  resourceFileUrl?: string;
  startDate: string;
  endDate?: string;
  statusId: string;
  ownerId: string;
  status?: ProjectStatus;
  owner?: { id: string; fullName: string; title?: string };
  isOwner?: boolean;
  myRole?: string | null;
  approvalStatus?: string;
}

export interface AddProjectModel {
  projectName: string;
  description?: string;
  mainImageUrl?: string;
  resourceFileUrl?: string;
  startDate: string;
  endDate?: string;
  statusId: string;
  ownerId: string;
}

export interface UpdateProjectModel {
  id: string;
  projectName: string;
  description?: string;
  mainImageUrl?: string;
  resourceFileUrl?: string;
  startDate: string;
  endDate?: string;
  statusId: string;
  ownerId: string;
}

export type ProjectDocumentFileType = 'image' | 'pdf' | 'document' | 'other';

export interface ProjectDocument {
  id?: string;
  fileName: string;
  fileUrl: string;
  description?: string;
  fileType: ProjectDocumentFileType;
  projectId: string;
  uploadedById: string;
  createdAt?: string;
}

export interface AddProjectDocumentModel {
  fileName: string;
  fileUrl: string;
  description?: string;
  fileType: ProjectDocumentFileType;
  projectId: string;
  uploadedById?: string;
}

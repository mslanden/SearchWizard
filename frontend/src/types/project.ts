// Type definitions for the project management system

export interface Artifact {
  id: string;
  name: string;
  type: string;
  dateAdded: string;
  url?: string;
  description?: string;
  inputType: 'file' | 'url' | 'text';
  category: 'company' | 'role';
  fileType?: string;
  fileUrl?: string;
  sourceUrl?: string;
  textContent?: string;
  processedContent?: string;
}

export interface Candidate {
  id: string;
  name: string;
  role: string;
  company: string;
  email: string;
  phone: string;
  photoUrl: string;
  artifacts: number;
}

export interface Interviewer {
  id: string;
  name: string;
  position: string;
  company: string;
  email: string;
  phone: string;
  photoUrl: string;
  artifacts: number;
}

export interface ProjectOutput {
  id: string;
  name: string;
  type: string;
  dateCreated: string;
  url: string;
  description?: string;
}

export interface Project {
  id: string;
  title: string;
  client: string;
  date: string;
  description: string;
  artifactCount: number;
  backgroundColor: string;
  artifacts: Artifact[];
  candidates: Candidate[];
  interviewers: Interviewer[];
  outputs: ProjectOutput[];
}

// Legacy structure for backward compatibility
export interface LegacyProject {
  id: string;
  title: string;
  client: string;
  date: string;
  description: string;
  artifactCount: number;
  backgroundColor: string;
  companyArtifacts: Artifact[];
  roleArtifacts: Artifact[];
  candidates: Candidate[];
  interviewers: Interviewer[];
  outputs: ProjectOutput[];
}

export interface ProjectState {
  project: Project | null;
  loading: boolean;
  error: string | null;
  deletingDocument: string | false;
  selectedOutputs: string[];
}

export interface ProjectAction {
  type: 'SET_PROJECT' | 'SET_LOADING' | 'SET_ERROR' | 'ADD_ARTIFACT' | 'ADD_CANDIDATE' | 'UPDATE_CANDIDATE' | 'ADD_INTERVIEWER' | 'UPDATE_INTERVIEWER' | 'DELETE_ARTIFACT' | 'DELETE_OUTPUT' | 'TOGGLE_OUTPUT_SELECTION' | 'SET_DELETING_DOCUMENT';
  payload?: any;
}

export interface ArtifactUploadData {
  name: string;
  description?: string;
  inputType: 'file' | 'url' | 'text';
  file?: File;
  sourceUrl?: string;  // Standardized field name for external URLs
  textContent?: string;
}

export interface CandidateFormData {
  name: string;
  role: string;
  company: string;
  email: string;
  phone: string;
  photoUrl?: string;
}

export interface InterviewerFormData {
  name: string;
  position: string;
  company: string;
  email: string;
  phone: string;
  photoUrl?: string;
}

export interface ProjectHeaderData {
  title: string;
  client: string;
  description: string;
}
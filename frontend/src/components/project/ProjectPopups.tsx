import CandidateAddPopup from '../popups/CandidateAddPopup';
import CandidateEditPopup from '../popups/CandidateEditPopup';
import InterviewerAddPopup from '../popups/InterviewerAddPopup';
import InterviewerEditPopup from '../popups/InterviewerEditPopup';
import GoldenExamplesPopup from '../popups/GoldenExamplesPopup';
import GenerateDocumentPopup from '../popups/GenerateDocumentPopup';
import ProjectHeaderEditPopup from '../popups/ProjectHeaderEditPopup';
import UnifiedArtifactUploadPopup from '../popups/UnifiedArtifactUploadPopup';
import HtmlDocumentViewer from '../common/HtmlDocumentViewer';
import {
  ArtifactUploadData,
  Candidate,
  CandidateFormData,
  Interviewer,
  InterviewerFormData,
  Project,
  ProjectHeaderData,
} from '../../types/project';

interface ProjectPopupsProps {
  project: Project;
  currentCandidate: Candidate | null;
  currentInterviewer: Interviewer | null;
  isAddCandidateOpen: boolean;
  isEditCandidateOpen: boolean;
  isEditInterviewerOpen: boolean;
  isGoldenExamplesOpen: boolean;
  isGenerateDocumentOpen: boolean;
  isProjectHeaderEditOpen: boolean;
  artifactUploadType: 'company' | 'role' | null;
  viewingDocument: string | null;
  onCloseAddCandidate: () => void;
  onAddCandidate: (data: CandidateFormData) => Promise<void>;
  onCloseCandidateEdit: () => void;
  onSaveCandidate: (data: CandidateFormData) => Promise<void>;
  onDeleteCandidate: (id: string) => Promise<void>;
  onCloseInterviewerEdit: () => void;
  onSaveInterviewer: (data: InterviewerFormData) => Promise<void>;
  onDeleteInterviewer: (id: string) => Promise<void>;
  onAddInterviewer: (data: InterviewerFormData) => Promise<void>;
  onCloseGoldenExamples: () => void;
  onCloseGenerateDocument: () => void;
  onCloseProjectHeaderEdit: () => void;
  onSaveProjectHeader: (data: ProjectHeaderData) => Promise<void>;
  onCloseArtifactUpload: () => void;
  onArtifactUpload: (data: ArtifactUploadData) => Promise<void>;
  onSetViewingDocument: (url: string | null) => void;
}

export default function ProjectPopups({
  project,
  currentCandidate,
  currentInterviewer,
  isAddCandidateOpen,
  isEditCandidateOpen,
  isEditInterviewerOpen,
  isGoldenExamplesOpen,
  isGenerateDocumentOpen,
  isProjectHeaderEditOpen,
  artifactUploadType,
  viewingDocument,
  onCloseAddCandidate,
  onAddCandidate,
  onCloseCandidateEdit,
  onSaveCandidate,
  onDeleteCandidate,
  onCloseInterviewerEdit,
  onSaveInterviewer,
  onDeleteInterviewer,
  onAddInterviewer,
  onCloseGoldenExamples,
  onCloseGenerateDocument,
  onCloseProjectHeaderEdit,
  onSaveProjectHeader,
  onCloseArtifactUpload,
  onArtifactUpload,
  onSetViewingDocument,
}: ProjectPopupsProps) {
  return (
    <>
      {/* Candidate Add Popup */}
      {isAddCandidateOpen && (
        <CandidateAddPopup
          onClose={onCloseAddCandidate}
          onAdd={onAddCandidate}
        />
      )}

      {/* Candidate Edit Popup */}
      {isEditCandidateOpen && (
        <CandidateEditPopup
          candidate={currentCandidate}
          onClose={onCloseCandidateEdit}
          onDelete={onDeleteCandidate}
          onSave={onSaveCandidate}
        />
      )}

      {/* Interviewer Add/Edit Popup */}
      {isEditInterviewerOpen && (
        currentInterviewer ? (
          <InterviewerEditPopup
            interviewer={currentInterviewer}
            onClose={onCloseInterviewerEdit}
            onSave={onSaveInterviewer}
            onDelete={onDeleteInterviewer}
          />
        ) : (
          <InterviewerAddPopup
            onClose={onCloseInterviewerEdit}
            onAdd={onAddInterviewer}
          />
        )
      )}

      {/* Golden Examples Popup */}
      {isGoldenExamplesOpen && (
        <GoldenExamplesPopup onClose={onCloseGoldenExamples} />
      )}

      {/* Generate Document Popup */}
      {isGenerateDocumentOpen && (
        <GenerateDocumentPopup
          onClose={onCloseGenerateDocument}
          projectId={project.id}
        />
      )}

      {/* Project Header Edit Popup */}
      {isProjectHeaderEditOpen && (
        <ProjectHeaderEditPopup
          project={project}
          onClose={onCloseProjectHeaderEdit}
          onSave={onSaveProjectHeader}
        />
      )}

      {/* Artifact Upload Popup */}
      {artifactUploadType && (
        <UnifiedArtifactUploadPopup
          isOpen={!!artifactUploadType}
          type={artifactUploadType}
          onClose={onCloseArtifactUpload}
          onUpload={onArtifactUpload}
        />
      )}

      {/* HTML Document Viewer */}
      {viewingDocument && (
        <HtmlDocumentViewer
          url={viewingDocument}
          onClose={() => onSetViewingDocument(null)}
        />
      )}
    </>
  );
}

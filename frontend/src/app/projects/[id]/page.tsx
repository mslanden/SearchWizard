"use client";

import { useState, use, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { projectsApi } from '../../../lib/supabase';
import { artifactApi } from '../../../lib/api';
import CandidateAddPopup from '../../../components/popups/CandidateAddPopup';
import InterviewerAddPopup from '../../../components/popups/InterviewerAddPopup';
import InterviewerEditPopup from '../../../components/popups/InterviewerEditPopup';
import GoldenExamplesPopup from '../../../components/popups/GoldenExamplesPopup';
import GenerateDocumentPopup from '../../../components/popups/GenerateDocumentPopup';
import ProjectHeaderEditPopup from '../../../components/popups/ProjectHeaderEditPopup';
import UnifiedArtifactUploadPopup from '../../../components/popups/UnifiedArtifactUploadPopup';
import CandidateEditPopup from '../../../components/popups/CandidateEditPopup';
import HtmlDocumentViewer from '../../../components/common/HtmlDocumentViewer';
import Header from '../../../components/Header';
import ProjectHeader from '../../../components/project/header/ProjectHeader';
import ArtifactsSection from '../../../components/project/sections/ArtifactsSection';
import PeopleSection from '../../../components/project/sections/PeopleSection';
import OutputsSection from '../../../components/project/sections/OutputsSection';

// Import types and utilities
import { Artifact, ArtifactUploadData, CandidateFormData, InterviewerFormData, ProjectHeaderData } from '../../../types/project';
import { useProjectReducer } from '../../../hooks/useProjectReducer';
import { useErrorHandler } from '../../../hooks/useErrorHandler';
import { fetchProjectData, createEmptyProject, getArtifactsByCategory } from '../../../utils/projectUtils';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectDetail({ params }: PageProps) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const { state, actions } = useProjectReducer();
  const { error, handleError, clearError, showSuccess, hasError } = useErrorHandler();
  
  // UI state
  const [viewingDocument, setViewingDocument] = useState<string | null>(null);
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
  const [isEditCandidateOpen, setIsEditCandidateOpen] = useState(false);
  const [currentCandidate, setCurrentCandidate] = useState<any>(null);
  const [isEditInterviewerOpen, setIsEditInterviewerOpen] = useState(false);
  const [currentInterviewer, setCurrentInterviewer] = useState<any>(null);
  const [isGoldenExamplesOpen, setIsGoldenExamplesOpen] = useState(false);
  const [isGenerateDocumentOpen, setIsGenerateDocumentOpen] = useState(false);
  const [isProjectHeaderEditOpen, setIsProjectHeaderEditOpen] = useState(false);
  const [artifactUploadType, setArtifactUploadType] = useState<'company' | 'role' | null>(null);

  // Memoized values for performance
  const companyArtifacts = useMemo(() => 
    state.project ? getArtifactsByCategory(state.project.artifacts, 'company') : [], 
    [state.project?.artifacts]
  );
  
  const roleArtifacts = useMemo(() => 
    state.project ? getArtifactsByCategory(state.project.artifacts, 'role') : [], 
    [state.project?.artifacts]
  );

  // Fetch project data on mount
  useEffect(() => {
    const loadId = Math.random().toString(36).substring(7);
    console.log(`🔄 LOAD-${loadId} ProjectDetail starting for: ${unwrappedParams.id}`);
    
    async function loadProject() {
      try {
        actions.setLoading(true);
        clearError();
        
        const projectData = await fetchProjectData(unwrappedParams.id);
        console.log(`✅ LOAD-${loadId} Project data received, updating state`);
        actions.setProject(projectData);
        console.log(`✅ LOAD-${loadId} Complete!`);
        
      } catch (err) {
        console.error(`❌ LOAD-${loadId} Error:`, err.message);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load project';
        
        if (errorMessage.includes('not found')) {
          handleError(err as Error, 'find project');
          setTimeout(() => router.push('/projects'), 2000);
        } else {
          handleError(err as Error, 'load project');
          // Create empty project as fallback
          actions.setProject(createEmptyProject(unwrappedParams.id));
        }
      } finally {
        console.log(`🔄 LOAD-${loadId} Setting loading to false`);
        actions.setLoading(false);
      }
    }

    loadProject();
  }, [unwrappedParams.id]); // Remove potentially changing dependencies

  // Event handlers
  const toggleOutputSelection = (id: string) => {
    actions.toggleOutputSelection(id);
  };

  const openAddCandidate = () => setIsAddCandidateOpen(true);
  const closeAddCandidate = () => setIsAddCandidateOpen(false);

  const openCandidateEdit = (candidate: any) => {
    setCurrentCandidate(candidate);
    setIsEditCandidateOpen(true);
  };

  const closeCandidateEdit = () => {
    setIsEditCandidateOpen(false);
    setCurrentCandidate(null);
  };

  const openInterviewerEdit = (interviewer: any) => {
    setCurrentInterviewer(interviewer);
    setIsEditInterviewerOpen(true);
  };

  const closeInterviewerEdit = () => {
    setIsEditInterviewerOpen(false);
    setCurrentInterviewer(null);
  };

  const openGoldenExamples = () => setIsGoldenExamplesOpen(true);
  const closeGoldenExamples = () => setIsGoldenExamplesOpen(false);

  const openGenerateDocument = () => setIsGenerateDocumentOpen(true);
  const closeGenerateDocument = () => setIsGenerateDocumentOpen(false);

  const openProjectHeaderEdit = () => setIsProjectHeaderEditOpen(true);
  const closeProjectHeaderEdit = () => setIsProjectHeaderEditOpen(false);

  const openArtifactUpload = (type: 'company' | 'role') => setArtifactUploadType(type);
  const closeArtifactUpload = () => setArtifactUploadType(null);

  // Handler for saving interviewer edits
  const handleSaveInterviewer = async (updatedData: InterviewerFormData) => {
    if (!currentInterviewer || !state.project) return;
    
    try {
      const updatedInterviewer = await artifactApi.updateInterviewer(
        currentInterviewer.id,
        updatedData
      );

      actions.updateInterviewer({
        ...currentInterviewer,
        ...updatedInterviewer,
        photoUrl: updatedInterviewer.photoUrl || currentInterviewer.photoUrl
      });

      closeInterviewerEdit();
      showSuccess('Interviewer updated successfully');
    } catch (err) {
      handleError(err as Error, 'update interviewer');
    }
  };

  // Handle document deletion
  const handleDeleteDocument = async (documentId: string, documentName: string) => {
    if (!confirm(`Are you sure you want to delete "${documentName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      actions.setDeletingDocument(documentId);
      const result = await artifactApi.deleteProjectOutput(documentId);

      if (result) {
        actions.deleteOutput(documentId);
        showSuccess(`Document "${documentName}" deleted successfully`);
      }
    } catch (error) {
      handleError(error as Error, 'delete document');
    } finally {
      actions.setDeletingDocument(false);
    }
  };

  // Handle artifact deletion
  const handleDeleteArtifact = async (artifactId: string, artifactName: string, artifactType: string) => {
    if (!confirm(`Are you sure you want to delete "${artifactName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      actions.setDeletingDocument(artifactId);
      const result = await artifactApi.deleteArtifact(artifactId, artifactType);

      if (result) {
        actions.deleteArtifact(artifactId);
        showSuccess(`${artifactType.charAt(0).toUpperCase() + artifactType.slice(1)} artifact deleted successfully`);
      }
    } catch (error) {
      handleError(error as Error, `delete ${artifactType} artifact`);
    } finally {
      actions.setDeletingDocument(false);
    }
  };

  const handleArtifactUpload = async (artifactData: ArtifactUploadData) => {
    if (!state.project || !artifactUploadType) return;
    
    try {
      // Standardized artifact data following PROJECT_STANDARDS.md
      const standardizedArtifactData = {
        name: artifactData.name,
        description: artifactData.description,
        inputType: artifactData.inputType || 'file' as const,
        sourceUrl: artifactData.sourceUrl,  // URL input
        textContent: artifactData.textContent  // Text input
      };

      // File is passed separately as required by API
      const artifactFile = artifactData.file || null;

      let newArtifact;
      if (artifactUploadType === 'company') {
        newArtifact = await artifactApi.addCompanyArtifact(
          state.project.id,
          standardizedArtifactData,
          artifactFile
        );
      } else {
        newArtifact = await artifactApi.addRoleArtifact(
          state.project.id,
          standardizedArtifactData,
          artifactFile
        );
      }

      if (newArtifact) {
        const formattedArtifact: Artifact = {
          id: newArtifact.id,
          name: newArtifact.name,
          type: newArtifact.file_type || newArtifact.fileType || 'Document',
          dateAdded: new Date(newArtifact.date_added || newArtifact.dateAdded || newArtifact.created_at).toLocaleDateString(),
          url: newArtifact.file_url || newArtifact.fileUrl || newArtifact.url,
          description: newArtifact.description,
          inputType: artifactData.inputType,
          category: artifactUploadType
        };

        actions.addArtifact(formattedArtifact);
        closeArtifactUpload();
        showSuccess('Artifact uploaded successfully');
      }
    } catch (err) {
      handleError(err as Error, `upload ${artifactUploadType} artifact`);
    }
  };

  const handleAddCandidate = async (candidateData: CandidateFormData) => {
    if (!state.project) return;
    
    try {
      const newCandidate = await artifactApi.addCandidate(state.project.id, candidateData);

      if (newCandidate) {
        actions.addCandidate({
          id: newCandidate.id,
          name: newCandidate.name,
          role: newCandidate.role,
          company: newCandidate.company,
          email: newCandidate.email,
          phone: newCandidate.phone,
          photoUrl: newCandidate.photo_url || '/images/default-pfp.webp',
          artifacts: 0
        });
      }

      closeAddCandidate();
      showSuccess('Candidate added successfully');
    } catch (err) {
      handleError(err as Error, 'add candidate');
    }
  };

  const handleAddInterviewer = async (interviewerData: InterviewerFormData) => {
    if (!state.project) return;
    
    try {
      const newInterviewer = await artifactApi.addInterviewer(state.project.id, interviewerData);

      if (newInterviewer) {
        actions.addInterviewer({
          id: newInterviewer.id,
          name: newInterviewer.name,
          position: newInterviewer.position,
          company: newInterviewer.company,
          email: newInterviewer.email,
          phone: newInterviewer.phone,
          photoUrl: newInterviewer.photo_url || '/images/default-pfp.webp',
          artifacts: 0
        });
      }

      closeInterviewerEdit();
      showSuccess('Interviewer added successfully');
    } catch (err) {
      handleError(err as Error, 'add interviewer');
    }
  };

  const saveProjectHeaderEdit = async (formData: ProjectHeaderData) => {
    if (!state.project) return;
    
    try {
      const updatedProject = await projectsApi.updateProject(state.project.id, {
        title: formData.title,
        client: formData.client,
        description: formData.description
      });

      if (updatedProject) {
        actions.setProject({
          ...state.project,
          title: updatedProject.title,
          client: updatedProject.client,
          description: updatedProject.description
        });
        showSuccess('Project updated successfully');
      } else {
        throw new Error('No data returned from update');
      }
    } catch (err) {
      handleError(err as Error, 'update project');
    }

    setIsProjectHeaderEditOpen(false);
  };

  // Handle project deletion
  const handleDeleteProject = async () => {
    if (!state.project) return;
    
    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      try {
        const success = await projectsApi.deleteProject(state.project.id);
        if (success) {
          router.push('/');
        } else {
          throw new Error('Delete operation failed');
        }
      } catch (err) {
        handleError(err as Error, 'delete project');
      }
    }
  };

  // Loading state
  if (state.loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex flex-col items-center justify-center transition-colors">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-purple border-r-transparent">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-2 text-gray-700 dark:text-dark-text-secondary">Loading project...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (hasError || !state.project) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">Error Loading Project</h2>
            <p className="text-gray-700 dark:text-dark-text-secondary mb-4">{error || 'Project not found'}</p>
            <Link href="/" className="bg-brand-purple hover:bg-brand-purple-dark text-white px-4 py-2 rounded-md transition-colors">
              Return to Projects
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="flex items-center text-gray-700 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text transition-colors">
            <ArrowLeftIcon className="w-4 h-4 mr-2 text-gray-700 dark:text-dark-text-secondary" />
            Back to projects
          </Link>

          <button
            onClick={handleDeleteProject}
            className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white px-3 py-2 rounded-md shadow-sm text-sm transition-colors"
          >
            Delete Project
          </button>
        </div>

        <ProjectHeader 
          project={state.project} 
          onEdit={openProjectHeaderEdit} 
        />

        <ArtifactsSection
          companyArtifacts={companyArtifacts}
          roleArtifacts={roleArtifacts}
          onDelete={handleDeleteArtifact}
          deletingDocument={state.deletingDocument}
          onAdd={openArtifactUpload}
        />

        <PeopleSection
          candidates={state.project.candidates}
          interviewers={state.project.interviewers}
          onAddCandidate={openAddCandidate}
          onEditCandidate={openCandidateEdit}
          onAddInterviewer={() => openInterviewerEdit(null)}
          onEditInterviewer={openInterviewerEdit}
        />

        <OutputsSection
          outputs={state.project.outputs}
          selectedOutputs={state.selectedOutputs}
          onToggleSelection={toggleOutputSelection}
          onView={setViewingDocument}
          onDelete={handleDeleteDocument}
          deletingDocument={state.deletingDocument}
          onGoldenExamples={openGoldenExamples}
          onGenerateDocument={openGenerateDocument}
        />
      </main>

      {/* Candidate Add Popup */}
      {isAddCandidateOpen && (
        <CandidateAddPopup 
          onClose={closeAddCandidate} 
          onAdd={handleAddCandidate}
        />
      )}

      {/* Candidate Edit Popup */}
      {isEditCandidateOpen && (
        <CandidateEditPopup 
          candidate={currentCandidate}
          onClose={closeCandidateEdit} 
          onSave={async (updatedCandidate: CandidateFormData) => {
            if (!currentCandidate || !state.project) return;
            
            try {
              const updated = await artifactApi.updateCandidate(state.project.id, currentCandidate.id, updatedCandidate);

              if (updated) {
                actions.updateCandidate({
                  ...currentCandidate,
                  ...updated,
                  ...updatedCandidate,
                  photoUrl: updated.photoUrl || currentCandidate.photoUrl
                });
                closeCandidateEdit();
                showSuccess('Candidate updated successfully');
              } else {
                throw new Error('No data returned from update operation');
              }
            } catch (err) {
              handleError(err as Error, 'update candidate');
            }
          }}
        />
      )}

      {/* Interviewer Add/Edit Popup */}
      {isEditInterviewerOpen && (
        currentInterviewer ? (
          <InterviewerEditPopup 
            interviewer={currentInterviewer}
            onClose={closeInterviewerEdit} 
            onSave={handleSaveInterviewer}
          />
        ) : (
          <InterviewerAddPopup 
            onClose={closeInterviewerEdit} 
            onAdd={handleAddInterviewer}
          />
        )
      )}

      {/* Golden Examples Popup */}
      {isGoldenExamplesOpen && (
        <GoldenExamplesPopup onClose={closeGoldenExamples} />
      )}

      {/* Generate Document Popup */}
      {isGenerateDocumentOpen && (
        <GenerateDocumentPopup 
          onClose={closeGenerateDocument} 
          projectId={state.project?.id as any} 
        />
      )}

      {/* Project Header Edit Popup */}
      {isProjectHeaderEditOpen && (
        <ProjectHeaderEditPopup 
          project={state.project}
          onClose={closeProjectHeaderEdit}
          onSave={saveProjectHeaderEdit}
        />
      )}

      {/* Artifact Upload Popup */}
      {artifactUploadType && (
        <UnifiedArtifactUploadPopup 
          isOpen={!!artifactUploadType}
          type={artifactUploadType}
          onClose={closeArtifactUpload}
          onUpload={handleArtifactUpload}
        />
      )}

      {/* HTML Document Viewer */}
      {viewingDocument && (
        <HtmlDocumentViewer 
          url={viewingDocument}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </div>
  );
}

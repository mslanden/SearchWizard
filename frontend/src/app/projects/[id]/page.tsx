"use client";

import { useState, use, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { projectsApi } from '../../../lib/supabase';
import { artifactApi } from '../../../lib/api';
import ProjectPopups from '../../../components/project/ProjectPopups';
import Header from '../../../components/Header';
import ProjectHeader from '../../../components/project/header/ProjectHeader';
import AndroChatBar from '../../../components/project/AndroChatBar';
import ArtifactsSection from '../../../components/project/sections/ArtifactsSection';
import PeopleSection from '../../../components/project/sections/PeopleSection';
import OutputsSection from '../../../components/project/sections/OutputsSection';
import BasePopup from '../../../components/common/BasePopup';

// Import types and utilities
import { Artifact, ArtifactUploadData, Candidate, CandidateFormData, Interviewer, InterviewerFormData, ProjectHeaderData, ProjectOutput } from '../../../types/project';
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
  const [viewingDocument, setViewingDocument] = useState<{ url: string; id: string; name: string } | null>(null);
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
  const [isEditCandidateOpen, setIsEditCandidateOpen] = useState(false);
  const [currentCandidate, setCurrentCandidate] = useState<Candidate | null>(null);
  const [isEditInterviewerOpen, setIsEditInterviewerOpen] = useState(false);
  const [currentInterviewer, setCurrentInterviewer] = useState<Interviewer | null>(null);
  const [isGoldenExamplesOpen, setIsGoldenExamplesOpen] = useState(false);
  const [isGenerateDocumentOpen, setIsGenerateDocumentOpen] = useState(false);
  const [isProjectHeaderEditOpen, setIsProjectHeaderEditOpen] = useState(false);
  const [artifactUploadType, setArtifactUploadType] = useState<'company' | 'role' | null>(null);
  const [isRenameOutputOpen, setIsRenameOutputOpen] = useState(false);
  const [currentOutput, setCurrentOutput] = useState<ProjectOutput | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

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

  const openCandidateEdit = (candidate: Candidate) => {
    setCurrentCandidate(candidate);
    setIsEditCandidateOpen(true);
  };

  const closeCandidateEdit = () => {
    setIsEditCandidateOpen(false);
    setCurrentCandidate(null);
  };

  const openInterviewerEdit = (interviewer: Interviewer | null) => {
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

  // Handler for deleting a candidate
  const handleDeleteCandidate = async (candidateId: string) => {
    if (!confirm('Delete this candidate? This cannot be undone.')) return;
    try {
      await artifactApi.deleteCandidate(candidateId);
      actions.deleteCandidate(candidateId);
      closeCandidateEdit();
      showSuccess('Candidate deleted successfully');
    } catch (err) {
      handleError(err as Error, 'delete candidate');
    }
  };

  // Handler for deleting an interviewer
  const handleDeleteInterviewer = async (interviewerId: string) => {
    if (!confirm('Delete this interviewer? This cannot be undone.')) return;
    try {
      await artifactApi.deleteInterviewer(interviewerId);
      actions.deleteInterviewer(interviewerId);
      closeInterviewerEdit();
      showSuccess('Interviewer deleted successfully');
    } catch (err) {
      handleError(err as Error, 'delete interviewer');
    }
  };

  // Handler for saving candidate edits
  const handleSaveCandidate = async (updatedCandidate: CandidateFormData) => {
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
  };

  // Handler for saving interviewer edits
  const handleSaveInterviewer = async (updatedData: InterviewerFormData) => {
    if (!currentInterviewer || !state.project) return;
    
    try {
      const updatedInterviewer = await artifactApi.updateInterviewer(
        state.project.id,
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

  // Callbacks for artifact count updates from edit popups
  const handleCandidateArtifactAdded = (candidateId: string) => {
    actions.incrementCandidateArtifactCount(candidateId);
  };

  const handleCandidateArtifactDeleted = (candidateId: string) => {
    actions.decrementCandidateArtifactCount(candidateId);
  };

  const handleInterviewerArtifactAdded = (interviewerId: string) => {
    actions.incrementInterviewerArtifactCount(interviewerId);
  };

  const handleInterviewerArtifactDeleted = (interviewerId: string) => {
    actions.decrementInterviewerArtifactCount(interviewerId);
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

  // Handle document generated (async job completed)
  const handleOutputGenerated = (output: ProjectOutput) => {
    actions.addOutput(output);
    showSuccess(`Document "${output.name}" generated successfully`);
  };

  // Handle rename output
  const handleRenameOutput = (output: ProjectOutput) => {
    setCurrentOutput(output);
    setIsRenameOutputOpen(true);
  };

  const handleSaveRename = async (outputId: string, newName: string) => {
    await (artifactApi as any).updateProjectOutput(outputId, { name: newName });
    actions.updateOutput({ id: outputId, name: newName });
    showSuccess(`Document renamed to "${newName}"`);
    setIsRenameOutputOpen(false);
  };

  const handleDownload = async (outputId: string, outputName: string): Promise<void> => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://searchwizard-production.up.railway.app';
      const response = await fetch(`${backendUrl}/api/outputs/${outputId}/download-docx`);
      if (!response.ok) {
        const detail = await response.text().catch(() => 'Unknown error');
        throw new Error(`Download failed (${response.status}): ${detail}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${outputName || 'document'}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      handleError(err as Error, 'download document');
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
        textContent: artifactData.textContent,  // Text input
        artifactType: artifactData.artifactType
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
          type: newArtifact.type || newArtifact.document_type || 'Document',
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
          photoUrl: newCandidate.photoUrl || '/images/default-pfp.webp',
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
          photoUrl: newInterviewer.photoUrl || '/images/default-pfp.webp',
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
    try {
      const success = await projectsApi.deleteProject(state.project.id);
      if (success) {
        router.push('/');
      } else {
        throw new Error('Delete operation failed');
      }
    } catch (err) {
      handleError(err as Error, 'delete project');
    } finally {
      setIsDeleteConfirmOpen(false);
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
  if (hasError || (!state.project && !state.loading)) {
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

  // TypeScript narrowing guard — state.project is non-null past this point
  if (!state.project) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <AndroChatBar projectId={state.project.id} />

        <ProjectHeader
          project={state.project}
          onEdit={openProjectHeaderEdit}
          onDelete={() => setIsDeleteConfirmOpen(true)}
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
          onView={(url: string) => {
            const output = state.project?.outputs.find(o => o.url === url);
            setViewingDocument({ url, id: output?.id ?? '', name: output?.name ?? '' });
          }}
          onDownload={handleDownload}
          onDelete={handleDeleteDocument}
          onRename={handleRenameOutput}
          deletingDocument={state.deletingDocument}
          onGoldenExamples={openGoldenExamples}
          onGenerateDocument={openGenerateDocument}
        />
      </main>

      <ProjectPopups
        project={state.project}
        currentCandidate={currentCandidate}
        currentInterviewer={currentInterviewer}
        isAddCandidateOpen={isAddCandidateOpen}
        isEditCandidateOpen={isEditCandidateOpen}
        isEditInterviewerOpen={isEditInterviewerOpen}
        isGoldenExamplesOpen={isGoldenExamplesOpen}
        isGenerateDocumentOpen={isGenerateDocumentOpen}
        isProjectHeaderEditOpen={isProjectHeaderEditOpen}
        artifactUploadType={artifactUploadType}
        viewingDocument={viewingDocument}
        onCloseAddCandidate={closeAddCandidate}
        onAddCandidate={handleAddCandidate}
        onCloseCandidateEdit={closeCandidateEdit}
        onSaveCandidate={handleSaveCandidate}
        onDeleteCandidate={handleDeleteCandidate}
        onCloseInterviewerEdit={closeInterviewerEdit}
        onSaveInterviewer={handleSaveInterviewer}
        onDeleteInterviewer={handleDeleteInterviewer}
        onAddInterviewer={handleAddInterviewer}
        onCloseGoldenExamples={closeGoldenExamples}
        onCloseGenerateDocument={closeGenerateDocument}
        onOutputGenerated={handleOutputGenerated}
        isRenameOutputOpen={isRenameOutputOpen}
        currentOutput={currentOutput}
        onCloseRenameOutput={() => setIsRenameOutputOpen(false)}
        onSaveRename={handleSaveRename}
        onCloseProjectHeaderEdit={closeProjectHeaderEdit}
        onSaveProjectHeader={saveProjectHeaderEdit}
        onCloseArtifactUpload={closeArtifactUpload}
        onArtifactUpload={handleArtifactUpload}
        onSetViewingDocument={setViewingDocument}
        onDownload={handleDownload}
        onCandidateArtifactAdded={handleCandidateArtifactAdded}
        onCandidateArtifactDeleted={handleCandidateArtifactDeleted}
        onInterviewerArtifactAdded={handleInterviewerArtifactAdded}
        onInterviewerArtifactDeleted={handleInterviewerArtifactDeleted}
      />

      <BasePopup
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="Delete Project"
        size="sm"
      >
        <p className="text-gray-700 dark:text-dark-text-secondary mb-6">
          Are you sure you want to delete <strong>{state.project.title}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setIsDeleteConfirmOpen(false)}
            className="px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteProject}
            className="px-4 py-2 text-sm rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            Delete Project
          </button>
        </div>
      </BasePopup>
    </div>
  );
}

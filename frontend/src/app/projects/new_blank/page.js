"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { projectsApi } from '../../../lib/supabase';
import { artifactApi } from '../../../lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeftIcon, PlusIcon, PencilIcon, UserGroupIcon, UserIcon, BuildingOfficeIcon, BriefcaseIcon } from '@heroicons/react/24/outline';
import GoldenExamplesPopup from '../../../components/popups/GoldenExamplesPopup';
import GenerateDocumentPopup from '../../../components/popups/GenerateDocumentPopup';
import ProjectHeaderEditPopup from '../../../components/popups/ProjectHeaderEditPopup';
import EnhancedArtifactUploadPopup from '../../../components/popups/EnhancedArtifactUploadPopup';
import CandidateAddPopup from '../../../components/popups/CandidateAddPopup';
import InterviewerAddPopup from '../../../components/popups/InterviewerAddPopup';
import Header from '../../../components/Header';
import { useAuth } from '../../../contexts/AuthContext';
import CandidateEditPopup from '../../../components/popups/CandidateEditPopup';
import InterviewerEditPopup from '../../../components/popups/InterviewerEditPopup';

// Blank project template
const blankProject = {
  id: 'new_blank',
  title: 'New Project',
  client: 'Add Client Name',
  date: 'Today',
  description: 'Add project description here',
  companyArtifacts: [],
  roleArtifacts: [],
  candidates: [],
  interviewers: [],
  outputs: []
};

export default function BlankProjectPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [project, setProject] = useState(blankProject);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedOutputs, setSelectedOutputs] = useState([]);
  const [isEditCandidateOpen, setIsEditCandidateOpen] = useState(false);
  const [currentCandidate, setCurrentCandidate] = useState(null);
  const [isEditInterviewerOpen, setIsEditInterviewerOpen] = useState(false);
  const [currentInterviewer, setCurrentInterviewer] = useState(null);
  const [isGoldenExamplesOpen, setIsGoldenExamplesOpen] = useState(false);
  const [isGenerateDocumentOpen, setIsGenerateDocumentOpen] = useState(false);
  const [isProjectHeaderEditOpen, setIsProjectHeaderEditOpen] = useState(false);
  const [isCompanyArtifactUploadOpen, setIsCompanyArtifactUploadOpen] = useState(false);
  const [isRoleArtifactUploadOpen, setIsRoleArtifactUploadOpen] = useState(false);
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
  const [isAddInterviewerOpen, setIsAddInterviewerOpen] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !user) {
      router.push('/login');
    }
  }, [isAuthenticated, user, router]);

  const toggleOutputSelection = (id) => {
    setSelectedOutputs(prev => 
      prev.includes(id) 
        ? prev.filter(outputId => outputId !== id) 
        : [...prev, id]
    );
  };

  const openCandidateEdit = (candidate) => {
    setCurrentCandidate(candidate);
    setIsEditCandidateOpen(true);
  };

  const closeCandidateEdit = () => {
    setIsEditCandidateOpen(false);
    setCurrentCandidate(null);
  };

  const openInterviewerEdit = (interviewer) => {
    setCurrentInterviewer(interviewer);
    setIsEditInterviewerOpen(true);
  };

  const closeInterviewerEdit = () => {
    setIsEditInterviewerOpen(false);
    setCurrentInterviewer(null);
  };

  const openGoldenExamples = () => {
    setIsGoldenExamplesOpen(true);
  };

  const closeGoldenExamples = () => {
    setIsGoldenExamplesOpen(false);
  };

  const openGenerateDocument = () => {
    setIsGenerateDocumentOpen(true);
  };

  const closeGenerateDocument = () => {
    setIsGenerateDocumentOpen(false);
  };

  const openProjectHeaderEdit = () => {
    setIsProjectHeaderEditOpen(true);
  };

  const closeProjectHeaderEdit = () => {
    setIsProjectHeaderEditOpen(false);
  };

  const saveProjectHeaderEdit = async (formData) => {
    setProject(prev => ({
      ...prev,
      title: formData.title,
      client: formData.client,
      description: formData.description
    }));
    setIsProjectHeaderEditOpen(false);

    // Save to Supabase if a title and client are provided
    if (formData.title && formData.client) {
      await saveProjectToSupabase({
        ...project,
        title: formData.title,
        client: formData.client,
        description: formData.description
      });
    }
  };

  // Save project to Supabase
  const saveProjectToSupabase = async (projectData) => {
    // Validate required fields
    if (!projectData.title || projectData.title.trim() === '') {
      alert('Project title is required');
      setIsSaving(false);
      return null;
    }

    try {
      setIsSaving(true);

      // Check if user is authenticated
      if (!isAuthenticated || !user) {

        alert('You must be logged in to create a project. Please log in and try again.');
        setIsSaving(false);
        return null;
      }

      // Format data for Supabase
      const formattedProject = {
        title: projectData.title.trim(),
        client: projectData.client ? projectData.client.trim() : '',
        date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
        artifactCount: (
          (projectData.companyArtifacts?.length || 0) + 
          (projectData.roleArtifacts?.length || 0) + 
          (projectData.candidates?.length || 0) + 
          (projectData.interviewers?.length || 0)
        ),
        backgroundColor: 'light-cream' // Default background color
      };


      const newProject = await projectsApi.createProject(formattedProject);

      if (newProject && newProject.id) {

        // Navigate to the newly created project page
        router.push(`/projects/${newProject.id}`);
        return newProject;
      } else {

        alert('Failed to save project. Please check the console for more details and ensure your Supabase connection is properly configured.');
        return null;
      }
    } catch (err) {

      alert('An error occurred while saving the project. Please check your connection to Supabase and ensure you have the proper permissions.');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="flex items-center text-gray-700 hover:text-gray-900">
            <ArrowLeftIcon className="w-4 h-4 mr-2 text-gray-700" />
            Back to projects
          </Link>

          <button
            onClick={() => saveProjectToSupabase(project)}
            disabled={isSaving}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{isSaving ? 'Saving...' : 'Save Project'}</span>
          </button>
        </div>

        {/* Project Header */}
        <div className="bg-[#FFF5E6] rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{project.title}</h1>
              <p className="text-gray-700 mb-1">{project.client}</p>
              <p className="text-gray-700 text-sm">{project.date}</p>
            </div>
            <button 
              className="p-2 rounded-full hover:bg-blue-100"
              onClick={openProjectHeaderEdit}
            >
              <PencilIcon className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Company Artifacts */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <BuildingOfficeIcon className="w-5 h-5 mr-2 text-gray-700" />
                <h2 className="text-lg font-medium text-gray-900">Company Artifacts</h2>
              </div>
              <button 
                onClick={() => setIsCompanyArtifactUploadOpen(true)}
                className="text-sm text-purple-600 flex items-center font-medium"
              >
                <PlusIcon className="w-4 h-4 mr-1 text-gray-700" />
                Add
              </button>
            </div>
            {project.companyArtifacts.length > 0 ? (
              <table className="w-full">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="py-2 px-3 text-left">Artifact</th>
                    <th className="py-2 px-3 text-left">Type</th>
                    <th className="py-2 px-3 text-left">Date Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {project.companyArtifacts.map(artifact => (
                    <tr key={artifact.id} className="hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-900">{artifact.name}</td>
                      <td className="py-2 px-3">
                        <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                          {artifact.type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-700 text-sm">{artifact.dateAdded}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500 text-center">
                <p>No company artifacts added yet</p>
                <p className="text-sm mt-1">Click &quot;Add&quot; to upload company documents</p>
              </div>
            )}
          </div>

          {/* Role Artifacts */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <BriefcaseIcon className="w-5 h-5 mr-2 text-gray-700" />
                <h2 className="text-lg font-medium text-gray-900">Role Artifacts</h2>
              </div>
              <button 
                onClick={() => setIsRoleArtifactUploadOpen(true)}
                className="text-sm text-purple-600 flex items-center font-medium"
              >
                <PlusIcon className="w-4 h-4 mr-1 text-gray-700" />
                Add
              </button>
            </div>
            {project.roleArtifacts.length > 0 ? (
              <table className="w-full">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="py-2 px-3 text-left">Artifact</th>
                    <th className="py-2 px-3 text-left">Type</th>
                    <th className="py-2 px-3 text-left">Date Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {project.roleArtifacts.map(artifact => (
                    <tr key={artifact.id} className="hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-900">{artifact.name}</td>
                      <td className="py-2 px-3">
                        <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                          {artifact.type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-700 text-sm">{artifact.dateAdded}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500 text-center">
                <p>No role artifacts added yet</p>
                <p className="text-sm mt-1">Click &quot;Add&quot; to upload role documents</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Candidates */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <UserGroupIcon className="w-5 h-5 mr-2 text-gray-700" />
                <h2 className="text-lg font-medium text-gray-900">Candidates and Candidate Artifacts</h2>
              </div>
              <button 
                onClick={() => setIsAddCandidateOpen(true)}
                className="text-sm text-brand-purple flex items-center font-medium"
              >
                <PlusIcon className="w-4 h-4 mr-1 text-gray-700" />
                Add
              </button>
            </div>
            {project.candidates.length > 0 ? (
              <table className="w-full">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="py-2 px-3 text-left">Candidate Name</th>
                    <th className="py-2 px-3 text-left">Current Role</th>
                    <th className="py-2 px-3 text-left">Current Company</th>
                    <th className="py-2 px-3 text-left">Artifacts</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {project.candidates.map(candidate => (
                    <tr key={candidate.id} className="hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-900">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0 mr-3">
                            <Image 
                              src={candidate.photoUrl || '/images/default-pfp.webp'} 
                              alt={candidate.name} 
                              width={32} 
                              height={32} 
                              className="object-cover" 
                            />
                          </div>
                          <span>{candidate.name}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-gray-800">{candidate.role}</td>
                      <td className="py-2 px-3 text-gray-800">{candidate.company}</td>
                      <td className="py-2 px-3">
                        <span className="text-sm text-gray-700">{candidate.artifacts}</span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button 
                          className="p-1 rounded-full hover:bg-gray-100"
                          onClick={() => openCandidateEdit(candidate)}
                        >
                          <PencilIcon className="w-4 h-4 text-gray-700" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500 text-center">
                <p>No candidates added yet</p>
                <p className="text-sm mt-1">Click &quot;Add&quot; to add potential candidates for this role</p>
              </div>
            )}
          </div>

          {/* Interviewers */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <UserIcon className="w-5 h-5 mr-2 text-gray-700" />
                <h2 className="text-lg font-medium text-gray-900">Interviewers and Process Artifacts</h2>
              </div>
              <button 
                onClick={() => setIsAddInterviewerOpen(true)}
                className="text-sm text-brand-purple flex items-center font-medium"
              >
                <PlusIcon className="w-4 h-4 mr-1 text-gray-700" />
                Add
              </button>
            </div>
            {project.interviewers.length > 0 ? (
              <table className="w-full">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="py-2 px-3 text-left">Interviewer</th>
                    <th className="py-2 px-3 text-left">Position</th>
                    <th className="py-2 px-3 text-left">Company</th>
                    <th className="py-2 px-3 text-left">Artifacts</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {project.interviewers.map(interviewer => (
                    <tr key={interviewer.id} className="hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-900">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0 mr-3">
                            <Image 
                              src={interviewer.photoUrl || '/images/default-pfp.webp'} 
                              alt={interviewer.name} 
                              width={32} 
                              height={32} 
                              className="object-cover" 
                            />
                          </div>
                          <span>{interviewer.name}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-gray-800">{interviewer.position}</td>
                      <td className="py-2 px-3 text-gray-800">{interviewer.company}</td>
                      <td className="py-2 px-3">
                        <span className="text-sm text-gray-700">{interviewer.artifacts}</span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button 
                          className="p-1 rounded-full hover:bg-gray-100"
                          onClick={() => openInterviewerEdit(interviewer)}
                        >
                          <PencilIcon className="w-4 h-4 text-gray-700" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500 text-center">
                <p>No interviewers added yet</p>
                <p className="text-sm mt-1">Click &quot;Add&quot; to add interviewers for this role</p>
              </div>
            )}
          </div>
        </div>

        {/* Project Output */}
        <div className="bg-[#FFF5E6] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Project Output</h2>
            <div className="space-x-3">
              <button 
                className="px-4 py-2 bg-[#F8B960] text-white rounded-md hover:bg-opacity-90"
                onClick={openGoldenExamples}
              >
                Golden Examples
              </button>
              <button 
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md"
                onClick={openGenerateDocument}
              >
                Generate New
              </button>
            </div>
          </div>

          {project.outputs.length > 0 ? (
            <div className="bg-white rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-12 px-3 py-3 text-left">
                      <input type="checkbox" className="rounded border-gray-300" />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase">Output Document</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date Created</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {project.outputs.map(output => (
                    <tr key={output.id} className="hover:bg-gray-50">
                      <td className="px-3 py-4">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300"
                          checked={selectedOutputs.includes(output.id)}
                          onChange={() => toggleOutputSelection(output.id)}
                        />
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-900">{output.name}</td>
                      <td className="px-3 py-4">
                        <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                          {output.type}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-700">{output.dateCreated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-6">
              <div className="flex flex-col items-center justify-center py-8 text-gray-500 text-center">
                <p>No documents generated yet</p>
                <p className="text-sm mt-1">Click &quot;Generate New&quot; to create output documents</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Candidate Edit Popup */}
      {isEditCandidateOpen && currentCandidate && (
        <CandidateEditPopup 
          candidate={currentCandidate} 
          onClose={closeCandidateEdit} 
        />
      )}

      {/* Interviewer Edit Popup */}
      {isEditInterviewerOpen && currentInterviewer && (
        <InterviewerEditPopup 
          interviewer={currentInterviewer} 
          onClose={closeInterviewerEdit} 
        />
      )}

      {/* Golden Examples Popup */}
      {isGoldenExamplesOpen && (
        <GoldenExamplesPopup onClose={closeGoldenExamples} />
      )}

      {/* Generate Document Popup */}
      {isGenerateDocumentOpen && (
        <GenerateDocumentPopup onClose={closeGenerateDocument} />
      )}

      {/* Project Header Edit Popup */}
      {isProjectHeaderEditOpen && (
        <ProjectHeaderEditPopup 
          project={project}
          onClose={closeProjectHeaderEdit}
          onSave={saveProjectHeaderEdit}
        />
      )}

      {/* Company Artifact Upload Popup */}
      {isCompanyArtifactUploadOpen && (
        <EnhancedArtifactUploadPopup 
          type="company"
          onClose={() => setIsCompanyArtifactUploadOpen(false)}
          onUpload={async (artifactData) => {
            try {
              // If project is not saved yet, save it first
              let projectId = project.id;
              if (projectId === 'new_blank') {

                const savedProject = await saveProjectToSupabase(project);
                if (savedProject && savedProject.id) {

                  projectId = savedProject.id;
                  setProject(prev => ({ ...prev, id: projectId }));
                } else {

                  alert('Unable to save the project. Please try again.');
                  return;
                }
              }

              // Upload the artifact
              const newArtifact = await artifactApi.addCompanyArtifact(
                projectId,
                { 
                  name: artifactData.name, 
                  description: artifactData.description,
                  artifactType: artifactData.artifactType || 'other',
                  inputType: artifactData.inputType || 'file',
                  sourceUrl: artifactData.url,
                  textContent: artifactData.textContent
                },
                artifactData.file
              );

              // Update the UI
              setProject(prev => ({
                ...prev,
                companyArtifacts: [
                  ...prev.companyArtifacts,
                  {
                    id: newArtifact.id,
                    name: newArtifact.name,
                    type: newArtifact.file_type,
                    dateAdded: new Date(newArtifact.date_added).toLocaleDateString()
                  }
                ]
              }));

              setIsCompanyArtifactUploadOpen(false);
            } catch (err) {

              alert('Failed to upload artifact. Please try again.');
            }
          }}
        />
      )}

      {/* Role Artifact Upload Popup */}
      {isRoleArtifactUploadOpen && (
        <EnhancedArtifactUploadPopup 
          type="role"
          onClose={() => setIsRoleArtifactUploadOpen(false)}
          onUpload={async (artifactData) => {
            try {
              // If project is not saved yet, save it first
              let projectId = project.id;
              if (projectId === 'new_blank') {

                const savedProject = await saveProjectToSupabase(project);
                if (savedProject && savedProject.id) {

                  projectId = savedProject.id;
                  setProject(prev => ({ ...prev, id: projectId }));
                } else {

                  alert('Unable to save the project. Please try again.');
                  return;
                }
              }

              // Upload the artifact
              const newArtifact = await artifactApi.addRoleArtifact(
                projectId,
                { 
                  name: artifactData.name, 
                  description: artifactData.description,
                  artifactType: artifactData.artifactType || 'other',
                  inputType: artifactData.inputType || 'file',
                  sourceUrl: artifactData.url,
                  textContent: artifactData.textContent
                },
                artifactData.file
              );

              // Update the UI
              setProject(prev => ({
                ...prev,
                roleArtifacts: [
                  ...prev.roleArtifacts,
                  {
                    id: newArtifact.id,
                    name: newArtifact.name,
                    type: newArtifact.file_type,
                    dateAdded: new Date(newArtifact.date_added).toLocaleDateString()
                  }
                ]
              }));

              setIsRoleArtifactUploadOpen(false);
            } catch (err) {

              alert('Failed to upload artifact. Please try again.');
            }
          }}
        />
      )}

      {/* Add Candidate Popup */}
      {isAddCandidateOpen && (
        <CandidateAddPopup 
          onClose={() => setIsAddCandidateOpen(false)}
          onAdd={async (candidateData) => {
            try {
              // If project is not saved yet, save it first
              let projectId = project.id;
              if (projectId === 'new_blank') {

                const savedProject = await saveProjectToSupabase(project);
                if (savedProject && savedProject.id) {

                  projectId = savedProject.id;
                  setProject(prev => ({ ...prev, id: projectId }));
                } else {

                  alert('Unable to save the project. Please try again.');
                  return;
                }
              }

              // Add the candidate
              const newCandidate = await artifactApi.addCandidate(projectId, candidateData);

              // Update the UI
              setProject(prev => ({
                ...prev,
                candidates: [
                  ...prev.candidates,
                  {
                    id: newCandidate.id,
                    name: newCandidate.name,
                    role: newCandidate.role,
                    company: newCandidate.company,
                    photoUrl: newCandidate.photo_url,
                    artifacts: newCandidate.artifact_count
                  }
                ]
              }));

              setIsAddCandidateOpen(false);
            } catch (err) {

              alert('Failed to add candidate. Please try again.');
            }
          }}
        />
      )}

      {/* Add Interviewer Popup */}
      {isAddInterviewerOpen && (
        <InterviewerAddPopup 
          onClose={() => setIsAddInterviewerOpen(false)}
          onAdd={async (interviewerData) => {
            try {
              // If project is not saved yet, save it first
              let projectId = project.id;
              if (projectId === 'new_blank') {

                const savedProject = await saveProjectToSupabase(project);
                if (savedProject && savedProject.id) {

                  projectId = savedProject.id;
                  setProject(prev => ({ ...prev, id: projectId }));
                } else {

                  alert('Unable to save the project. Please try again.');
                  return;
                }
              }

              // Add the interviewer
              const newInterviewer = await artifactApi.addInterviewer(projectId, interviewerData);

              // Update the UI
              setProject(prev => ({
                ...prev,
                interviewers: [
                  ...prev.interviewers,
                  {
                    id: newInterviewer.id,
                    name: newInterviewer.name,
                    position: newInterviewer.position,
                    company: newInterviewer.company,
                    photoUrl: newInterviewer.photo_url,
                    artifacts: newInterviewer.artifact_count
                  }
                ]
              }));

              setIsAddInterviewerOpen(false);
            } catch (err) {

              alert('Failed to add interviewer. Please try again.');
            }
          }}
        />
      )}
    </div>
  );
}

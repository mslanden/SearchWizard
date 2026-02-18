import { Project, LegacyProject, Artifact, Candidate, Interviewer, ProjectOutput } from '../types/project';
import { projectsApi, supabase } from '../lib/supabase';
import { artifactApi } from '../lib/api';

// Transform database fields to UI format consistently
export const transformDatabaseFields = (data: any): any => {
  if (!data) return data;
  
  const transformed = { ...data };
  
  // Handle date fields consistently
  if (data.created_at) {
    transformed.dateAdded = new Date(data.created_at).toLocaleDateString();
    transformed.dateCreated = new Date(data.created_at).toLocaleDateString();
  }
  if (data.date_added) {
    transformed.dateAdded = new Date(data.date_added).toLocaleDateString();
  }
  if (data.date_created) {
    transformed.dateCreated = new Date(data.date_created).toLocaleDateString();
  }
  
  // Handle file fields
  if (data.file_url) transformed.fileUrl = data.file_url;
  if (data.file_type) transformed.fileType = data.file_type;
  if (data.photo_url) transformed.photoUrl = data.photo_url;
  if (data.output_type) transformed.type = data.output_type;
  if (data.artifact_type) transformed.category = data.artifact_type;
  
  return transformed;
};

// Create unified artifacts array from legacy company/role separation
export const unifyArtifacts = (companyArtifacts: Artifact[], roleArtifacts: Artifact[]): Artifact[] => {
  const unified = [
    ...companyArtifacts.map(a => ({ ...a, category: 'company' as const })),
    ...roleArtifacts.map(a => ({ ...a, category: 'role' as const }))
  ];
  
  return unified;
};

// Convert legacy project structure to unified structure
export const convertLegacyProject = (legacyProject: LegacyProject): Project => {
  return {
    ...legacyProject,
    artifacts: unifyArtifacts(legacyProject.companyArtifacts, legacyProject.roleArtifacts)
  };
};

// Wait for authentication to be ready with retry logic
const waitForAuth = async (maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (!error && session?.user) {
      return session;
    }
    
    if (i < maxRetries - 1) {
      console.log(`🔄 Auth retry ${i + 1}/${maxRetries}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Authentication not available after retries');
};

// Fetch all project data in parallel for better performance
export const fetchProjectData = async (projectId: string) => {
  const fetchId = Math.random().toString(36).substring(7);
  console.log(`🔄 FETCH-${fetchId} Starting for project: ${projectId}`);
  
  try {
    const session = await waitForAuth();
    console.log(`✅ FETCH-${fetchId} Auth ready for user: ${session.user.id}`);

    // Verify session is still valid and refresh if needed
    const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !currentSession) {
      console.error(`❌ FETCH-${fetchId} Session validation failed:`, sessionError);
      throw new Error('Authentication required - please sign in again');
    }

    const [
      projectData,
      companyArtifacts,
      roleArtifacts,
      candidatesResult,
      interviewersResult,
      outputsResult
    ] = await Promise.all([
      projectsApi.getProjectById(projectId),
      artifactApi.getArtifacts(projectId, 'company' as any),
      artifactApi.getArtifacts(projectId, 'role' as any),
      supabase.from('candidates').select('*').eq('project_id', projectId),
      supabase.from('interviewers').select('*').eq('project_id', projectId),
      supabase.from('project_outputs').select('*').eq('project_id', projectId)
    ]);

    console.log(`✅ FETCH-${fetchId} Data received - project: ${!!projectData}, artifacts: ${(companyArtifacts?.length || 0) + (roleArtifacts?.length || 0)}, candidates: ${candidatesResult.data?.length || 0}, interviewers: ${interviewersResult.data?.length || 0}, outputs: ${outputsResult.data?.length || 0}`);

    if (!projectData) {
      throw new Error('Project not found');
    }

    // Check for critical RLS errors that indicate authentication issues
    if (candidatesResult.error?.message?.includes('access control')) {
      console.error('RLS access control error for candidates:', candidatesResult.error);
      throw new Error('Access denied - please refresh your authentication');
    }
    if (interviewersResult.error?.message?.includes('access control')) {
      console.error('RLS access control error for interviewers:', interviewersResult.error);
      throw new Error('Access denied - please refresh your authentication');
    }
    if (outputsResult.error?.message?.includes('access control')) {
      console.error('RLS access control error for outputs:', outputsResult.error);
      throw new Error('Access denied - please refresh your authentication');
    }

    // Transform and format data consistently
    const candidates: Candidate[] = candidatesResult.data?.map(candidate => ({
      id: candidate.id,
      name: candidate.name,
      role: candidate.role,
      company: candidate.company,
      email: candidate.email,
      phone: candidate.phone,
      photoUrl: candidate.photo_url || '/images/default-pfp.webp',
      artifacts: candidate.artifacts_count || 0
    })) || [];

    const interviewers: Interviewer[] = interviewersResult.data?.map(interviewer => ({
      id: interviewer.id,
      name: interviewer.name,
      position: interviewer.position,
      company: interviewer.company,
      email: interviewer.email,
      phone: interviewer.phone,
      photoUrl: interviewer.photo_url || '/images/default-pfp.webp',
      artifacts: interviewer.artifacts_count || 0
    })) || [];

    const outputs: ProjectOutput[] = outputsResult.data?.map(output => ({
      id: output.id,
      name: output.name,
      type: output.output_type || 'Document',
      dateCreated: new Date(output.created_at || output.date_created).toLocaleDateString(),
      url: output.file_url,
      description: output.description
    })) || [];

    // Format company artifacts
    const formattedCompanyArtifacts: Artifact[] = companyArtifacts?.map(artifact => ({
      id: artifact.id,
      name: artifact.name,
      type: artifact.fileType || 'Document',
      dateAdded: new Date(artifact.dateAdded).toLocaleDateString(),
      url: artifact.fileUrl,
      description: artifact.description,
      inputType: artifact.inputType || 'file',
      category: 'company'
    })) || [];

    // Format role artifacts
    const formattedRoleArtifacts: Artifact[] = roleArtifacts?.map(artifact => ({
      id: artifact.id,
      name: artifact.name,
      type: artifact.fileType || 'Document',
      dateAdded: new Date(artifact.dateAdded).toLocaleDateString(),
      url: artifact.fileUrl,
      description: artifact.description,
      inputType: artifact.inputType || 'file',
      category: 'role'
    })) || [];

    // Create unified project structure
    const project: Project = {
      id: projectData.id,
      title: projectData.title,
      client: projectData.client,
      date: projectData.date,
      description: projectData.description || 'No description available',
      artifactCount: formattedCompanyArtifacts.length + formattedRoleArtifacts.length,
      backgroundColor: projectData.background_color || 'light-cream',
      artifacts: [...formattedCompanyArtifacts, ...formattedRoleArtifacts],
      candidates,
      interviewers,
      outputs
    };

    console.log(`✅ FETCH-${fetchId} Complete!`);
    return project;
  } catch (error) {
    console.error(`❌ FETCH-${fetchId} Error:`, error.message);
    throw error;
  }
};

// Create empty project structure for fallback
export const createEmptyProject = (id: string): Project => {
  return {
    id,
    title: '',
    client: '',
    date: '',
    description: '',
    artifactCount: 0,
    backgroundColor: 'light-cream',
    artifacts: [],
    candidates: [],
    interviewers: [],
    outputs: []
  };
};

// Filter artifacts by category for backward compatibility
export const getArtifactsByCategory = (artifacts: Artifact[], category: 'company' | 'role'): Artifact[] => {
  return artifacts.filter(artifact => artifact.category === category);
};
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { artifactApi } from '../lib/api';

export default function useDocumentGeneration(projectId) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [structures, setStructures] = useState({});
  const [userComment, setUserComment] = useState('');
  // Legacy compatibility
  const [documentType, setDocumentType] = useState('');
  const [documentTypes, setDocumentTypes] = useState([]);
  const [localProjectId, setLocalProjectId] = useState(projectId);
  const { user } = useAuth();

  // Fetch templates from V2 API on component mount
  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Effect to handle projectId changes or set a default if not provided
  useEffect(() => {
    if (!localProjectId && user) {
      fetchMostRecentProject();
    } else if (projectId) {
      setLocalProjectId(projectId);
    }
  }, [projectId, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchMostRecentProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        return;
      }

      if (data && data.length > 0) {
        setLocalProjectId(data[0].id);
      } else {
        setError('No projects found. Please create a project first.');
      }
    } catch (err) {
      // Error fetching recent project - continue silently
    }
  };

  // Function to fetch templates from V2 API
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        throw new Error('User must be logged in to fetch templates');
      }

      let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://searchwizard-production.up.railway.app';
      
      // Ensure the URL has a protocol
      if (backendUrl && !backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
        backendUrl = `https://${backendUrl}`;
      }
      
      const response = await fetch(`${backendUrl}/api/templates?user_id=${user.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      
      const data = await response.json();
      const templateList = data.templates || [];

      if (templateList.length > 0) {
        setTemplates(templateList);
        setSelectedTemplate(templateList[0]);
        
        // Legacy compatibility: set document types from templates
        const legacyTypes = templateList.map(t => t.name);
        setDocumentTypes(legacyTypes);
        setDocumentType(templateList[0].name);
        
        setLoading(false);
        return;
      } else {
        // No templates available, provide empty state
        setTemplates([]);
        setSelectedTemplate(null);
        setDocumentTypes([]);
        setDocumentType('');
        setLoading(false);
      }
    } catch (error) {
      setError('Failed to load templates: ' + error.message);
      setLoading(false);
    }
  };

  // Function to get default sections for a document type
  const getDefaultSections = (documentType) => {
    switch (documentType) {
      case 'Role Specifications':
        return [
          {
            name: "Role Overview",
            description: "Overview of the role",
            content_guidelines: "Provide a high-level summary of the role, its purpose, and its place in the organization."
          },
          {
            name: "Responsibilities",
            description: "Key responsibilities of the role",
            content_guidelines: "List the main duties and responsibilities of the position."
          },
          {
            name: "Requirements",
            description: "Required qualifications and skills",
            content_guidelines: "Detail the required education, experience, skills, and qualifications."
          },
          {
            name: "Benefits",
            description: "Benefits and perks",
            content_guidelines: "Outline the compensation package, benefits, and other perks."
          }
        ];

      case 'Candidate Reports':
        return [
          {
            name: "Candidate Summary",
            description: "Summary of the candidate",
            content_guidelines: "Provide a concise overview of the candidate's background and suitability."
          },
          {
            name: "Experience",
            description: "Professional experience",
            content_guidelines: "Detail the candidate's work history and relevant experience."
          },
          {
            name: "Skills",
            description: "Key skills and competencies",
            content_guidelines: "List the candidate's technical and soft skills."
          },
          {
            name: "Recommendation",
            description: "Hiring recommendation",
            content_guidelines: "Provide a clear recommendation regarding the candidate's suitability."
          }
        ];

      case 'Company Info - Annual Reports etc':
        return [
          {
            name: "Company Profile",
            description: "Overview of the company",
            content_guidelines: "Provide a high-level summary of the company, its mission, and its values."
          },
          {
            name: "Products/Services",
            description: "Products or services offered",
            content_guidelines: "Detail the company's main products or services."
          },
          {
            name: "Market Position",
            description: "Market position and competitors",
            content_guidelines: "Outline the company's position in the market and its main competitors."
          },
          {
            name: "Culture",
            description: "Company culture and values",
            content_guidelines: "Describe the company's culture, values, and working environment."
          }
        ];

      case 'Analyst Reports':
        return [
          {
            name: "Executive Summary",
            description: "Summary of key findings",
            content_guidelines: "Provide a concise overview of the main findings and recommendations."
          },
          {
            name: "Analysis",
            description: "Detailed analysis",
            content_guidelines: "Present a thorough analysis of the subject matter."
          },
          {
            name: "Market Trends",
            description: "Current and future trends",
            content_guidelines: "Discuss relevant market trends and their implications."
          },
          {
            name: "Recommendations",
            description: "Strategic recommendations",
            content_guidelines: "Offer actionable recommendations based on the analysis."
          }
        ];

      default:
        return [
          {
            name: "Introduction",
            description: "Introduction section",
            content_guidelines: "Introduce the document"
          },
          {
            name: "Main Content",
            description: "Main content section",
            content_guidelines: "Provide the main content"
          },
          {
            name: "Conclusion",
            description: "Conclusion section",
            content_guidelines: "Conclude the document"
          }
        ];
    }
  };

  // Function to generate HTML document using V2 template API
  const generateDocument = async (structure) => {
    try {
      if (!selectedTemplate) {
        throw new Error('No template selected');
      }

      const requestData = {
        template_id: selectedTemplate.id,
        project_id: localProjectId.toString(),
        user_id: user.id,
        user_requirements: structure.userComment || userComment || ''
      };

      let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://searchwizard-production.up.railway.app';
      
      // Ensure the URL has a protocol
      if (backendUrl && !backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
        backendUrl = `https://${backendUrl}`;
      }
      
      const response = await fetch(`${backendUrl}/api/generate-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.html_content;
    } catch (error) {
      throw new Error(`Failed to generate document: ${error.message}`);
    }
  };

  // Function to save HTML to Supabase
  const saveHtmlToSupabase = async (htmlContent) => {
    try {
      const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
      const file = new File([htmlBlob], `${documentType.replace(/\s+/g, '_')}_${Date.now()}.html`, {
        type: 'text/html',
      });

      if (!localProjectId) {
        throw new Error('Project ID is required to save document');
      }

      const outputData = {
        name: `${documentType} Document`,
        description: `Auto-generated ${documentType} document with interactive features`,
        output_type: 'html_document',
      };

      const result = await artifactApi.addProjectOutput(localProjectId, outputData, file);
      return result;
    } catch (error) {
      if (!localProjectId) {
        throw new Error('Project ID is missing. Cannot save document.');
      } else if (!documentType) {
        throw new Error('Document type is missing. Cannot save document.');
      } else {
        throw new Error(`Failed to save document to database: ${error.message || 'Unknown error'}`);
      }
    }
  };

  // Function to fetch all artifacts (company and role) for a project
  const fetchProjectArtifacts = async (projectId) => {
    try {
      const companyArtifacts = await artifactApi.getArtifacts(projectId, 'company');
      const roleArtifacts = await artifactApi.getArtifacts(projectId, 'role');

      const fetchFileContent = async (artifact) => {
        if (artifact.filePath && artifact.fileUrl) {
          try {
            const bucket = artifact.artifactType === 'company' ? 'company-artifacts' : 'role-artifacts';
            const { data, error } = await supabase.storage
              .from(bucket)
              .download(artifact.filePath);

            if (error) {
              return artifact;
            }

            if (data) {
              const content = await data.text();
              return {
                ...artifact,
                content: content
              };
            }
          } catch (error) {
            // Error fetching file content - continue with artifact without content
          }
        }
        return artifact;
      };

      const processedCompanyArtifacts = await Promise.all(
        (companyArtifacts || []).map(async (artifact) => {
          const processed = await fetchFileContent({
            ...artifact,
            artifactType: 'company'
          });
          return processed;
        })
      );

      const processedRoleArtifacts = await Promise.all(
        (roleArtifacts || []).map(async (artifact) => {
          const processed = await fetchFileContent({
            ...artifact,
            artifactType: 'role'
          });
          return processed;
        })
      );

      const allArtifacts = [
        ...processedCompanyArtifacts,
        ...processedRoleArtifacts
      ];

      return allArtifacts;
    } catch (error) {
      throw new Error(`Failed to fetch project artifacts: ${error.message}`);
    }
  };

  // Handle document generation
  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!localProjectId) {
        const { data, error } = await supabase
          .from('projects')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          throw new Error('Could not retrieve a project. Please create a project first.');
        }

        if (!data || data.length === 0) {
          throw new Error('No projects found. Please create a project first.');
        }

        setLocalProjectId(data[0].id);
      }

      const projectArtifacts = await fetchProjectArtifacts(localProjectId);

      const structure = {
        documentType: documentType,
        artifacts: projectArtifacts,
        userComment: userComment
      };

      const htmlContent = await generateDocument(structure);
      await saveHtmlToSupabase(htmlContent);

      setLoading(false);
      return true; // Success
    } catch (error) {
      setError(error.message || 'An error occurred during document generation');
      setLoading(false);
      return false; // Failure
    }
  };

  return {
    // V2 Template API
    selectedTemplate,
    setSelectedTemplate,
    templates,
    fetchTemplates,
    // Legacy compatibility
    documentType,
    setDocumentType,
    documentTypes,
    // Shared state
    loading,
    error,
    userComment,
    setUserComment,
    handleGenerate
  };
}
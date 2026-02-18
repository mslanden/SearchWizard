"use client";

import { useState, useEffect, useRef } from 'react';
import { XMarkIcon, DocumentIcon, ArrowUpTrayIcon, PlusIcon, TrashIcon, DocumentTextIcon, CogIcon, EyeIcon } from '@heroicons/react/24/outline';
import { artifactApi } from '../../lib/api';
import StructureViewer from '../StructureViewer';
import { useAuth } from '../../contexts/AuthContext';

export default function GoldenExamplesPopup({ onClose }) {
  const popupRef = useRef(null);
  const { user } = useAuth();

  // Prevent parent click from closing when clicking inside the popup
  const handleContainerClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  const [goldenExamples, setGoldenExamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddExampleOpen, setIsAddExampleOpen] = useState(false);
  const [uploadData, setUploadData] = useState({
    name: '',
    description: '',
    exampleType: 'role_specification',
    files: []
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [exampleTypes, setExampleTypes] = useState([]);
  const [analysisStatus, setAnalysisStatus] = useState('');

  // State for structure viewer
  const [isStructureViewerOpen, setIsStructureViewerOpen] = useState(false);
  const [currentStructure, setCurrentStructure] = useState(null);

  // Handle document structure generation for an existing example
  async function handleGenerateStructure(documentId) {
    try {
      setLoading(true);
      setError('');
      setAnalysisStatus('Starting document analysis...');

      // Find the document to analyze
      const documentToAnalyze = goldenExamples.find(example => example.id === documentId);
      if (!documentToAnalyze) {
        throw new Error('Document not found');
      }

      setAnalysisStatus(`Analyzing document: ${documentToAnalyze.name}...`);

      // Call API to process the document with structure agent
      const structure = await artifactApi.analyzeDocumentStructure(documentId);

      if (structure) {
        setAnalysisStatus('Saving document structure...');
        // Save the structure as another golden example
        const structureExample = await artifactApi.addStructureExample({
          name: `${documentToAnalyze.name} - Structure`,
          description: `Generated structure template from ${documentToAnalyze.name}`,
          exampleType: documentToAnalyze.type,
          originalDocumentId: documentId,
          structure: structure
        });

        if (structureExample) {
          // Add the structure to the list
          const formattedStructure = {
            id: structureExample.id,
            name: structureExample.name,
            type: structureExample.example_type ? exampleTypes.find(t => t.id === structureExample.example_type)?.name || structureExample.example_type : 'Other',
            dateAdded: new Date(structureExample.date_added).toLocaleDateString(),
            url: structureExample.file_url,
            description: structureExample.description,
            isStructure: true
          };

          setGoldenExamples(prev => [...prev, formattedStructure]);
          setAnalysisStatus('Structure successfully generated and saved!');
        }
      } else {
        throw new Error('Failed to analyze document structure');
      }
    } catch (error) {

      setError(`Failed to generate structure: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
      setAnalysisStatus('');
    }
  }

  // Handle deletion of a golden example
  async function handleDeleteExample(exampleId) {
    try {
      // Confirm deletion with the user
      if (!confirm('Are you sure you want to delete this example? This action cannot be undone.')) {
        return;
      }

      setLoading(true);
      setError('');

      // Find the example to be deleted
      const exampleToDelete = goldenExamples.find(example => example.id === exampleId);
      if (!exampleToDelete) {
        throw new Error('Example not found');
      }

      // Call new API to delete the template
      const userId = user?.id;
      let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://searchwizard-production.up.railway.app';
      
      // Ensure the URL has a protocol
      if (backendUrl && !backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
        backendUrl = `https://${backendUrl}`;
      }
      
      const response = await fetch(`${backendUrl}/api/templates/${exampleId}?user_id=${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete template');
      }

      // Update the list of examples
      setGoldenExamples(prev => prev.filter(example => example.id !== exampleId));

    } catch (error) {

      setError(`Failed to delete example: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  // Handle viewing structure for V2 templates
  async function handleViewStructure(example) {
    try {
      setLoading(true);
      setError('');

      // For V2 templates, structure is stored in template_prompt and visual_data
      const structureData = {
        templatePrompt: example.templatePrompt || 'No template prompt available',
        visualData: example.visualData || {},
        name: example.name,
        type: example.type,
        hasVisualAnalysis: example.hasVisualAnalysis
      };
      
      setCurrentStructure(structureData);
      setIsStructureViewerOpen(true);
      setLoading(false);
    } catch (error) {
      setError(`Failed to load structure data: ${error.message || 'Unknown error'}`);
      setLoading(false);
    }
  }

  // Handle file selection
  function handleFileChange(e) {
    if (e.target.files && e.target.files.length > 0) {
      setUploadData({...uploadData, files: Array.from(e.target.files)});
    }
  }

  // Handle form submission for adding a golden example
  async function handleAddGoldenExample(e) {
    e.preventDefault();

    // Validate form
    if (!uploadData.name.trim()) {
      setUploadError('Please enter a name for the example');
      return;
    }

    if (uploadData.files.length === 0) {
      setUploadError('Please select a file to upload');
      return;
    }

    // Validate file types
    const allowedTypes = [
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/markdown',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/csv', 'application/json', 'text/html', 'image/jpeg', 'image/png'
    ];

    // Check each file for size and type
    for (const file of uploadData.files) {
      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError(`File ${file.name} exceeds 10MB limit. Please choose smaller files.`);
        return;
      }

      // Validate file type
      if (!allowedTypes.includes(file.type) && 
          !(file.name.endsWith('.md') && file.type === 'text/markdown')) {
        setUploadError(`File type of ${file.name} (${file.type}) is not supported. Please upload only document, spreadsheet, or image files.`);
        return;
      }
    }

    try {
      setIsAnalyzing(true);
      setUploadError('');
      setAnalysisStatus(`Analyzing document structure from ${uploadData.files[0].name}...`);

      // Analyze the first file directly without storing it
      if (uploadData.files.length === 0) {
        setUploadError('No files selected');
        return;
      }

      const firstFile = uploadData.files[0];
      let documentStructure = null;

      try {
        // Show clear message that we're only analyzing the structure
        setAnalysisStatus(`Analyzing document structure from ${firstFile.name} (file will not be stored)...`);

        // Add file size check before sending to backend
        if (firstFile.size > 5 * 1024 * 1024) { // 5MB limit
          throw new Error('File too large. Please use a smaller file (under 5MB) to avoid timeout issues.');
        }

        // Create template using V2 API
        setAnalysisStatus(`Creating template with visual analysis from ${firstFile.name}...`);
        
        // Get user ID from auth context
        const userId = user?.id;
        
        if (!userId) {
          throw new Error('User not authenticated');
        }

        console.log('Creating template with user ID:', userId);
        console.log('File details:', {
          name: firstFile.name,
          size: firstFile.size,
          type: firstFile.type
        });

        const formData = new FormData();
        formData.append('file', firstFile);
        formData.append('name', uploadData.name);
        formData.append('user_id', userId);

        let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://searchwizard-production.up.railway.app';
        
        // Ensure the URL has a protocol
        if (backendUrl && !backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
          backendUrl = `https://${backendUrl}`;
        }
        
        console.log('Posting template to:', `${backendUrl}/api/templates`);
        
        const response = await fetch(`${backendUrl}/api/templates`, {
          method: 'POST',
          body: formData
        });

        console.log('Template creation response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Template creation error:', response.status, errorText);
          
          // Try to parse as JSON, fallback to text
          let errorMessage = errorText;
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.detail || errorText;
          } catch (e) {
            // Use text as-is
          }
          
          throw new Error(`Failed to create template: ${response.status} - ${errorMessage}`);
        }

        const result = await response.json();

        if (result.success) {
          // Refresh the templates list
          await fetchGoldenExamples();
          
          setIsAddExampleOpen(false);
          setUploadData({
            name: '',
            description: '',
            exampleType: 'role_specification',
            files: []
          });
          
          const successMessage = result.visual_analysis_available 
            ? 'Template created successfully with visual analysis!'
            : 'Template created successfully!';
          setAnalysisStatus(successMessage);
          
          // Clear success message after 3 seconds
          setTimeout(() => setAnalysisStatus(''), 3000);
        } else {
          throw new Error('Failed to create template');
        }
      } catch (error) {

        setUploadError(`Error processing file: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {

      setUploadError(`Failed to upload example: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  }

  // Function to fetch templates (extracted so it can be reused)
  const fetchGoldenExamples = async () => {
    try {
      setLoading(true);
      setError('');

      // Set predefined example types for V2 template system
      setExampleTypes([
        { id: 'role_specification', name: 'Role Specification' },
        { id: 'resume', name: 'Resume' },
        { id: 'cover_letter', name: 'Cover Letter' },
        { id: 'job_description', name: 'Job Description' },
        { id: 'interview_report', name: 'Interview Report' },
        { id: 'company_profile', name: 'Company Profile' },
        { id: 'other', name: 'Other' }
      ]);

      // Fetch templates using V2 API only
      const userId = user?.id;
      
      if (!userId) {
        console.log('No user ID available, skipping template fetch');
        setGoldenExamples([]);
        setLoading(false);
        return;
      }
      
      let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://searchwizard-production.up.railway.app';
      
      // Ensure the URL has a protocol
      if (backendUrl && !backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
        backendUrl = `https://${backendUrl}`;
      }
      
      console.log('Fetching templates from:', `${backendUrl}/api/templates?user_id=${userId}`);
      
      const response = await fetch(`${backendUrl}/api/templates?user_id=${userId}`);
      
      console.log('Templates fetch response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Templates fetch error:', response.status, errorText);
        
        if (response.status === 404 || response.status === 405) {
          throw new Error('Template API not deployed yet. Please deploy the backend with the new V2 endpoints.');
        } else {
          throw new Error(`Failed to fetch templates: ${response.status} - ${errorText}`);
        }
      }
      
      const data = await response.json();
      const templates = data.templates || [];

      console.log('Fetched templates:', templates);

      if (templates && Array.isArray(templates)) {
        const processedTemplates = templates.map(template => {
          // All templates are V2 now
          // Clean up the original file URL by removing trailing characters
          let cleanUrl = template.original_file_url || template.file_url || '';
          if (cleanUrl.endsWith('?')) {
            cleanUrl = cleanUrl.slice(0, -1);
          }
          // Fix public URL to use signed URL for private bucket
          if (cleanUrl.includes('/public/')) {
            cleanUrl = cleanUrl.replace('/public/', '/sign/');
          }
          
          return {
            id: template.id,
            name: template.name,
            type: template.document_type || 'Document',
            dateAdded: new Date(template.date_added).toLocaleDateString(),
            url: cleanUrl,
            description: template.description || '',
            isStructure: false, // V2 templates don't separate structure
            isTemplate: true, // All templates are V2 templates
            hasVisualAnalysis: template.visual_data && Object.keys(template.visual_data).length > 1,
            usageCount: template.usage_count || 0,
            templatePrompt: template.template_prompt, // Store template prompt for structure viewing
            visualData: template.visual_data
          };
        });

        setGoldenExamples(processedTemplates);
      } else {
        setGoldenExamples([]);
      }
    } catch (error) {

      // Check if it's a database schema issue
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        setError('Golden examples feature is not available. The database table may not be set up yet.');
      } else {
        setError(`Failed to load golden examples: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoldenExamples();
  }, [user]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40" onClick={onClose}>
      <div 
        ref={popupRef}
        className="rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-white"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="text-yellow-500">
                <DocumentIcon className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Golden Examples</h2>
                <p className="text-sm text-gray-500">
                  Manage your document examples and structure templates
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-purple"></div>
              <p className="mt-4 text-gray-600">Loading golden examples...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <div className="text-red-600 mb-4">{error}</div>
              {error.includes('not available') || error.includes('not be set up') ? (
                <div className="mt-2 text-sm text-gray-600">
                  <p>This feature requires database setup. Please contact your administrator.</p>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsAddExampleOpen(true);
                    setError('');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  Add New Example
                </button>
              )}
            </div>
          ) : goldenExamples.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <DocumentIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Golden Examples</h3>
              <p className="text-gray-500 mb-6">
                You haven&apos;t added any golden examples yet. Add one to get started.
              </p>
              <button
                onClick={() => setIsAddExampleOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                Add Golden Example
              </button>
            </div>
          ) : (
            <>
              <div className="flex justify-end mb-4">
                <button 
                  onClick={() => setIsAddExampleOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                  Add Golden Example
                </button>
              </div>
              <div className="rounded-lg overflow-hidden border border-gray-200">
                <table className="w-full rounded-lg overflow-hidden">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                    <tr>
                      <th className="py-3 px-4 text-left font-medium">Name</th>
                      <th className="py-3 px-4 text-left font-medium">Type</th>
                      <th className="py-3 px-4 text-left font-medium">Date Added</th>
                      <th className="py-3 px-4 text-left font-medium">Features</th>
                      <th className="py-3 px-4 text-left font-medium">Usage</th>
                      <th className="py-3 px-4 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {goldenExamples.map(example => (
                      <tr key={example.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-900">
                          <div className="flex items-center">
                            <div className="text-gray-500 mr-2">
                              {example.isStructure ? <CogIcon className="h-5 w-5" /> : <DocumentIcon className="h-5 w-5" />}
                            </div>
                            <div>
                              <div className="font-medium">{example.name}</div>
                              <div className="text-xs text-gray-500">{example.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {example.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-700">{example.dateAdded}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col space-y-1">
                            {example.isTemplate ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                ✨ Template
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                📄 Document
                              </span>
                            )}
                            {example.hasVisualAnalysis && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                👁️ Visual
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          <span className="text-sm font-medium">{example.usageCount || 0}</span>
                          <span className="text-xs text-gray-500 ml-1">uses</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex space-x-3 justify-end">
                            <a
                              href={example.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-100"
                              title="View file"
                            >
                              <DocumentTextIcon className="h-5 w-5" />
                            </a>
                            <button
                              onClick={() => handleViewStructure(example)}
                              className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-100"
                              title="View structure"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteExample(example.id)}
                              className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-100"
                              title="Delete example"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Add Example Form */}
          {isAddExampleOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full mx-auto p-6" style={{ maxWidth: '500px' }}>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Create New Template</h3>
                    <p className="text-sm text-gray-600 mt-1">Upload a document to create a template with visual analysis</p>
                  </div>
                  <button
                    onClick={() => setIsAddExampleOpen(false)}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {uploadError && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                    {uploadError}
                  </div>
                )}

                {analysisStatus && (
                  <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded relative">
                    {analysisStatus}
                    {isAnalyzing && (
                      <div className="mt-2 flex justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-purple"></div>
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={handleAddGoldenExample}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={uploadData.name}
                        onChange={e => setUploadData({...uploadData, name: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 text-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        rows="3"
                        value={uploadData.description}
                        onChange={e => setUploadData({...uploadData, description: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm text-gray-700 py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                      ></textarea>
                    </div>

                    <div>
                      <label htmlFor="exampleType" className="block text-sm font-medium text-gray-700">
                        Example Type
                      </label>
                      <select
                        id="exampleType"
                        name="exampleType"
                        value={uploadData.exampleType}
                        onChange={e => setUploadData({...uploadData, exampleType: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 text-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                      >
                        {exampleTypes.map(type => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Upload File
                      </label>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                          <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600">
                            <label
                              htmlFor="file-upload"
                              className="relative cursor-pointer bg-white rounded-md font-medium text-purple-600 hover:text-purple-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-purple-500"
                            >
                              <span>Upload a file</span>
                              <input
                                id="file-upload"
                                name="file-upload"
                                type="file"
                                className="sr-only"
                                onChange={handleFileChange}
                                accept=".pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.xls,.ppt,.pptx,.json,.html,.jpg,.jpeg,.png"
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">
                            PDF, DOC, DOCX, TXT, MD, CSV, XLS, XLSX, PPT, PPTX, JSON, HTML, JPG, PNG
                          </p>
                          {uploadData.files.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-700">Selected file: {uploadData.files[0].name}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsAddExampleOpen(false)}
                      className="mr-3 inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isUploading || isAnalyzing || uploadData.files.length === 0}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploading || isAnalyzing ? 'Processing...' : 'Upload'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Structure Viewer */}
      <StructureViewer 
        isOpen={isStructureViewerOpen} 
        onClose={() => setIsStructureViewerOpen(false)} 
        structure={currentStructure} 
      />
    </div>
  );
}

"use client";

import { useState, useEffect } from 'react';
import { XMarkIcon, DocumentIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { artifactApi } from '../../lib/api';

export default function ProcessArtifactUploadPopup({ interviewerId, interviewerName, onClose, onUpload }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [artifactType, setArtifactType] = useState('other');
  const [artifactTypes, setArtifactTypes] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load artifact types for process artifacts
    const loadArtifactTypes = async () => {
      try {
        setIsLoadingTypes(true);
        const types = await artifactApi.getArtifactTypes('process');
        setArtifactTypes(types);

        // Set default artifact type if available
        if (types && types.length > 0) {
          setArtifactType(types[0].id);
        }
      } catch (err) {

        setError('Failed to load artifact types. Please try again.');
      } finally {
        setIsLoadingTypes(false);
      }
    };

    loadArtifactTypes();
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Use the file name as the default artifact name if no name is set
      if (!name) {
        setName(selectedFile.name.split('.')[0]);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    if (!name.trim()) {
      setError('Please provide a name for the artifact');
      return;
    }

    try {
      setIsUploading(true);
      setError('');

      await onUpload({
        file,
        name: name.trim(),
        description: description.trim(),
        artifactType: artifactType,
        interviewerId: interviewerId,
        dateAdded: new Date().toISOString()
      });

      onClose();
    } catch (err) {

      setError('Failed to upload artifact. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Upload Process Artifact for {interviewerName}</h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full hover:bg-gray-200"
          >
            <XMarkIcon className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Upload File</label>
            <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
              {file ? (
                <div className="flex items-center justify-center space-x-2">
                  <DocumentIcon className="w-8 h-8 text-blue-500" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <ArrowUpTrayIcon className="w-10 h-10 text-gray-400 mx-auto" />
                  <p className="text-gray-500">Drag and drop your file here or</p>
                  <label className="inline-block bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-md cursor-pointer">
                    Browse Files
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.txt,.rtf,.ppt,.pptx,.xls,.xlsx"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="name" className="block text-gray-700 mb-2">Artifact Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-purple"
              placeholder="Enter artifact name"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="artifactType" className="block text-gray-700 mb-2">Artifact Type</label>
            <select
              id="artifactType"
              value={artifactType}
              onChange={(e) => setArtifactType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-purple"
              disabled={isLoadingTypes}
            >
              {isLoadingTypes ? (
                <option>Loading types...</option>
              ) : (
                artifactTypes.map(typeOption => (
                  <option key={typeOption.id} value={typeOption.id}>
                    {typeOption.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="mb-6">
            <label htmlFor="description" className="block text-gray-700 mb-2">Description (Optional)</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-purple"
              placeholder="Brief description of the process artifact"
              rows="3"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-4 py-2 bg-brand-purple hover:bg-brand-purple-dark text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isUploading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              )}
              {isUploading ? 'Uploading...' : 'Upload Artifact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

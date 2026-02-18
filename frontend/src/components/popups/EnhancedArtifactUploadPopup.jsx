"use client";

import { XMarkIcon } from '@heroicons/react/24/outline';
import useEnhancedArtifactUpload from '../../hooks/useEnhancedArtifactUpload';
import EnhancedArtifactUploadForm from '../artifact-upload/EnhancedArtifactUploadForm';
import UploadSuccessMessage from '../artifact-upload/UploadSuccessMessage';

export default function EnhancedArtifactUploadPopup({ type, onClose, onUpload }) {
  const {
    // State
    inputType,
    setInputType,
    file,
    sourceUrl,
    setSourceUrl,
    textContent,
    setTextContent,
    name,
    setName,
    description,
    setDescription,
    artifactType,
    setArtifactType,
    artifactTypes,
    isUploading,
    isLoadingTypes,
    error,
    fieldErrors,
    uploadSuccess,
    
    // Methods
    handleFileSelect,
    handleSubmit,
    handleUploadAnother
  } = useEnhancedArtifactUpload(type);

  const title = type === 'company' ? 'Add Company Artifact' :
                type === 'role' ? 'Add Role Artifact' :
                type === 'process' ? 'Add Process Artifact' :
                type === 'candidate' ? 'Add Candidate Artifact' :
                'Add Artifact';

  const onSubmit = (e) => handleSubmit(e, onUpload);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4"
      aria-modal="true"
      role="dialog"
      tabIndex={-1}
      aria-labelledby="artifact-upload-title"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 id="artifact-upload-title" className="text-xl font-semibold text-gray-800">
            {title}
          </h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full hover:bg-gray-200"
            aria-label="Close artifact upload dialog"
          >
            <XMarkIcon className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        {uploadSuccess ? (
          <UploadSuccessMessage
            onUploadAnother={handleUploadAnother}
            onClose={onClose}
          />
        ) : (
          <>
            {/* Error Display */}
            {error && (
              <div 
                id="artifact-upload-error" 
                className="mx-6 mt-4 p-3 bg-red-100 text-red-700 rounded-md" 
                role="alert"
              >
                {error}
              </div>
            )}

            {/* Enhanced Upload Form */}
            <EnhancedArtifactUploadForm
              inputType={inputType}
              setInputType={setInputType}
              file={file}
              sourceUrl={sourceUrl}
              setSourceUrl={setSourceUrl}
              textContent={textContent}
              setTextContent={setTextContent}
              name={name}
              setName={setName}
              description={description}
              setDescription={setDescription}
              artifactType={artifactType}
              setArtifactType={setArtifactType}
              artifactTypes={artifactTypes}
              isLoadingTypes={isLoadingTypes}
              fieldErrors={fieldErrors}
              onFileSelect={handleFileSelect}
              onSubmit={onSubmit}
              onCancel={onClose}
              isUploading={isUploading}
              type={type}
            />
          </>
        )}
      </div>
    </div>
  );
}
"use client";

import { XMarkIcon } from '@heroicons/react/24/outline';
import useArtifactUpload from '../../hooks/useArtifactUpload';
import ArtifactUploadForm from '../artifact-upload/ArtifactUploadForm';
import UploadSuccessMessage from '../artifact-upload/UploadSuccessMessage';

export default function ArtifactUploadPopup({ type, onClose, onUpload }) {
  const {
    // State
    file,
    name, setName,
    description, setDescription,
    artifactType, setArtifactType,
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
  } = useArtifactUpload(type);

  const title = type === 'company' ? 'Upload Company Artifact' :
                type === 'role' ? 'Upload Role Artifact' :
                type === 'process' ? 'Upload Process Artifact' :
                type === 'candidate' ? 'Upload Candidate Artifact' :
                'Upload Artifact';

  const onSubmit = (e) => handleSubmit(e, onUpload);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
      aria-modal="true"
      role="dialog"
      tabIndex={-1}
      aria-labelledby="artifact-upload-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
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

            {/* Upload Form */}
            <ArtifactUploadForm
              file={file}
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
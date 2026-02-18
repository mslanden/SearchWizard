"use client";

import { XMarkIcon } from '@heroicons/react/24/outline';
import { interviewerApi } from '../../lib/api';
import useEnhancedArtifactUpload from '../../hooks/useEnhancedArtifactUpload';
import EnhancedArtifactUploadForm from '../artifact-upload/EnhancedArtifactUploadForm';

export default function EnhancedProcessArtifactUploadPopup({ interviewerId, interviewerName, onClose, onSuccess }) {
  const {
    inputType,
    setInputType,
    file,
    url,
    setUrl,
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
    handleFileSelect,
    handleSubmit,
    handleUploadAnother
  } = useEnhancedArtifactUpload('process');

  const handleUpload = async (uploadPayload) => {
    const artifactData = {
      name: uploadPayload.name,
      description: uploadPayload.description,
      artifactType: uploadPayload.artifactType,
      inputType: uploadPayload.inputType
    };

    // Add input-specific data
    if (uploadPayload.inputType === 'url') {
      artifactData.sourceUrl = uploadPayload.url;
    } else if (uploadPayload.inputType === 'text') {
      artifactData.textContent = uploadPayload.textContent;
    }

    const result = await interviewerApi.addProcessArtifact(
      interviewerId,
      artifactData,
      uploadPayload.file || null
    );

    if (onSuccess) {
      await onSuccess(result);
    }

    return result;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            {uploadSuccess ? 'Upload Complete' : `Upload Artifact for ${interviewerName}`}
          </h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full hover:bg-gray-200"
          >
            <XMarkIcon className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {uploadSuccess ? (
          <div className="p-6 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Artifact uploaded successfully!</h3>
              <p className="text-gray-600">The artifact has been added to {interviewerName}&apos;s profile.</p>
            </div>
            <div className="flex justify-center space-x-3">
              <button
                onClick={handleUploadAnother}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
              >
                Upload Another
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-brand-purple hover:bg-brand-purple-dark text-white rounded-md"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="m-6 p-3 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}
            <EnhancedArtifactUploadForm
              inputType={inputType}
              setInputType={setInputType}
              file={file}
              url={url}
              setUrl={setUrl}
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
              onSubmit={(e) => handleSubmit(e, handleUpload)}
              onCancel={onClose}
              isUploading={isUploading}
              type="process"
            />
          </>
        )}
      </div>
    </div>
  );
}
import { useState } from 'react';
import { LinkIcon, DocumentTextIcon, DocumentIcon } from '@heroicons/react/24/outline';
import SecureFileUpload from '../SecureFileUpload';

export default function EnhancedArtifactUploadForm({
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
  isLoadingTypes,
  fieldErrors,
  onFileSelect,
  onSubmit,
  onCancel,
  isUploading,
  type
}) {
  const description_placeholder = "(Optional) e.g., '2024 Q1 Company Profile', 'Sample Interview Rubric'";

  return (
    <form onSubmit={onSubmit} className="p-6">
      {/* File Upload Section */}
      <div className="mb-6">
        {inputType === 'file' ? (
          <div className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center bg-purple-25">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <DocumentIcon className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Upload artifacts</h3>
              <p className="text-gray-600 mb-4">
                Drag & drop or{' '}
                <button
                  type="button"
                  className="text-purple-600 hover:text-purple-700 font-medium"
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  choose file
                </button>
                {' '}to upload
              </p>
              <p className="text-sm text-gray-500">
                Supported file types: PDF, txt, Markdown, Audio (e.g. mp3), .png, .jpg, .jpeg
              </p>
            </div>
            <input
              id="file-input"
              type="file"
              className="hidden"
              onChange={(e) => onFileSelect(e.target.files?.[0])}
              accept=".pdf,.txt,.md,.doc,.docx,.png,.jpg,.jpeg,.mp3"
            />
            {fieldErrors.file && (
              <p className="mt-2 text-sm text-red-600">{fieldErrors.file}</p>
            )}
          </div>
        ) : (
          <div
            onClick={() => setInputType('file')}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-purple-300 transition-colors"
          >
            <DocumentIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 text-sm">Click to upload files</p>
          </div>
        )}
      </div>

      {/* Alternative Input Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {/* Link Option */}
        <div
          onClick={() => setInputType('url')}
          className={`p-4 rounded-lg border transition-all cursor-pointer ${
            inputType === 'url'
              ? 'border-purple-500 bg-purple-50'
              : 'border-gray-200 hover:border-purple-300'
          }`}
        >
          <LinkIcon className={`w-5 h-5 mb-2 ${inputType === 'url' ? 'text-purple-600' : 'text-gray-500'}`} />
          <div className="text-sm font-medium text-gray-700 mb-1">Link</div>
          <div className="text-xs text-gray-500">Website</div>
        </div>

        {/* Text Option */}
        <div
          onClick={() => setInputType('text')}
          className={`p-4 rounded-lg border transition-all cursor-pointer ${
            inputType === 'text'
              ? 'border-purple-500 bg-purple-50'
              : 'border-gray-200 hover:border-purple-300'
          }`}
        >
          <DocumentTextIcon className={`w-5 h-5 mb-2 ${inputType === 'text' ? 'text-purple-600' : 'text-gray-500'}`} />
          <div className="text-sm font-medium text-gray-700 mb-1">Paste text</div>
          <div className="text-xs text-gray-500">Copied text</div>
        </div>
      </div>

      {/* Input-specific content */}
      {inputType === 'url' && (
        <div className="mb-6">
          <label htmlFor="url-input" className="block text-gray-700 mb-2">
            Website URL
          </label>
          <input
            id="url-input"
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className={`w-full px-3 py-2 border ${
              fieldErrors.sourceUrl ? 'border-red-500' : 'border-gray-300'
            } rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-purple`}
            placeholder="https://example.com"
            required
          />
          {fieldErrors.sourceUrl && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.sourceUrl}</p>
          )}
          <p className="mt-2 text-sm text-gray-600">
            Only the visible text on the website will be imported at this moment
          </p>
        </div>
      )}

      {inputType === 'text' && (
        <div className="mb-6">
          <label htmlFor="text-input" className="block text-gray-700 mb-2">
            Text Content
          </label>
          <textarea
            id="text-input"
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            className={`w-full px-3 py-2 border ${
              fieldErrors.textContent ? 'border-red-500' : 'border-gray-300'
            } rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-purple`}
            placeholder="Paste your text content here..."
            rows="6"
            required
          />
          {fieldErrors.textContent && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.textContent}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {textContent.length} characters
          </p>
        </div>
      )}

      {/* Common Fields */}
      <div className="mb-6">
        <label htmlFor="artifactType" className="block text-gray-700 mb-2">
          Artifact Type
        </label>
        <select
          id="artifactType"
          value={artifactType}
          onChange={(e) => setArtifactType(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-purple"
          disabled={isLoadingTypes}
        >
          {isLoadingTypes ? (
            <option>Loading types...</option>
          ) : (
            artifactTypes.map((typeOption) => (
              <option key={typeOption.id} value={typeOption.id}>
                {typeOption.name}
              </option>
            ))
          )}
        </select>
      </div>

      <div className="mb-6">
        <label htmlFor="artifact-name" className="block text-gray-700 mb-2">
          Name
        </label>
        <input
          id="artifact-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`w-full px-3 py-2 border ${
            fieldErrors.name ? 'border-red-500' : 'border-gray-300'
          } rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500`}
          placeholder="e.g., Company Overview 2024"
          required
        />
        {fieldErrors.name && (
          <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
        )}
      </div>

      <div className="mb-6">
        <label htmlFor="description" className="block text-gray-700 mb-2">
          Description (Optional)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`w-full px-3 py-2 border ${
            fieldErrors.description ? 'border-red-500' : 'border-gray-300'
          } rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500`}
          placeholder={description_placeholder}
          rows="3"
          maxLength="500"
        />
        {fieldErrors.description && (
          <p className="mt-1 text-sm text-red-600">{fieldErrors.description}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">{description.length}/500 characters</p>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isUploading}
          className="px-4 py-2 bg-brand-purple hover:bg-brand-purple-dark text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? 'Uploading...' : 'Upload Artifact'}
        </button>
      </div>
    </form>
  );
}
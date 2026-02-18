import React, { useState, useCallback } from 'react';
import BasePopup from '../common/BasePopup';
import { useEnhancedErrorHandler } from '../../contexts/ToastContext';
import { ArtifactUploadData } from '../../types/project';

export type ArtifactUploadType = 'company' | 'role' | 'process' | 'candidate';
export type InputType = 'file' | 'url' | 'text';

interface UnifiedArtifactUploadPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (data: ArtifactUploadData) => Promise<void>;
  type: ArtifactUploadType;
  title?: string;
}

const UnifiedArtifactUploadPopup: React.FC<UnifiedArtifactUploadPopupProps> = ({
  isOpen,
  onClose,
  onUpload,
  type,
  title,
}) => {
  const [inputType, setInputType] = useState<InputType>('file');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const { handleError, handleSuccess } = useEnhancedErrorHandler();

  const defaultTitle = `Add ${type.charAt(0).toUpperCase() + type.slice(1)} Artifact`;
  const modalTitle = title || defaultTitle;

  const resetForm = useCallback(() => {
    setInputType('file');
    setFile(null);
    setUrl('');
    setTextContent('');
    setName('');
    setDescription('');
    setIsUploading(false);
  }, []);

  const handleClose = useCallback(() => {
    if (!isUploading) {
      resetForm();
      onClose();
    }
  }, [isUploading, resetForm, onClose]);

  const validateForm = (): string | null => {
    if (!name.trim()) {
      return 'Name is required';
    }

    switch (inputType) {
      case 'file':
        if (!file) {
          return 'Please select a file';
        }
        break;
      case 'url':
        if (!url.trim()) {
          return 'URL is required';
        }
        if (!isValidUrl(url)) {
          return 'Please enter a valid URL';
        }
        break;
      case 'text':
        if (!textContent.trim()) {
          return 'Text content is required';
        }
        break;
    }

    return null;
  };

  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      handleError(new Error(validationError), 'validate form');
      return;
    }

    setIsUploading(true);

    try {
      const uploadData: ArtifactUploadData = {
        name: name.trim(),
        description: description.trim() ? description.trim() : undefined,
        inputType,
        ...(inputType === 'file' && { file: file! }),
        ...(inputType === 'url' && { url: url.trim() }),
        ...(inputType === 'text' && { textContent: textContent.trim() }),
      };

      await onUpload(uploadData);
      handleSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} artifact uploaded successfully`);
      handleClose();
    } catch (error) {
      handleError(error as Error, `upload ${type} artifact`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!name) {
        setName(selectedFile.name.replace(/\.[^/.]+$/, '')); // Remove extension
      }
    }
  };

  const renderInputSection = () => {
    switch (inputType) {
      case 'file':
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                Select File
              </label>
              <input
                id="file-upload"
                type="file"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 dark:text-dark-text-secondary
                         file:mr-4 file:py-2 file:px-4
                         file:rounded-md file:border-0
                         file:text-sm file:font-medium
                         file:bg-brand-purple file:text-white
                         hover:file:bg-brand-purple-dark
                         file:cursor-pointer cursor-pointer"
                accept=".pdf,.doc,.docx,.txt,.md,.json,.csv"
                required
                disabled={isUploading}
              />
              {file && (
                <p className="mt-2 text-sm text-gray-600 dark:text-dark-text-secondary">
                  Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          </div>
        );

      case 'url':
        return (
          <div>
            <label htmlFor="url-input" className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
              URL
            </label>
            <input
              id="url-input"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md 
                       bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text
                       focus:ring-2 focus:ring-brand-purple focus:border-transparent"
              placeholder="https://example.com/document.pdf"
              required
              disabled={isUploading}
            />
          </div>
        );

      case 'text':
        return (
          <div>
            <label htmlFor="text-content" className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
              Text Content
            </label>
            <textarea
              id="text-content"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md 
                       bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text
                       focus:ring-2 focus:ring-brand-purple focus:border-transparent resize-vertical"
              placeholder="Enter your text content here..."
              required
              disabled={isUploading}
            />
          </div>
        );
    }
  };

  return (
    <BasePopup
      isOpen={isOpen}
      onClose={handleClose}
      title={modalTitle}
      size="md"
      preventCloseOnBackdrop={isUploading}
      preventCloseOnEscape={isUploading}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Input Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-3">
            Input Type
          </label>
          <div className="flex space-x-4">
            {(['file', 'url', 'text'] as const).map((type) => (
              <label key={type} className="flex items-center">
                <input
                  type="radio"
                  name="inputType"
                  value={type}
                  checked={inputType === type}
                  onChange={(e) => setInputType(e.target.value as InputType)}
                  className="h-4 w-4 text-brand-purple focus:ring-brand-purple border-gray-300"
                  disabled={isUploading}
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-dark-text capitalize">
                  {type}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Dynamic Input Section */}
        {renderInputSection()}

        {/* Name Field */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
            Name *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md 
                     bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text
                     focus:ring-2 focus:ring-brand-purple focus:border-transparent"
            placeholder="Enter artifact name"
            required
            disabled={isUploading}
          />
        </div>

        {/* Description Field */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md 
                     bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text
                     focus:ring-2 focus:ring-brand-purple focus:border-transparent resize-vertical"
            placeholder="Optional description"
            disabled={isUploading}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-dark-border">
          <button
            type="button"
            onClick={handleClose}
            disabled={isUploading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-dark-text-secondary 
                     bg-gray-100 dark:bg-dark-bg-tertiary hover:bg-gray-200 dark:hover:bg-dark-bg 
                     rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isUploading}
            className="px-4 py-2 text-sm font-medium text-white 
                     bg-brand-purple hover:bg-brand-purple-dark 
                     rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     focus:outline-none focus:ring-2 focus:ring-brand-purple focus:ring-offset-2
                     flex items-center"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Uploading...
              </>
            ) : (
              'Upload Artifact'
            )}
          </button>
        </div>
      </form>
    </BasePopup>
  );
};

export default UnifiedArtifactUploadPopup;
import { useState, useRef } from 'react';
import { DocumentIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { validators, FILE_SIZE_LIMITS, ALLOWED_FILE_TYPES } from '../utils/validation';

/**
 * Secure file upload component with validation
 * Prevents malicious file uploads and validates file types/sizes
 */
export default function SecureFileUpload({
  onFileSelect,
  acceptedTypes = 'documents',
  maxSize = FILE_SIZE_LIMITS.default,
  multiple = false,
  maxFiles = 10,
  className = '',
  disabled = false,
  required = false,
  showPreview = true,
  onError = () => {}
}) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState([]);
  const fileInputRef = useRef(null);

  // Get allowed file types
  const allowedTypes = ALLOWED_FILE_TYPES[acceptedTypes] || ALLOWED_FILE_TYPES.all;
  const acceptString = allowedTypes.join(',');

  // Validate a single file
  const validateFile = (file) => {
    const error = validators.file(file, {
      maxSize,
      allowedTypes,
      category: acceptedTypes
    });

    if (error) {
      return { file, error };
    }

    // Additional security checks
    const fileName = file.name.toLowerCase();
    
    // Check for double extensions
    const doubleExtPattern = /\.(jpg|jpeg|png|gif|pdf|doc|docx)\.(exe|bat|cmd|com|pif|scr|vbs|js)$/i;
    if (doubleExtPattern.test(fileName)) {
      return { file, error: 'Suspicious file name detected' };
    }

    // Check for null bytes in filename
    if (fileName.includes('\0')) {
      return { file, error: 'Invalid file name' };
    }

    return { file, error: null };
  };

  // Handle file selection
  const handleFileSelect = (files) => {
    const fileArray = Array.from(files);
    const validatedFiles = [];
    const newErrors = [];

    // Check max files limit
    if (multiple && fileArray.length > maxFiles) {
      newErrors.push(`Maximum ${maxFiles} files allowed`);
      setErrors(newErrors);
      onError(newErrors);
      return;
    }

    // Validate each file
    fileArray.forEach((file) => {
      const { error } = validateFile(file);
      if (error) {
        newErrors.push(`${file.name}: ${error}`);
      } else {
        validatedFiles.push(file);
      }
    });

    setErrors(newErrors);
    
    if (validatedFiles.length > 0) {
      if (multiple) {
        setSelectedFiles(validatedFiles);
        onFileSelect(validatedFiles);
      } else {
        setSelectedFiles([validatedFiles[0]]);
        onFileSelect(validatedFiles[0]);
      }
    } else {
      onError(newErrors);
    }
  };

  // Handle drag and drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  // Handle file input change
  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files);
    }
  };

  // Remove a selected file
  const removeFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    
    if (multiple) {
      onFileSelect(newFiles);
    } else {
      onFileSelect(null);
    }
    
    // Clear errors for removed file
    const removedFileName = selectedFiles[index].name;
    setErrors(errors.filter(err => !err.includes(removedFileName)));
  };

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get icon based on file type
  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) {
      return <PhotoIcon className="w-12 h-12 text-gray-400" />;
    }
    return <DocumentIcon className="w-12 h-12 text-gray-400" />;
  };

  return (
    <div className={className}>
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 ${
          dragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={acceptString}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          className="hidden"
        />

        <div className="text-center">
          <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {acceptedTypes === 'images' 
              ? 'PNG, JPG, GIF up to 10MB'
              : acceptedTypes === 'documents'
              ? 'PDF, DOC, DOCX, TXT up to 50MB'
              : `Max size: ${formatFileSize(maxSize)}`
            }
          </p>
          {multiple && (
            <p className="text-xs text-gray-500 mt-1">
              Up to {maxFiles} files allowed
            </p>
          )}
        </div>
      </div>

      {/* Error messages */}
      {errors.length > 0 && (
        <div className="mt-2">
          {errors.map((error, index) => (
            <p key={index} className="text-sm text-red-600">
              {error}
            </p>
          ))}
        </div>
      )}

      {/* Selected files preview */}
      {showPreview && selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                {getFileIcon(file)}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
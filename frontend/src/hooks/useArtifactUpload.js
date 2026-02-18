import { useState, useEffect } from 'react';
import { artifactApi } from '../lib/api';
import { validators, sanitizers } from '../utils/validation';

export default function useArtifactUpload(type) {
  const [file, setFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [artifactType, setArtifactType] = useState('other');
  const [artifactTypes, setArtifactTypes] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    const loadArtifactTypes = async () => {
      try {
        setIsLoadingTypes(true);
        const types = await artifactApi.getArtifactTypes(type);
        setArtifactTypes(types);
        if (types && types.length > 0) {
          setArtifactType(types[0].id);
        }
      } catch (err) {
        setError(`Failed to load artifact types. Please try again.`);
      } finally {
        setIsLoadingTypes(false);
      }
    };
    loadArtifactTypes();
  }, [type]);

  const handleFileSelect = (selectedFile) => {
    if (Array.isArray(selectedFile)) {
      setFiles(selectedFile);
      setFile(selectedFile[0]);
      if (!name && selectedFile[0]) {
        setName(selectedFile[0].name.split('.')[0]);
      }
    } else if (selectedFile) {
      setFile(selectedFile);
      setFiles([selectedFile]);
      if (!name) {
        setName(selectedFile.name.split('.')[0]);
      }
    } else {
      setFile(null);
      setFiles([]);
    }
  };

  const validateForm = () => {
    const formData = {
      file: file,
      name: sanitizers.trim(name),
      description: sanitizers.trim(description)
    };

    const validationRules = {
      file: [validators.required],
      name: [
        validators.required,
        validators.minLength(2),
        validators.maxLength(100),
        validators.noSpecialChars
      ],
      description: [validators.maxLength(500)]
    };

    const validation = {};
    Object.keys(validationRules).forEach(field => {
      const value = formData[field];
      const rules = validationRules[field];
      
      for (const rule of rules) {
        const error = rule(value);
        if (error) {
          validation[field] = error;
          break;
        }
      }
    });

    return { formData, validation };
  };

  const handleSubmit = async (e, onUpload) => {
    e.preventDefault();
    setUploadSuccess(false);
    setError('');
    setFieldErrors({});

    const { formData, validation } = validateForm();

    if (Object.keys(validation).length > 0) {
      setFieldErrors(validation);
      return;
    }

    const uploadPayload = {
      file,
      name: formData.name,
      description: formData.description,
      type: type,
      artifactType: artifactType,
      dateAdded: new Date().toISOString()
    };

    try {
      setIsUploading(true);
      const result = await onUpload(uploadPayload);
      setUploadSuccess(true);
      resetForm();
    } catch (err) {
      setError('Failed to upload artifact. Please try again.');
      if (err && err.message) {
        setError(`Failed to upload artifact: ${err.message}`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setFiles([]);
    setName('');
    setDescription('');
  };

  const handleUploadAnother = () => {
    setUploadSuccess(false);
    resetForm();
  };

  return {
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
  };
}
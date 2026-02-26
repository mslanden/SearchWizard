import { useState, useEffect } from 'react';
import { artifactApi } from '../lib/api';

export default function useCandidateEdit(candidate) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [artifacts, setArtifacts] = useState([]);
  const [isLoadingArtifacts, setIsLoadingArtifacts] = useState(false);
  const [artifactTypes, setArtifactTypes] = useState([]);
  const [isEditProfile, setIsEditProfile] = useState(false);
  const [showUploadPopup, setShowUploadPopup] = useState(false);

  useEffect(() => {
    if (candidate) {
      setName(candidate.name || '');
      setRole(candidate.role || '');
      setCompany(candidate.company || '');
      setEmail(candidate.email || '');
      setPhone(candidate.phone || '');
      setPreviewUrl(candidate.photoUrl || '/images/default-pfp.webp');

      loadCandidateArtifacts();
      loadArtifactTypes();
    } else {
      resetForm();
    }
  }, [candidate]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = () => {
    setName('');
    setRole('');
    setCompany('');
    setEmail('');
    setPhone('');
    setPreviewUrl('/images/default-pfp.webp');
  };

  const loadCandidateArtifacts = async () => {
    if (!candidate || !candidate.id) return;

    setIsLoadingArtifacts(true);
    try {
      const candidateArtifacts = await artifactApi.getCandidateArtifacts(candidate.id);
      setArtifacts(candidateArtifacts || []);
    } catch (err) {
      setError('Failed to load candidate artifacts');
    } finally {
      setIsLoadingArtifacts(false);
    }
  };

  const loadArtifactTypes = async () => {
    try {
      const types = await artifactApi.getArtifactTypes('candidate');
      setArtifactTypes(types || []);
    } catch (err) {
      // Failed to load artifact types - continue with empty array
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePhoto(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleProfileSubmit = async (e, onSave) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Please provide a name for the candidate');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const formData = {
        name: name.trim(),
        role: role.trim(),
        company: company.trim(),
        email: email.trim(),
        phone: phone.trim(),
        profilePhoto
      };

      await onSave(formData);
      setIsEditProfile(false);
    } catch (err) {
      setError('Failed to save candidate. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadArtifact = () => {
    setShowUploadPopup(true);
  };

  const handleArtifactUploaded = (uploadedArtifact) => {
    if (!uploadedArtifact) {
      setError('Upload failed - no data returned');
      return;
    }

    const formattedArtifact = {
      id: uploadedArtifact.id,
      name: uploadedArtifact.name,
      description: uploadedArtifact.description || '',
      artifactType: uploadedArtifact.artifactType || 'other',
      dateAdded: uploadedArtifact.createdAt || new Date().toISOString(),
      fileUrl: uploadedArtifact.fileUrl || '',
      fileType: uploadedArtifact.fileType || '',
      fileSize: uploadedArtifact.fileSize || 0
    };

    setArtifacts(prev => [formattedArtifact, ...prev]);
    setError('');
    setShowUploadPopup(false);
  };

  const handleChangeArtifactType = (artifactId, newType) => {
    setArtifacts(artifacts.map(a =>
      a.id === artifactId ? {...a, artifactType: newType} : a
    ));
  };

  return {
    // State
    name, setName,
    role, setRole,
    company, setCompany,
    email, setEmail,
    phone, setPhone,
    profilePhoto,
    previewUrl,
    isSubmitting,
    error, setError,
    artifacts,
    isLoadingArtifacts,
    artifactTypes,
    isEditProfile, setIsEditProfile,
    showUploadPopup, setShowUploadPopup,

    // Methods
    handlePhotoChange,
    handleProfileSubmit,
    handleUploadArtifact,
    handleArtifactUploaded,
    handleChangeArtifactType,
  };
}

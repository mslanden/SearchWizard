import { useState, useEffect } from 'react';

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
  const [isEditProfile, setIsEditProfile] = useState(false);

  useEffect(() => {
    if (candidate) {
      setName(candidate.name || '');
      setRole(candidate.role || '');
      setCompany(candidate.company || '');
      setEmail(candidate.email || '');
      setPhone(candidate.phone || '');
      setPreviewUrl(candidate.photoUrl || '/images/default-pfp.webp');
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
    isEditProfile, setIsEditProfile,

    // Methods
    handlePhotoChange,
    handleProfileSubmit,
  };
}

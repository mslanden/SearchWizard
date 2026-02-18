import SecureFileUpload from '../SecureFileUpload';

export default function ArtifactUploadForm({
  file,
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
  const description_placeholder = "(Optional) e.g. '2024 Q1 Company Profile', 'Sample Interview Rubric'";

  return (
    <form onSubmit={onSubmit} className="p-6">
      <div className="mb-6">
        <label className="block text-gray-700 mb-2">Upload File</label>
        <SecureFileUpload
          acceptedTypes="documents"
          onFileSelect={onFileSelect}
          onError={(errors) => {}}
          maxSize={52428800} // 50MB
          required={true}
          showPreview={true}
          className="w-full"
        />
        {fieldErrors.file && (
          <p className="mt-1 text-sm text-red-600">{fieldErrors.file}</p>
        )}
      </div>

      <div className="mb-6">
        <label htmlFor="artifactType" className="block text-gray-700 mb-2">Artifact Type</label>
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
            artifactTypes.map(typeOption => (
              <option key={typeOption.id} value={typeOption.id}>
                {typeOption.name}
              </option>
            ))
          )}
        </select>
      </div>

      <div className="mb-6">
        <label htmlFor="artifact-name" className="block text-gray-700 mb-2">Name</label>
        <input
          id="artifact-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`w-full px-3 py-2 border ${fieldErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-purple`}
          placeholder="e.g., Company Overview 2024"
          required
        />
        {fieldErrors.name && (
          <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
        )}
      </div>

      <div className="mb-6">
        <label htmlFor="description" className="block text-gray-700 mb-2">Description (Optional)</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`w-full px-3 py-2 border ${fieldErrors.description ? 'border-red-500' : 'border-gray-300'} rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-purple`}
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
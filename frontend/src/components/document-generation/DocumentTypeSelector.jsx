
export default function DocumentTypeSelector({ 
  documentType, 
  onDocumentTypeChange, 
  documentTypes,
  loading 
}) {
  return (
    <div className="flex items-center justify-between">
      <label htmlFor="documentType" className="text-xl text-gray-700 font-medium">
        Select Document Type:
      </label>
      <div className="w-1/2">
        <div className="relative">
          <select
            id="documentType"
            value={documentType}
            onChange={(e) => onDocumentTypeChange(e.target.value)}
            disabled={loading}
            className="block w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 pr-8 rounded-lg focus:outline-none focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
          >
            {documentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
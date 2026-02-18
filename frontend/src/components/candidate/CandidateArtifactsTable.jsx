import { DocumentIcon, LinkIcon, DocumentTextIcon, PlusIcon } from '@heroicons/react/24/outline';

export default function CandidateArtifactsTable({ 
  artifacts, 
  artifactTypes, 
  isLoadingArtifacts, 
  onUploadArtifact, 
  onChangeArtifactType 
}) {
  const getArtifactIcon = (type) => {
    switch(type?.toLowerCase()) {
      case 'candidate resume':
        return <DocumentIcon className="w-5 h-5 text-gray-500" />;
      case 'linkedin profile':
        return <LinkIcon className="w-5 h-5 text-gray-500" />;
      case 'interview notes':
        return <DocumentTextIcon className="w-5 h-5 text-gray-500" />;
      default:
        return <DocumentIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  return (
    <div className="px-6 pb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Candidate Artifacts</h3>
        <button 
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1.5 rounded-md flex items-center text-sm"
          onClick={onUploadArtifact}
        >
          <PlusIcon className="w-4 h-4 mr-1" />
          Add Artifact
        </button>
      </div>

      <div className="bg-white rounded-lg overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="text-xs text-gray-500 uppercase bg-[#F5F5F5]">
            <tr>
              <th className="py-2 px-4 text-left font-medium">Artifact</th>
              <th className="py-2 px-4 text-left font-medium">Type</th>
              <th className="py-2 px-4 text-left font-medium">Date Added</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoadingArtifacts ? (
              <tr>
                <td colSpan="3" className="text-center py-4 text-gray-500">Loading artifacts...</td>
              </tr>
            ) : artifacts.length === 0 ? (
              <tr>
                <td colSpan="3" className="text-center py-4 text-gray-500">No artifacts added yet</td>
              </tr>
            ) : (
              artifacts.map(artifact => (
                <tr key={artifact.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4">
                    <div className="flex items-center">
                      {getArtifactIcon(artifact.artifactType)}
                      <span className={`ml-2 text-sm ${artifact.artifactType === 'linkedin profile' ? 'text-blue-600' : 'text-gray-800'}`}>
                        {artifact.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-4">
                    <select 
                      value={artifact.artifactType} 
                      onChange={(e) => onChangeArtifactType(artifact.id, e.target.value)}
                      className="bg-white border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                      style={{ 
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`, 
                        backgroundPosition: 'right 0.5rem center', 
                        backgroundSize: '1.5em 1.5em', 
                        backgroundRepeat: 'no-repeat' 
                      }}
                    >
                      {artifactTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-4 text-gray-600 text-sm">
                    {formatDate(artifact.dateAdded)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
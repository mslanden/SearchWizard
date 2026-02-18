
export default function OutputsSection({ 
  outputs, 
  selectedOutputs, 
  onToggleSelection, 
  onView, 
  onDelete, 
  deletingDocument,
  onGoldenExamples,
  onGenerateDocument 
}) {
  return (
    <div className="bg-[#FFF5E6] rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900">Project Output</h2>
        <div className="space-x-3">
          <button 
            className="px-4 py-2 bg-[#F8B960] text-white rounded-md hover:bg-opacity-90"
            onClick={onGoldenExamples}
          >
            Golden Examples
          </button>
          <button 
            className="btn"
            onClick={onGenerateDocument}
          >
            Generate New
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 px-3 py-3 text-left">
                <input type="checkbox" className="rounded border-gray-300" />
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase">Output Document</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date Created</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-700 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {outputs.map(output => (
              <tr key={output.id} className="hover:bg-gray-50">
                <td className="px-3 py-4">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300"
                    checked={selectedOutputs.includes(output.id)}
                    onChange={() => onToggleSelection(output.id)}
                  />
                </td>
                <td className="px-3 py-4 text-sm text-gray-900">{output.name}</td>
                <td className="px-3 py-4">
                  <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                    {output.type}
                  </span>
                </td>
                <td className="px-3 py-4 text-sm text-gray-700">{output.dateCreated}</td>
                <td className="px-3 py-4 text-right text-sm font-medium">
                  <div className="flex space-x-3 justify-end">
                    <button 
                      onClick={() => onView(output.url)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      View
                    </button>
                    <button 
                      onClick={() => onDelete(output.id, output.name)}
                      className="text-red-600 hover:text-red-900"
                      disabled={deletingDocument}
                    >
                      {deletingDocument === output.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
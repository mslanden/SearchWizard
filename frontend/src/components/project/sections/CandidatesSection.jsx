import Image from 'next/image';
import { PlusIcon, UserGroupIcon, PencilIcon } from '@heroicons/react/24/outline';

export default function CandidatesSection({ candidates, onAdd, onEdit }) {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <UserGroupIcon className="w-5 h-5 mr-2 text-gray-700" />
          <h2 className="text-lg font-medium text-gray-900">Candidates and Candidate Artifacts</h2>
        </div>
        <button 
          onClick={onAdd}
          className="text-sm text-brand-purple flex items-center font-medium"
        >
          <PlusIcon className="w-4 h-4 mr-1 text-gray-700" />
          Add
        </button>
      </div>
      <table className="w-full">
        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
          <tr>
            <th className="py-2 px-3 text-left">Candidate Name</th>
            <th className="py-2 px-3 text-left">Current Role</th>
            <th className="py-2 px-3 text-left">Current Company</th>
            <th className="py-2 px-3 text-left">Artifacts</th>
            <th className="py-2 px-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {candidates.map(candidate => (
            <tr key={candidate.id} className="hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-900">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0 mr-3">
                    <Image 
                      src={candidate.photoUrl || '/images/default-pfp.webp'} 
                      alt={candidate.name} 
                      width={32} 
                      height={32} 
                      style={{ objectFit: 'cover', width: '100%', height: 'auto' }}
                      onError={(e) => {
                        e.target.src = '/images/default-pfp.webp';
                      }}
                    />
                  </div>
                  <span>{candidate.name}</span>
                </div>
              </td>
              <td className="py-2 px-3 text-gray-800">{candidate.role}</td>
              <td className="py-2 px-3 text-gray-800">{candidate.company}</td>
              <td className="py-2 px-3">
                <span className="text-sm text-gray-700">{candidate.artifacts}</span>
              </td>
              <td className="py-2 px-3 text-right">
                <button 
                  className="p-1 rounded-full hover:bg-gray-100"
                  onClick={() => onEdit(candidate)}
                >
                  <PencilIcon className="w-4 h-4 text-gray-700" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
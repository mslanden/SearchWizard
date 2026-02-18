import Image from 'next/image';
import { PlusIcon, UserIcon, PencilIcon } from '@heroicons/react/24/outline';

export default function InterviewersSection({ interviewers, onAdd, onEdit }) {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <UserIcon className="w-5 h-5 mr-2 text-gray-700" />
          <h2 className="text-lg font-medium text-gray-900">Interviewers and Process Artifacts</h2>
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
            <th className="py-2 px-3 text-left">Interviewer</th>
            <th className="py-2 px-3 text-left">Position</th>
            <th className="py-2 px-3 text-left">Company</th>
            <th className="py-2 px-3 text-left">Artifacts</th>
            <th className="py-2 px-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {interviewers.map(interviewer => (
            <tr key={interviewer.id} className="hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-900">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0 mr-3">
                    <Image 
                      src={interviewer.photoUrl || '/images/default-pfp.webp'} 
                      alt={interviewer.name} 
                      width={32} 
                      height={32} 
                      style={{ objectFit: 'cover', width: '100%', height: 'auto' }}
                      onError={(e) => {
                        e.target.src = '/images/default-pfp.webp';
                      }}
                    />
                  </div>
                  <span>{interviewer.name}</span>
                </div>
              </td>
              <td className="py-2 px-3 text-gray-800">{interviewer.position}</td>
              <td className="py-2 px-3 text-gray-800">{interviewer.company}</td>
              <td className="py-2 px-3">
                <span className="text-sm text-gray-700">{interviewer.artifacts}</span>
              </td>
              <td className="py-2 px-3 text-right">
                <button 
                  className="p-1 rounded-full hover:bg-gray-100"
                  onClick={() => onEdit(interviewer)}
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
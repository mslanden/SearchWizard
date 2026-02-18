import Image from 'next/image';
import { PencilIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function CandidateProfileDisplay({ 
  candidate, 
  onEdit, 
  onClose 
}) {
  return (
    <div className="flex items-start p-6">
      <div className="relative mr-6">
        <div className="w-24 h-24 rounded-full overflow-hidden">
          <Image 
            src={candidate.photoUrl || '/images/default-pfp.webp'} 
            alt={candidate.name || 'Candidate'}
            width={96} 
            height={96} 
            style={{ objectFit: 'cover', width: '100%', height: 'auto' }}
            className="rounded-full"
            onError={(e) => {
              e.target.src = '/images/default-pfp.webp';
            }}
          />
        </div>
      </div>

      <div className="flex-1">
        <div className="flex justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{candidate.name}</h2>
            <p className="text-gray-600 text-lg">{candidate.role}</p>
            <p className="text-blue-600 font-medium mb-2">{candidate.company}</p>

            {candidate.email && (
              <p className="text-gray-600 text-sm mb-1">
                <span className="font-medium">Email:</span> {candidate.email}
              </p>
            )}

            {candidate.phone && (
              <p className="text-gray-600 text-sm">
                <span className="font-medium">Phone:</span> {candidate.phone}
              </p>
            )}
          </div>
          <div className="flex">
            <button 
              onClick={onEdit}
              className="p-2 rounded-full hover:bg-gray-200 h-10 mr-2"
            >
              <PencilIcon className="w-5 h-5 text-gray-600" />
            </button>
            <button 
              onClick={onClose} 
              className="p-2 rounded-full hover:bg-gray-200 h-10"
            >
              <XMarkIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
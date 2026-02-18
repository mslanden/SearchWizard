
export default function UploadSuccessMessage({ onUploadAnother, onClose }) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="mb-4">
        <svg 
          className="w-12 h-12 text-green-500" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div className="text-green-700 font-semibold mb-2">Upload successful!</div>
      <div className="flex space-x-3">
        <button 
          onClick={onUploadAnother} 
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
        >
          Upload Another
        </button>
        <button 
          onClick={onClose} 
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
        >
          Close
        </button>
      </div>
    </div>
  );
}
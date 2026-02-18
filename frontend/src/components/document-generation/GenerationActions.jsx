
export default function GenerationActions({ 
  onGenerate, 
  loading, 
  error 
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button 
          className="text-white py-3 px-6 rounded-full text-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ 
            backgroundColor: loading ? '#9CA3AF' : '#8B5CF6',
            ':hover': { backgroundColor: loading ? '#9CA3AF' : '#7C3AED' } 
          }}
          onClick={onGenerate}
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Generate by Magic'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="text-right">
        <a 
          href="#" 
          className="underline font-medium" 
          style={{ color: '#4B5563' }}
          onMouseEnter={(e) => e.target.style.color = '#6D28D9'}
          onMouseLeave={(e) => e.target.style.color = '#4B5563'}
        >
          Advanced - Edit Prompt before Generating
        </a>
      </div>
    </div>
  );
}
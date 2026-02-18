
export default function UserCommentsSection({ 
  userComment, 
  onUserCommentChange, 
  loading 
}) {
  return (
    <div className="space-y-2">
      <label htmlFor="userComment" className="text-xl text-gray-700 font-medium block">
        Additional Comments or Requirements:
      </label>
      <textarea
        id="userComment"
        value={userComment}
        onChange={(e) => onUserCommentChange(e.target.value)}
        disabled={loading}
        placeholder="Add any specific requirements or comments for the document generation..."
        className="block w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg focus:outline-none focus:border-purple-500 min-h-[120px] resize-y disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <p className="text-sm text-gray-500 italic">
        Your comments will be used to customize the document generation process.
      </p>
    </div>
  );
}
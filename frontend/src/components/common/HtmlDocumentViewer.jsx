import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';

export default function HtmlDocumentViewer({ url, onClose }) {
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to extract file path from Supabase storage URL
  const extractFilePathFromUrl = (url) => {
    // Extract path from signed URL: /storage/v1/object/sign/bucket/path?token=...
    const signMatch = url.match(/\/storage\/v1\/object\/sign\/([^?]+)/);
    if (signMatch) {
      return signMatch[1]; // Returns "bucket/path"
    }
    
    // Extract path from public URL: /storage/v1/object/public/bucket/path
    const publicMatch = url.match(/\/storage\/v1\/object\/public\/(.+)/);
    if (publicMatch) {
      return publicMatch[1]; // Returns "bucket/path"
    }
    
    return null;
  };

  // Function to generate fresh signed URL
  const getFreshSignedUrl = async (originalUrl) => {
    const fullPath = extractFilePathFromUrl(originalUrl);
    if (!fullPath) {
      console.error('❌ [HtmlViewer] Could not extract file path from URL:', originalUrl);
      return originalUrl;
    }

    // Split bucket and path
    const [bucket, ...pathParts] = fullPath.split('/');
    const filePath = pathParts.join('/');
    
    console.log('🔄 [HtmlViewer] Generating fresh signed URL for bucket:', bucket, 'path:', filePath);
    
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 3600); // 1 hour expiry
      
      if (error) {
        console.error('❌ [HtmlViewer] Failed to create signed URL:', error);
        return originalUrl;
      }
      
      console.log('✅ [HtmlViewer] Fresh signed URL generated');
      return data.signedUrl;
    } catch (err) {
      console.error('❌ [HtmlViewer] Error generating signed URL:', err);
      return originalUrl;
    }
  };

  useEffect(() => {
    const fetchHtmlContent = async () => {
      try {
        setLoading(true);
        console.log('🔄 [HtmlViewer] Attempting to fetch document from:', url);
        
        // Try to get a fresh signed URL first if this looks like an expired signed URL
        let fetchUrl = url;
        if (url.includes('/storage/v1/object/sign/') && url.includes('?token=')) {
          console.log('🔄 [HtmlViewer] Detected signed URL, generating fresh one...');
          fetchUrl = await getFreshSignedUrl(url);
        }
        
        let response = await fetch(fetchUrl);
        console.log('📡 [HtmlViewer] Initial response:', response.status, response.statusText);

        // If the first attempt fails with 400/404, try the old path format (with duplicate user ID)
        if (!response.ok && (response.status === 400 || response.status === 404)) {
          console.log('❌ [HtmlViewer] First attempt failed, trying fallback URL format...');
          
          // Try to construct the old path format
          if (url.includes('/storage/v1/object/')) {
            const oldFormatUrl = url.replace(
              /\/storage\/v1\/object\/[^/]+\/project-outputs\/([^/]+)\/(.+)/,
              '/storage/v1/object/public/project-outputs/$1/$1/$2'
            );
            
            if (oldFormatUrl !== url) {
              console.log('🔄 [HtmlViewer] Trying old format URL:', oldFormatUrl);
              response = await fetch(oldFormatUrl);
              console.log('📡 [HtmlViewer] Fallback response:', response.status, response.statusText);
            }
          }
        }

        if (!response.ok) {
          const errorDetails = `${response.status} ${response.statusText}`;
          console.error('❌ [HtmlViewer] Final fetch failed:', errorDetails);
          throw new Error(`Failed to fetch HTML content: ${errorDetails}`);
        }

        const html = await response.text();
        console.log('✅ [HtmlViewer] Document fetched successfully, length:', html.length);
        setHtmlContent(html);
        setLoading(false);
      } catch (err) {
        console.error('❌ [HtmlViewer] Error:', err);
        setError(err.message || 'Failed to load HTML document');
        setLoading(false);
      }
    };

    if (url) {
      fetchHtmlContent();
    }
  }, [url]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Document Viewer</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <XMarkIcon className="w-6 h-6 text-gray-700" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-purple"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 p-4">
              {error}
            </div>
          ) : (
            <iframe
              srcDoc={htmlContent}
              title="HTML Document"
              className="w-full h-full border-0"
              sandbox="allow-same-origin allow-scripts allow-forms"
            />
          )}
        </div>
      </div>
    </div>
  );
}

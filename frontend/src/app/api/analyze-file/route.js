import { NextResponse } from 'next/server';

export async function POST(request) {
  try {

    // Get the form data with the file
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {

      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check file size (10MB limit for upload, though frontend enforces 5MB for analysis)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 413 }
      );
    }

    // Create a new FormData to forward to the backend
    const newFormData = new FormData();
    newFormData.append('file', file);

    // Forward the request to the Render backend
    const backendUrl = 'https://searchwizard-production.up.railway.app/analyze-file';

    try {
      // Forward the request to the Render backend with a longer timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const response = await fetch(backendUrl, {
        method: 'POST',
        body: newFormData,
        signal: controller.signal
      });

      clearTimeout(timeoutId); // Clear the timeout if the request completes

      // Get the response from the backend
      const data = await response.json();

      // Return the response to the client
      return NextResponse.json(data, { status: response.status });
    } catch (error) {

      return NextResponse.json(
        { error: `Failed to connect to backend: ${error.message}` },
        { status: 502 }
      );
    }
  } catch (error) {

    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}

// Increase the body size limit for file uploads
export const config = {
  api: {
    bodyParser: false,
    responseLimit: '50mb',
    // The Next.js App Router uses a different config format than pages router
    // This sets the max file size to 10MB
  },
};

// For Next.js App Router, we need to use the Edge Runtime to handle larger files
export const runtime = 'edge';

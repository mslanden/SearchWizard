import { NextResponse } from 'next/server';

export async function POST(request) {
  try {

    // Parse the request body
    const body = await request.json();
    const { documentId, fileName, fileUrl } = body;


    if (!documentId || !fileUrl) {

      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Forward the request to the Render backend
    const backendUrl = 'https://searchwizard-production.up.railway.app/analyze-structure';

    try {
      // Forward the request to the Render backend
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

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

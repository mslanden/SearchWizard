import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
// Check for both NEXT_PUBLIC_ prefixed and non-prefixed versions
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {

}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request) {
  try {
    // Verify user authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { documentType, structure, userInput = '' } = body;

    if (!documentType || !structure) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Generate document
    const htmlDocument = await generateDocument(documentType, structure, userInput);

    return NextResponse.json({ html: htmlDocument });
  } catch (error) {

    return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
  }
}

/**
 * Generate document based on structure by forwarding to Render backend
 */
async function generateDocument(documentType, structure, userInput) {
  try {
    // Forward the request to the Render backend
    const backendUrl = 'https://searchwizard-production.up.railway.app/generate-document';

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        document_type: documentType,
        structure: structure,
        user_input: userInput || ''
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.html_content || data.html;
  } catch (error) {

    throw error;
  }
}

/**
 * Generate a basic HTML document based on structure
 */
function generateBasicHtml(documentType, structure) {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // CSS for PDF styling
  const css = `
    @page {
      size: A4;
      margin: 2cm;
    }
    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      line-height: 1.5;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .page {
      page-break-after: always;
      position: relative;
      padding: 20px;
    }
    .page:last-child {
      page-break-after: avoid;
    }
    h1 {
      font-size: 24pt;
      color: #2c3e50;
      margin-bottom: 20px;
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
    }
    h2 {
      font-size: 18pt;
      color: #3498db;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    h3 {
      font-size: 14pt;
      color: #2980b9;
      margin-top: 15px;
      margin-bottom: 5px;
    }
    p {
      margin-bottom: 10px;
      text-align: justify;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .footer {
      position: fixed;
      bottom: 0;
      width: 100%;
      text-align: center;
      font-size: 9pt;
      color: #777;
      border-top: 1px solid #eee;
      padding-top: 5px;
    }
    .image-placeholder {
      background-color: #f5f5f5;
      border: 1px dashed #ccc;
      padding: 20px;
      text-align: center;
      margin: 15px 0;
      min-height: 100px;
    }
    ul, ol {
      margin-left: 20px;
      margin-bottom: 10px;
    }
    .document-title {
      font-size: 28pt;
      font-weight: bold;
      text-align: center;
      margin-top: 100px;
      margin-bottom: 10px;
      color: #2c3e50;
    }
    .document-subtitle {
      font-size: 16pt;
      text-align: center;
      margin-bottom: 100px;
      color: #7f8c8d;
    }
    .page-number {
      position: absolute;
      bottom: 20px;
      right: 20px;
      font-size: 9pt;
      color: #777;
    }
    .date {
      position: absolute;
      bottom: 20px;
      left: 20px;
      font-size: 9pt;
      color: #777;
    }
  `;

  // Document type-specific CSS
  let typeSpecificCss = '';
  switch (documentType) {
    case 'Role Specification':
      typeSpecificCss = `
        h1 { color: #3498db; }
        .header { background-color: #f8f9fa; padding: 15px; }
      `;
      break;
    case 'Candidate Brief':
      typeSpecificCss = `
        h1 { color: #27ae60; }
        .header { background-color: #f0f8f1; padding: 15px; }
      `;
      break;
    case 'Company Overview':
      typeSpecificCss = `
        h1 { color: #e74c3c; }
        .header { background-color: #fdf2f0; padding: 15px; }
      `;
      break;
    case 'Interview Guide':
      typeSpecificCss = `
        h1 { color: #9b59b6; }
        .header { background-color: #f5f0f7; padding: 15px; }
      `;
      break;
    case 'Candidate Report':
      typeSpecificCss = `
        h1 { color: #f39c12; }
        .header { background-color: #fef9e7; padding: 15px; }
      `;
      break;
    default:
      break;
  }

  // Generate content for each section
  let sectionsHtml = '';
  if (structure.sections && Array.isArray(structure.sections)) {
    structure.sections.forEach((section, index) => {
      const sectionContent = generateSectionContent(section, documentType);
      sectionsHtml += `
        <h2>${section.name}</h2>
        ${sectionContent}
      `;

      // Add image placeholder if appropriate
      if (index % 2 === 1) {
        sectionsHtml += `
          <div class="image-placeholder" id="imageDropZone${index + 1}">
            <span>Drag & Drop Image Here</span>
            <input type="file" accept="image/*">
          </div>
        `;
      }
    });
  }

  // Assemble the complete HTML document
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${documentType}</title>
      <style>
        ${css}
        ${typeSpecificCss}
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <h1>${documentType}</h1>
          <p>Generated on ${currentDate}</p>
        </div>

        <div class="document-title">${documentType}</div>
        <div class="document-subtitle">Professional Document</div>

        <div class="page-number">Page 1</div>
        <div class="date">${currentDate}</div>
      </div>

      <div class="page">
        <div class="header">
          <h1>${documentType}</h1>
        </div>

        ${sectionsHtml}

        <div class="page-number">Page 2</div>
        <div class="date">${currentDate}</div>
      </div>

      <div class="footer">
        Generated by Search Wizard Document Generator
      </div>
    </body>
    </html>
  `;

  return html;
}

/**
 * Generate content for a document section
 */
function generateSectionContent(section, documentType) {
  // Generate placeholder content based on section type and document type
  let content = '';

  switch (section.name.toLowerCase()) {
    case 'role overview':
    case 'company profile':
    case 'candidate summary':
    case 'interview overview':
    case 'candidate assessment':
      content = `
        <p>This section provides a comprehensive overview of the ${documentType.toLowerCase()}. It includes key information about the context, background, and purpose.</p>
        <p>The content is designed to give readers a clear understanding of the subject matter and its significance within the broader organizational context.</p>
      `;
      break;

    case 'responsibilities':
    case 'experience':
    case 'products/services':
    case 'key questions':
    case 'strengths':
      content = `
        <p>This section outlines the primary elements related to this aspect of the ${documentType.toLowerCase()}.</p>
        <ul>
          <li>Key point 1 with detailed explanation and context</li>
          <li>Key point 2 with supporting information and examples</li>
          <li>Key point 3 highlighting important aspects and considerations</li>
          <li>Key point 4 providing additional context and details</li>
        </ul>
      `;
      break;

    case 'requirements':
    case 'skills':
    case 'market position':
    case 'evaluation criteria':
    case 'areas for development':
      content = `
        <p>This section details the specific criteria and standards associated with this aspect of the ${documentType.toLowerCase()}.</p>
        <table>
          <tr>
            <th>Criteria</th>
            <th>Description</th>
            <th>Importance</th>
          </tr>
          <tr>
            <td>Criteria 1</td>
            <td>Detailed explanation of the first criteria</td>
            <td>High</td>
          </tr>
          <tr>
            <td>Criteria 2</td>
            <td>Detailed explanation of the second criteria</td>
            <td>Medium</td>
          </tr>
          <tr>
            <td>Criteria 3</td>
            <td>Detailed explanation of the third criteria</td>
            <td>High</td>
          </tr>
        </table>
      `;
      break;

    case 'benefits':
    case 'education':
    case 'culture':
    case 'next steps':
    case 'recommendation':
      content = `
        <p>This section provides important information about the outcomes and implications related to this aspect of the ${documentType.toLowerCase()}.</p>
        <ol>
          <li>Primary consideration with detailed explanation</li>
          <li>Secondary consideration with supporting information</li>
          <li>Tertiary consideration with contextual details</li>
        </ol>
        <p>These elements collectively contribute to a comprehensive understanding of this aspect and its significance within the overall document context.</p>
      `;
      break;

    default:
      content = `
        <p>This section contains important information related to ${section.name.toLowerCase()} within the context of this ${documentType.toLowerCase()}.</p>
        <p>The content is designed to provide readers with a clear understanding of this aspect and its relevance to the overall document purpose.</p>
      `;
  }

  return content;
}

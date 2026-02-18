import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

// Initialize Supabase client
// Check for both NEXT_PUBLIC_ prefixed and non-prefixed versions
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {

}

const supabase = createClient(supabaseUrl, supabaseKey);

// Path to example documents
const EXAMPLE_DOCS_DIR = path.join(process.cwd(), '..', 'backend', 'Example-docs');

export async function GET() {
  try {
    // Verify user authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get document structures from Example-docs directory
    const structures = await getExampleDocStructures();

    return NextResponse.json({ structures });
  } catch (error) {

    return NextResponse.json({ error: 'Failed to retrieve document structures' }, { status: 500 });
  }
}

/**
 * Get document structures from Example-docs directory
 */
async function getExampleDocStructures() {
  try {
    // Check if Example-docs directory exists
    if (!fs.existsSync(EXAMPLE_DOCS_DIR)) {

      return {};
    }

    // Get all subdirectories (document types)
    const documentTypes = fs.readdirSync(EXAMPLE_DOCS_DIR)
      .filter(item => {
        const itemPath = path.join(EXAMPLE_DOCS_DIR, item);
        return fs.statSync(itemPath).isDirectory();
      });

    // Process each document type
    const structures = {};
    for (const docType of documentTypes) {
      // Create a structure for this document type
      structures[docType] = createStructureFromDocType(docType);
    }

    return structures;
  } catch (error) {

    return {};
  }
}

/**
 * Create a structure object for a document type
 */
function createStructureFromDocType(documentType) {
  // Get the files in this document type directory
  const docTypePath = path.join(EXAMPLE_DOCS_DIR, documentType);
  const files = fs.readdirSync(docTypePath)
    .filter(file => {
      const filePath = path.join(docTypePath, file);
      return fs.statSync(filePath).isFile() && 
             (file.endsWith('.pdf') || file.endsWith('.docx') || file.endsWith('.txt'));
    });

  // Create sections based on document type
  let sections = [];

  switch (documentType) {
    case 'Role Specifications':
      sections = [
        {
          name: "Role Overview",
          description: "Overview of the role",
          content_guidelines: "Provide a high-level summary of the role, its purpose, and its place in the organization."
        },
        {
          name: "Responsibilities",
          description: "Key responsibilities of the role",
          content_guidelines: "List the main duties and responsibilities of the position."
        },
        {
          name: "Requirements",
          description: "Required qualifications and skills",
          content_guidelines: "Detail the required education, experience, skills, and qualifications."
        },
        {
          name: "Benefits",
          description: "Benefits and perks",
          content_guidelines: "Outline the compensation package, benefits, and other perks."
        }
      ];
      break;

    case 'Candidate Reports':
      sections = [
        {
          name: "Candidate Summary",
          description: "Summary of the candidate",
          content_guidelines: "Provide a concise overview of the candidate's background and suitability."
        },
        {
          name: "Experience",
          description: "Professional experience",
          content_guidelines: "Detail the candidate's work history and relevant experience."
        },
        {
          name: "Skills",
          description: "Key skills and competencies",
          content_guidelines: "List the candidate's technical and soft skills."
        },
        {
          name: "Recommendation",
          description: "Hiring recommendation",
          content_guidelines: "Provide a clear recommendation regarding the candidate's suitability."
        }
      ];
      break;

    case 'Company Info - Annual Reports etc':
      sections = [
        {
          name: "Company Profile",
          description: "Overview of the company",
          content_guidelines: "Provide a high-level summary of the company, its mission, and its values."
        },
        {
          name: "Products/Services",
          description: "Products or services offered",
          content_guidelines: "Detail the company's main products or services."
        },
        {
          name: "Market Position",
          description: "Market position and competitors",
          content_guidelines: "Outline the company's position in the market and its main competitors."
        },
        {
          name: "Culture",
          description: "Company culture and values",
          content_guidelines: "Describe the company's culture, values, and working environment."
        }
      ];
      break;

    case 'Analyst Reports':
      sections = [
        {
          name: "Executive Summary",
          description: "Summary of key findings",
          content_guidelines: "Provide a concise overview of the main findings and recommendations."
        },
        {
          name: "Analysis",
          description: "Detailed analysis",
          content_guidelines: "Present a thorough analysis of the subject matter."
        },
        {
          name: "Market Trends",
          description: "Current and future trends",
          content_guidelines: "Discuss relevant market trends and their implications."
        },
        {
          name: "Recommendations",
          description: "Strategic recommendations",
          content_guidelines: "Offer actionable recommendations based on the analysis."
        }
      ];
      break;

    default:
      // Generic sections for other document types
      sections = [
        {
          name: "Introduction",
          description: "Introduction section",
          content_guidelines: "Introduce the document"
        },
        {
          name: "Main Content",
          description: "Main content section",
          content_guidelines: "Provide the main content"
        },
        {
          name: "Conclusion",
          description: "Conclusion section",
          content_guidelines: "Conclude the document"
        }
      ];
  }

  // Create the structure object
  return {
    document_type: documentType,
    sections: sections,
    formatting: {
      preferred_style: "professional",
      tone: "formal"
    },
    example_files: files
  };
}

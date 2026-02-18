import path from 'path';
import fs from 'fs';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

    // Get all document structures from example documents
    const structures = await getDocumentStructures();

    return NextResponse.json({ structures });
  } catch (error) {

    return NextResponse.json({ error: 'Failed to retrieve document structures' }, { status: 500 });
  }
}

/**
 * Get document structures from example documents
 */
async function getDocumentStructures() {
  try {
    // Check if Example-docs directory exists
    if (!fs.existsSync(EXAMPLE_DOCS_DIR)) {

      return {};
    }

    // Get all subdirectories (document types)
    const documentTypes = fs.readdirSync(EXAMPLE_DOCS_DIR)
      .filter(item => fs.statSync(path.join(EXAMPLE_DOCS_DIR, item)).isDirectory());

    // Process each document type
    const structures = {};
    for (const docType of documentTypes) {
      // Get first example file for this document type
      const docTypePath = path.join(EXAMPLE_DOCS_DIR, docType);
      const exampleFiles = fs.readdirSync(docTypePath)
        .filter(file => {
          const filePath = path.join(docTypePath, file);
          return fs.statSync(filePath).isFile() && 
                 (file.endsWith('.pdf') || file.endsWith('.docx') || file.endsWith('.txt'));
        });

      if (exampleFiles.length > 0) {
        // For now, return a simplified structure since we can't easily run the Python code from here
        structures[docType] = createBasicStructure(docType);
      }
    }

    return structures;
  } catch (error) {

    return {};
  }
}

/**
 * Create a basic document structure
 */
function createBasicStructure(documentType) {
  // Create a basic structure based on document type
  let sections = [];

  switch (documentType) {
    case 'Role Specification':
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

    case 'Candidate Brief':
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
          name: "Education",
          description: "Educational background",
          content_guidelines: "Outline the candidate's educational qualifications."
        }
      ];
      break;

    case 'Company Overview':
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

    case 'Interview Guide':
      sections = [
        {
          name: "Interview Overview",
          description: "Overview of the interview process",
          content_guidelines: "Provide a summary of the interview stages and objectives."
        },
        {
          name: "Key Questions",
          description: "Key questions to ask",
          content_guidelines: "List important questions to assess the candidate's suitability."
        },
        {
          name: "Evaluation Criteria",
          description: "Criteria for evaluation",
          content_guidelines: "Detail the criteria for evaluating the candidate's responses."
        },
        {
          name: "Next Steps",
          description: "Next steps in the process",
          content_guidelines: "Outline the next steps following the interview."
        }
      ];
      break;

    case 'Candidate Report':
      sections = [
        {
          name: "Candidate Assessment",
          description: "Overall assessment of the candidate",
          content_guidelines: "Provide a comprehensive evaluation of the candidate."
        },
        {
          name: "Strengths",
          description: "Candidate strengths",
          content_guidelines: "Detail the candidate's key strengths and positive attributes."
        },
        {
          name: "Areas for Development",
          description: "Areas for development",
          content_guidelines: "Identify areas where the candidate could improve or develop."
        },
        {
          name: "Recommendation",
          description: "Hiring recommendation",
          content_guidelines: "Provide a clear recommendation regarding the candidate's suitability."
        }
      ];
      break;

    default:
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

  return {
    document_type: documentType,
    sections: sections,
    formatting: {
      preferred_style: "professional",
      tone: "formal"
    }
  };
}

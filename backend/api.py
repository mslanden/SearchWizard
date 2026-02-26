#!/usr/bin/env python3
"""
API Server for Search Wizard

This FastAPI server exposes endpoints for document generation and other backend functionality.
"""

import os
import json
import sys
import datetime
import requests
import base64
import io
import anthropic
from typing import Optional, Dict, List, Any
import uuid
from fastapi import FastAPI, HTTPException, Body, File, UploadFile, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
from pdf2image import convert_from_bytes
from supabase import create_client, Client

# Add the parent directory to sys.path to allow imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables for API keys
load_dotenv()

# Print environment variables for debugging
print("Environment variables loaded:")
print(f"PORT: {os.environ.get('PORT', 'Not set (will use default)')}")
print(f"NEXT_PUBLIC_SUPABASE_URL: {'Set' if os.environ.get('NEXT_PUBLIC_SUPABASE_URL') else 'Not set'}")
print(f"NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: {'Set' if os.environ.get('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY') else 'Not set'}")
print(f"OPENAI_API_KEY: {'Set' if os.environ.get('OPENAI_API_KEY') else 'Not set'}")
print(f"ANTHROPIC_API_KEY: {'Set' if os.environ.get('ANTHROPIC_API_KEY') else 'Not set'}")
print(f"GEMINI_API_KEY: {'Set' if os.environ.get('GEMINI_API_KEY') else 'Not set'}")

from agents.structure_agent import StructureAgent
from agents.kb_support import enhance_prompt_with_kb

# Import our utility functions
from utils import extract_text_from_pdf

# ---------------------------------------------------------------------------
# Module-level configuration — loaded once at startup
# ---------------------------------------------------------------------------
SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY', '')
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')

# Generation limits — centralised here so they are easy to tune
MAX_TEMPLATE_CONTENT_CHARS = 15000   # chars of golden example fed to template creation
MAX_STORED_CONTENT_CHARS   = 15000   # chars stored in original_content DB column
MAX_ARTIFACT_CHARS         = 2000    # chars per artifact included in generation prompt
MAX_COMPANY_ARTIFACTS      = 3       # company artifacts included in generation prompt
MAX_ROLE_ARTIFACTS         = 3       # role artifacts included in generation prompt
MAX_CANDIDATES             = 5       # candidates included in generation prompt
MAX_INTERVIEWERS           = 3       # interviewers included in generation prompt
VISION_MAX_TOKENS          = 2000    # max_tokens for PDF visual analysis call
TEMPLATE_MAX_TOKENS        = 3000    # max_tokens for template prompt creation call
GENERATION_MAX_TOKENS      = 8000    # max_tokens for final document generation call
PDF_VISION_PAGES           = 2       # number of PDF pages sent to Claude Vision

# Initialize FastAPI app
app = FastAPI(title="Search Wizard API", 
              description="API for document generation and other backend functionality",
              version="1.0.0")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint to verify the API is running"""
    return {"status": "ok", "message": "API is running"}

# Mount static files directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# Add CORS middleware
# CORS_ALLOWED_ORIGINS env var can be a comma-separated list of additional origins.
# Set this in Railway per environment to avoid hardcoding environment-specific URLs.
_base_origins = [
    "https://searchwizard.ai",
    "https://www.searchwizard.ai",
    "https://search-wizard-smoky.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001",
]
_extra_origins = [
    o.strip() for o in os.environ.get("CORS_ALLOWED_ORIGINS", "").split(",") if o.strip()
]
_allowed_origins = _base_origins + _extra_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# File analysis endpoint
@app.post("/analyze-file")
async def analyze_file(file: UploadFile = File(...)):
    """Analyze a file using the StructureAgent to extract document structure"""
    try:
        # Save the uploaded file to a temporary location
        temp_file_path = f"/tmp/{file.filename}"
        with open(temp_file_path, "wb") as temp_file:
            content = await file.read()
            temp_file.write(content)
            
        # Initialize the structure agent
        structure_agent = StructureAgent(framework="openai")
        
        # Analyze the file
        structure = structure_agent.analyze_structure([temp_file_path])
        
        # Clean up the temporary file
        os.remove(temp_file_path)
        
        return {"structure": structure}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing file: {str(e)}")

# Structure analysis endpoint
@app.post("/analyze-structure")
async def analyze_structure(request: dict = Body(...)):
    """Analyze a document structure from a file URL"""
    try:
        document_id = request.get("documentId")
        file_url = request.get("fileUrl")
        
        if not document_id or not file_url:
            raise HTTPException(status_code=400, detail="Missing documentId or fileUrl")
            
        # Download the file from the URL
        temp_file_path = f"/tmp/document_{document_id}.pdf"
        response = requests.get(file_url)
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Failed to download file: {response.status_code}")
            
        with open(temp_file_path, "wb") as temp_file:
            temp_file.write(response.content)
            
        # Initialize the structure agent
        structure_agent = StructureAgent(framework="openai")
        
        # Analyze the file
        structure = structure_agent.analyze_structure([temp_file_path])
        
        # Clean up the temporary file
        os.remove(temp_file_path)
        
        return {"structure": structure}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing structure: {str(e)}")

# Template creation endpoint (V2 approach)
@app.post("/api/templates")
async def create_template(
    file: UploadFile = File(...),
    name: str = Form(...),
    user_id: str = Form(...),
    document_type: str = Form(None)
):
    """Create a new template using V2 approach with Claude Vision analysis"""
    try:
        import base64
        import io
        from pdf2image import convert_from_bytes
        import anthropic

        if not SUPABASE_URL or not SUPABASE_KEY:
            raise HTTPException(status_code=500, detail="Supabase configuration missing")

        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

        # Read file content
        file_content = await file.read()
        
        # Extract text content
        original_content = ""
        if file.content_type == "application/pdf":
            original_content = extract_text_from_pdf(file_content)
        else:
            # For text files
            original_content = file_content.decode('utf-8')
        
        if not original_content or len(original_content) < 10:
            raise HTTPException(status_code=400, detail="Could not extract meaningful content from file")
        
        # Initialize Anthropic client
        if not ANTHROPIC_API_KEY:
            raise HTTPException(status_code=500, detail="Anthropic API key not configured. Please set ANTHROPIC_API_KEY environment variable.")

        try:
            anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to initialize Anthropic client: {str(e)}")
        
        # Convert PDF to images for Claude Vision (if PDF)
        visual_data = {}
        if file.content_type == "application/pdf":
            try:
                # Convert PDF to images
                images = convert_from_bytes(file_content, first_page=1, last_page=PDF_VISION_PAGES + 1)

                # Prepare images for Claude Vision
                image_data = []
                for i, image in enumerate(images[:PDF_VISION_PAGES]):
                    buffer = io.BytesIO()
                    image.save(buffer, format='PNG')
                    buffer.seek(0)
                    image_b64 = base64.b64encode(buffer.getvalue()).decode()
                    image_data.append(image_b64)
                
                visual_prompt = """Analyze this document's visual design and styling. Extract:
1. Color scheme (background, text, accent colors)
2. Typography (fonts, sizes, hierarchy)
3. Layout patterns (margins, spacing, alignment)
4. Visual elements (borders, tables, formatting)
5. Professional style (modern, traditional, corporate)

Return as JSON with keys: colors, typography, layout, elements, overall_style, css_guidelines"""

                # Create message content with images
                message_content = [{"type": "text", "text": visual_prompt}]
                for img_b64 in image_data:
                    message_content.append({
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": img_b64
                        }
                    })
                
                vision_response = anthropic_client.messages.create(
                    model="claude-sonnet-4-6",
                    max_tokens=VISION_MAX_TOKENS,
                    messages=[{
                        "role": "user", 
                        "content": message_content
                    }]
                )
                
                # Try to parse visual analysis as JSON
                try:
                    visual_data = json.loads(vision_response.content[0].text)
                except:
                    visual_data = {"analysis": vision_response.content[0].text}
                    
            except Exception as e:
                print(f"Visual analysis failed: {str(e)}")
                visual_data = {"error": "Visual analysis not available"}
        
        # Create comprehensive template prompt using single AI call
        template_creation_prompt = f"""Analyze this document and create a comprehensive template for generating similar documents.

DOCUMENT CONTENT:
{original_content[:MAX_TEMPLATE_CONTENT_CHARS]}

VISUAL STYLING DATA:
{json.dumps(visual_data, indent=2)}

Create a detailed template prompt that includes:
1. Document structure and sections
2. Writing style and tone
3. Visual formatting requirements
4. Content organization patterns
5. Professional standards

The template should allow generating similar documents by combining it with:
- Company information (name, address, contact details)
- Role/position specific content
- Candidate information
- Process requirements
- User's specific requirements

Return ONLY the template prompt text that will be used for document generation."""

        # Generate template prompt
        template_response = anthropic_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=TEMPLATE_MAX_TOKENS,
            messages=[{
                "role": "user",
                "content": template_creation_prompt
            }]
        )
        
        template_prompt = template_response.content[0].text
        
        # Upload file to Supabase storage for viewing later
        file_extension = os.path.splitext(file.filename)[1]
        storage_filename = f"{user_id}/{name}_{datetime.datetime.now().isoformat()}{file_extension}"
        
        try:
            storage_response = supabase.storage.from_("golden-examples").upload(
                storage_filename, file_content, {"content-type": file.content_type}
            )
            
            # Get public URL
            original_file_url = supabase.storage.from_("golden-examples").get_public_url(storage_filename)
            
        except Exception as e:
            print(f"File upload failed: {str(e)}")
            original_file_url = None
        
        # Determine document type (use explicitly provided type, else guess from name)
        if not document_type:
            document_type = "document"
            if "resume" in name.lower() or "cv" in name.lower():
                document_type = "resume"
            elif "cover" in name.lower() or "letter" in name.lower():
                document_type = "cover_letter"
            elif "job" in name.lower() or "role" in name.lower():
                document_type = "job_description"
        
        # Save template to database
        template_data = {
            "id": str(uuid.uuid4()),  # Generate UUID for the template
            "name": name,
            "user_id": user_id,
            "document_type": document_type,
            "file_type": file.content_type,
            "original_content": original_content[:MAX_STORED_CONTENT_CHARS] if original_content else "",
            "template_prompt": template_prompt,
            "visual_data": visual_data,
            "original_file_url": original_file_url,
            "file_size": len(file_content),
            "usage_count": 0,
            "is_global": False,
            "version": 2,  # Mark as v2 template
            "date_added": datetime.datetime.utcnow().isoformat()
        }
        
        result = supabase.table('golden_examples').insert(template_data).execute()
        
        return {
            "success": True,
            "template_id": result.data[0]["id"],
            "message": "Template created successfully",
            "visual_analysis_available": len(visual_data) > 1
        }
        
    except Exception as e:
        print(f"Template creation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating template: {str(e)}")

# Template listing endpoint
@app.get("/api/templates")
async def list_templates(user_id: str = Query(...)):
    """List all templates for a user"""
    try:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise HTTPException(status_code=500, detail="Supabase configuration missing")
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

        # Get user's templates + global templates
        response = supabase.table('golden_examples').select(
            'id, name, document_type, file_type, original_file_url, usage_count, date_added, visual_data, version'
        ).or_(f'user_id.eq.{user_id},is_global.eq.true').order('date_added', desc=True).execute()
        
        return {"templates": response.data}
        
    except Exception as e:
        print(f"Template listing error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error listing templates: {str(e)}")

# Template deletion endpoint
@app.delete("/api/templates/{template_id}")
async def delete_template(template_id: str, user_id: str = Query(...)):
    """Delete a template"""
    try:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise HTTPException(status_code=500, detail="Supabase configuration missing")
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

        # Verify ownership and delete
        response = supabase.table('golden_examples').delete().eq('id', template_id).eq('user_id', user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Template not found or access denied")
        
        return {"success": True, "message": "Template deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Template deletion error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting template: {str(e)}")

# New V2 Document generation endpoint using templates + artifacts
@app.post("/api/generate-document")
async def generate_document_v2(
    template_id: str = Body(...),
    project_id: str = Body(...),
    user_id: str = Body(...),
    user_requirements: str = Body(default="")
):
    """Generate document using V2 approach: template + project artifacts"""
    try:
        import anthropic

        if not SUPABASE_URL or not SUPABASE_KEY:
            raise HTTPException(status_code=500, detail="Supabase configuration missing")

        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        
        # Get template
        template_response = supabase.table('golden_examples').select('*').eq('id', template_id).single().execute()
        if not template_response.data:
            raise HTTPException(status_code=404, detail="Template not found")
        
        template = template_response.data
        
        # Get project artifacts
        artifacts_response = supabase.table('artifacts').select('*').eq('project_id', project_id).execute()
        artifacts = artifacts_response.data or []
        
        # Organize artifacts by type
        company_artifacts = [a for a in artifacts if a.get('artifact_type') == 'company']
        role_artifacts = [a for a in artifacts if a.get('artifact_type') == 'role']
        
        # Get candidates and interviewers for additional context
        candidates_response = supabase.table('candidates').select('*').eq('project_id', project_id).execute()
        candidates = candidates_response.data or []
        
        interviewers_response = supabase.table('interviewers').select('*').eq('project_id', project_id).execute()
        interviewers = interviewers_response.data or []
        
        # Build context from artifacts
        def extract_artifact_content(artifact):
            content = artifact.get('processed_content') or artifact.get('description', '')
            if not content and artifact.get('file_url'):
                # Try to fetch content from file if needed
                try:
                    import requests
                    response = requests.get(artifact['file_url'])
                    if response.status_code == 200:
                        if 'pdf' in response.headers.get('Content-Type', ''):
                            content = extract_text_from_pdf(response.content)
                        else:
                            content = response.text
                except:
                    content = f"[File: {artifact.get('name', 'Unknown')}]"
            return content
        
        # Compile context
        company_context = ""
        if company_artifacts:
            company_context = "\n\n".join([
                f"**{a.get('name', 'Company Document')}**:\n{extract_artifact_content(a)[:MAX_ARTIFACT_CHARS]}"
                for a in company_artifacts[:MAX_COMPANY_ARTIFACTS]
            ])

        role_context = ""
        if role_artifacts:
            role_context = "\n\n".join([
                f"**{a.get('name', 'Role Document')}**:\n{extract_artifact_content(a)[:MAX_ARTIFACT_CHARS]}"
                for a in role_artifacts[:MAX_ROLE_ARTIFACTS]
            ])

        candidate_context = ""
        if candidates:
            candidate_context = "\n\n".join([
                f"**{c.get('name', 'Candidate')}** ({c.get('role', 'Position')}): {c.get('company', 'Company')}"
                for c in candidates[:MAX_CANDIDATES]
            ])

        process_context = ""
        if interviewers:
            process_context = "\n\n".join([
                f"**{i.get('name', 'Interviewer')}** ({i.get('position', 'Position')})"
                for i in interviewers[:MAX_INTERVIEWERS]
            ])
        
        # Create comprehensive generation prompt
        generation_prompt = f"""
{template.get('template_prompt', '')}

COMPANY CONTEXT:
{company_context}

ROLE/POSITION CONTEXT:
{role_context}

CANDIDATE INFORMATION:
{candidate_context}

PROCESS/INTERVIEWER INFORMATION:
{process_context}

VISUAL STYLING REQUIREMENTS:
{json.dumps(template.get('visual_data', {}), indent=2)}

USER SPECIFIC REQUIREMENTS:
{user_requirements}

Generate a complete, professional document that follows the template structure and visual styling while incorporating all the relevant context provided above. Ensure the document is well-formatted HTML that matches the original template's professional appearance.
"""
        
        # Generate document
        response = anthropic_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=GENERATION_MAX_TOKENS,
            messages=[{
                "role": "user",
                "content": generation_prompt
            }]
        )
        
        generated_content = response.content[0].text
        
        # Update template usage count
        supabase.table('golden_examples').update({
            'usage_count': template.get('usage_count', 0) + 1
        }).eq('id', template_id).execute()
        
        return {
            "success": True,
            "html_content": generated_content,
            "template_used": template.get('name', ''),
            "document_type": template.get('document_type', 'document'),
            "timestamp": datetime.datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"Document generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating document: {str(e)}")

@app.get("/")
async def root():
    """Root endpoint to check if the API is running."""
    return {"status": "ok", "message": "Search Wizard API is running"}

# Content processing endpoints
class ProcessContentRequest(BaseModel):
    content_type: str  # 'url' or 'text'
    content: str       # URL or text content
    artifact_type: Optional[str] = None

class ProcessContentResponse(BaseModel):
    processed_content: str
    content_type: str
    metadata: Dict[str, Any]

@app.post("/process-content", response_model=ProcessContentResponse)
async def process_content(request: ProcessContentRequest):
    """Process URL or text content for artifact creation."""
    from utils import scrape_url_content, process_text_content
    
    try:
        if request.content_type == "url":
            # Scrape URL content
            scraped_content = scrape_url_content(request.content)
            processed_content = process_text_content(scraped_content, request.artifact_type)
            
            return ProcessContentResponse(
                processed_content=processed_content,
                content_type="url",
                metadata={
                    "source_url": request.content,
                    "content_length": len(processed_content),
                    "artifact_type": request.artifact_type
                }
            )
            
        elif request.content_type == "text":
            # Process text content
            processed_content = process_text_content(request.content, request.artifact_type)
            
            return ProcessContentResponse(
                processed_content=processed_content,
                content_type="text",
                metadata={
                    "content_length": len(processed_content),
                    "artifact_type": request.artifact_type
                }
            )
            
        else:
            raise HTTPException(status_code=400, detail="Invalid content_type. Must be 'url' or 'text'")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing content: {str(e)}")

@app.post("/generate-document")
async def generate_document_legacy():
    """Legacy endpoint — removed. Use /api/generate-document (V2) instead."""
    raise HTTPException(status_code=410, detail="Legacy endpoint removed. Use /api/generate-document (V2) instead.")

# Run the server
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting FastAPI server on http://0.0.0.0:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)

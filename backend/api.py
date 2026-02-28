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
import asyncio
from fastapi import FastAPI, HTTPException, Body, File, UploadFile, Form, Query, BackgroundTasks
from pipeline.pipeline_runner import run_pipeline_and_store
from brain.brain import build_brain_context, call_claude
from brain.embedder import embed_and_store
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
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
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')

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

# Blueprint pipeline token limits
BLUEPRINT_SEMANTIC_MAX_TOKENS = 4000
BLUEPRINT_VISUAL_MAX_TOKENS   = 3000
BLUEPRINT_LAYOUT_MAX_TOKENS   = 2000

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
        
        # Convert PDF to images for Claude Vision (if PDF) — uses PyMuPDF, no poppler required
        visual_data = {}
        if file.content_type == "application/pdf":
            try:
                import fitz  # PyMuPDF
                doc = fitz.open(stream=file_content, filetype="pdf")
                mat = fitz.Matrix(1.5, 1.5)  # 108 DPI equivalent
                image_data = []
                for i, page in enumerate(doc):
                    if i >= PDF_VISION_PAGES:
                        break
                    pix = page.get_pixmap(matrix=mat)
                    png_bytes = pix.tobytes("png")
                    image_data.append(base64.b64encode(png_bytes).decode())
                doc.close()
                
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

# ---------------------------------------------------------------------------
# V3 Template creation — async Document DNA pipeline
# ---------------------------------------------------------------------------

@app.post("/api/templates/v3")
async def create_template_v3(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    name: str = Form(...),
    user_id: str = Form(...),
    document_type: str = Form(None),
):
    """
    Create a golden example template using the V3 Document DNA pipeline.

    Returns HTTP 202 immediately after uploading the file and inserting a
    'processing' DB record.  The blueprint is built asynchronously in the
    background; poll GET /api/templates/{id}/status for completion.
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(status_code=500, detail="Supabase configuration missing")
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured")

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    file_bytes = await file.read()
    if len(file_bytes) < 10:
        raise HTTPException(status_code=400, detail="Uploaded file is empty or too small")

    # Resolve document_type
    if not document_type:
        document_type = "document"

    # Upload file to Supabase storage
    file_extension = os.path.splitext(file.filename or "file")[1]
    storage_filename = f"{user_id}/{name}_{datetime.datetime.utcnow().isoformat()}{file_extension}"
    original_file_url = None
    try:
        supabase.storage.from_("golden-examples").upload(
            storage_filename, file_bytes, {"content-type": file.content_type or "application/octet-stream"}
        )
        original_file_url = supabase.storage.from_("golden-examples").get_public_url(storage_filename)
    except Exception as e:
        print(f"V3 file upload failed: {e}")

    # Insert DB record with status='processing'
    template_id = str(uuid.uuid4())
    template_data = {
        "id": template_id,
        "name": name,
        "user_id": user_id,
        "document_type": document_type,
        "file_type": file.content_type or "application/octet-stream",
        "original_content": "",
        "template_prompt": None,
        "visual_data": None,
        "blueprint": None,
        "status": "processing",
        "original_file_url": original_file_url,
        "file_size": len(file_bytes),
        "usage_count": 0,
        "is_global": False,
        "version": 3,
        "date_added": datetime.datetime.utcnow().isoformat(),
    }
    supabase.table("golden_examples").insert(template_data).execute()

    # Dispatch pipeline as a background task
    background_tasks.add_task(
        run_pipeline_and_store,
        SUPABASE_URL,
        SUPABASE_KEY,
        ANTHROPIC_API_KEY,
        template_id,
        file_bytes,
        file.filename or f"file{file_extension}",
        document_type,
    )

    return {"template_id": template_id, "status": "processing"}


@app.get("/api/templates/{template_id}/status")
async def get_template_status(template_id: str, user_id: str = Query(...)):
    """Poll the processing status of a V3 template blueprint pipeline."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(status_code=500, detail="Supabase configuration missing")

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    response = (
        supabase.table("golden_examples")
        .select("id, status, blueprint, processing_error")
        .eq("id", template_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Template not found or access denied")

    record = response.data
    return {
        "status": record.get("status", "ready"),
        "blueprint": record.get("blueprint"),
        "error": record.get("processing_error"),
    }


# ---------------------------------------------------------------------------
# Helper: convert a V3 blueprint into a generation prompt (V2-compatible)
# ---------------------------------------------------------------------------

def _blueprint_to_generation_prompt(blueprint: dict) -> str:
    """
    Serialise a JSON blueprint into a structured generation prompt string
    that the existing generate_document_v2 handler can consume.
    """
    import json

    content_spec = blueprint.get("content_structure_spec", {})
    layout_spec = blueprint.get("layout_spec", {})
    visual_spec = blueprint.get("visual_style_spec", {})

    sections = content_spec.get("sections", [])
    section_lines = []
    for s in sections:
        indent = "  " * (s.get("depth", 1) - 1)
        section_lines.append(
            f"{indent}- [{s.get('intent', '').upper()}] {s.get('title', '')}: "
            f"{s.get('micro_template', '')}"
        )

    prompt = f"""DOCUMENT STRUCTURE (from blueprint analysis):
{chr(10).join(section_lines)}

LAYOUT SPECIFICATION:
- Page size: {layout_spec.get('page_size', 'A4')}
- Column structure: {layout_spec.get('column_structure', 'single')}
- Margins: {json.dumps(layout_spec.get('margins_pt', {}))}

VISUAL STYLE:
- Typography: {json.dumps(visual_spec.get('typography', {}), indent=2)}
- Color palette: {json.dumps(visual_spec.get('color_palette', {}), indent=2)}

Follow this structure precisely when generating the document. Use the section intents and micro-templates as writing guidance. Apply the visual style tokens to format headings, body text, and tables."""

    return prompt


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
            'id, name, document_type, file_type, original_file_url, usage_count, date_added, '
            'visual_data, version, status, blueprint, template_prompt'
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

        # Build generation prompt — prefer V3 blueprint when available
        blueprint = template.get("blueprint")
        if blueprint:
            template_prompt_text = _blueprint_to_generation_prompt(blueprint)
            visual_data_json = blueprint.get("visual_style_spec", {})
        else:
            template_prompt_text = template.get("template_prompt", "")
            visual_data_json = template.get("visual_data", {})

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
{template_prompt_text}

COMPANY CONTEXT:
{company_context}

ROLE/POSITION CONTEXT:
{role_context}

CANDIDATE INFORMATION:
{candidate_context}

PROCESS/INTERVIEWER INFORMATION:
{process_context}

VISUAL STYLING REQUIREMENTS:
{json.dumps(visual_data_json, indent=2)}

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

@app.post("/api/generate-document/v3")
async def generate_document_v3_endpoint(
    template_id:      str           = Body(...),
    project_id:       str           = Body(...),
    user_id:          str           = Body(...),
    user_requirements: str          = Body(default=""),
    candidate_id:     Optional[str] = Body(default=None),
    interviewer_id:   Optional[str] = Body(default=None),
    preview_only:     bool          = Body(default=False),
):
    """
    V3 document generation using Project Brain semantic artifact selection.

    The Brain reads the template's V3 blueprint, scores all project artifacts against
    the blueprint's section intents using OpenAI embeddings (keyword fallback when
    embeddings are absent), and composes a structured generation prompt.

    If preview_only=True: returns assembled prompt + selected_artifacts without
    calling Claude (used by the "Preview Prompt" feature in the frontend).
    """
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

        context = await build_brain_context(
            supabase=supabase,
            project_id=project_id,
            template_id=template_id,
            candidate_id=candidate_id,
            interviewer_id=interviewer_id,
            user_requirements=user_requirements,
        )

        if preview_only:
            return {
                "prompt": context["prompt"],
                "selected_artifacts": context["selected_artifacts"],
            }

        html_content = await call_claude(
            anthropic_client=anthropic_client,
            prompt=context["prompt"],
            max_tokens=GENERATION_MAX_TOKENS,
        )

        # Increment template usage count
        try:
            template_resp = supabase.table('golden_examples').select(
                'usage_count'
            ).eq('id', template_id).single().execute()
            current_count = (template_resp.data or {}).get('usage_count', 0) or 0
            supabase.table('golden_examples').update(
                {'usage_count': current_count + 1}
            ).eq('id', template_id).execute()
        except Exception:
            pass  # Non-critical

        return {
            "success": True,
            "html_content": html_content,
            "selected_artifacts": context["selected_artifacts"],
            "document_type": context.get("document_type", ""),
            "timestamp": datetime.datetime.now().isoformat(),
        }

    except Exception as e:
        print(f"V3 document generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating document: {str(e)}")


@app.post("/api/artifacts/embed")
async def embed_artifact_endpoint(
    artifact_id: str = Body(...),
    table:       str = Body(...),
    user_id:     str = Body(...),
):
    """
    Generate and store an embedding for a single artifact.
    Called fire-and-forget from the frontend immediately after artifact upload.
    Supported tables: 'artifacts', 'candidate_artifacts', 'process_artifacts'.
    """
    allowed_tables = {'artifacts', 'candidate_artifacts', 'process_artifacts'}
    if table not in allowed_tables:
        raise HTTPException(status_code=400, detail=f"Invalid table: {table}")

    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        art_resp = supabase.table(table).select('*').eq('id', artifact_id).single().execute()
        if not art_resp.data:
            raise HTTPException(status_code=404, detail="Artifact not found")
        await embed_and_store(supabase, artifact_id, table, art_resp.data)
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Artifact embed error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating embedding: {str(e)}")


async def _backfill_all_embeddings(supabase) -> None:
    """Background task: generate embeddings for all artifacts with null embedding."""
    for table in ('artifacts', 'candidate_artifacts', 'process_artifacts'):
        try:
            resp = supabase.table(table).select('*').is_('embedding', 'null').execute()
            for artifact in (resp.data or []):
                try:
                    await embed_and_store(supabase, artifact['id'], table, artifact)
                    print(f"[backfill] Embedded {table}/{artifact['id']}")
                except Exception as e:
                    print(f"[backfill] Failed {table}/{artifact['id']}: {e}")
        except Exception as e:
            print(f"[backfill] Failed to query {table}: {e}")


@app.post("/api/brain/generate-embeddings")
async def backfill_embeddings(
    user_id: str = Body(...),
    background_tasks: BackgroundTasks = None,
):
    """
    Admin endpoint: queue embedding generation for all artifacts with null embeddings.
    Useful for backfilling existing artifacts uploaded before this feature was introduced.
    """
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    if background_tasks is None:
        background_tasks = BackgroundTasks()
    background_tasks.add_task(_backfill_all_embeddings, supabase)
    return {"status": "queued", "message": "Embedding backfill queued for all artifact tables"}


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

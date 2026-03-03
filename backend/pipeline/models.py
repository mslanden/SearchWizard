"""
Pydantic models for the Document DNA pipeline.
Defines the Intermediate Document Model (IDM) and the JSON Blueprint schema.
"""

from typing import Optional, List, Any
from pydantic import BaseModel, Field
import datetime


# ---------------------------------------------------------------------------
# Intermediate Document Model (IDM) — output of Stage A (Preprocessor)
# ---------------------------------------------------------------------------

class BlockStyle(BaseModel):
    font_name: Optional[str] = None
    font_size_pt: Optional[float] = None
    font_weight: Optional[str] = None        # "normal" | "bold"
    font_italic: Optional[bool] = None
    color_hex: Optional[str] = None          # e.g. "#1F3864"
    background_color_hex: Optional[str] = None
    text_alignment: Optional[str] = None     # "left" | "center" | "right" | "justify"


class BBox(BaseModel):
    x0: float
    y0: float
    x1: float
    y1: float


class Line(BaseModel):
    text: str
    bbox: Optional[BBox] = None


class Block(BaseModel):
    block_id: str
    block_type: str                          # "text" | "image" | "table" | "header" | "footer"
    bbox: Optional[BBox] = None              # None for DOCX (no native coordinate system)
    text: str = ""
    lines: List[Line] = Field(default_factory=list)
    style: Optional[BlockStyle] = None
    ocr_confidence: Optional[float] = None  # None if native; 0.0-1.0 if OCR


class Page(BaseModel):
    page_number: int
    blocks: List[Block] = Field(default_factory=list)


class DocumentMetadata(BaseModel):
    title: Optional[str] = None
    page_size: str = "unknown"               # "A4" | "Letter" | "custom"
    width_pt: Optional[float] = None
    height_pt: Optional[float] = None
    margins: Optional[dict] = None          # {"top": 72, "bottom": 72, "left": 72, "right": 72}
    is_scanned: bool = False
    ocr_used: bool = False


class IntermediateDocumentModel(BaseModel):
    document_id: str
    source_format: str                       # "pdf" | "docx" | "image"
    page_count: int
    metadata: DocumentMetadata
    pages: List[Page] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# JSON Blueprint — output of Stage E (Assembler)
# ---------------------------------------------------------------------------

class Section(BaseModel):
    section_id: str
    title: str
    depth: int = 1
    intent: str = ""
    allowed_element_types: List[str] = Field(default_factory=list)
    rhetorical_pattern: str = ""
    micro_template: str = ""
    typography_role: str = "body"            # Added by assembler: "h1" | "h2" | "h3" | "body"
    child_sections: List[Any] = Field(default_factory=list)


class ContentStructureSpec(BaseModel):
    sections: List[Section] = Field(default_factory=list)


class SpacingRules(BaseModel):
    before_h1_pt: float = 24.0
    after_h1_pt: float = 12.0
    before_h2_pt: float = 18.0
    after_h2_pt: float = 8.0
    paragraph_spacing_pt: float = 6.0
    line_spacing_multiple: float = 1.15


class HeaderFooterRule(BaseModel):
    present: bool = False
    content_pattern: str = ""


class LayoutSpec(BaseModel):
    page_size: str = "A4"
    margins_pt: dict = Field(default_factory=lambda: {"top": 72, "bottom": 72, "left": 72, "right": 72})
    column_structure: str = "single"        # "single" | "two-column"
    section_order: List[str] = Field(default_factory=list)
    spacing_rules: SpacingRules = Field(default_factory=SpacingRules)
    header_rule: HeaderFooterRule = Field(default_factory=HeaderFooterRule)
    footer_rule: HeaderFooterRule = Field(default_factory=HeaderFooterRule)
    table_placement: str = "inline"         # "inline" | "full_width"
    image_placement: str = "inline"         # "inline" | "float_right"


class TypographyToken(BaseModel):
    font_family: Optional[str] = None
    size_pt: Optional[float] = None
    weight: Optional[str] = None
    color_hex: Optional[str] = None
    inferred: bool = False


class BulletStyle(BaseModel):
    level_1: str = "•"
    level_2: str = "–"
    indent_pt: float = 18.0


class ParagraphRules(BaseModel):
    first_line_indent_pt: float = 0.0
    space_between_paragraphs_pt: float = 6.0


class VisualStyleSpec(BaseModel):
    typography: dict = Field(default_factory=dict)   # keys: h1, h2, h3, body, caption, table_header
    color_palette: dict = Field(default_factory=dict) # keys: primary, secondary, accent, background, etc.
    bullet_style: BulletStyle = Field(default_factory=BulletStyle)
    paragraph_rules: ParagraphRules = Field(default_factory=ParagraphRules)


class JSONBlueprint(BaseModel):
    blueprint_id: str
    golden_example_id: str
    document_type: str
    generated_at: str
    content_structure_spec: ContentStructureSpec
    layout_spec: LayoutSpec
    visual_style_spec: VisualStyleSpec

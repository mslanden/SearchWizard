"use client";

import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

// ─── Helpers ────────────────────────────────────────────────────────────────

function InferredBadge() {
  return (
    <span className="ml-1 inline-block rounded px-1.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700">
      inferred
    </span>
  );
}

function ErrorBadge({ message }) {
  return (
    <span className="ml-1 inline-block rounded px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700" title={message}>
      error
    </span>
  );
}

function SectionNode({ section, depth = 0 }) {
  const indent = depth * 16;
  return (
    <div style={{ marginLeft: indent }} className="mb-3 border-l-2 border-gray-200 pl-3">
      <div className="text-sm font-semibold text-gray-800">
        {section.section_id || section.title || `Section ${depth + 1}`}
        {section.inferred && <InferredBadge />}
      </div>
      {section.intent && (
        <div className="text-xs text-gray-500 mt-0.5">
          <span className="font-medium text-gray-600">Intent:</span> {section.intent}
        </div>
      )}
      {section.rhetorical_pattern && (
        <div className="text-xs text-gray-500">
          <span className="font-medium text-gray-600">Pattern:</span> {section.rhetorical_pattern}
        </div>
      )}
      {section.micro_template && (
        <div className="text-xs text-gray-500">
          <span className="font-medium text-gray-600">Template:</span> {section.micro_template}
        </div>
      )}
      {section.typography_role && (
        <div className="text-xs text-gray-500">
          <span className="font-medium text-gray-600">Typography:</span>{' '}
          <code className="bg-gray-100 rounded px-1">{section.typography_role}</code>
        </div>
      )}
      {Array.isArray(section.subsections) &&
        section.subsections.map((sub, i) => (
          <SectionNode key={sub.section_id || i} section={sub} depth={depth + 1} />
        ))}
    </div>
  );
}

// ─── Content Structure Tab ──────────────────────────────────────────────────

function ContentTab({ spec }) {
  if (!spec) return <p className="text-sm text-gray-500">No content structure data.</p>;
  if (spec.error) return <ErrorBadge message={spec.error} />;

  const sections = spec.sections || [];
  return (
    <div className="space-y-1">
      {sections.length === 0 ? (
        <p className="text-sm text-gray-500">No sections extracted.</p>
      ) : (
        sections.map((s, i) => <SectionNode key={s.section_id || i} section={s} depth={0} />)
      )}
    </div>
  );
}

// ─── Layout Tab ─────────────────────────────────────────────────────────────

function KV({ label, value, inferred }) {
  if (value === undefined || value === null) return null;
  const display = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-100 last:border-0 text-sm">
      <span className="text-gray-500 font-medium">{label}</span>
      <span className="text-gray-800">
        {display}
        {inferred && <InferredBadge />}
      </span>
    </div>
  );
}

function LayoutTab({ spec }) {
  if (!spec) return <p className="text-sm text-gray-500">No layout data.</p>;
  if (spec.error) return <ErrorBadge message={spec.error} />;

  const margins = spec.margins_pt || {};
  const spacing = spec.spacing_rules || {};

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Page</h4>
        <KV label="Size" value={spec.page_size} />
        <KV label="Columns" value={spec.column_structure} />
        <KV label="Has Header" value={spec.has_header !== undefined ? String(spec.has_header) : undefined} />
        <KV label="Has Footer" value={spec.has_footer !== undefined ? String(spec.has_footer) : undefined} />
      </div>

      {Object.keys(margins).length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Margins (pt)</h4>
          {Object.entries(margins).map(([k, v]) => (
            <KV key={k} label={k} value={v} />
          ))}
        </div>
      )}

      {Object.keys(spacing).length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Spacing (pt)</h4>
          {Object.entries(spacing).map(([k, v]) => (
            <KV key={k} label={k} value={typeof v === 'object' ? JSON.stringify(v) : v} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Visual Style Tab ────────────────────────────────────────────────────────

function TypographySpecimen({ role, token }) {
  if (!token) return null;
  const style = {
    fontFamily: token.font_family || 'inherit',
    fontSize: token.size_pt ? `${Math.min(token.size_pt, 24)}px` : undefined,
    fontWeight: token.weight === 'bold' ? 700 : 400,
    color: token.color_hex || '#111827',
  };
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-400 w-20 shrink-0">{role}</span>
      <span style={style} className="flex-1 truncate">
        The quick brown fox
        {token.inferred && <InferredBadge />}
      </span>
      <span className="text-xs text-gray-400 ml-3 shrink-0">
        {token.font_family || '—'} {token.size_pt ? `${token.size_pt}pt` : ''} {token.weight || ''}
      </span>
    </div>
  );
}

function ColorSwatch({ role, hex }) {
  if (!hex) return null;
  return (
    <div className="flex items-center gap-2 py-1">
      <div
        className="w-6 h-6 rounded border border-gray-200 shrink-0"
        style={{ backgroundColor: hex }}
      />
      <span className="text-xs text-gray-500 capitalize">{role}</span>
      <code className="text-xs text-gray-700 ml-auto">{hex}</code>
    </div>
  );
}

function VisualTab({ spec }) {
  if (!spec) return <p className="text-sm text-gray-500">No visual style data.</p>;
  if (spec.error) return <ErrorBadge message={spec.error} />;

  const typography = spec.typography || {};
  const palette = spec.color_palette || {};
  const bullet = spec.bullet_style;
  const para = spec.paragraph_rules;

  const typoOrder = ['h1', 'h2', 'h3', 'body', 'caption', 'table_header'];

  return (
    <div className="space-y-5">
      {Object.keys(typography).length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Typography</h4>
          {typoOrder.map(role =>
            typography[role] ? (
              <TypographySpecimen key={role} role={role} token={typography[role]} />
            ) : null
          )}
        </div>
      )}

      {Object.keys(palette).length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Color Palette</h4>
          {Object.entries(palette).map(([role, hex]) => (
            <ColorSwatch key={role} role={role} hex={hex} />
          ))}
        </div>
      )}

      {bullet && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Bullet Style</h4>
          <KV label="Level 1" value={bullet.level_1} />
          <KV label="Level 2" value={bullet.level_2} />
          <KV label="Indent (pt)" value={bullet.indent_pt} />
        </div>
      )}

      {para && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Paragraph Rules</h4>
          <KV label="First-line indent (pt)" value={para.first_line_indent_pt} />
          <KV label="Space between paragraphs (pt)" value={para.space_between_paragraphs_pt} />
        </div>
      )}
    </div>
  );
}

// ─── Root Component ──────────────────────────────────────────────────────────

export default function BlueprintViewer({ isOpen, onClose, blueprint }) {
  if (!isOpen) return null;

  const content = blueprint?.content_structure_spec;
  const layout = blueprint?.layout_spec;
  const visual = blueprint?.visual_style_spec;

  const tabs = [
    { label: 'Content Structure', panel: <ContentTab spec={content} /> },
    { label: 'Layout', panel: <LayoutTab spec={layout} /> },
    { label: 'Visual Style', panel: <VisualTab spec={visual} /> },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Document Blueprint</h2>
            {blueprint?.generated_at && (
              <p className="text-xs text-gray-400 mt-0.5">
                Generated {new Date(blueprint.generated_at).toLocaleString()}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {!blueprint ? (
          <div className="p-6 text-center text-gray-500 text-sm">No blueprint available.</div>
        ) : (
          <TabGroup className="flex flex-col flex-1 overflow-hidden">
            <TabList className="flex border-b border-gray-200 px-6 shrink-0">
              {tabs.map(({ label }) => (
                <Tab
                  key={label}
                  className={({ selected }) =>
                    `mr-6 pb-3 pt-3 text-sm font-medium border-b-2 focus:outline-none transition-colors ${
                      selected
                        ? 'border-purple-600 text-purple-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`
                  }
                >
                  {label}
                </Tab>
              ))}
            </TabList>

            <TabPanels className="flex-1 overflow-y-auto p-6">
              {tabs.map(({ label, panel }) => (
                <TabPanel key={label}>{panel}</TabPanel>
              ))}
            </TabPanels>
          </TabGroup>
        )}
      </div>
    </div>
  );
}

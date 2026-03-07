import React, { useState, useRef, useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { Code, Eye } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const MODULES = {
  toolbar: {
    container: [
      [{ header: [1, 2, 3, 4, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }],
      [{ align: [] }],
      ['link', 'image'],
      ['clean'],
    ],
  },
};

const FORMATS = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'blockquote', 'code-block',
  'list', 'bullet', 'indent', 'align',
  'link', 'image',
];

function formatHtml(html) {
  if (!html) return '';
  let indent = 0;
  const tab = '  ';
  // Split on tags but keep delimiters
  const parts = html.replace(/>\s*</g, '><').split(/(?=<)|(?<=>)/g);
  const lines = [];

  for (const part of parts) {
    if (!part.trim()) continue;
    const isClosing = /^<\//.test(part);
    const isSelfClosing = /\/>$/.test(part) || /^<(br|hr|img|input|meta|link)[\s>]/i.test(part);
    const isOpening = /^<[^/!]/.test(part) && !isSelfClosing;

    if (isClosing) indent = Math.max(0, indent - 1);
    lines.push(tab.repeat(indent) + part.trim());
    if (isOpening) indent += 1;
  }

  return lines.join('\n');
}

export default function RichTextEditor({ value, onChange, minHeight = '400px', title }) {
  const [htmlMode, setHtmlMode] = useState(false);
  const quillRef = useRef(null);
  // When true, show a read-only HTML preview instead of Quill (to avoid sanitization of custom HTML)
  const hasCustomHtml = /<button|onclick|style\s*=|<iframe|<script/i.test(value || '');
  const [useRawPreview, setUseRawPreview] = useState(hasCustomHtml);

  const modulesWithImageHandler = useRef({
    ...MODULES,
    toolbar: {
      ...MODULES.toolbar,
      handlers: {
        image: () => {
          const input = document.createElement('input');
          input.setAttribute('type', 'file');
          input.setAttribute('accept', 'image/*');
          input.click();
          input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            const result = await base44.integrations.Core.UploadFile({ file });
            const quill = quillRef.current?.getEditor();
            if (quill) {
              const range = quill.getSelection(true);
              quill.insertEmbed(range.index, 'image', result.file_url);
            }
          };
        },
      },
    },
  }).current;

  return (
    <div className="border border-slate-200 rounded-lg">
      {/* Toggle bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200 rounded-t-lg">
        {title && <span className="text-sm font-semibold text-slate-700">{title}</span>}
        <Button
          type="button"
          size="sm"
          variant={htmlMode ? 'default' : 'outline'}
          onClick={() => {
            if (!htmlMode) {
              // Switching to HTML source: pretty-print for readability
              onChange(formatHtml(value));
            } else {
              // Switching back to visual: collapse whitespace
              const collapsed = (value || '').replace(/\n\s*/g, '').trim();
              onChange(collapsed);
              // Detect if HTML contains tags Quill can't handle (button, style attrs, onclick, etc.)
              const hasCustomHtml = /<button|onclick|style\s*=|<iframe|<script/i.test(collapsed);
              setUseRawPreview(hasCustomHtml);
            }
            setHtmlMode(!htmlMode);
          }}
          className="h-7 text-xs gap-1"
        >
          {htmlMode ? <Eye className="w-3 h-3" /> : <Code className="w-3 h-3" />}
          {htmlMode ? 'Visual Editor' : 'HTML Source'}
        </Button>
      </div>

      {htmlMode ? (
        <textarea
          value={value || ''}
          onChange={(e) => {
            htmlModeEditedRef.current = true;
            onChange(e.target.value);
          }}
          className="w-full font-mono text-sm p-4 bg-white text-slate-800 resize-y focus:outline-none rounded-b-lg border-0"
          style={{ minHeight }}
          placeholder="<p>Enter HTML here...</p>"
          spellCheck={false}
        />
      ) : useRawPreview ? (
        <div className="p-4 bg-slate-50 rounded-b-lg" style={{ minHeight }}>
          <div className="mb-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            <span>⚠️ This content contains custom HTML (e.g. buttons) that cannot be edited in the visual editor. Switch to <strong>HTML Source</strong> to make changes.</span>
          </div>
          <div className="rich-content" dangerouslySetInnerHTML={{ __html: value || '' }} />
        </div>
      ) : (
        <>
          <style>{`.rte-editor .ql-editor { min-height: ${minHeight}; font-size: 0.95rem; line-height: 1.6; } .rte-editor .ql-toolbar { border: none; border-bottom: 1px solid #e2e8f0; } .rte-editor .ql-container { border: none; } .rte-editor .ql-editor h1 { font-size: 2em; font-weight: 700; margin-bottom: 0.5em; } .rte-editor .ql-editor h2 { font-size: 1.5em; font-weight: 700; margin-bottom: 0.5em; } .rte-editor .ql-editor h3 { font-size: 1.25em; font-weight: 600; margin-bottom: 0.4em; } .rte-editor .ql-editor h4 { font-size: 1em; font-weight: 600; margin-bottom: 0.3em; } .rte-editor .ql-editor ul { list-style: disc; padding-left: 1.5em; margin-bottom: 0.75em; } .rte-editor .ql-editor ol { list-style: decimal; padding-left: 1.5em; margin-bottom: 0.75em; } .rte-editor .ql-editor blockquote { border-left: 4px solid #cbd5e1; padding-left: 1em; color: #64748b; margin: 0.75em 0; } .rte-editor .ql-editor pre { background: #1e293b; color: #e2e8f0; padding: 1em; border-radius: 0.5em; overflow-x: auto; } .rte-editor .ql-editor a { color: #7c3aed; text-decoration: underline; } .rte-editor .ql-editor strong { font-weight: 700; } .rte-editor .ql-editor em { font-style: italic; }`}</style>
          <div className="rte-editor">
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={value || ''}
              onChange={(v, delta, source) => {
                if (source === 'user') onChange(v);
              }}
              modules={modulesWithImageHandler}
              formats={FORMATS}
            />
          </div>
        </>
      )}
    </div>
  );
}
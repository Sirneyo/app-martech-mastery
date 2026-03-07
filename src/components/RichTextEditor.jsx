import React, { useState, useRef } from 'react';
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

export default function RichTextEditor({ value, onChange, minHeight = '500px' }) {
  const [htmlMode, setHtmlMode] = useState(false);
  const quillRef = useRef(null);

  const handleImageUpload = () => {
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
  };

  const modulesWithImageHandler = {
    ...MODULES,
    toolbar: {
      ...MODULES.toolbar,
      handlers: { image: handleImageUpload },
    },
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {/* Toggle bar */}
      <div className="flex items-center justify-end gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
        <Button
          type="button"
          size="sm"
          variant={htmlMode ? 'default' : 'outline'}
          onClick={() => setHtmlMode(!htmlMode)}
          className="h-7 text-xs gap-1"
        >
          {htmlMode ? <Eye className="w-3 h-3" /> : <Code className="w-3 h-3" />}
          {htmlMode ? 'Visual Editor' : 'HTML Source'}
        </Button>
      </div>

      {htmlMode ? (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full font-mono text-sm p-4 bg-slate-900 text-green-400 resize-y focus:outline-none"
          style={{ minHeight }}
          placeholder="<p>Enter HTML here...</p>"
          spellCheck={false}
        />
      ) : (
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value || ''}
          onChange={onChange}
          modules={modulesWithImageHandler}
          formats={FORMATS}
          style={{ minHeight }}
        />
      )}
    </div>
  );
}
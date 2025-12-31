import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, FileText, Link as LinkIcon } from 'lucide-react';

export default function AdminTemplatesStudioPreview() {
  const urlParams = new URLSearchParams(window.location.search);
  const templateType = urlParams.get('type');
  const templateId = urlParams.get('id');

  const entityMap = {
    assignment: 'AssignmentTemplate',
    project: 'ProjectTemplate',
    portfolio: 'PortfolioItemTemplate',
  };

  const { data: template } = useQuery({
    queryKey: ['template', templateType, templateId],
    queryFn: async () => {
      if (!templateId || templateId === 'draft') return null;
      const results = await base44.entities[entityMap[templateType]].filter({ id: templateId });
      return results[0];
    },
    enabled: !!templateId && templateId !== 'draft',
  });

  const { data: downloads = [] } = useQuery({
    queryKey: ['template-downloads', templateId],
    queryFn: () => base44.entities.TemplateDownload.filter({ template_id: templateId }),
    enabled: !!templateId && templateId !== 'draft',
  });

  if (!template) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading preview...</p>
      </div>
    );
  }

  const evidenceReqs = JSON.parse(template.evidence_requirements_json || '{}');

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to={createPageUrl(`AdminTemplatesStudioEdit?type=${templateType}&id=${templateId}`)}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Edit
            </Button>
          </Link>
          <Badge variant={template.status === 'published' ? 'default' : 'secondary'}>
            {template.status}
          </Badge>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {template.thumbnail_url && (
            <img
              src={template.thumbnail_url}
              alt={template.title}
              className="w-full h-64 object-cover"
            />
          )}

          <div className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">{template.title}</h1>
                {template.short_description && (
                  <p className="text-lg text-slate-600">{template.short_description}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Week {template.week_number}</p>
                <p className="text-2xl font-bold text-violet-600">{template.points} pts</p>
              </div>
            </div>

            {template.content_html && (
              <div className="prose max-w-none mb-8">
                <div dangerouslySetInnerHTML={{ __html: template.content_html }} />
              </div>
            )}

            {downloads.length > 0 && (
              <div className="mb-8 p-6 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Downloads
                </h3>
                <div className="space-y-2">
                  {downloads.map((download) => (
                    <a
                      key={download.id}
                      href={download.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <FileText className="w-5 h-5 text-slate-400" />
                      <span className="flex-1 font-medium text-slate-700">{download.file_name}</span>
                      <LinkIcon className="w-4 h-4 text-slate-400" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="p-6 bg-violet-50 rounded-lg border border-violet-200">
              <h3 className="font-semibold text-violet-900 mb-3">Evidence Requirements</h3>
              <div className="space-y-2 text-sm text-violet-800">
                {evidenceReqs.allow_file && (
                  <p>✓ File uploads allowed</p>
                )}
                {evidenceReqs.allow_link && (
                  <p>✓ Link submissions allowed</p>
                )}
                {evidenceReqs.allow_text && (
                  <p>✓ Text submissions allowed</p>
                )}
              </div>
            </div>

            {templateType === 'portfolio' && (
              <div className="mt-6 flex flex-wrap gap-3">
                <Badge variant="outline">Category: {template.category}</Badge>
                <Badge variant="outline">Unlock: Week {template.unlock_week}</Badge>
                {template.required_flag && <Badge variant="destructive">Required</Badge>}
                {template.needs_approval && <Badge variant="secondary">Needs Approval</Badge>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
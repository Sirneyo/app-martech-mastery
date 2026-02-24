import React, { useEffect } from 'react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function AdminTemplatesStudioDuplicate() {
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
      if (!templateId) return null;
      const results = await base44.entities[entityMap[templateType]].filter({ id: templateId });
      return results[0];
    },
    enabled: !!templateId,
  });

  const { data: downloads = [] } = useQuery({
    queryKey: ['template-downloads', templateId],
    queryFn: () => base44.entities.TemplateDownload.filter({ template_id: templateId }),
    enabled: !!templateId,
  });

  useEffect(() => {
    if (template && downloads) {
      performDuplication();
    }
  }, [template, downloads]);

  const performDuplication = async () => {
    // Generate a new unique template_key so it appears as a separate template
    const newKey = `${template.template_key}-copy-${Date.now()}`;

    const duplicateData = {
      ...template,
      template_key: newKey,
      title: `${template.title} (Copy)`,
      version: 1,
      status: 'draft',
      published_at: null,
    };

    delete duplicateData.id;
    delete duplicateData.created_date;
    delete duplicateData.updated_date;
    delete duplicateData.created_by;

    const newTemplate = await base44.entities[entityMap[templateType]].create(duplicateData);

    for (const download of downloads) {
      await base44.entities.TemplateDownload.create({
        template_type: templateType,
        template_id: newTemplate.id,
        file_url: download.file_url,
        file_name: download.file_name,
        sort_order: download.sort_order,
      });
    }

    window.location.href = createPageUrl(`AdminTemplatesStudioEdit?type=${templateType}&id=${newTemplate.id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Creating new version...</p>
      </div>
    </div>
  );
}
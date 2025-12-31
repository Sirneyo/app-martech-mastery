import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Eye, Upload, Plus, Trash2, GripVertical, Copy } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { toast } from 'react-hot-toast';

export default function AdminTemplatesStudioEdit() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const templateType = urlParams.get('type');
  const templateId = urlParams.get('id');

  const [formData, setFormData] = useState({
    template_key: '',
    version: 1,
    title: '',
    short_description: '',
    content_html: '',
    week_number: 1,
    points: templateType === 'project' ? 200 : 100,
    status: 'draft',
    thumbnail_url: '',
    evidence_requirements_json: '{"allow_file":true,"allow_link":true,"allow_text":true}',
    // Portfolio specific
    category: 'assignment',
    unlock_week: 1,
    required_flag: false,
    needs_approval: true,
    sort_order: 0,
  });

  const [evidenceReqs, setEvidenceReqs] = useState({
    allow_file: true,
    allow_link: true,
    allow_text: true,
  });

  const [downloads, setDownloads] = useState([]);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

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

  const { data: existingDownloads = [] } = useQuery({
    queryKey: ['template-downloads', templateId],
    queryFn: () => base44.entities.TemplateDownload.filter({ template_id: templateId }),
    enabled: !!templateId,
  });

  useEffect(() => {
    if (template) {
      setFormData({
        ...template,
        evidence_requirements_json: template.evidence_requirements_json || '{"allow_file":true,"allow_link":true,"allow_text":true}',
      });
      try {
        const parsed = JSON.parse(template.evidence_requirements_json || '{}');
        setEvidenceReqs(parsed);
      } catch (e) {
        setEvidenceReqs({ allow_file: true, allow_link: true, allow_text: true });
      }
    }
  }, [template]);

  useEffect(() => {
    if (existingDownloads.length > 0) {
      setDownloads(existingDownloads.sort((a, b) => a.sort_order - b.sort_order));
    }
  }, [existingDownloads]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const dataToSave = {
        ...formData,
        evidence_requirements_json: JSON.stringify(evidenceReqs),
        updated_date: new Date().toISOString(),
      };

      if (formData.status === 'published' && !formData.published_at) {
        dataToSave.published_at = new Date().toISOString();
      }

      let savedTemplate;
      if (templateId) {
        await base44.entities[entityMap[templateType]].update(templateId, dataToSave);
        savedTemplate = { ...dataToSave, id: templateId };
      } else {
        // New template
        if (!dataToSave.template_key) {
          dataToSave.template_key = `tpl-${Date.now()}`;
        }
        savedTemplate = await base44.entities[entityMap[templateType]].create(dataToSave);
      }

      // Save downloads
      const existingIds = existingDownloads.map(d => d.id);
      const currentIds = downloads.filter(d => d.id).map(d => d.id);
      const toDelete = existingIds.filter(id => !currentIds.includes(id));

      for (const id of toDelete) {
        await base44.entities.TemplateDownload.delete(id);
      }

      for (let i = 0; i < downloads.length; i++) {
        const download = downloads[i];
        const downloadData = {
          template_type: templateType,
          template_id: savedTemplate.id,
          file_url: download.file_url,
          file_name: download.file_name,
          sort_order: i,
        };

        if (download.id) {
          await base44.entities.TemplateDownload.update(download.id, downloadData);
        } else {
          await base44.entities.TemplateDownload.create(downloadData);
        }
      }

      return savedTemplate;
    },
    onSuccess: (data) => {
      toast.success('Template saved successfully');
      queryClient.invalidateQueries({ queryKey: ['template'] });
      queryClient.invalidateQueries({ queryKey: ['assignment-templates'] });
      queryClient.invalidateQueries({ queryKey: ['project-templates'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-templates'] });
      queryClient.invalidateQueries({ queryKey: ['template-downloads'] });
      if (!templateId) {
        window.location.href = createPageUrl(`AdminTemplatesStudioEdit?type=${templateType}&id=${data.id}`);
      }
    },
  });

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingThumb(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, thumbnail_url: result.file_url });
      toast.success('Thumbnail uploaded');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploadingThumb(false);
    }
  };

  const handleAddDownload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setDownloads([...downloads, {
        file_url: result.file_url,
        file_name: file.name,
        sort_order: downloads.length,
      }]);
      toast.success('File added');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveDownload = (index) => {
    setDownloads(downloads.filter((_, i) => i !== index));
  };

  const handleDuplicate = async () => {
    const duplicateData = {
      ...formData,
      template_key: formData.template_key,
      version: (formData.version || 1) + 1,
      status: 'draft',
      published_at: null,
    };

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

    toast.success('New version created');
    window.location.href = createPageUrl(`AdminTemplatesStudioEdit?type=${templateType}&id=${newTemplate.id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('AdminTemplatesStudio')}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {templateId ? 'Edit' : 'Create'} {templateType.charAt(0).toUpperCase() + templateType.slice(1)}
              </h1>
              {templateId && (
                <p className="text-sm text-slate-500">Version {formData.version || 1}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {templateId && (
              <Button onClick={handleDuplicate} variant="outline">
                <Copy className="w-4 h-4 mr-2" />
                Duplicate as v{(formData.version || 1) + 1}
              </Button>
            )}
            <Link to={createPageUrl(`AdminTemplatesStudioPreview?type=${templateType}&id=${templateId || 'draft'}`)}>
              <Button variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
            </Link>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Left Panel - Content */}
          <div className="col-span-2 space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6">
              <div>
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter template title"
                />
              </div>

              <div>
                <Label>Short Description</Label>
                <Textarea
                  value={formData.short_description || ''}
                  onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                  placeholder="Brief overview (optional)"
                  rows={3}
                />
              </div>

              <div>
                <Label>Content</Label>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <ReactQuill
                    theme="snow"
                    value={formData.content_html || ''}
                    onChange={(value) => setFormData({ ...formData, content_html: value })}
                    className="min-h-[300px]"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h3 className="font-semibold text-slate-900 mb-4">Evidence Requirements</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Allow file uploads</Label>
                    <Switch
                      checked={evidenceReqs.allow_file}
                      onCheckedChange={(checked) => setEvidenceReqs({ ...evidenceReqs, allow_file: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Allow link submissions</Label>
                    <Switch
                      checked={evidenceReqs.allow_link}
                      onCheckedChange={(checked) => setEvidenceReqs({ ...evidenceReqs, allow_link: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Allow text submissions</Label>
                    <Switch
                      checked={evidenceReqs.allow_text}
                      onCheckedChange={(checked) => setEvidenceReqs({ ...evidenceReqs, allow_text: checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">Downloads</h3>
                  <label htmlFor="file-upload">
                    <Button variant="outline" size="sm" disabled={uploadingFile} asChild>
                      <span>
                        <Plus className="w-4 h-4 mr-2" />
                        {uploadingFile ? 'Uploading...' : 'Add File'}
                      </span>
                    </Button>
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    onChange={handleAddDownload}
                  />
                </div>
                <div className="space-y-2">
                  {downloads.map((download, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <GripVertical className="w-4 h-4 text-slate-400" />
                      <span className="flex-1 text-sm text-slate-700">{download.file_name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDownload(index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  {downloads.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4">No downloads added</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Controls */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6">
              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
                {formData.status === 'published' && (
                  <p className="text-xs text-green-600 mt-2">Students can see this template</p>
                )}
              </div>

              <div>
                <Label>Thumbnail</Label>
                {formData.thumbnail_url && (
                  <img
                    src={formData.thumbnail_url}
                    alt="Thumbnail"
                    className="w-full h-32 object-cover rounded-lg mb-2"
                  />
                )}
                <label htmlFor="thumb-upload">
                  <Button variant="outline" size="sm" disabled={uploadingThumb} asChild className="w-full">
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingThumb ? 'Uploading...' : formData.thumbnail_url ? 'Change' : 'Upload'}
                    </span>
                  </Button>
                </label>
                <input
                  id="thumb-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleThumbnailUpload}
                />
              </div>

              <div>
                <Label>Week Number</Label>
                <Input
                  type="number"
                  value={formData.week_number || 1}
                  onChange={(e) => setFormData({ ...formData, week_number: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <Label>Points</Label>
                <Input
                  type="number"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
                />
              </div>

              {templateType === 'portfolio' && (
                <>
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="assignment">Assignment</SelectItem>
                        <SelectItem value="project">Project</SelectItem>
                        <SelectItem value="certification">Certification</SelectItem>
                        <SelectItem value="skill">Skill</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Unlock Week</Label>
                    <Input
                      type="number"
                      value={formData.unlock_week || 1}
                      onChange={(e) => setFormData({ ...formData, unlock_week: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Required Item</Label>
                    <Switch
                      checked={formData.required_flag}
                      onCheckedChange={(checked) => setFormData({ ...formData, required_flag: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Needs Approval</Label>
                    <Switch
                      checked={formData.needs_approval}
                      onCheckedChange={(checked) => setFormData({ ...formData, needs_approval: checked })}
                    />
                  </div>

                  <div>
                    <Label>Sort Order</Label>
                    <Input
                      type="number"
                      value={formData.sort_order || 0}
                      onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
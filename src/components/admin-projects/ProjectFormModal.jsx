import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';

export default function ProjectFormModal({ project, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: project?.title || '',
    company_name: project?.company_name || '',
    overview: project?.overview || '',
    intro_video_url: project?.intro_video_url || '',
    agreement_doc_url: project?.agreement_doc_url || '',
    agreement_text: project?.agreement_text || '',
    status: project?.status || 'draft',
    unlock_week: project?.unlock_week ?? 8,
    sort_order: project?.sort_order ?? 0,
  });

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (project?.id) {
        return base44.entities.SimProject.update(project.id, data);
      }
      return base44.entities.SimProject.create(data);
    },
    onSuccess: onSaved,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">{project ? 'Edit Project' : 'New Project'}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Project Title *</Label>
              <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. CRM Migration Campaign" />
            </div>
            <div className="space-y-1.5">
              <Label>Company Name</Label>
              <Input value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="e.g. SaaSly" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Overview Description</Label>
            <Textarea value={form.overview} onChange={e => set('overview', e.target.value)} rows={3} placeholder="Brief project overview..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Intro Video URL</Label>
              <Input value={form.intro_video_url} onChange={e => set('intro_video_url', e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <Label>Agreement Document URL</Label>
              <Input value={form.agreement_doc_url} onChange={e => set('agreement_doc_url', e.target.value)} placeholder="https://..." />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Agreement Text (shown to student)</Label>
            <Textarea value={form.agreement_text} onChange={e => set('agreement_text', e.target.value)} rows={4} placeholder="By signing below, I agree to..." />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Unlock Week</Label>
              <Input type="number" value={form.unlock_week} onChange={e => set('unlock_week', parseInt(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Sort Order</Label>
              <Input type="number" value={form.sort_order} onChange={e => set('sort_order', parseInt(e.target.value))} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate(form)} disabled={!form.title || mutation.isPending}>
            {mutation.isPending ? 'Saving...' : project ? 'Save Changes' : 'Create Project'}
          </Button>
        </div>
      </div>
    </div>
  );
}
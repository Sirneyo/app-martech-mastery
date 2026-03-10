import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import RichTextEditor from '@/components/RichTextEditor';

const EMPTY_FORM = {
  title: '',
  short_description: '',
  content_html: '',
  thumbnail_url: '',
  banner_url: '',
  sort_order: 0,
  status: 'draft',
};

export default function AdminGlossary() {
  const queryClient = useQueryClient();
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const handleUpload = async (file, field, setLoading) => {
    setLoading(true);
    const { file_url: raw } = await base44.integrations.Core.UploadFile({ file });
    const file_url = raw.replace('https://base44.app', 'https://app.martech-mastery.com');
    setForm(f => ({ ...f, [field]: file_url }));
    setLoading(false);
  };

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['glossary-items-admin'],
    queryFn: () => base44.entities.GlossaryItem.list('sort_order'),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editItem?.id) {
        return base44.entities.GlossaryItem.update(editItem.id, data);
      } else {
        return base44.entities.GlossaryItem.create(data);
      }
    },
    onSuccess: () => {
      toast.success(editItem?.id ? 'Glossary item updated' : 'Glossary item created');
      queryClient.invalidateQueries({ queryKey: ['glossary-items-admin'] });
      queryClient.invalidateQueries({ queryKey: ['glossary-items'] });
      setEditItem(null);
    },
    onError: () => toast.error('Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.GlossaryItem.delete(id),
    onSuccess: () => {
      toast.success('Deleted');
      queryClient.invalidateQueries({ queryKey: ['glossary-items-admin'] });
      queryClient.invalidateQueries({ queryKey: ['glossary-items'] });
      setDeleteItem(null);
    },
  });

  const openNew = () => {
    setForm({ ...EMPTY_FORM, sort_order: items.length });
    setEditItem({});
  };

  const openEdit = (item) => {
    setForm({
      title: item.title || '',
      short_description: item.short_description || '',
      content_html: item.content_html || '',
      thumbnail_url: item.thumbnail_url || '',
      banner_url: item.banner_url || '',
      sort_order: item.sort_order ?? 0,
      status: item.status || 'draft',
    });
    setEditItem(item);
  };

  const toggleStatus = async (item) => {
    const newStatus = item.status === 'published' ? 'draft' : 'published';
    await base44.entities.GlossaryItem.update(item.id, { status: newStatus });
    queryClient.invalidateQueries({ queryKey: ['glossary-items-admin'] });
    queryClient.invalidateQueries({ queryKey: ['glossary-items'] });
    toast.success(`${newStatus === 'published' ? 'Published' : 'Unpublished'}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Glossary</h1>
            <p className="text-slate-500 mt-1">Manage glossary lessons shown to students</p>
          </div>
          <Button onClick={openNew} className="bg-violet-600 hover:bg-violet-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Glossary Item
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400">Loading...</div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-slate-400">No glossary items yet. Add one above.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-slate-600 font-medium">#</th>
                  <th className="px-5 py-3 text-left text-slate-600 font-medium">Title</th>
                  <th className="px-5 py-3 text-left text-slate-600 font-medium">Status</th>
                  <th className="px-5 py-3 text-right text-slate-600 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 text-slate-400">{idx + 1}</td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">{item.title}</p>
                      {item.short_description && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{item.short_description}</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => toggleStatus(item)}>
                        <Badge variant={item.status === 'published' ? 'default' : 'secondary'}>
                          {item.status}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                          <Edit className="w-4 h-4 mr-1" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteItem(item)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit / Create Dialog */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem?.id ? 'Edit Glossary Item' : 'New Glossary Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Title</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Short Description (shown on card)</Label>
              <Textarea rows={2} value={form.short_description} onChange={e => setForm({ ...form, short_description: e.target.value })} />
            </div>
            {/* Thumbnail */}
            <div className="space-y-2">
              <Label>Thumbnail <span className="text-slate-400 font-normal text-xs">(shown on glossary card)</span></Label>
              <div className="flex gap-2 items-start">
                <div className="flex-1">
                  <Input
                    value={form.thumbnail_url}
                    onChange={e => setForm({ ...form, thumbnail_url: e.target.value })}
                    placeholder="https://... or upload →"
                  />
                </div>
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleUpload(e.target.files[0], 'thumbnail_url', setUploadingThumb)} />
                  <Button type="button" variant="outline" size="sm" disabled={uploadingThumb} asChild>
                    <span><Upload className="w-4 h-4 mr-1" />{uploadingThumb ? 'Uploading...' : 'Upload'}</span>
                  </Button>
                </label>
              </div>
              {form.thumbnail_url && (
                <div className="relative inline-block">
                  <img src={form.thumbnail_url} alt="thumbnail" className="h-20 rounded-lg object-cover border border-slate-200" />
                  <button onClick={() => setForm(f => ({ ...f, thumbnail_url: '' }))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Banner */}
            <div className="space-y-2">
              <Label>Banner Image <span className="text-slate-400 font-normal text-xs">(hero banner on the detail page)</span></Label>
              <div className="flex gap-2 items-start">
                <div className="flex-1">
                  <Input
                    value={form.banner_url}
                    onChange={e => setForm({ ...form, banner_url: e.target.value })}
                    placeholder="https://... or upload →"
                  />
                </div>
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleUpload(e.target.files[0], 'banner_url', setUploadingBanner)} />
                  <Button type="button" variant="outline" size="sm" disabled={uploadingBanner} asChild>
                    <span><Upload className="w-4 h-4 mr-1" />{uploadingBanner ? 'Uploading...' : 'Upload'}</span>
                  </Button>
                </label>
              </div>
              {form.banner_url && (
                <div className="relative inline-block w-full">
                  <img src={form.banner_url} alt="banner" className="w-full h-32 rounded-lg object-cover border border-slate-200" />
                  <button onClick={() => setForm(f => ({ ...f, banner_url: '' }))} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Content</Label>
              <RichTextEditor
                value={form.content_html}
                onChange={val => setForm({ ...form, content_html: val })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending || !form.title}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Glossary Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteItem?.title}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteItem.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
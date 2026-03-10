import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Shield, Upload, Copy, Trash2, Image, Film, Check, Search, X, ExternalLink } from 'lucide-react';

export default function AdminMediaLibrary() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['media-files'],
    queryFn: () => base44.entities.MediaFile.list('-created_date', 200),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MediaFile.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-files'] });
      setDeleteTarget(null);
    },
  });

  const handleFiles = async (fileList) => {
    const toUpload = Array.from(fileList);
    if (!toUpload.length) return;
    setUploading(true);
    for (const file of toUpload) {
      const fileType = file.type.startsWith('image/')
        ? 'image'
        : file.type.startsWith('video/')
        ? 'video'
        : 'other';
      const { file_url: raw_url } = await base44.integrations.Core.UploadFile({ file });
      const file_url = raw_url.replace('https://base44.app', 'https://app.martech-mastery.com');
      await base44.entities.MediaFile.create({
        name: file.name,
        file_url,
        file_type: fileType,
        mime_type: file.type,
        uploaded_by: currentUser?.email || 'admin',
      });
    }
    queryClient.invalidateQueries({ queryKey: ['media-files'] });
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const copyToClipboard = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = files.filter((f) => {
    const matchSearch = !search || f.name?.toLowerCase().includes(search.toLowerCase()) || f.tags?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || f.file_type === typeFilter;
    return matchSearch && matchType;
  });

  if (currentUser && currentUser.app_role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-700">Access Restricted</h2>
          <p className="text-slate-500 mt-2">This area is only accessible to Super Admins.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
            <Image className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Media Library</h1>
            <p className="text-slate-500 mt-0.5">Upload images and videos — copy links to use anywhere</p>
          </div>
        </div>

        {/* Upload Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
            dragOver ? 'border-violet-500 bg-violet-50' : 'border-slate-300 bg-white hover:border-violet-400 hover:bg-violet-50/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Upload className={`w-10 h-10 mx-auto mb-3 ${dragOver ? 'text-violet-500' : 'text-slate-400'}`} />
          {uploading ? (
            <p className="text-violet-600 font-semibold animate-pulse">Uploading...</p>
          ) : (
            <>
              <p className="text-slate-700 font-semibold text-lg">Drop files here or click to browse</p>
              <p className="text-slate-400 text-sm mt-1">Supports images and videos · Multiple files allowed</p>
            </>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center bg-white border border-slate-200 rounded-xl p-4">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by filename or tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'image', 'video', 'other'].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  typeFilter === t
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-sm text-slate-400 ml-auto">{filtered.length} file{filtered.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="text-center py-20 text-slate-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-400">
            <Image className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No media files yet</p>
            <p className="text-sm mt-1">Upload images or videos above to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((file) => (
              <div key={file.id} className="group bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Preview */}
                <div
                  className="relative w-full h-36 bg-slate-100 cursor-pointer"
                  onClick={() => setPreviewFile(file)}
                >
                  {file.file_type === 'image' ? (
                    <img
                      src={file.file_url}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : file.file_type === 'video' ? (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                      <Film className="w-8 h-8 text-slate-400" />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-8 h-8 text-slate-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <ExternalLink className="w-5 h-5 text-white" />
                  </div>
                  {/* Type badge */}
                  <div className="absolute top-2 left-2">
                    <Badge className={`text-xs py-0 ${file.file_type === 'image' ? 'bg-blue-100 text-blue-700' : file.file_type === 'video' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                      {file.file_type}
                    </Badge>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-xs font-medium text-slate-800 truncate mb-2" title={file.name}>{file.name}</p>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs"
                      onClick={() => copyToClipboard(file.file_url, file.id)}
                    >
                      {copiedId === file.id ? (
                        <><Check className="w-3 h-3 mr-1 text-green-500" /> Copied</>
                      ) : (
                        <><Copy className="w-3 h-3 mr-1" /> Copy URL</>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0 text-red-500 border-red-100 hover:bg-red-50"
                      onClick={() => setDeleteTarget(file)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-slate-800 truncate">{previewFile?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {previewFile?.file_type === 'image' && (
              <img src={previewFile.file_url} alt={previewFile.name} className="w-full max-h-96 object-contain rounded-lg border border-slate-200 bg-slate-50" />
            )}
            {previewFile?.file_type === 'video' && (
              <video src={previewFile.file_url} controls className="w-full max-h-96 rounded-lg border border-slate-200 bg-black" />
            )}
            <div className="space-y-2">
              <Label className="text-slate-600 text-sm">File URL</Label>
              <div className="flex gap-2">
                <Input value={previewFile?.file_url || ''} readOnly className="text-sm font-mono bg-slate-50" />
                <Button
                  onClick={() => copyToClipboard(previewFile.file_url, previewFile.id)}
                  className="shrink-0 bg-violet-600 hover:bg-violet-700"
                >
                  {copiedId === previewFile?.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(previewFile.file_url, '_blank')}
                  className="shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2 text-xs text-slate-500">
              <span>Type: {previewFile?.file_type}</span>
              {previewFile?.mime_type && <span>· {previewFile.mime_type}</span>}
              {previewFile?.uploaded_by && <span>· Uploaded by {previewFile.uploaded_by}</span>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Delete File
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-slate-700">
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will remove it from the library (the file URL may still work).
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
              >
                <Trash2 className="w-4 h-4 mr-1" /> {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
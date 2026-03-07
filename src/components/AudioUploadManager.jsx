import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Music, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'react-hot-toast';

export default function AudioUploadManager({ audioFiles = [], onChange }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a'];
    if (!allowed.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a)$/i)) {
      toast.error('Only MP3, WAV, and M4A files are supported');
      return;
    }
    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      const newEntry = { url: result.file_url, title: file.name.replace(/\.[^.]+$/, ''), description: '' };
      onChange([...audioFiles, newEntry]);
      toast.success('Audio uploaded');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const update = (index, field, value) => {
    const updated = audioFiles.map((a, i) => i === index ? { ...a, [field]: value } : a);
    onChange(updated);
  };

  const remove = (index) => {
    onChange(audioFiles.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {audioFiles.map((audio, index) => (
        <div key={index} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600">
              <Music className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-medium text-slate-700 truncate max-w-xs">{audio.url.split('/').pop()}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => remove(index)}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
          <audio controls src={audio.url} className="w-full h-10" />
          <div>
            <Label className="text-xs">Audio Title</Label>
            <Input
              value={audio.title || ''}
              onChange={(e) => update(index, 'title', e.target.value)}
              placeholder="e.g. Week 1 Lecture Recording"
              className="mt-1 h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Short Description</Label>
            <Textarea
              value={audio.description || ''}
              onChange={(e) => update(index, 'description', e.target.value)}
              placeholder="Brief description of this audio..."
              rows={2}
              className="mt-1 text-sm"
            />
          </div>
        </div>
      ))}

      <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-violet-400 hover:bg-violet-50 transition-all cursor-pointer">
        {uploading ? (
          <><Loader2 className="w-4 h-4 animate-spin text-violet-500" /><span className="text-sm text-slate-600">Uploading...</span></>
        ) : (
          <><Plus className="w-4 h-4 text-slate-500" /><span className="text-sm text-slate-600">Upload Audio File (MP3, WAV, M4A)</span></>
        )}
        <input
          type="file"
          accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4,audio/x-m4a"
          onChange={handleUpload}
          className="hidden"
          disabled={uploading}
        />
      </label>
    </div>
  );
}
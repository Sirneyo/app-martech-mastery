import React from 'react';
import { Music } from 'lucide-react';

export default function AssignmentAudioPlayer({ audioFiles = [] }) {
  if (!audioFiles || audioFiles.length === 0) return null;

  return (
    <div className="space-y-4 mt-6">
      <h3 className="font-semibold text-slate-900 flex items-center gap-2">
        <Music className="w-5 h-5 text-violet-500" />
        Audio Materials
      </h3>
      {audioFiles.map((audio, index) => (
        <div key={index} className="p-4 bg-violet-50 rounded-lg border border-violet-100">
          <p className="font-medium text-slate-900 mb-1">{audio.title || `Audio ${index + 1}`}</p>
          {audio.description && (
            <p className="text-sm text-slate-600 mb-3">{audio.description}</p>
          )}
          <audio controls src={audio.url} className="w-full" />
        </div>
      ))}
    </div>
  );
}
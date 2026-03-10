import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react';

export default function StudentGlossaryDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const itemId = urlParams.get('id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: item, isLoading } = useQuery({
    queryKey: ['glossary-item', itemId],
    queryFn: async () => {
      const results = await base44.entities.GlossaryItem.filter({ id: itemId });
      return results[0];
    },
    enabled: !!itemId,
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['glossary-progress', currentUser?.id],
    queryFn: () => base44.entities.GlossaryProgress.filter({ user_id: currentUser.id }),
    enabled: !!currentUser?.id,
  });

  const myProgress = progress.find(p => p.glossary_item_id === itemId);
  const isComplete = myProgress?.completed;

  const markCompleteMutation = useMutation({
    mutationFn: async () => {
      if (myProgress) {
        return base44.entities.GlossaryProgress.update(myProgress.id, {
          completed: !isComplete,
          completed_date: !isComplete ? new Date().toISOString() : null,
        });
      } else {
        return base44.entities.GlossaryProgress.create({
          user_id: currentUser.id,
          glossary_item_id: itemId,
          completed: true,
          completed_date: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['glossary-progress', currentUser?.id] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-slate-400">
        Item not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="border-b border-slate-200 px-8 py-4 flex items-center justify-between bg-white sticky top-0 z-10">
        <button
          onClick={() => navigate(createPageUrl('StudentGlossary'))}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Glossary
        </button>

        <Button
          size="sm"
          variant={isComplete ? 'outline' : 'default'}
          onClick={() => markCompleteMutation.mutate()}
          disabled={markCompleteMutation.isPending}
          className="flex items-center gap-2"
        >
          {isComplete
            ? <><CheckCircle2 className="w-4 h-4 text-green-500" /> Completed</>
            : <><Circle className="w-4 h-4" /> Mark as Complete</>
          }
        </Button>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-8 py-10">
        {item.thumbnail_url && (
          <img
            src={item.thumbnail_url}
            alt={item.title}
            className="w-full max-h-56 object-cover rounded-xl mb-8 border border-slate-200"
          />
        )}
        <h1 className="text-3xl font-bold text-slate-900 mb-3">{item.title}</h1>
        {item.short_description && (
          <p className="text-slate-500 text-base mb-8 border-b border-slate-100 pb-8">{item.short_description}</p>
        )}
        {item.content_html ? (
          <div
            className="ql-editor rich-content"
            style={{ padding: 0 }}
            dangerouslySetInnerHTML={{ __html: item.content_html }}
          />
        ) : (
          <p className="text-slate-400 italic">No content available.</p>
        )}
      </div>
    </div>
  );
}
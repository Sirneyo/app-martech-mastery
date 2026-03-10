import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Circle, BookOpen, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function StudentGlossary() {
  const [expandedId, setExpandedId] = useState(null);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['glossary-items'],
    queryFn: () => base44.entities.GlossaryItem.filter({ status: 'published' }, 'sort_order'),
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['glossary-progress', currentUser?.id],
    queryFn: () => base44.entities.GlossaryProgress.filter({ user_id: currentUser.id }),
    enabled: !!currentUser?.id,
  });

  const completedIds = new Set(progress.filter(p => p.completed).map(p => p.glossary_item_id));

  const markCompleteMutation = useMutation({
    mutationFn: async (itemId) => {
      const existing = progress.find(p => p.glossary_item_id === itemId);
      if (existing) {
        return base44.entities.GlossaryProgress.update(existing.id, {
          completed: !existing.completed,
          completed_date: !existing.completed ? new Date().toISOString() : null,
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

  const completedCount = completedIds.size;
  const totalCount = items.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading glossary...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-8 py-8 border-b border-slate-200 bg-white">
        <h1 className="text-3xl font-bold text-slate-900">Marketing Technology Glossary</h1>
        <p className="text-slate-500 mt-2 max-w-xl">
          Focus: To provide a comprehensive understanding of key terms, tools, and concepts essential for marketing and marketing operations success.
        </p>
      </div>

      {/* Progress */}
      <div className="px-8 py-6 border-b border-slate-200 bg-white">
        <p className="text-sm font-semibold text-slate-700 mb-3">Category Progress</p>
        <Progress value={progressPct} className="h-2 mb-3" />
        <p className="text-sm text-slate-500">
          <span className="font-bold text-slate-800">{completedCount}/{totalCount}</span> Lessons Complete
        </p>
      </div>

      {/* Items */}
      <div className="divide-y divide-slate-100">
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <BookOpen className="w-10 h-10 mb-3" />
            <p className="text-base font-medium">No glossary lessons published yet</p>
          </div>
        )}
        {items.map((item) => {
          const isComplete = completedIds.has(item.id);
          const isOpen = expandedId === item.id;

          return (
            <div key={item.id} className="bg-white hover:bg-slate-50 transition-colors">
              <button
                className="w-full text-left px-8 py-5 flex items-center gap-5"
                onClick={() => setExpandedId(isOpen ? null : item.id)}
              >
                {/* Icon */}
                <div className="flex-shrink-0 text-slate-400">
                  <BookOpen className="w-5 h-5" />
                </div>

                {/* Thumbnail */}
                {item.thumbnail_url && (
                  <div className="flex-shrink-0 w-36 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                    <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 text-base mb-1">{item.title}</h3>
                  {item.short_description && (
                    <p className="text-sm text-slate-500 line-clamp-2">{item.short_description}</p>
                  )}
                </div>

                {/* Right side */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); markCompleteMutation.mutate(item.id); }}
                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-green-600 transition-colors"
                    title={isComplete ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {isComplete
                      ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                      : <Circle className="w-5 h-5 text-slate-300" />
                    }
                  </button>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-8 pb-8 pt-2">
                      {item.content_html ? (
                        <div
                          className="rich-content prose max-w-none text-slate-700"
                          dangerouslySetInnerHTML={{ __html: item.content_html }}
                        />
                      ) : (
                        <p className="text-slate-400 italic">No content available.</p>
                      )}
                      <div className="mt-5">
                        <Button
                          size="sm"
                          variant={isComplete ? 'outline' : 'default'}
                          onClick={() => markCompleteMutation.mutate(item.id)}
                          disabled={markCompleteMutation.isPending}
                        >
                          {isComplete ? '✓ Completed' : 'Mark as Complete'}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
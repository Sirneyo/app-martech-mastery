import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Upload, Link as LinkIcon, CheckSquare, Square, Send, MessageSquare, Clock, CheckCircle, AlertCircle, File } from 'lucide-react';

const STATUS_STYLES = {
  not_started: 'bg-slate-100 text-slate-500',
  in_progress: 'bg-blue-100 text-blue-700',
  in_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};
const STATUS_LABELS = { not_started: 'Not Started', in_progress: 'In Progress', in_review: 'In Review', approved: 'Done ✓', rejected: 'Needs Revision' };
const PRIORITY_STYLES = { high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-slate-100 text-slate-600' };

export default function TaskModal({ task, project, enrollment, user, submission, allTasks, onClose, onUpdated }) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [deliverableLink, setDeliverableLink] = useState(submission?.deliverable_link || '');
  const [deliverableText, setDeliverableText] = useState(submission?.deliverable_text || '');
  const [studentComment, setStudentComment] = useState(submission?.student_comment || '');
  const [uploading, setUploading] = useState(false);

  const subtasks = (() => { try { return JSON.parse(task.subtasks_json || '[]'); } catch { return []; } })();
  const completedSubtasks = (() => { try { return JSON.parse(submission?.subtasks_completed_json || '[]'); } catch { return []; } })();
  const isInReview = submission?.status === 'in_review';
  const isApproved = submission?.status === 'approved';
  const canEdit = !isInReview && !isApproved;

  // Auto-set to in_progress on first open
  const openMutation = useMutation({
    mutationFn: async () => {
      if (!submission) {
        return base44.entities.SimTaskSubmission.create({
          project_id: project.id,
          task_id: task.id,
          enrollment_id: enrollment.id,
          student_user_id: user.id,
          status: 'in_progress',
          first_opened_date: new Date().toISOString(),
        });
      } else if (submission.status === 'not_started') {
        return base44.entities.SimTaskSubmission.update(submission.id, { status: 'in_progress', first_opened_date: new Date().toISOString() });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-sim-task-submissions', enrollment.id] }),
  });

  useEffect(() => {
    if (!submission || submission.status === 'not_started') {
      openMutation.mutate();
    }
  }, []);

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['sim-task-comments', task.id, enrollment.id],
    queryFn: async () => {
      if (!submission?.id) return [];
      return base44.entities.SimTaskComment.filter({ task_submission_id: submission.id });
    },
    enabled: !!submission?.id,
  });

  const toggleSubtask = useMutation({
    mutationFn: async (index) => {
      const current = (() => { try { return JSON.parse(submission?.subtasks_completed_json || '[]'); } catch { return []; } })();
      const updated = current.includes(index) ? current.filter(i => i !== index) : [...current, index];
      const subId = submission?.id;
      if (subId) {
        return base44.entities.SimTaskSubmission.update(subId, { subtasks_completed_json: JSON.stringify(updated) });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-sim-task-submissions', enrollment.id] }),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const subId = submission?.id;
      const data = {
        status: 'in_review',
        submitted_date: new Date().toISOString(),
        student_comment: studentComment,
        deliverable_link: deliverableLink,
        deliverable_text: deliverableText,
      };
      return base44.entities.SimTaskSubmission.update(subId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-sim-task-submissions', enrollment.id] });
      onUpdated();
    },
  });

  const postComment = useMutation({
    mutationFn: async () => {
      if (!comment.trim() || !submission?.id) return;
      return base44.entities.SimTaskComment.create({
        task_submission_id: submission.id,
        project_id: project.id,
        task_id: task.id,
        author_user_id: user.id,
        author_name: user.full_name,
        author_role: 'student',
        content: comment,
      });
    },
    onSuccess: () => {
      setComment('');
      refetchComments();
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !submission?.id) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const existing = submission?.deliverable_file_urls || [];
    await base44.entities.SimTaskSubmission.update(submission.id, { deliverable_file_urls: [...existing, file_url] });
    queryClient.invalidateQueries({ queryKey: ['my-sim-task-submissions', enrollment.id] });
    setUploading(false);
  };

  const depTask = allTasks.find(t => t.id === task.dependency_task_id);

  const status = submission?.status || 'in_progress';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Badge className={`text-xs ${PRIORITY_STYLES[task.priority]}`}>{task.priority} priority</Badge>
              <Badge className={`text-xs ${STATUS_STYLES[status]}`}>{STATUS_LABELS[status]}</Badge>
            </div>
            <h2 className="text-xl font-bold text-slate-900">{task.title}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Tutor feedback (if rejected) */}
          {submission?.status === 'rejected' && submission.tutor_feedback && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-red-800 mb-1 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> Tutor Feedback</p>
              <p className="text-sm text-red-700">{submission.tutor_feedback}</p>
            </div>
          )}

          {/* Approved notice */}
          {isApproved && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-sm font-semibold text-green-800">This task has been approved by your tutor.</p>
            </div>
          )}

          {/* In review notice */}
          {isInReview && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <p className="text-sm font-semibold text-amber-800">Submitted for review — awaiting tutor feedback.</p>
            </div>
          )}

          {/* Brief */}
          {task.brief && (
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Task Brief</h3>
              <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed border border-slate-200">
                {task.brief}
              </div>
            </div>
          )}

          {/* Subtasks */}
          {subtasks.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Subtasks ({completedSubtasks.length}/{subtasks.length})</h3>
              <div className="space-y-2">
                {subtasks.map((sub, i) => {
                  const done = completedSubtasks.includes(i);
                  return (
                    <button
                      key={i}
                      disabled={!canEdit}
                      onClick={() => canEdit && toggleSubtask.mutate(i)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${done ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 hover:bg-slate-50'} ${!canEdit ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      {done ? <CheckSquare className="w-4 h-4 text-green-600 flex-shrink-0" /> : <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                      <span className={`text-sm ${done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Deliverable */}
          {canEdit && (
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">
                Deliverable
                <span className="text-xs font-normal text-slate-400 ml-2">Required: {task.deliverable_type}</span>
              </h3>
              <div className="space-y-3">
                {(task.deliverable_type === 'file' || task.deliverable_type === 'presentation' || task.deliverable_type === 'spreadsheet') && (
                  <div>
                    <label className="flex items-center gap-2 border-2 border-dashed border-slate-300 rounded-xl p-4 cursor-pointer hover:border-violet-400 transition-colors">
                      <Upload className="w-5 h-5 text-slate-400" />
                      <span className="text-sm text-slate-500">{uploading ? 'Uploading...' : 'Click to upload file'}</span>
                      <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                    </label>
                    {submission?.deliverable_file_urls?.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-violet-600 hover:underline mt-2">
                        <File className="w-4 h-4" /> Uploaded file {i + 1}
                      </a>
                    ))}
                  </div>
                )}
                {task.deliverable_type === 'link' && (
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-slate-400" />
                    <Input value={deliverableLink} onChange={e => setDeliverableLink(e.target.value)} placeholder="Paste your link here..." />
                  </div>
                )}
                {task.deliverable_type === 'text' && (
                  <Textarea value={deliverableText} onChange={e => setDeliverableText(e.target.value)} rows={4} placeholder="Enter your written deliverable..." />
                )}

                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Handover comment (optional)</label>
                  <Textarea value={studentComment} onChange={e => setStudentComment(e.target.value)} rows={2} placeholder="Anything you want to tell your tutor before they review..." />
                </div>
              </div>
            </div>
          )}

          {/* Submitted deliverable view */}
          {!canEdit && submission && (
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Submitted Deliverable</h3>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                {submission.deliverable_file_urls?.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-violet-600 hover:underline">
                    <File className="w-4 h-4" /> Uploaded file {i + 1}
                  </a>
                ))}
                {submission.deliverable_link && (
                  <a href={submission.deliverable_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-violet-600 hover:underline">
                    <LinkIcon className="w-4 h-4" /> {submission.deliverable_link}
                  </a>
                )}
                {submission.deliverable_text && <p className="text-sm text-slate-700">{submission.deliverable_text}</p>}
                {submission.student_comment && (
                  <div className="pt-2 border-t border-slate-200">
                    <p className="text-xs text-slate-400 mb-1">Your handover note:</p>
                    <p className="text-sm text-slate-600 italic">"{submission.student_comment}"</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Comments */}
          <div>
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" /> Comments
            </h3>
            <div className="space-y-3 mb-3 max-h-48 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-sm text-slate-400">No comments yet.</p>
              ) : comments.map(c => (
                <div key={c.id} className={`flex gap-3 ${c.author_role === 'tutor' ? '' : 'flex-row-reverse'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${c.author_role === 'tutor' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                    {c.author_name?.[0] || '?'}
                  </div>
                  <div className={`max-w-xs ${c.author_role === 'tutor' ? '' : 'text-right'}`}>
                    <p className="text-xs text-slate-400 mb-0.5">{c.author_name} · {c.author_role}</p>
                    <div className={`rounded-xl px-3 py-2 text-sm ${c.author_role === 'tutor' ? 'bg-slate-100 text-slate-700' : 'bg-blue-500 text-white'}`}>
                      {c.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Leave a comment or @mention your tutor..."
                rows={2}
                className="flex-1"
              />
              <Button onClick={() => postComment.mutate()} disabled={!comment.trim() || postComment.isPending} size="icon" className="self-end h-9 w-9">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Submit footer */}
        {canEdit && submission?.status !== 'not_started' && (
          <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4">
            <Button
              className="w-full gap-2"
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
            >
              <Send className="w-4 h-4" />
              {submitMutation.isPending ? 'Submitting...' : 'Submit for Review'}
            </Button>
            <p className="text-xs text-slate-400 text-center mt-2">Once submitted, you cannot edit until your tutor responds.</p>
          </div>
        )}
      </div>
    </div>
  );
}
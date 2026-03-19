import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X, MessageSquare, Send, CheckCircle2, XCircle,
  Upload, Link as LinkIcon, FileText, Clock,
  ArrowUpCircle, Circle, AlertCircle, ChevronDown,
  CheckSquare, Square, Star
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const STATUS_CONFIG = {
  not_started:  { label: 'Not Started', icon: Circle,        color: 'text-slate-500',  bg: 'bg-slate-100' },
  in_progress:  { label: 'In Progress', icon: ArrowUpCircle, color: 'text-blue-600',   bg: 'bg-blue-100' },
  in_review:    { label: 'In Review',   icon: AlertCircle,   color: 'text-amber-600',  bg: 'bg-amber-100' },
  approved:     { label: 'Approved',    icon: CheckCircle2,  color: 'text-emerald-600',bg: 'bg-emerald-100' },
  rejected:     { label: 'Needs Revision', icon: XCircle,   color: 'text-red-500',    bg: 'bg-red-100' },
};

const PRIORITY_STYLES = {
  high:   'bg-red-50 text-red-600 border border-red-100',
  medium: 'bg-amber-50 text-amber-600 border border-amber-100',
  low:    'bg-slate-50 text-slate-500 border border-slate-200',
};

export default function TutorTaskReviewPanel({ task, submission, student, phases, onClose, tutorId, projectId }) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [feedback, setFeedback] = useState(submission?.tutor_feedback || '');
  const [showFeedbackEditor, setShowFeedbackEditor] = useState(false);

  const phase = phases?.find(p => p.id === task.phase_id);
  const status = submission?.status || 'not_started';
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.not_started;
  const StatusIcon = cfg.icon;

  let subtasks = [];
  try { subtasks = JSON.parse(task.subtasks_json || '[]'); } catch {}
  let completedSubtasks = [];
  try { completedSubtasks = JSON.parse(submission?.subtasks_completed_json || '[]'); } catch {}

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['task-comments', submission?.id],
    queryFn: () => submission?.id
      ? base44.entities.TaskComment.filter({ task_submission_id: submission.id })
      : Promise.resolve([]),
    enabled: !!submission?.id,
    refetchInterval: 15000,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ newStatus, tutorFeedback }) => {
      if (!submission?.id) return;
      const updateData = {
        status: newStatus,
        reviewed_by_tutor_id: tutorId,
        reviewed_date: new Date().toISOString(),
      };
      if (tutorFeedback !== undefined) updateData.tutor_feedback = tutorFeedback;
      if (newStatus === 'rejected') updateData.revision_count = (submission.revision_count || 0) + 1;
      await base44.entities.TaskSubmission.update(submission.id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-submissions-project', projectId] });
      setShowFeedbackEditor(false);
    },
  });

  const addComment = useMutation({
    mutationFn: async (text) => {
      if (!submission?.id) return;
      await base44.entities.TaskComment.create({
        task_submission_id: submission.id,
        project_id: projectId,
        task_id: task.id,
        author_user_id: tutorId,
        author_name: currentUser?.full_name || currentUser?.email || 'Tutor',
        author_role: 'tutor',
        content: text,
      });
    },
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['task-comments', submission?.id] });
    },
  });

  const handleApprove = () => {
    reviewMutation.mutate({ newStatus: 'approved', tutorFeedback: feedback });
  };

  const handleRequestRevision = () => {
    reviewMutation.mutate({ newStatus: 'rejected', tutorFeedback: feedback });
  };

  const canReview = submission?.status === 'in_review';

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <motion.div
          className="relative ml-auto w-full max-w-xl bg-white h-full flex flex-col shadow-2xl"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        >
          {/* Header */}
          <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {cfg.label}
              </span>
              {task.priority && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[task.priority]}`}>
                  {task.priority}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Student info strip */}
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {(student?.student_name || 'S').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-700 truncate">{student?.student_name || 'Student'}</p>
              {student?.student_email && <p className="text-[10px] text-slate-400 truncate">{student.student_email}</p>}
            </div>
            {submission?.revision_count > 0 && (
              <Badge className="ml-auto text-[10px] bg-red-50 text-red-500 border border-red-100">
                {submission.revision_count} revision{submission.revision_count !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-5 space-y-6">

              {/* Task info */}
              <div>
                {phase && <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-1">{phase.title}</p>}
                <h2 className="text-xl font-bold text-slate-900 leading-snug">{task.title}</h2>
              </div>

              {task.brief && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Brief</h3>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{task.brief}</p>
                </div>
              )}

              {/* Subtasks progress (read-only for tutor) */}
              {subtasks.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subtask Progress</h3>
                    <span className="text-xs text-slate-400">{completedSubtasks.length}/{subtasks.length} done</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3">
                    <div
                      className="bg-teal-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${subtasks.length > 0 ? (completedSubtasks.length / subtasks.length) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    {subtasks.map((subtask, i) => {
                      const done = completedSubtasks.includes(i);
                      return (
                        <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-sm ${done ? 'border-green-100 bg-green-50/50' : 'border-slate-100 bg-slate-50'}`}>
                          {done
                            ? <CheckSquare className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            : <Square className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />}
                          <span className={done ? 'line-through text-slate-400' : 'text-slate-700'}>{subtask}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Submission / Deliverable */}
              {submission ? (
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Student Submission</h3>
                  <div className="space-y-2">
                    {submission.deliverable_link && (
                      <a href={submission.deliverable_link} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-violet-600 hover:underline bg-violet-50 border border-violet-100 rounded-xl px-3 py-2.5">
                        <LinkIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{submission.deliverable_link}</span>
                      </a>
                    )}
                    {submission.deliverable_text && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <p className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">Text submission</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{submission.deliverable_text}</p>
                      </div>
                    )}
                    {submission.deliverable_file_urls?.length > 0 && (
                      <div className="space-y-1">
                        {submission.deliverable_file_urls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-violet-600 hover:underline bg-violet-50 border border-violet-100 rounded-xl px-3 py-2.5">
                            <Upload className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">File {i + 1}</span>
                          </a>
                        ))}
                      </div>
                    )}
                    {submission.student_comment && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mt-1">
                        <p className="text-xs text-blue-500 font-semibold uppercase tracking-wider mb-1">Student Note</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{submission.student_comment}</p>
                      </div>
                    )}
                    {submission.submitted_date && (
                      <p className="text-xs text-slate-400 pt-1">
                        Submitted {new Date(submission.submitted_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center">
                  <Clock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Student hasn't submitted yet</p>
                </div>
              )}

              {/* Tutor feedback */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tutor Feedback</h3>
                  {submission && !showFeedbackEditor && (
                    <button
                      onClick={() => setShowFeedbackEditor(true)}
                      className="text-xs text-teal-600 hover:underline font-medium"
                    >
                      {submission.tutor_feedback ? 'Edit' : '+ Add feedback'}
                    </button>
                  )}
                </div>
                {showFeedbackEditor ? (
                  <div className="space-y-2">
                    <textarea
                      value={feedback}
                      onChange={e => setFeedback(e.target.value)}
                      placeholder="Write feedback for the student…"
                      rows={4}
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400 placeholder:text-slate-400 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowFeedbackEditor(false)}
                        className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  submission?.tutor_feedback ? (
                    <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                      <p className="text-sm text-violet-900 leading-relaxed whitespace-pre-wrap">{submission.tutor_feedback}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No feedback added yet.</p>
                  )
                )}
              </div>

              {/* Review actions */}
              {canReview && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Awaiting your review
                  </p>
                  {!showFeedbackEditor && (
                    <textarea
                      value={feedback}
                      onChange={e => setFeedback(e.target.value)}
                      placeholder="Add feedback before approving or requesting revision…"
                      rows={3}
                      className="w-full text-sm border border-amber-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-slate-400 resize-none bg-white"
                    />
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleApprove}
                      disabled={reviewMutation.isPending}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve
                    </Button>
                    <Button
                      onClick={handleRequestRevision}
                      disabled={reviewMutation.isPending}
                      variant="outline"
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50 gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Request Revision
                    </Button>
                  </div>
                </div>
              )}

              {/* Comments */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Comments ({comments.length})
                </h3>
                {comments.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No comments yet.</p>
                ) : (
                  <div className="space-y-3">
                    {[...comments].sort((a, b) => new Date(a.created_date) - new Date(b.created_date)).map(c => (
                      <div key={c.id} className={`rounded-xl p-3 text-sm ${c.author_role === 'tutor'
                        ? 'bg-violet-50 border border-violet-100'
                        : 'bg-slate-50 border border-slate-100'}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-semibold text-xs ${c.author_role === 'tutor' ? 'text-violet-600' : 'text-slate-600'}`}>
                            {c.author_name || 'Unknown'}{c.author_role === 'tutor' ? ' · Tutor' : ' · Student'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(c.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-700 whitespace-pre-wrap">{c.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Comment input */}
          {submission && (
            <div className="border-t border-slate-200 px-6 py-4 flex-shrink-0">
              <div className="flex gap-2">
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey && comment.trim()) {
                      e.preventDefault();
                      addComment.mutate(comment.trim());
                    }
                  }}
                  placeholder="Message student… (Enter to send)"
                  rows={2}
                  className="flex-1 resize-none text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent placeholder:text-slate-400"
                />
                <Button
                  onClick={() => comment.trim() && addComment.mutate(comment.trim())}
                  disabled={!comment.trim() || addComment.isPending}
                  size="icon"
                  className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl h-auto w-10 self-end flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
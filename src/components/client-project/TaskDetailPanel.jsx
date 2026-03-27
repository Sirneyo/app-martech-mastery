import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  X, CheckSquare, Square, MessageSquare, Send,
  Link as LinkIcon, Clock, Paperclip,
  PlayCircle, AlertCircle, CheckCircle, ChevronDown
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'To Do', icon: Clock, color: 'text-slate-500', bg: 'bg-slate-100' },
  { value: 'in_progress', label: 'In Progress', icon: PlayCircle, color: 'text-blue-600', bg: 'bg-blue-100', studentEditable: true },
  { value: 'in_review', label: 'In Review', icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-100', studentEditable: true },
  { value: 'approved', label: 'Completed', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
];

const PRIORITY_STYLES = {
  high:   'bg-red-50 text-red-600 border border-red-100',
  medium: 'bg-amber-50 text-amber-600 border border-amber-100',
  low:    'bg-slate-50 text-slate-500 border border-slate-200',
};

function renderWithLinks(text, onLinkClick) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part)
      ? <button key={i} onClick={(e) => { e.preventDefault(); onLinkClick(part); }} className="text-violet-600 underline hover:text-violet-800 break-all">{part}</button>
      : <span key={i}>{part}</span>
  );
}

export default function TaskDetailPanel({ task, submission, onClose, userId, enrollmentId, projectId, phases, onEnrollmentChange }) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [optimisticStatus, setOptimisticStatus] = useState(submission?.status || 'not_started');
  const [optimisticSubtasks, setOptimisticSubtasks] = useState([]);
  const [localSubmissionId, setLocalSubmissionId] = useState(submission?.id || null);
  const [linkToOpen, setLinkToOpen] = useState(null);

  let subtasks = [];
  try { subtasks = JSON.parse(task.subtasks_json || '[]'); } catch {}
  let completedSubtasks = [];
  try { completedSubtasks = JSON.parse(submission?.subtasks_completed_json || '[]'); } catch {}

  useEffect(() => {
    setOptimisticStatus(submission?.status || 'not_started');
    setOptimisticSubtasks(completedSubtasks);
    if (submission?.id) setLocalSubmissionId(submission.id);
  }, [submission?.id, task.id]);

  const phase = phases?.find(p => p.id === task.phase_id);

  const { data: comments = [] } = useQuery({
    queryKey: ['task-comments', localSubmissionId],
    queryFn: () => base44.entities.TaskComment.filter({ task_submission_id: localSubmissionId }),
    enabled: !!localSubmissionId,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const updateSubmission = useMutation({
    mutationFn: async (data) => {
      if (submission?.id) {
        await base44.entities.TaskSubmission.update(submission.id, data);
      } else {
        await base44.entities.TaskSubmission.create({
          project_id: projectId,
          task_id: task.id,
          enrollment_id: enrollmentId,
          student_user_id: userId,
          first_opened_date: new Date().toISOString(),
          ...data,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-task-submissions', projectId, userId] });
    },
  });

  const addComment = useMutation({
    mutationFn: async ({ text, files }) => {
      let subId = submission?.id;
      if (!subId) {
        const sub = await base44.entities.TaskSubmission.create({
          project_id: projectId,
          task_id: task.id,
          enrollment_id: enrollmentId,
          student_user_id: userId,
          status: 'not_started',
          first_opened_date: new Date().toISOString(),
        });
        subId = sub.id;
        queryClient.invalidateQueries({ queryKey: ['my-task-submissions', projectId, userId] });
      }
      const fullContent = files.length > 0
        ? (text ? text + '\n' : '') + files.map(f => `[file:${f.name}](${f.url})`).join('\n')
        : text;
      const newComment = await base44.entities.TaskComment.create({
        task_submission_id: subId,
        project_id: projectId,
        task_id: task.id,
        author_user_id: userId,
        author_name: currentUser?.full_name || currentUser?.email || 'You',
        author_role: 'student',
        content: fullContent,
      });
      return { subId, newComment };
    },
    onSuccess: ({ subId }) => {
      setComment('');
      setAttachedFiles([]);
      setLocalSubmissionId(subId);
      queryClient.invalidateQueries({ queryKey: ['task-comments', subId] });
    },
  });

  const handleStatusChange = (newStatus) => {
    if (newStatus === 'approved') return;
    if (newStatus === 'in_review' && optimisticStatus === 'in_progress') {
      if (confirm('Once submitted for review, you won\'t be able to make changes until the tutor reviews it. Continue?')) {
        setOptimisticStatus(newStatus);
        setShowStatusMenu(false);
        updateSubmission.mutate({ status: newStatus });
      }
      return;
    }
    setOptimisticStatus(newStatus);
    setShowStatusMenu(false);
    updateSubmission.mutate({ status: newStatus });
  };

  const toggleSubtask = (index) => {
    const newCompleted = optimisticSubtasks.includes(index)
      ? optimisticSubtasks.filter(i => i !== index)
      : [...optimisticSubtasks, index];
    setOptimisticSubtasks(newCompleted);
    updateSubmission.mutate({ subtasks_completed_json: JSON.stringify(newCompleted) });
  };

  const currentStatusOption = STATUS_OPTIONS.find(s => s.value === optimisticStatus) || STATUS_OPTIONS[0];
  const StatusIcon = currentStatusOption.icon;

  return (
    <AnimatePresence>
      {linkToOpen && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full mx-4 p-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <h3 className="font-semibold text-slate-900 mb-2">Open External Link?</h3>
            <p className="text-sm text-slate-600 mb-4 break-all"><span className="font-mono text-xs bg-slate-50 px-2 py-1 rounded">{linkToOpen}</span></p>
            <div className="flex gap-3">
              <button
                onClick={() => setLinkToOpen(null)}
                className="flex-1 h-9 px-4 rounded-lg border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onEnrollmentChange?.();
                  window.open(linkToOpen, '_blank');
                  setLinkToOpen(null);
                }}
                className="flex-1 h-9 px-4 rounded-lg bg-violet-600 text-white font-medium text-sm hover:bg-violet-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
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
          <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setShowStatusMenu(p => !p)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${currentStatusOption.bg} ${currentStatusOption.color} hover:opacity-80`}
                >
                  <StatusIcon className="w-3.5 h-3.5" />
                  {currentStatusOption.label}
                  <ChevronDown className="w-3 h-3 ml-0.5" />
                </button>
                {showStatusMenu && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden w-44">
                    {STATUS_OPTIONS.map(opt => {
                      const Ico = opt.icon;
                      const disabled = opt.value === 'approved';
                      return (
                        <button
                          key={opt.value}
                          onClick={() => !disabled && handleStatusChange(opt.value)}
                          disabled={disabled}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium transition-colors
                            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'}
                            ${opt.value === optimisticStatus ? 'bg-slate-50 font-bold' : ''}`}
                        >
                          <Ico className={`w-4 h-4 ${opt.color}`} />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
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

          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-6 space-y-6">
              <div>
                {phase && <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-1">{phase.title}</p>}
                <h2 className="text-xl font-bold text-slate-900 leading-snug">{task.title}</h2>
              </div>

              {task.brief && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Brief</h3>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{renderWithLinks(task.brief, setLinkToOpen)}</p>
                </div>
              )}

              {(() => {
                let refs = [];
                try { refs = JSON.parse(task.reference_files_json || '[]'); } catch {}
                return refs.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Resources</h3>
                    <div className="space-y-1.5">
                      {refs.map((url, i) => (
                        <button key={i} onClick={() => setLinkToOpen(url)}
                          className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-800 hover:underline break-all text-left">
                          <LinkIcon className="w-3.5 h-3.5 flex-shrink-0" />
                          {url}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {subtasks.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subtasks</h3>
                    <span className="text-xs text-slate-400">{optimisticSubtasks.length}/{subtasks.length} done</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3">
                    <div
                      className="bg-teal-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${subtasks.length > 0 ? (optimisticSubtasks.length / subtasks.length) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="space-y-2">
                    {subtasks.map((subtask, i) => {
                      const done = optimisticSubtasks.includes(i);
                      return (
                        <button
                          key={i}
                          onClick={() => toggleSubtask(i)}
                          className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all hover:bg-slate-50 border
                            ${done ? 'border-green-100 bg-green-50/50' : 'border-slate-100'}`}
                        >
                          {done
                            ? <CheckSquare className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            : <Square className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />
                          }
                          <span className={`text-sm ${done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{subtask}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {submission?.tutor_feedback && (
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-violet-500 uppercase tracking-wider mb-2">Tutor Feedback</h3>
                  <p className="text-sm text-violet-900 leading-relaxed">{submission.tutor_feedback}</p>
                </div>
              )}

              <div>
                {optimisticStatus === 'in_review' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-xs text-amber-700 font-medium">This task is under review. You cannot make changes until your tutor provides feedback.</p>
                  </div>
                )}

                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Comments ({comments.length})
                </h3>
                {comments.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No comments yet. Add one below.</p>
                ) : (
                  <div className="space-y-3 mb-4">
                    {[...comments].sort((a, b) => new Date(a.created_date) - new Date(b.created_date)).map((c, idx) => (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: idx * 0.04 }}
                        className={`rounded-xl p-3 text-sm ${c.author_role === 'tutor'
                          ? 'bg-violet-50 border border-violet-100'
                          : 'bg-slate-50 border border-slate-100'}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-semibold text-xs ${c.author_role === 'tutor' ? 'text-violet-600' : 'text-slate-600'}`}>
                            {c.author_name || 'Unknown'}{c.author_role === 'tutor' ? ' · Tutor' : ''}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(c.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-slate-700 whitespace-pre-wrap text-sm">
                  {c.content.split('\n').map((line, li) => {
                    const fileMatch = line.match(/^\[file:(.+?)\]\((.+?)\)$/);
                    if (fileMatch) {
                      return (
                        <a key={li} href={fileMatch[2]} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-violet-600 hover:text-violet-800 underline mt-1">
                          <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                          {fileMatch[1]}
                        </a>
                      );
                    }
                    return line ? <span key={li} className="block">{line}</span> : <br key={li} />;
                  })}
                </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 px-4 py-3 flex-shrink-0 bg-slate-50">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploadingFile(true);
                const { file_url } = await base44.integrations.Core.UploadFile({ file });
                setAttachedFiles(prev => [...prev, { name: file.name, url: file_url }]);
                setUploadingFile(false);
                e.target.value = '';
              }}
            />
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-1 pt-1">
                {attachedFiles.map((f, i) => (
                  <span key={i} className="flex items-center gap-1 bg-violet-50 border border-violet-200 text-violet-700 text-xs rounded-lg px-2 py-1">
                    <Paperclip className="w-3 h-3" />
                    {f.name}
                    <button onClick={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))} className="ml-0.5 text-violet-400 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-end bg-white border border-slate-200 rounded-2xl px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-teal-400 focus-within:border-transparent transition-all">
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && (comment.trim() || attachedFiles.length > 0)) {
                    e.preventDefault();
                    addComment.mutate({ text: comment.trim(), files: attachedFiles });
                  }
                }}
                placeholder="Add a comment…"
                rows={1}
                className="flex-1 resize-none text-sm focus:outline-none placeholder:text-slate-400 bg-transparent max-h-24 py-0.5"
              />
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40"
                  title="Attach file"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <button
                  onClick={() => (comment.trim() || attachedFiles.length > 0) && addComment.mutate({ text: comment.trim(), files: attachedFiles })}
                  disabled={(!comment.trim() && attachedFiles.length === 0) || addComment.isPending}
                  className="w-8 h-8 bg-teal-600 hover:bg-teal-700 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
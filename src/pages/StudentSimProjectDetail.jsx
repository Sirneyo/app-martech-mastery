import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderKanban, CheckCircle, Clock, AlertCircle,
  PlayCircle, X, ChevronRight, FileText, Link as LinkIcon,
  Upload, CheckSquare, Square
} from 'lucide-react';
import ProjectPartnershipBar from '@/components/ProjectPartnershipBar';

const TASK_STATUS_STYLES = {
  not_started: 'bg-slate-100 text-slate-500',
  in_progress: 'bg-blue-100 text-blue-700',
  in_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const TASK_STATUS_ICONS = {
  not_started: Clock,
  in_progress: PlayCircle,
  in_review: AlertCircle,
  approved: CheckCircle,
  rejected: AlertCircle,
};

const PRIORITY_STYLES = {
  high: 'bg-red-50 text-red-600 border border-red-100',
  medium: 'bg-amber-50 text-amber-600 border border-amber-100',
  low: 'bg-slate-50 text-slate-500 border border-slate-200',
};

// Task Detail Drawer
function TaskDrawer({ task, submission, onClose }) {
  if (!task) return null;

  const status = submission?.status || 'not_started';
  const Icon = TASK_STATUS_ICONS[status];

  let subtasks = [];
  try { subtasks = JSON.parse(task.subtasks_json || '[]'); } catch {}
  let completedSubtasks = [];
  try { completedSubtasks = JSON.parse(submission?.subtasks_completed_json || '[]'); } catch {}

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />

        {/* Panel */}
        <motion.div
          className="relative ml-auto w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <Icon className={`w-5 h-5 flex-shrink-0 ${
                status === 'approved' ? 'text-green-500' :
                status === 'in_review' ? 'text-amber-500' :
                status === 'in_progress' ? 'text-blue-500' : 'text-slate-400'
              }`} />
              <Badge className={TASK_STATUS_STYLES[status]}>{status.replace(/_/g, ' ')}</Badge>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-6">
            {/* Title */}
            <div>
              {task.priority && (
                <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full mb-2 ${PRIORITY_STYLES[task.priority]}`}>
                  {task.priority} priority
                </span>
              )}
              <h2 className="text-xl font-bold text-slate-900">{task.title}</h2>
            </div>

            {/* Brief */}
            {task.brief && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Task Brief</h3>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{task.brief}</p>
              </div>
            )}

            {/* Subtasks */}
            {subtasks.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Subtasks</h3>
                <div className="space-y-2">
                  {subtasks.map((subtask, i) => {
                    const done = completedSubtasks.includes(i);
                    return (
                      <div key={i} className="flex items-start gap-2.5">
                        {done
                          ? <CheckSquare className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          : <Square className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />
                        }
                        <span className={`text-sm ${done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{subtask}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Deliverable info */}
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Deliverable Type</h3>
              <div className="flex items-center gap-2">
                {task.deliverable_type === 'file' && <Upload className="w-4 h-4 text-slate-400" />}
                {task.deliverable_type === 'link' && <LinkIcon className="w-4 h-4 text-slate-400" />}
                {task.deliverable_type === 'text' && <FileText className="w-4 h-4 text-slate-400" />}
                <span className="text-sm text-slate-600 capitalize">{task.deliverable_type || 'file'}</span>
              </div>
            </div>

            {/* Submission info if exists */}
            {submission?.deliverable_link && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Your Submission</h3>
                <a href={submission.deliverable_link} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-violet-600 hover:underline flex items-center gap-1">
                  <LinkIcon className="w-3.5 h-3.5" />
                  {submission.deliverable_link}
                </a>
              </div>
            )}
            {submission?.deliverable_text && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Your Submission</h3>
                <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4 border border-slate-200 whitespace-pre-wrap">{submission.deliverable_text}</p>
              </div>
            )}

            {/* Tutor feedback */}
            {submission?.tutor_feedback && (
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-violet-500 uppercase tracking-wider mb-2">Tutor Feedback</h3>
                <p className="text-sm text-violet-900 leading-relaxed">{submission.tutor_feedback}</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function StudentSimProjectDetail() {
  const navigate = useNavigate();
  const [selectedTask, setSelectedTask] = useState(null);

  const params = new URLSearchParams(window.location.search);
  const projectId = params.get('id');

  const { data: user } = useQuery({ queryKey: ['current-user'], queryFn: () => base44.auth.me() });

  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['sim-project', projectId],
    queryFn: async () => {
      const list = await base44.entities.SimProject.filter({ id: projectId });
      return list[0];
    },
    enabled: !!projectId,
  });

  const { data: phases = [] } = useQuery({
    queryKey: ['sim-phases', projectId],
    queryFn: () => base44.entities.SimProjectPhase.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['sim-tasks', projectId],
    queryFn: () => base44.entities.SimProjectTask.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: enrollment, isLoading: loadingEnrollment } = useQuery({
    queryKey: ['my-enrollment', projectId, user?.id],
    queryFn: async () => {
      const list = await base44.entities.SimProjectEnrollment.filter({
        project_id: projectId,
        student_user_id: user.id,
      });
      return list[0];
    },
    enabled: !!projectId && !!user?.id,
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['my-task-submissions', projectId, user?.id],
    queryFn: () => base44.entities.SimTaskSubmission.filter({
      project_id: projectId,
      student_user_id: user.id,
    }),
    enabled: !!projectId && !!user?.id,
  });

  if (!projectId) {
    navigate(createPageUrl('StudentSimProjects'));
    return null;
  }

  if (loadingProject || loadingEnrollment) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!project || !enrollment) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <p className="text-slate-500">Project not found or you're not enrolled.</p>
        <button onClick={() => navigate(createPageUrl('StudentSimProjects'))}
          className="text-teal-600 text-sm hover:underline">
          Back to Projects
        </button>
      </div>
    );
  }

  const sortedPhases = [...phases].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const getSubmission = (taskId) => submissions.find(s => s.task_id === taskId);

  const TaskRow = ({ task }) => {
    const sub = getSubmission(task.id);
    const status = sub?.status || 'not_started';
    const Icon = TASK_STATUS_ICONS[status];
    return (
      <button
        onClick={() => setSelectedTask({ task, submission: sub || null })}
        className="w-full px-6 py-4 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left group"
      >
        <Icon className={`w-5 h-5 flex-shrink-0 ${
          status === 'approved' ? 'text-green-500' :
          status === 'in_review' ? 'text-amber-500' :
          status === 'in_progress' ? 'text-blue-500' : 'text-slate-400'
        }`} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900 group-hover:text-teal-700 transition-colors">{task.title}</p>
          {task.brief && <p className="text-sm text-slate-500 line-clamp-1 mt-0.5">{task.brief}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge className={TASK_STATUS_STYLES[status]}>{status.replace(/_/g, ' ')}</Badge>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-400 transition-colors" />
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <ProjectPartnershipBar showBack backTo="StudentSimProjects" />

      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center flex-shrink-0 shadow-sm">
              <FolderKanban className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              {project.company_name && <p className="text-xs text-teal-600 font-semibold uppercase tracking-wider mb-0.5">{project.company_name}</p>}
              <h1 className="text-2xl font-bold text-slate-900">{project.title}</h1>
              {project.overview && <p className="text-slate-500 mt-1 text-sm">{project.overview}</p>}
            </div>
            <Badge className={`capitalize ${
              enrollment.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
              enrollment.status === 'completed' ? 'bg-teal-50 text-teal-700 border border-teal-200' :
              'bg-slate-100 text-slate-500'
            }`}>{enrollment.status}</Badge>
          </div>
        </motion.div>

        {/* Phases & Tasks */}
        {sortedPhases.length === 0 && tasks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Tasks are being set up. Check back soon.</p>
          </div>
        ) : sortedPhases.length > 0 ? (
          <div className="space-y-6">
            {sortedPhases.map((phase, pi) => {
              const phaseTasks = tasks
                .filter(t => t.phase_id === phase.id)
                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
              return (
                <motion.div key={phase.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: pi * 0.05 }}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                    <h2 className="font-semibold text-slate-800">{phase.title}</h2>
                    {phase.description && <p className="text-sm text-slate-500 mt-0.5">{phase.description}</p>}
                  </div>
                  <div className="divide-y divide-slate-100">
                    {phaseTasks.map(task => <TaskRow key={task.id} task={task} />)}
                    {phaseTasks.length === 0 && (
                      <p className="px-6 py-4 text-sm text-slate-400">No tasks in this phase yet.</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {tasks.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map(task => <TaskRow key={task.id} task={task} />)}
            </div>
          </div>
        )}
      </div>

      {/* Task detail drawer */}
      {selectedTask && (
        <TaskDrawer
          task={selectedTask.task}
          submission={selectedTask.submission}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
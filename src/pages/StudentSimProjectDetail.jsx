import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  FolderKanban, CheckCircle, Clock, AlertCircle,
  PlayCircle
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

export default function StudentSimProjectDetail() {
  const navigate = useNavigate();
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!project || !enrollment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center gap-4">
        <p className="text-slate-500">Project not found or you're not enrolled.</p>
        <button onClick={() => navigate(createPageUrl('StudentSimProjects'))}
          className="text-violet-600 text-sm hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </button>
      </div>
    );
  }

  const sortedPhases = [...phases].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const getSubmission = (taskId) => submissions.find(s => s.task_id === taskId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <ProjectPartnershipBar showBack backLabel="Back to Projects" backTo="StudentSimProjects" />
      <div className="max-w-4xl mx-auto p-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
              <FolderKanban className="w-7 h-7 text-violet-600" />
            </div>
            <div className="flex-1">
              {project.company_name && <p className="text-xs text-slate-400 font-medium mb-0.5">{project.company_name}</p>}
              <h1 className="text-2xl font-bold text-slate-900">{project.title}</h1>
              {project.overview && <p className="text-slate-500 mt-1">{project.overview}</p>}
            </div>
            <Badge className="bg-green-100 text-green-700 capitalize">{enrollment.status}</Badge>
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
                    {phaseTasks.map(task => {
                      const sub = getSubmission(task.id);
                      const status = sub?.status || 'not_started';
                      const Icon = TASK_STATUS_ICONS[status];
                      return (
                        <div key={task.id} className="px-6 py-4 flex items-center gap-3">
                          <Icon className={`w-5 h-5 flex-shrink-0 ${status === 'approved' ? 'text-green-500' : status === 'in_review' ? 'text-amber-500' : 'text-slate-400'}`} />
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">{task.title}</p>
                            {task.brief && <p className="text-sm text-slate-500 line-clamp-1 mt-0.5">{task.brief}</p>}
                          </div>
                          <Badge className={TASK_STATUS_STYLES[status]}>{status.replace(/_/g, ' ')}</Badge>
                        </div>
                      );
                    })}
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
              {tasks.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map(task => {
                const sub = getSubmission(task.id);
                const status = sub?.status || 'not_started';
                const Icon = TASK_STATUS_ICONS[status];
                return (
                  <div key={task.id} className="px-6 py-4 flex items-center gap-3">
                    <Icon className={`w-5 h-5 flex-shrink-0 ${status === 'approved' ? 'text-green-500' : 'text-slate-400'}`} />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{task.title}</p>
                      {task.brief && <p className="text-sm text-slate-500 line-clamp-1 mt-0.5">{task.brief}</p>}
                    </div>
                    <Badge className={TASK_STATUS_STYLES[status]}>{status.replace(/_/g, ' ')}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
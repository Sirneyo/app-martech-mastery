import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
  import { motion } from 'framer-motion';
  import { FolderKanban, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import KanbanBoard from '@/components/client-project/KanbanBoard';
import TaskDetailPanel from '@/components/client-project/TaskDetailPanel';

export default function StudentClientProjectDetail() {
  const navigate = useNavigate();
  const [selectedTask, setSelectedTask] = useState(null);
  const [showKickoffAlert, setShowKickoffAlert] = useState(false);
  const [pendingProjectId, setPendingProjectId] = useState(null);

  const params = new URLSearchParams(window.location.search);
  const projectId = params.get('id');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const list = await base44.entities.Project.filter({ id: projectId });
      return list[0];
    },
    enabled: !!projectId,
    staleTime: 0,
    gcTime: 0,
  });

  const { data: phases = [] } = useQuery({
    queryKey: ['project-phases', projectId],
    queryFn: () => base44.entities.ProjectPhase.filter({ project_id: projectId }),
    enabled: !!projectId,
    staleTime: 0,
    gcTime: 0,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: () => base44.entities.ProjectTask.filter({ project_id: projectId }),
    enabled: !!projectId,
    staleTime: 0,
    gcTime: 0,
  });

  const { data: enrollment, isLoading: loadingEnrollment } = useQuery({
    queryKey: ['my-enrollment', projectId, user?.id],
    queryFn: async () => {
      const list = await base44.entities.ProjectEnrollment.filter({
        project_id: projectId,
        student_user_id: user.id,
      });
      return list[0];
    },
    enabled: !!projectId && !!user?.id,
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['my-task-submissions', projectId, user?.id],
    queryFn: () => base44.entities.TaskSubmission.filter({
      project_id: projectId,
      student_user_id: user.id,
    }),
    enabled: !!projectId && !!user?.id,
  });

  if (!projectId) {
    navigate(createPageUrl('StudentClientProjects'));
    return null;
  }

  const handleProjectEnter = (id) => {
    setPendingProjectId(id);
    setShowKickoffAlert(true);
  };

  const handleConfirmKickoff = () => {
    setShowKickoffAlert(false);
    setPendingProjectId(null);
  };

  const handleBackClick = () => {
    navigate('/StudentClientProjects');
  };

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
        <button onClick={() => navigate(createPageUrl('StudentClientProjects'))}
          className="text-teal-600 text-sm hover:underline">
          Back to Projects
        </button>
      </div>
    );
  }

  const totalTasks = tasks.length;
  const doneTasks = submissions.filter(s => s.status === 'approved').length;

  return (
    <div className="min-h-screen bg-slate-50">
      {showKickoffAlert && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full mx-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 text-base">Project Kick-off</h3>
                  <p className="text-sm text-slate-500 mt-1">Clicking "Start Project" will move this project to the "In Progress" phase. You'll then be able to begin working on tasks.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowKickoffAlert(false)}
                  className="flex-1 h-9 px-4 rounded-lg border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmKickoff}
                  className="flex-1 h-9 px-4 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors"
                >
                  Start Project
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      <div className="p-6 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handleBackClick}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
            title="Back to My Projects"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
        </div>
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6 flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center flex-shrink-0 shadow-sm">
            <FolderKanban className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            {project.company_name && (
              <p className="text-xs text-teal-600 font-semibold uppercase tracking-wider mb-0.5">{project.company_name}</p>
            )}
            <h1 className="text-xl font-bold text-slate-900">{project.title}</h1>
            {project.overview && <p className="text-slate-500 mt-0.5 text-sm">{project.overview}</p>}
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            {totalTasks > 0 && (
              <div className="text-right">
                <p className="text-xs text-slate-400">Progress</p>
                <p className="text-sm font-bold text-slate-700">{doneTasks}/{totalTasks} done</p>
                <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1">
                  <div
                    className="bg-teal-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}
            <Badge className={`capitalize ${
              enrollment.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
              enrollment.status === 'completed' ? 'bg-teal-50 text-teal-700 border border-teal-200' :
              'bg-slate-100 text-slate-500'
            }`}>{enrollment.status}</Badge>
          </div>
        </motion.div>

        {tasks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Tasks are being set up. Check back soon.</p>
          </div>
        ) : (
          <KanbanBoard
            tasks={tasks}
            phases={phases}
            submissions={submissions}
            enrollmentId={enrollment.id}
            userId={user?.id}
            projectId={projectId}
            onTaskClick={(task, submission) => setSelectedTask({ task, submission: submission || null })}
          />
        )}
      </div>

      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask.task}
          submission={selectedTask.submission}
          phases={phases}
          userId={user?.id}
          enrollmentId={enrollment?.id}
          projectId={projectId}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
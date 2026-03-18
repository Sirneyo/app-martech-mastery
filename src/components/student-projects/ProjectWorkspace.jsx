import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, List, LayoutGrid, CheckCircle, Clock, Lock, AlertCircle, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import TaskModal from '@/components/student-projects/TaskModal';

const STATUS_STYLES = {
  not_started: 'bg-slate-100 text-slate-500',
  in_progress: 'bg-blue-100 text-blue-700',
  in_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};
const STATUS_LABELS = { not_started: 'Not Started', in_progress: 'In Progress', in_review: 'In Review', approved: 'Done', rejected: 'Needs Revision' };
const PRIORITY_STYLES = { high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-slate-100 text-slate-600' };

export default function ProjectWorkspace({ project, enrollment, user }) {
  const navigate = useNavigate();
  const [view, setView] = useState('list');
  const [selectedTask, setSelectedTask] = useState(null);

  const { data: phases = [] } = useQuery({
    queryKey: ['sim-phases', project.id],
    queryFn: () => base44.entities.SimProjectPhase.filter({ project_id: project.id }),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['sim-tasks', project.id],
    queryFn: () => base44.entities.SimProjectTask.filter({ project_id: project.id }),
  });

  const { data: submissions = [], refetch: refetchSubmissions } = useQuery({
    queryKey: ['my-sim-task-submissions', enrollment.id],
    queryFn: () => base44.entities.SimTaskSubmission.filter({ enrollment_id: enrollment.id }),
  });

  const submissionMap = Object.fromEntries(submissions.map(s => [s.task_id, s]));

  const isTaskUnlocked = (task) => {
    if (!task.dependency_task_id) return true;
    const depSub = submissionMap[task.dependency_task_id];
    return depSub?.status === 'approved';
  };

  const getTaskStatus = (task) => {
    const sub = submissionMap[task.id];
    return sub?.status || 'not_started';
  };

  const sortedPhases = [...phases].sort((a, b) => a.sort_order - b.sort_order);
  const allTasks = tasks.length;
  const approvedCount = submissions.filter(s => s.status === 'approved').length;
  const inReviewCount = submissions.filter(s => s.status === 'in_review').length;
  const inProgressCount = submissions.filter(s => s.status === 'in_progress').length;
  const overdue = 0; // can compute from due_days_from_start if needed

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('StudentSimProjects'))}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            {project.company_name && <p className="text-xs text-slate-400 font-medium">{project.company_name}</p>}
            <h1 className="text-lg font-bold text-slate-900">{project.title}</h1>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${view === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button
              onClick={() => setView('board')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${view === 'board' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Board
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-6 text-sm">
          <span className="text-slate-500">Total: <strong className="text-slate-900">{allTasks}</strong></span>
          <span className="text-green-600">Done: <strong>{approvedCount}</strong></span>
          <span className="text-blue-600">In Progress: <strong>{inProgressCount}</strong></span>
          <span className="text-amber-600">In Review: <strong>{inReviewCount}</strong></span>
          {allTasks > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${Math.round((approvedCount / allTasks) * 100)}%` }} />
              </div>
              <span className="text-slate-500 text-xs">{Math.round((approvedCount / allTasks) * 100)}%</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {view === 'list' ? (
          <div className="space-y-6">
            {sortedPhases.map(phase => {
              const phaseTasks = tasks.filter(t => t.phase_id === phase.id).sort((a, b) => a.sort_order - b.sort_order);
              return (
                <div key={phase.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-slate-900">{phase.title}</h3>
                    {phase.description && <p className="text-xs text-slate-400 mt-0.5">{phase.description}</p>}
                  </div>
                  <div className="divide-y divide-slate-100">
                    {phaseTasks.map(task => {
                      const unlocked = isTaskUnlocked(task);
                      const status = getTaskStatus(task);
                      return (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`flex items-center gap-4 px-5 py-4 transition-colors ${unlocked ? 'hover:bg-slate-50 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                          onClick={() => unlocked && setSelectedTask(task)}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            status === 'approved' ? 'bg-green-100' :
                            status === 'in_review' ? 'bg-amber-100' :
                            status === 'in_progress' ? 'bg-blue-100' :
                            !unlocked ? 'bg-slate-100' : 'bg-slate-100'
                          }`}>
                            {!unlocked ? <Lock className="w-4 h-4 text-slate-400" /> :
                             status === 'approved' ? <CheckCircle className="w-4 h-4 text-green-600" /> :
                             status === 'in_review' ? <Clock className="w-4 h-4 text-amber-600" /> :
                             status === 'rejected' ? <AlertCircle className="w-4 h-4 text-red-500" /> :
                             <div className="w-3 h-3 rounded-full border-2 border-slate-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 text-sm">{task.title}</p>
                            {task.brief && <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{task.brief}</p>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge className={`text-xs ${PRIORITY_STYLES[task.priority]}`}>{task.priority}</Badge>
                            <Badge className={`text-xs ${STATUS_STYLES[status]}`}>{STATUS_LABELS[status]}</Badge>
                            {unlocked && <ChevronRight className="w-4 h-4 text-slate-300" />}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Board view */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {['not_started', 'in_progress', 'in_review', 'approved'].map(colStatus => {
              const colTasks = tasks.filter(t => getTaskStatus(t) === colStatus);
              return (
                <div key={colStatus} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={`text-xs ${STATUS_STYLES[colStatus]}`}>{STATUS_LABELS[colStatus]}</Badge>
                    <span className="text-xs text-slate-400 ml-auto">{colTasks.length}</span>
                  </div>
                  <div className="space-y-2">
                    {colTasks.map(task => {
                      const unlocked = isTaskUnlocked(task);
                      return (
                        <div
                          key={task.id}
                          onClick={() => unlocked && setSelectedTask(task)}
                          className={`p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm ${unlocked ? 'cursor-pointer hover:shadow-sm' : 'opacity-50 cursor-not-allowed'}`}
                        >
                          <div className="flex items-start gap-2">
                            {!unlocked && <Lock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />}
                            <p className="font-medium text-slate-800 line-clamp-2">{task.title}</p>
                          </div>
                          <div className="flex items-center gap-1 mt-2">
                            <Badge className={`text-xs ${PRIORITY_STYLES[task.priority]}`}>{task.priority}</Badge>
                          </div>
                        </div>
                      );
                    })}
                    {colTasks.length === 0 && <p className="text-xs text-slate-300 text-center py-4">No tasks</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          project={project}
          enrollment={enrollment}
          user={user}
          submission={submissionMap[selectedTask.id]}
          allTasks={tasks}
          onClose={() => setSelectedTask(null)}
          onUpdated={() => {
            refetchSubmissions();
            setSelectedTask(null);
          }}
        />
      )}
    </div>
  );
}
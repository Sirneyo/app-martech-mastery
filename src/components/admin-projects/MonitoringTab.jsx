import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, User, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

const STATUS_STYLES = {
  not_started: 'bg-slate-100 text-slate-500',
  in_progress: 'bg-blue-100 text-blue-700',
  in_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function MonitoringTab({ project }) {
  const [expandedStudent, setExpandedStudent] = useState(null);

  const { data: enrollments = [] } = useQuery({
    queryKey: ['project-enrollments', project.id],
    queryFn: () => base44.entities.ProjectEnrollment.filter({ project_id: project.id }),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: phases = [] } = useQuery({
    queryKey: ['project-phases', project.id],
    queryFn: () => base44.entities.ProjectPhase.filter({ project_id: project.id }),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['project-tasks', project.id],
    queryFn: () => base44.entities.ProjectTask.filter({ project_id: project.id }),
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['task-submissions', project.id],
    queryFn: () => base44.entities.TaskSubmission.filter({ project_id: project.id }),
  });

  const getName = (id) => allUsers.find(u => u.id === id)?.full_name || 'Unknown';

  const getStudentStats = (enrollment) => {
    const studentSubs = submissions.filter(s => s.student_user_id === enrollment.student_user_id);
    const approved = studentSubs.filter(s => s.status === 'approved').length;
    const inReview = studentSubs.filter(s => s.status === 'in_review').length;
    const inProgress = studentSubs.filter(s => s.status === 'in_progress').length;
    const total = tasks.length;
    const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
    return { approved, inReview, inProgress, total, pct };
  };

  const totalPendingReview = submissions.filter(s => s.status === 'in_review').length;
  const totalCompleted = enrollments.filter(e => e.status === 'completed').length;

  const getPhaseForTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    return phases.find(p => p.id === task?.phase_id)?.title || '';
  };

  return (
    <div className="space-y-5">
      {/* Summary Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Enrolled', value: enrollments.length, icon: User, color: 'text-blue-600 bg-blue-50' },
          { label: 'Pending Review', value: totalPendingReview, icon: Clock, color: 'text-amber-600 bg-amber-50' },
          { label: 'Completed', value: totalCompleted, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Student Progress List */}
      <div className="space-y-3">
        {enrollments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-400 text-sm">
            No students enrolled.
          </div>
        ) : enrollments.map(enrollment => {
          const stats = getStudentStats(enrollment);
          const studentSubs = submissions.filter(s => s.student_user_id === enrollment.student_user_id);
          const isExpanded = expandedStudent === enrollment.id;

          return (
            <div key={enrollment.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedStudent(isExpanded ? null : enrollment.id)}
              >
                <button className="text-slate-400">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-violet-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 text-sm">{getName(enrollment.student_user_id)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={stats.pct} className="h-1.5 w-32" />
                    <span className="text-xs text-slate-500">{stats.pct}% complete</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-green-500" /> {stats.approved}/{stats.total}</span>
                  {stats.inReview > 0 && <Badge className="bg-amber-100 text-amber-700 text-xs">{stats.inReview} in review</Badge>}
                </div>
                <Badge className={`text-xs ${enrollment.status === 'completed' ? 'bg-violet-100 text-violet-700' : enrollment.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {enrollment.status}
                </Badge>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-100 p-4">
                  {studentSubs.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No task activity yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {studentSubs.map(sub => {
                        const task = tasks.find(t => t.id === sub.task_id);
                        return (
                          <div key={sub.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-800">{task?.title || 'Unknown Task'}</p>
                              <p className="text-xs text-slate-400">{getPhaseForTask(sub.task_id)}</p>
                            </div>
                            <Badge className={`text-xs ${STATUS_STYLES[sub.status]}`}>{sub.status.replace('_', ' ')}</Badge>
                            {sub.revision_count > 0 && (
                              <Badge className="text-xs bg-orange-100 text-orange-700">{sub.revision_count} revision{sub.revision_count !== 1 ? 's' : ''}</Badge>
                            )}
                            {sub.submitted_date && (
                              <span className="text-xs text-slate-400">{new Date(sub.submitted_date).toLocaleDateString()}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
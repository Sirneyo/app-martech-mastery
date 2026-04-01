import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Users, CheckCircle2, Circle, ArrowUpCircle, Clock, AlertCircle, ChevronDown, ChevronRight, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import TutorTaskReviewPanel from '@/components/client-project/TutorTaskReviewPanel';

const FILTERS = [
  { id: 'in_review', label: 'In Review' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'approved', label: 'Approved' },
  { id: 'all', label: 'All' },
];

const urlParams = new URLSearchParams(window.location.search);
const PROJECT_ID = urlParams.get('id');

const STATUS_CONFIG = {
  not_started:  { label: 'Not Started',    icon: Circle,        color: 'text-slate-400', bg: 'bg-slate-50 border-slate-200',       badge: 'bg-slate-100 text-slate-500' },
  in_progress:  { label: 'In Progress',    icon: ArrowUpCircle, color: 'text-blue-500',  bg: 'bg-blue-50 border-blue-200',         badge: 'bg-blue-100 text-blue-700' },
  in_review:    { label: 'In Review',      icon: Clock,         color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200',       badge: 'bg-amber-100 text-amber-700' },
  approved:     { label: 'Approved',       icon: CheckCircle2,  color: 'text-emerald-500',bg: 'bg-emerald-50 border-emerald-200',  badge: 'bg-emerald-100 text-emerald-700' },
  rejected:     { label: 'Needs Revision', icon: AlertCircle,   color: 'text-red-500',   bg: 'bg-red-50 border-red-200',           badge: 'bg-red-100 text-red-700' },
};

function StudentRow({ student, tasks, submissions, onTaskClick, filterStatus }) {
  const [expanded, setExpanded] = useState(true);

  const getSubmission = (taskId) =>
    submissions.find(s => s.task_id === taskId && s.student_user_id === student.student_user_id);

  const totalTasks = tasks.length;
  const approved = tasks.filter(t => getSubmission(t.id)?.status === 'approved').length;
  const inReview = tasks.filter(t => getSubmission(t.id)?.status === 'in_review').length;

  // Only show tasks matching the filter
  const visibleTasks = filterStatus === 'all'
    ? tasks.filter(t => !!getSubmission(t.id))
    : tasks.filter(t => getSubmission(t.id)?.status === filterStatus);

  const avatarUrl = student.profile_picture_url;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={student.student_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-slate-200" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
            {(student.student_name || 'S').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm truncate">{student.student_name}</p>
          <p className="text-xs text-slate-500">{approved}/{totalTasks} tasks approved</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {inReview > 0 && (
            <Badge className="bg-amber-100 text-amber-700 text-xs border-0">{inReview} in review</Badge>
          )}
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && visibleTasks.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-slate-100"
          >
            <div className="px-5 py-4 space-y-2 bg-slate-50">
              {visibleTasks.map(task => {
                const sub = getSubmission(task.id);
                const status = sub?.status || 'not_started';
                const cfg = STATUS_CONFIG[status];
                const Icon = cfg.icon;
                return (
                  <button
                    key={task.id}
                    onClick={() => onTaskClick(task, sub, student)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${cfg.bg} hover:shadow-sm cursor-pointer`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${cfg.color}`} />
                    <span className="flex-1 text-sm text-slate-700 font-medium truncate">{task.title}</span>
                    <Badge className={`text-xs border-0 ${cfg.badge}`}>{cfg.label}</Badge>
                    {status === 'in_review' && (
                      <span className="text-xs text-amber-600 font-semibold ml-1">Review →</span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TutorClientProjectDetail() {
  const navigate = useNavigate();
  const [selectedReview, setSelectedReview] = useState(null);
  const [activeFilter, setActiveFilter] = useState('in_review');

  const { data: user } = useQuery({ queryKey: ['current-user'], queryFn: () => base44.auth.me() });

  const { data: tutorAssignments = [], isLoading: checkingAccess } = useQuery({
    queryKey: ['tutor-project-assignments', user?.id],
    queryFn: () => base44.entities.ProjectTutorAssignment.filter({ tutor_user_id: user.id }),
    enabled: !!user?.id,
  });

  const isAssigned = tutorAssignments.some(a => a.project_id === PROJECT_ID);

  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['project', PROJECT_ID],
    queryFn: () => base44.entities.Project.filter({ id: PROJECT_ID }).then(r => r[0]),
    enabled: !!PROJECT_ID && !checkingAccess && isAssigned,
  });


  const { data: phases = [] } = useQuery({
    queryKey: ['project-phases', PROJECT_ID],
    queryFn: () => base44.entities.ProjectPhase.filter({ project_id: PROJECT_ID }),
    enabled: !!PROJECT_ID,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['project-tasks', PROJECT_ID],
    queryFn: () => base44.entities.ProjectTask.filter({ project_id: PROJECT_ID }),
    enabled: !!PROJECT_ID,
  });

  const { data: enrollments = [], isLoading: loadingEnrollments } = useQuery({
    queryKey: ['project-enrollments-tutor', PROJECT_ID, user?.id],
    queryFn: () => base44.entities.ProjectEnrollment.filter({ project_id: PROJECT_ID, reviewer_tutor_id: user.id }),
    enabled: !!PROJECT_ID && !!user?.id && !checkingAccess && isAssigned,
  });

  const enrollmentUserIds = enrollments.map(e => e.student_user_id);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['enrollment-users', enrollmentUserIds.join(',')],
    queryFn: async () => {
      const res = await base44.functions.invoke('getUsersByIds', { userIds: enrollmentUserIds });
      return res.data?.users || [];
    },
    enabled: enrollmentUserIds.length > 0,
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['task-submissions-project', PROJECT_ID],
    queryFn: () => base44.entities.TaskSubmission.filter({ project_id: PROJECT_ID }),
    enabled: !!PROJECT_ID,
    refetchInterval: 30000,
  });

  const isLoading = checkingAccess || loadingProject || (isAssigned && loadingEnrollments);

  if (!PROJECT_ID) {
    navigate(createPageUrl('TutorClientProjects'));
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-teal-100 border-t-teal-600 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading project…</p>
        </div>
      </div>
    );
  }

  if (!isAssigned) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md w-full text-center overflow-hidden"
        >
          <div className="bg-gradient-to-br from-red-500 to-rose-600 px-8 py-10">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Access Denied</h2>
            <p className="text-white/70 text-sm">You are not assigned to this project</p>
          </div>
          <div className="px-8 py-8">
            <p className="text-slate-500 text-sm">Only tutors assigned to a project can view student progress.</p>
            <button
              onClick={() => navigate(createPageUrl('TutorClientProjects'))}
              className="mt-4 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 transition-colors"
            >
              Back to Projects
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const students = enrollments.map(e => {
    const u = allUsers.find(u => u.id === e.student_user_id);
    return {
      ...e,
      student_name: u?.display_name || u?.full_name || u?.email || 'Unknown',
      student_email: u?.email || '',
      profile_picture_url: u?.profile_picture || u?.profile_picture_url || u?.avatar_url || null,
    };
  });

  // Filter students: only show those who have at least one submission matching the filter
  const filteredStudents = students.filter(student => {
    if (activeFilter === 'all') {
      return submissions.some(s => s.student_user_id === student.student_user_id);
    }
    return submissions.some(s => s.student_user_id === student.student_user_id && s.status === activeFilter);
  });

  const sortedTasks = [...tasks].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const mySubmissions = submissions.filter(s => enrollments.some(e => e.student_user_id === s.student_user_id));
  const inReviewCount = mySubmissions.filter(s => s.status === 'in_review').length;
  const approvedCount = mySubmissions.filter(s => s.status === 'approved').length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-8 py-8">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider mb-1">
              {project?.company_name || 'Client Project'}
            </p>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">{project?.title}</h1>
            {project?.overview && <p className="text-slate-500 text-sm">{project.overview}</p>}
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-4"
        >
          {[
            { label: 'My Students', value: students.length, icon: Users, color: 'from-teal-500 to-teal-700' },
            { label: 'Awaiting Review', value: inReviewCount, icon: Clock, color: 'from-amber-400 to-orange-500' },
            { label: 'Tasks Approved', value: approvedCount, icon: CheckCircle2, color: 'from-emerald-500 to-teal-500' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </motion.div>

        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Students</h2>
              <Badge className="bg-slate-100 text-slate-600 text-xs border-0">{filteredStudents.length} shown</Badge>
            </div>
            <div className="flex gap-2 flex-wrap">
              {FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                    activeFilter === f.id
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300 hover:text-teal-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">
                {activeFilter === 'in_review' ? 'No students awaiting review' : 'No students match this filter'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStudents.map((student, i) => (
                <motion.div
                  key={student.student_user_id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <StudentRow
                    student={student}
                    tasks={sortedTasks}
                    submissions={submissions}
                    filterStatus={activeFilter}
                    onTaskClick={(task, sub, stu) => setSelectedReview({ task, submission: sub, student: stu })}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedReview && (
        <TutorTaskReviewPanel
          task={selectedReview.task}
          submission={selectedReview.submission}
          student={selectedReview.student}
          phases={phases}
          tutorId={user?.id}
          projectId={PROJECT_ID}
          onClose={() => setSelectedReview(null)}
        />
      )}
    </div>
  );
}
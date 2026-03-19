import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { FolderKanban, ChevronRight, Users, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

const STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-500 border border-slate-200',
  active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  archived: 'bg-slate-100 text-slate-400 border border-slate-200',
};

export default function TutorClientProjects() {
  const { data: user } = useQuery({ queryKey: ['current-user'], queryFn: () => base44.auth.me() });

  const { data: tutorAssignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['tutor-project-assignments', user?.id],
    queryFn: () => base44.entities.ProjectTutorAssignment.filter({ tutor_user_id: user.id }),
    enabled: !!user?.id,
  });

  const assignedProjectIds = tutorAssignments.map(a => a.project_id);

  const { data: allProjects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['all-projects'],
    queryFn: () => base44.entities.Project.list(),
    enabled: assignedProjectIds.length > 0,
  });

  const { data: allEnrollments = [] } = useQuery({
    queryKey: ['all-enrollments'],
    queryFn: () => base44.entities.ProjectEnrollment.list(),
    enabled: assignedProjectIds.length > 0,
  });

  if (loadingAssignments || (assignedProjectIds.length > 0 && loadingProjects)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-teal-100 border-t-teal-600 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading your projects…</p>
        </div>
      </div>
    );
  }

  const myProjects = allProjects.filter(p => assignedProjectIds.includes(p.id));

  const getStudentCount = (projectId) =>
    allEnrollments.filter(e => e.project_id === projectId && e.reviewer_tutor_id === user?.id).length;

  if (myProjects.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md w-full overflow-hidden text-center"
        >
          <div className="bg-gradient-to-br from-slate-700 to-slate-900 px-8 py-10">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7 text-white/80" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Client Projects</h2>
            <p className="text-white/60 text-sm">No projects assigned yet</p>
          </div>
          <div className="px-8 py-8">
            <p className="text-slate-600 text-sm font-medium mb-1">You haven't been assigned to any projects.</p>
            <p className="text-slate-400 text-sm leading-relaxed">
              An admin will assign you to a client project. Check back here soon!
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-8 py-8">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Client Projects</h1>
            <p className="text-slate-500 text-sm">Projects you're assigned to review student progress on</p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8 space-y-4">
        {myProjects.map((project, i) => {
          const studentCount = getStudentCount(project.id);
          return (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.35 }}
            >
              <Link
                to={createPageUrl(`TutorClientProjectDetail?id=${project.id}`)}
                className="group flex items-center gap-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-200 transition-all duration-200"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <FolderKanban className="w-7 h-7 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  {project.company_name && (
                    <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider mb-1">{project.company_name}</p>
                  )}
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors truncate">{project.title}</h3>
                  {project.overview && (
                    <p className="text-sm text-slate-500 line-clamp-1 mt-0.5">{project.overview}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <Badge className={`text-xs ${STATUS_STYLES[project.status] || 'bg-slate-100 text-slate-500'}`}>
                      {project.status}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Users className="w-3.5 h-3.5" />
                      {studentCount} student{studentCount !== 1 ? 's' : ''} assigned to you
                    </span>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <div className="w-9 h-9 rounded-xl border border-slate-200 group-hover:border-teal-200 group-hover:bg-teal-50 flex items-center justify-center transition-all">
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
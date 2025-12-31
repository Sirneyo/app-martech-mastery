import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Users, ClipboardCheck, Award, ChevronRight, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TutorDashboard() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: assignments } = useQuery({
    queryKey: ['tutor-cohort-assignments'],
    queryFn: async () => {
      if (!user?.id) return [];
      return base44.entities.TutorCohortAssignment.filter({ tutor_id: user.id });
    },
    enabled: !!user?.id,
  });

  const cohortIds = [...new Set(assignments?.map(a => a.cohort_id) || [])];

  const { data: assignmentSubmissions } = useQuery({
    queryKey: ['pending-assignment-submissions', cohortIds],
    queryFn: async () => {
      if (cohortIds.length === 0) return [];
      
      const memberships = await base44.entities.CohortMembership.list();
      const studentIds = memberships
        .filter(m => cohortIds.includes(m.cohort_id))
        .map(m => m.user_id);
      
      const submissions = await base44.entities.Submission.filter({ submission_kind: 'assignment' });
      return submissions.filter(s => 
        studentIds.includes(s.user_id) && 
        ['submitted', 'in_review'].includes(s.status)
      );
    },
    enabled: cohortIds.length > 0,
  });

  const { data: projectSubmissions } = useQuery({
    queryKey: ['pending-project-submissions', cohortIds],
    queryFn: async () => {
      if (cohortIds.length === 0) return [];
      
      const memberships = await base44.entities.CohortMembership.list();
      const studentIds = memberships
        .filter(m => cohortIds.includes(m.cohort_id))
        .map(m => m.user_id);
      
      const submissions = await base44.entities.Submission.filter({ submission_kind: 'project' });
      return submissions.filter(s => 
        studentIds.includes(s.user_id) && 
        ['submitted', 'in_review'].includes(s.status)
      );
    },
    enabled: cohortIds.length > 0,
  });

  const { data: portfolioReviews } = useQuery({
    queryKey: ['pending-portfolio-reviews', cohortIds],
    queryFn: async () => {
      if (cohortIds.length === 0) return [];
      
      const memberships = await base44.entities.CohortMembership.list();
      const studentIds = memberships
        .filter(m => cohortIds.includes(m.cohort_id))
        .map(m => m.user_id);
      
      const items = await base44.entities.PortfolioItemStatus.list();
      return items.filter(i => 
        studentIds.includes(i.user_id) && 
        ['submitted', 'in_review'].includes(i.status)
      );
    },
    enabled: cohortIds.length > 0,
  });

  const stats = [
    { label: 'Assigned Cohorts', value: cohortIds.length, icon: Users, color: 'from-blue-500 to-cyan-500', page: 'TutorCohorts' },
    { label: 'Assignment Submissions', value: assignmentSubmissions?.length || 0, icon: ClipboardCheck, color: 'from-violet-500 to-purple-500', page: 'TutorAssignmentSubmissions' },
    { label: 'Project Submissions', value: projectSubmissions?.length || 0, icon: ClipboardCheck, color: 'from-amber-500 to-orange-500', page: 'TutorProjectSubmissions' },
    { label: 'Portfolio Reviews', value: portfolioReviews?.length || 0, icon: Award, color: 'from-emerald-500 to-teal-500', page: 'TutorPortfolioReviews' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Tutor Dashboard 👨‍🏫
        </h1>
        <p className="text-slate-500 mt-1">Manage your cohorts and review student work</p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        {stats.map((stat, index) => (
          <Link
            key={stat.label}
            to={createPageUrl(stat.page)}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/50 hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-sm text-slate-600 group-hover:text-slate-900">
              View details
              <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200"
      >
        <h2 className="text-xl font-bold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to={createPageUrl('TutorAssignmentSubmissions')}
            className="flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-violet-500 hover:bg-violet-50 transition-all group"
          >
            <ClipboardCheck className="w-8 h-8 text-violet-600" />
            <div>
              <h3 className="font-bold text-slate-900">Review Assignments</h3>
              <p className="text-sm text-slate-500">{assignmentSubmissions?.length || 0} pending</p>
            </div>
          </Link>

          <Link
            to={createPageUrl('TutorProjectSubmissions')}
            className="flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-orange-500 hover:bg-orange-50 transition-all group"
          >
            <ClipboardCheck className="w-8 h-8 text-orange-600" />
            <div>
              <h3 className="font-bold text-slate-900">Review Projects</h3>
              <p className="text-sm text-slate-500">{projectSubmissions?.length || 0} pending</p>
            </div>
          </Link>

          <Link
            to={createPageUrl('TutorPortfolioReviews')}
            className="flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
          >
            <Award className="w-8 h-8 text-emerald-600" />
            <div>
              <h3 className="font-bold text-slate-900">Portfolio Reviews</h3>
              <p className="text-sm text-slate-500">{portfolioReviews?.length || 0} pending</p>
            </div>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
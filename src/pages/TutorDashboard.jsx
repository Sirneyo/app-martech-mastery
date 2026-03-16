import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Users, ClipboardCheck, Award, ChevronRight, TrendingUp, Trophy, Ticket } from 'lucide-react';
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

  const { data: cohorts } = useQuery({
    queryKey: ['tutor-cohorts', cohortIds],
    queryFn: async () => {
      if (cohortIds.length === 0) return [];
      return base44.entities.Cohort.list();
    },
    enabled: cohortIds.length > 0,
  });

  const { data: cohortLeaderboards } = useQuery({
    queryKey: ['cohort-leaderboards', cohortIds],
    queryFn: async () => {
      if (cohortIds.length === 0) return {};
      const res = await base44.functions.invoke('getTutorLeaderboards', { cohortIds });
      return res.data?.leaderboards || {};
    },
    enabled: cohortIds.length > 0,
  });

  // Consolidated pending counts from one backend call instead of 3 separate heavy queries
  const { data: dashboardData } = useQuery({
    queryKey: ['tutor-dashboard-data', cohortIds],
    queryFn: async () => {
      if (cohortIds.length === 0) return { pending: { assignments: 0, projects: 0, portfolio: 0 } };
      const res = await base44.functions.invoke('getTutorDashboardData', {});
      return res.data || { pending: { assignments: 0, projects: 0, portfolio: 0 } };
    },
    enabled: cohortIds.length > 0,
  });

  const pending = dashboardData?.pending || { assignments: 0, projects: 0, portfolio: 0 };

  const stats = [
    { label: 'Assigned Cohorts', value: cohortIds.length, icon: Users, color: 'from-blue-500 to-cyan-500', page: 'TutorCohorts' },
    { label: 'Assignment Submissions', value: pending.assignments, icon: ClipboardCheck, color: 'from-violet-500 to-purple-500', page: 'TutorAssignmentSubmissions' },
    { label: 'Project Submissions', value: pending.projects, icon: ClipboardCheck, color: 'from-amber-500 to-orange-500', page: 'TutorProjectSubmissions' },
    { label: 'Portfolio Reviews', value: pending.portfolio, icon: Award, color: 'from-emerald-500 to-teal-500', page: 'TutorPortfolioReviews' },
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
        className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8"
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

          <Link
            to={createPageUrl('AdminSupportTickets')}
            className="flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
          >
            <Ticket className="w-8 h-8 text-blue-600" />
            <div>
              <h3 className="font-bold text-slate-900">Support Tickets</h3>
              <p className="text-sm text-slate-500">View & respond to tickets</p>
            </div>
          </Link>
        </div>
      </motion.div>

      {cohortIds.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Cohort Leaderboards</h2>
              <p className="text-sm text-slate-500">Top 10 students by points in your cohorts</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {cohortIds.map((cohortId) => {
              const cohort = cohorts?.find(c => c.id === cohortId);
              const leaderboard = cohortLeaderboards?.[cohortId] || [];
              if (!cohort) return null;

              return (
                <div key={cohortId} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 px-5 py-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900">{cohort.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5 capitalize">{cohort.status} · Week {cohort.current_week || 1}</p>
                    </div>
                    <TrendingUp className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="p-4">
                    {leaderboard.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No points data yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {leaderboard.map((student, index) => (
                          <div
                            key={student.id}
                            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                          >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                              index === 0 ? 'bg-amber-500 text-white' :
                              index === 1 ? 'bg-slate-400 text-white' :
                              index === 2 ? 'bg-orange-400 text-white' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {index + 1}
                            </div>
                            <p className="flex-1 font-medium text-sm text-slate-900 truncate">{student.name}</p>
                            <span className="font-bold text-sm text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full">
                              {student.points.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
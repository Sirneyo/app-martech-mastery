import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  Play, 
  Clock, 
  TrendingUp, 
  Award, 
  BookOpen,
  ChevronRight,
  Zap,
  Target,
  Trophy,
  User,
  Mail,
  MessageCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { format, differenceInWeeks, isBefore, isAfter, isWithinInterval } from 'date-fns';

export default function StudentDashboard() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const result = await base44.entities.AppSettings.list();
      return result[0] || {};
    },
  });

  const { data: membership } = useQuery({
    queryKey: ['my-cohort-membership'],
    queryFn: async () => {
      if (!user?.id) return null;
      const memberships = await base44.entities.CohortMembership.filter({ user_id: user.id, status: 'active' });
      return memberships[0];
    },
    enabled: !!user?.id,
  });

  const { data: cohort } = useQuery({
    queryKey: ['my-cohort', membership?.cohort_id],
    queryFn: async () => {
      if (!membership?.cohort_id) return null;
      const cohorts = await base44.entities.Cohort.filter({ id: membership.cohort_id });
      return cohorts[0];
    },
    enabled: !!membership?.cohort_id,
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['student-dashboard-data', membership?.cohort_id],
    queryFn: async () => {
      if (!membership?.cohort_id) return { tutor: null, leaderboardData: [] };
      const { data } = await base44.functions.invoke('getStudentDashboardData');
      return data;
    },
    enabled: !!membership?.cohort_id,
  });

  const tutor = dashboardData?.tutor;

  const { data: streak } = useQuery({
    queryKey: ['login-streak'],
    queryFn: async () => {
      if (!user?.id) return 0;
      const events = await base44.entities.LoginEvent.filter({ user_id: user.id });
      
      const dates = events.map(e => e.login_time.split('T')[0]).sort().reverse();
      const uniqueDates = [...new Set(dates)];
      
      let streakCount = 0;
      const today = new Date().toISOString().split('T')[0];
      
      for (let i = 0; i < uniqueDates.length; i++) {
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() - i);
        const expected = expectedDate.toISOString().split('T')[0];
        
        if (uniqueDates[i] === expected) {
          streakCount++;
        } else {
          break;
        }
      }
      
      return streakCount;
    },
    enabled: !!user?.id,
  });

  const { data: myPoints } = useQuery({
    queryKey: ['my-points'],
    queryFn: async () => {
      if (!user?.id) return 0;
      const ledger = await base44.entities.PointsLedger.filter({ user_id: user.id });
      return ledger.reduce((sum, entry) => sum + entry.points, 0);
    },
    enabled: !!user?.id,
  });



  const { data: mySubmissions } = useQuery({
    queryKey: ['my-submissions-count'],
    queryFn: async () => {
      if (!user?.id) return { total: 0, graded: 0 };
      const submissions = await base44.entities.Submission.filter({ user_id: user.id });
      return {
        total: submissions.length,
        graded: submissions.filter(s => s.status === 'graded').length,
      };
    },
    enabled: !!user?.id,
  });

  const { data: attendance } = useQuery({
    queryKey: ['my-attendance'],
    queryFn: async () => {
      if (!user?.id) return { total: 0, present: 0 };
      const records = await base44.entities.Attendance.filter({ student_user_id: user.id });
      return {
        total: records.length,
        present: records.filter(r => r.status === 'present').length,
      };
    },
    enabled: !!user?.id,
  });

  const { data: portfolioStatuses = [] } = useQuery({
    queryKey: ['my-portfolio-statuses'],
    queryFn: async () => {
      if (!user?.id || !membership?.cohort_id) return [];
      return base44.entities.PortfolioItemStatus.filter({ 
        user_id: user.id,
        cohort_id: membership.cohort_id
      });
    },
    enabled: !!user?.id && !!membership?.cohort_id,
  });

  const { data: portfolioTemplates = [] } = useQuery({
    queryKey: ['portfolio-templates'],
    queryFn: () => base44.entities.PortfolioItemTemplate.list('sort_order'),
  });

  const { data: certificate } = useQuery({
    queryKey: ['my-certificate', membership?.cohort_id],
    queryFn: async () => {
      if (!user?.id || !membership?.cohort_id) return null;
      const certs = await base44.entities.Certificate.filter({ 
        student_user_id: user.id, 
        cohort_id: membership.cohort_id 
      });
      return certs[0];
    },
    enabled: !!user?.id && !!membership?.cohort_id,
  });

  const leaderboard = dashboardData?.leaderboardData || [];
  const requiredRequirements = portfolioTemplates.filter(t => t.required_flag);
  const completedRequirements = requiredRequirements.filter(t => {
    const status = portfolioStatuses.find(s => s.portfolio_item_id === t.id);
    return status?.status === 'approved';
  }).length;
  const certificationProgress = requiredRequirements.length > 0 
    ? Math.round((completedRequirements / requiredRequirements.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}! 👋
            </h1>
            <p className="text-slate-500 mt-1">Continue your MarTech journey</p>
          </div>
          <div className="flex items-center gap-4">
            {user?.is_approved_graduate && (
              <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl px-4 py-3">
                <Trophy className="w-6 h-6 text-yellow-600" />
                <div>
                  <p className="font-bold text-yellow-900">Approved Graduate</p>
                  <p className="text-xs text-yellow-700">Certified Professional</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/50 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Total Points</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{myPoints || 0}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
              <Award className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/50 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Submissions</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{mySubmissions?.graded || 0}/{mySubmissions?.total || 0}</p>
              <p className="text-xs text-slate-400 mt-1">Graded</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/50 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Attendance</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{attendance?.present || 0}/{attendance?.total || 0}</p>
              <p className="text-xs text-slate-400 mt-1">{attendance?.total > 0 ? Math.round((attendance.present / attendance.total) * 100) : 0}%</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
              <Clock className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/50 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Current Streak</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{streak || 0} days</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-8"
      >
        <a
          href={settings?.kajabi_url || "https://www.the-growth-academy.co/library"}
          target="_blank"
          rel="noopener noreferrer"
          className="block group"
        >
          <div className="bg-gradient-to-br from-purple-600 to-violet-500 rounded-3xl p-12 text-white hover:shadow-2xl hover:shadow-purple-500/30 transition-all duration-300 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
            </div>

            <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-4xl font-bold mb-3">Continue Your Learning</h2>
                <p className="text-white/90 text-lg mb-6">
                  Access all course materials, videos, and resources on the Growth Academy platform
                </p>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span className="flex items-center gap-2">
                    <Play className="w-4 h-4" /> Video lessons
                  </span>
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Course materials
                  </span>
                  <span className="flex items-center gap-2">
                    <Target className="w-4 h-4" /> Live sessions
                  </span>
                </div>
              </div>

              <div className="flex-shrink-0">
                <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                  <Play className="w-10 h-10 text-purple-600 ml-1" />
                </div>
              </div>
            </div>
          </div>
        </a>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
      >
        {cohort && (() => {
          const startDate = new Date(cohort.start_date);
          const endDate = new Date(cohort.end_date);
          const now = new Date();
          const totalWeeks = 12;

          let cohortStatus = 'Upcoming';
          let currentWeek = 0;
          let weeksRemaining = 0;

          if (cohort.start_date && cohort.end_date) {
            if (isWithinInterval(now, { start: startDate, end: endDate })) {
              cohortStatus = 'Active';
              currentWeek = Math.min(differenceInWeeks(now, startDate) + 1, totalWeeks);
              weeksRemaining = Math.max(0, differenceInWeeks(endDate, now));
            } else if (isAfter(now, endDate)) {
              cohortStatus = 'Completed';
              currentWeek = totalWeeks;
              weeksRemaining = 0;
            } else {
              cohortStatus = 'Upcoming';
              currentWeek = 0;
              weeksRemaining = differenceInWeeks(startDate, now);
            }
          }

          const statusColor = cohortStatus === 'Active' ? 'text-green-600' : cohortStatus === 'Upcoming' ? 'text-blue-500' : 'text-slate-500';

          return (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Your Cohort</h3>
                  <p className="text-sm text-slate-500">{cohort.name}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Status:</span>
                  <span className={`font-semibold ${statusColor}`}>{cohortStatus}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Current Week:</span>
                  <span className="font-semibold text-slate-900">
                    {cohortStatus === 'Upcoming' ? 'Not started' : `Week ${currentWeek} of ${totalWeeks}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">{cohortStatus === 'Upcoming' ? 'Starts in:' : 'Weeks Remaining:'}</span>
                  <span className="font-semibold text-blue-600">{weeksRemaining} weeks</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all"
                    style={{ width: `${(currentWeek / totalWeeks) * 100}%` }}
                  />
                </div>
                {cohort.start_date && cohort.end_date && (
                  <>
                    <div className="flex justify-between text-sm pt-1">
                      <span className="text-slate-600">Start Date:</span>
                      <span className="font-medium text-slate-900">{format(startDate, 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">End Date:</span>
                      <span className="font-medium text-slate-900">{format(endDate, 'MMM d, yyyy')}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-sm pt-2 border-t border-slate-100 mt-2">
                  <span className="text-slate-500">Your Local Time:</span>
                  <span className="font-mono text-xs text-slate-700">{now.toLocaleString()}</span>
                </div>
              </div>
            </div>
          );
        })()}

        {tutor && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50">
            <div className="flex items-center gap-4 mb-4">
              {tutor.profile_picture ? (
                <img 
                  src={tutor.profile_picture} 
                  alt={tutor.full_name}
                  className="w-16 h-16 rounded-xl object-cover border-2 border-violet-200"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
              )}
              <div>
                <h3 className="font-bold text-slate-900">{tutor.display_name || tutor.full_name}</h3>
                <p className="text-sm text-slate-500">Current Tutor</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-slate-600">{tutor.email}</p>
              </div>
              <div className="flex gap-2 pt-2">
                <a 
                  href={`mailto:${tutor.email}`}
                  className="flex-1 flex items-center justify-center gap-2 bg-violet-50 text-violet-700 px-4 py-2 rounded-lg hover:bg-violet-100 transition-colors text-sm font-medium"
                >
                  <Mail className="w-4 h-4" />
                  Email
                </a>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {certificate && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 shadow-sm border-2 border-yellow-300 mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Certificate Unlocked!</h3>
              <p className="text-sm text-slate-600">You've completed all requirements</p>
            </div>
          </div>
          <p className="text-sm text-slate-700 mb-3">Certificate ID: <span className="font-mono font-semibold">{certificate.certificate_id_code}</span></p>
          <p className="text-xs text-slate-600">Issued: {certificate.issued_at ? new Date(certificate.issued_at).toLocaleDateString() : 'Pending'}</p>
        </motion.div>
      )}

      {cohort && leaderboard.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50 mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Cohort Leaderboard</h3>
              <p className="text-sm text-slate-500">Top 10 students by points</p>
            </div>
          </div>
          <div className="space-y-2">
            {leaderboard.map((student, index) => (
              <div 
                key={student.id}
                className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
                  student.id === user?.id 
                    ? 'bg-amber-50 border-2 border-amber-200' 
                    : 'bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                  index === 0 ? 'bg-amber-500 text-white' :
                  index === 1 ? 'bg-slate-400 text-white' :
                  index === 2 ? 'bg-orange-400 text-white' :
                  'bg-slate-200 text-slate-700'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className={`font-semibold ${student.id === user?.id ? 'text-amber-900' : 'text-slate-900'}`}>
                    {student.name} {student.id === user?.id && '(You)'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Award className={`w-4 h-4 ${student.id === user?.id ? 'text-amber-600' : 'text-slate-400'}`} />
                  <span className={`font-bold ${student.id === user?.id ? 'text-amber-900' : 'text-slate-900'}`}>
                    {student.points}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {settings?.whatsapp_community_url && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <a 
            href={settings.whatsapp_community_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-6 text-white hover:shadow-xl hover:shadow-green-500/25 transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">WhatsApp Community</h3>
                <p className="text-white/80 text-sm">Join the chat</p>
              </div>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </a>
        </motion.div>
      )}
    </div>
  );
}
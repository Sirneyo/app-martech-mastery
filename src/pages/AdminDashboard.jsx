import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, TrendingUp, Users, CheckCircle, Clock, Award, BookOpen, ExternalLink, Zap, ChevronRight, GraduationCap, FileText, FolderCheck, ClipboardList, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
  const { data: users = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: cohorts = [] } = useQuery({
    queryKey: ['all-cohorts'],
    queryFn: () => base44.entities.Cohort.list(),
  });

  const { data: pointsLedger = [] } = useQuery({
    queryKey: ['all-points'],
    queryFn: () => base44.entities.PointsLedger.list(),
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['all-submissions'],
    queryFn: () => base44.entities.Submission.list(),
  });

  const { data: portfolioStatuses = [] } = useQuery({
    queryKey: ['all-portfolio-statuses'],
    queryFn: () => base44.entities.PortfolioItemStatus.list(),
  });

  const { data: examAttempts = [] } = useQuery({
    queryKey: ['all-exam-attempts'],
    queryFn: () => base44.entities.ExamAttempt.list(),
  });

  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const result = await base44.entities.AppSettings.list();
      return result[0] || {};
    },
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['memberships'],
    queryFn: () => base44.entities.CohortMembership.list(),
  });

  const { data: tutorAssignments = [] } = useQuery({
    queryKey: ['tutor-assignments'],
    queryFn: () => base44.entities.TutorCohortAssignment.list(),
  });

  const { data: loginEvents = [] } = useQuery({
    queryKey: ['login-events'],
    queryFn: () => base44.entities.LoginEvent.list('-login_time'),
  });

  const { data: portfolioTemplates = [] } = useQuery({
    queryKey: ['portfolio-templates'],
    queryFn: () => base44.entities.PortfolioItemTemplate.list(),
  });

  // Calculate overall leaderboard
  const overallLeaderboard = useMemo(() => {
    const studentPoints = {};
    
    pointsLedger.forEach(entry => {
      if (!studentPoints[entry.user_id]) {
        studentPoints[entry.user_id] = 0;
      }
      studentPoints[entry.user_id] += entry.points || 0;
    });

    const leaderboard = Object.entries(studentPoints)
      .map(([userId, points]) => {
        const user = users.find(u => u.id === userId);
        return {
          userId,
          name: user?.full_name || 'Unknown',
          email: user?.email || '',
          points,
        };
      })
      .sort((a, b) => b.points - a.points)
      .slice(0, 5);

    return leaderboard;
  }, [pointsLedger, users]);

  // Calculate cohort leaderboards
  const cohortLeaderboards = useMemo(() => {
    return cohorts.map(cohort => {
      const cohortPoints = {};
      
      pointsLedger.forEach(entry => {
        const user = users.find(u => u.id === entry.user_id);
        if (user?.cohort_id === cohort.id) {
          if (!cohortPoints[entry.user_id]) {
            cohortPoints[entry.user_id] = 0;
          }
          cohortPoints[entry.user_id] += entry.points || 0;
        }
      });

      const leaderboard = Object.entries(cohortPoints)
        .map(([userId, points]) => {
          const user = users.find(u => u.id === userId);
          return {
            userId,
            name: user?.full_name || 'Unknown',
            points,
          };
        })
        .sort((a, b) => b.points - a.points)
        .slice(0, 3);

      return {
        cohort,
        leaderboard,
      };
    });
  }, [cohorts, pointsLedger, users]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalStudents = users.filter(u => u.app_role === 'student').length;
    const totalTutors = users.filter(u => u.app_role === 'tutor').length;
    const activeCohorts = cohorts.filter(c => c.status === 'active').length;
    
    const pendingSubmissions = submissions.filter(s => 
      s.status === 'submitted' || s.status === 'in_review'
    ).length;
    
    const pendingPortfolioReviews = portfolioStatuses.filter(p => 
      p.status === 'submitted' || p.status === 'in_review'
    ).length;
    
    const completedExams = examAttempts.filter(a => 
      a.attempt_status === 'submitted' && a.pass_flag === true
    ).length;

    return {
      totalStudents,
      totalTutors,
      activeCohorts,
      pendingSubmissions,
      pendingPortfolioReviews,
      completedExams,
    };
  }, [users, cohorts, submissions, portfolioStatuses, examAttempts]);

  // Cohort health data
  const cohortHealthData = useMemo(() => {
    return cohorts.filter(c => c.status === 'active').map(cohort => {
      const cohortMembers = memberships.filter(m => m.cohort_id === cohort.id && m.status === 'active');
      const cohortTutors = tutorAssignments.filter(ta => ta.cohort_id === cohort.id && ta.is_primary);
      const cohortPendingSubmissions = submissions.filter(s => 
        s.cohort_id === cohort.id && ['submitted', 'in_review'].includes(s.status)
      );
      const cohortNeedsRevision = submissions.filter(s => 
        s.cohort_id === cohort.id && s.status === 'needs_revision'
      );
      const cohortPendingPortfolio = portfolioStatuses.filter(ps => 
        ps.cohort_id === cohort.id && ['submitted', 'in_review'].includes(ps.status)
      );
      const cohortPasses = examAttempts.filter(ea => 
        ea.cohort_id === cohort.id && ea.pass_flag
      );
      const cohortSubmittedAttempts = examAttempts.filter(ea => 
        ea.cohort_id === cohort.id && ea.submitted_at
      );
      const cohortPassRate = cohortSubmittedAttempts.length > 0 
        ? Math.round((cohortPasses.length / cohortSubmittedAttempts.length) * 100) 
        : 0;

      return {
        cohort,
        activeStudents: cohortMembers.length,
        tutors: cohortTutors.length,
        pendingSubmissions: cohortPendingSubmissions.length,
        needsRevision: cohortNeedsRevision.length,
        pendingPortfolio: cohortPendingPortfolio.length,
        certPasses: cohortPasses.length,
        certPassRate: cohortPassRate,
      };
    });
  }, [cohorts, memberships, tutorAssignments, submissions, portfolioStatuses, examAttempts]);

  // Oldest ungraded submissions
  const oldestSubmissions = useMemo(() => {
    return submissions
      .filter(s => ['submitted', 'in_review'].includes(s.status))
      .sort((a, b) => new Date(a.submitted_date) - new Date(b.submitted_date))
      .slice(0, 10)
      .map(s => {
        const student = users.find(u => u.id === s.user_id);
        const cohort = cohorts.find(c => c.id === s.cohort_id);
        const ageHours = s.submitted_date 
          ? Math.floor((new Date() - new Date(s.submitted_date)) / (1000 * 60 * 60))
          : 0;
        return { ...s, student, cohort, ageHours };
      });
  }, [submissions, users, cohorts]);

  // Oldest pending portfolio
  const oldestPortfolio = useMemo(() => {
    return portfolioStatuses
      .filter(ps => ['submitted', 'in_review'].includes(ps.status))
      .sort((a, b) => new Date(a.updated_date) - new Date(b.updated_date))
      .slice(0, 10)
      .map(ps => {
        const student = users.find(u => u.id === ps.user_id);
        const cohort = cohorts.find(c => c.id === ps.cohort_id);
        const template = portfolioTemplates.find(pt => pt.id === ps.portfolio_item_id);
        const ageHours = ps.updated_date 
          ? Math.floor((new Date() - new Date(ps.updated_date)) / (1000 * 60 * 60))
          : 0;
        return { ...ps, student, cohort, template, ageHours };
      });
  }, [portfolioStatuses, users, cohorts, portfolioTemplates]);

  // Tutor workload
  const tutorWorkload = useMemo(() => {
    const activeTutors = users.filter(u => u.app_role === 'tutor');
    return activeTutors.map(tutor => {
      const assignedCohortIds = tutorAssignments
        .filter(ta => ta.tutor_id === tutor.id)
        .map(ta => ta.cohort_id);
      const assignedCount = assignedCohortIds.length;
      const submissionsWaiting = submissions.filter(s => 
        assignedCohortIds.includes(s.cohort_id) && ['submitted', 'in_review'].includes(s.status)
      ).length;
      const portfolioWaiting = portfolioStatuses.filter(ps => 
        assignedCohortIds.includes(ps.cohort_id) && ['submitted', 'in_review'].includes(ps.status)
      ).length;
      const totalWaiting = submissionsWaiting + portfolioWaiting;
      return { tutor, assignedCount, submissionsWaiting, portfolioWaiting, totalWaiting };
    }).sort((a, b) => b.totalWaiting - a.totalWaiting);
  }, [users, tutorAssignments, submissions, portfolioStatuses]);

  // Engagement
  const engagement = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const loginsToday = loginEvents.filter(le => le.login_time && le.login_time.startsWith(today)).length;
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentLogins = loginEvents.filter(le => le.login_time && new Date(le.login_time) >= sevenDaysAgo);
    const uniqueUsers = new Set(recentLogins.map(le => le.user_id)).size;

    return { loginsToday, uniqueUsers };
  }, [loginEvents]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
          <p className="text-slate-600">Complete overview of your platform</p>
        </div>

        {/* Quick Access Tools */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to={createPageUrl('BeginLearning')}
            className="flex items-center gap-3 px-4 py-4 rounded-xl transition-all duration-200 group bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-purple-300"
          >
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br from-purple-600 to-violet-500">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">
                Begin Learning
              </p>
              <p className="text-xs text-slate-500">Courses & Live Sessions</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
          </Link>

          <a
            href={settings?.marketo_url || "https://experience.adobe.com/#/@oadsolutionsltd/"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-4 rounded-xl transition-all duration-200 group bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-slate-300"
          >
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-white border border-slate-200">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693261f4a46b591b7d38e623/81e4b8812_AdobeIcon.png" 
                alt="Adobe" 
                className="w-8 h-8"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">
                Launch Marketo
              </p>
              <p className="text-xs text-slate-500">Opens in new tab</p>
            </div>
            <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
          </a>

          <Link
            to={createPageUrl('StudentAITools')}
            className="flex items-center gap-3 px-4 py-4 rounded-xl transition-all duration-200 group bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-cyan-300"
          >
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-500">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">
                AI Tools
              </p>
              <p className="text-xs text-slate-500">MarTech AI Assistant</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link to={createPageUrl('AdminUsers')}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 cursor-pointer hover:shadow-xl transition-all">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                  <Users className="w-5 h-5 opacity-80" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalStudents}</div>
                </CardContent>
              </Card>
            </motion.div>
          </Link>

          <Link to={createPageUrl('AdminUsers')}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 cursor-pointer hover:shadow-xl transition-all">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Tutors</CardTitle>
                  <Award className="w-5 h-5 opacity-80" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalTutors}</div>
                </CardContent>
              </Card>
            </motion.div>
          </Link>

          <Link to={createPageUrl('AdminCohorts')}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 cursor-pointer hover:shadow-xl transition-all">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Active Cohorts</CardTitle>
                  <TrendingUp className="w-5 h-5 opacity-80" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.activeCohorts}</div>
                </CardContent>
              </Card>
            </motion.div>
          </Link>

          <Link to={createPageUrl('AdminSubmissions')}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 cursor-pointer hover:shadow-xl transition-all">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Pending Submissions</CardTitle>
                  <Clock className="w-5 h-5 opacity-80" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.pendingSubmissions}</div>
                </CardContent>
              </Card>
            </motion.div>
          </Link>

          <Link to={createPageUrl('AdminPortfolio')}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white border-0 cursor-pointer hover:shadow-xl transition-all">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Pending Portfolio Reviews</CardTitle>
                  <Clock className="w-5 h-5 opacity-80" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.pendingPortfolioReviews}</div>
                </CardContent>
              </Card>
            </motion.div>
          </Link>

          <Link to={createPageUrl('AdminExams')}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white border-0 cursor-pointer hover:shadow-xl transition-all">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Completed Exams</CardTitle>
                  <CheckCircle className="w-5 h-5 opacity-80" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.completedExams}</div>
                </CardContent>
              </Card>
            </motion.div>
          </Link>
        </div>

        {/* Active View Display */}
        {activeView && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative"
          >
            <Card className="border-2 border-slate-300">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50">
                <CardTitle>
                  {activeView === 'students' && 'All Students'}
                  {activeView === 'tutors' && 'All Tutors'}
                  {activeView === 'cohorts' && 'Active Cohorts'}
                  {activeView === 'submissions' && 'Pending Submissions'}
                  {activeView === 'portfolio' && 'Pending Portfolio Reviews'}
                  {activeView === 'exams' && 'Completed Exams'}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setActiveView(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                {activeView === 'students' && (
                  <div className="space-y-2">
                    {users.filter(u => u.app_role === 'student').map(user => (
                      <div key={user.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-slate-600">{user.email}</p>
                        </div>
                        <Badge variant="secondary">{user.status || 'active'}</Badge>
                      </div>
                    ))}
                  </div>
                )}
                
                {activeView === 'tutors' && (
                  <div className="space-y-2">
                    {users.filter(u => u.app_role === 'tutor').map(user => (
                      <div key={user.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-slate-600">{user.email}</p>
                        </div>
                        <Badge variant="secondary">{user.status || 'active'}</Badge>
                      </div>
                    ))}
                  </div>
                )}
                
                {activeView === 'cohorts' && (
                  <div className="space-y-2">
                    {cohorts.filter(c => c.status === 'active').map(cohort => (
                      <Link key={cohort.id} to={createPageUrl(`AdminCohortOverview?id=${cohort.id}`)}>
                        <div className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                          <p className="font-medium">{cohort.name}</p>
                          <p className="text-sm text-slate-600">
                            {cohort.start_date && new Date(cohort.start_date).toLocaleDateString()} - {cohort.end_date && new Date(cohort.end_date).toLocaleDateString()}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                
                {activeView === 'submissions' && (
                  <div className="space-y-2">
                    {submissions.filter(s => ['submitted', 'in_review'].includes(s.status)).map(sub => {
                      const student = users.find(u => u.id === sub.user_id);
                      const cohort = cohorts.find(c => c.id === sub.cohort_id);
                      return (
                        <div key={sub.id} className="p-3 bg-slate-50 rounded-lg">
                          <div className="flex justify-between items-start mb-1">
                            <p className="font-medium">{student?.full_name}</p>
                            <Badge variant="secondary">{sub.submission_kind}</Badge>
                          </div>
                          <p className="text-sm text-slate-600">{cohort?.name}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {sub.submitted_date && new Date(sub.submitted_date).toLocaleDateString()}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {activeView === 'portfolio' && (
                  <div className="space-y-2">
                    {portfolioStatuses.filter(ps => ['submitted', 'in_review'].includes(ps.status)).map(ps => {
                      const student = users.find(u => u.id === ps.user_id);
                      const cohort = cohorts.find(c => c.id === ps.cohort_id);
                      const template = portfolioTemplates.find(pt => pt.id === ps.portfolio_item_id);
                      return (
                        <div key={ps.id} className="p-3 bg-slate-50 rounded-lg">
                          <div className="flex justify-between items-start mb-1">
                            <p className="font-medium">{student?.full_name}</p>
                            <Badge variant="secondary">{template?.title}</Badge>
                          </div>
                          <p className="text-sm text-slate-600">{cohort?.name}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {ps.updated_date && new Date(ps.updated_date).toLocaleDateString()}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {activeView === 'exams' && (
                  <div className="space-y-2">
                    {examAttempts.filter(a => a.attempt_status === 'submitted' && a.pass_flag === true).map(attempt => {
                      const student = users.find(u => u.id === attempt.student_user_id);
                      const cohort = cohorts.find(c => c.id === attempt.cohort_id);
                      return (
                        <div key={attempt.id} className="p-3 bg-slate-50 rounded-lg">
                          <div className="flex justify-between items-start mb-1">
                            <p className="font-medium">{student?.full_name}</p>
                            <Badge className="bg-green-100 text-green-700">Passed</Badge>
                          </div>
                          <p className="text-sm text-slate-600">{cohort?.name}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Score: {attempt.score_percent}% | {attempt.submitted_at && new Date(attempt.submitted_at).toLocaleDateString()}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Leaderboards Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overall Leaderboard */}
          <Card className="border-2 border-orange-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b border-orange-200">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-orange-600" />
                <CardTitle className="text-lg text-orange-900">Overall Top 5</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-2">
                {overallLeaderboard.map((student, index) => (
                  <div
                    key={student.userId}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-slate-50 to-white border border-slate-200"
                  >
                    <div className="flex-shrink-0">
                      {index === 0 && <Trophy className="w-6 h-6 text-yellow-500" />}
                      {index === 1 && <Trophy className="w-6 h-6 text-slate-400" />}
                      {index === 2 && <Trophy className="w-6 h-6 text-orange-600" />}
                      {index > 2 && (
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                          {index + 1}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-900 truncate">{student.name}</p>
                    </div>
                    <Badge className="bg-orange-500 text-white text-sm px-2 py-0.5">
                      {student.points}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Cohort Leaderboards */}
          {cohortLeaderboards.slice(0, 2).map(({ cohort, leaderboard }) => (
            <Card key={cohort.id} className="border border-slate-200">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="flex items-center justify-between text-lg">
                  <span className="truncate">{cohort.name}</span>
                  <Badge variant={cohort.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                    {cohort.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {leaderboard.length > 0 ? (
                  <div className="space-y-2">
                    {leaderboard.map((student, index) => (
                      <div
                        key={student.userId}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-sm font-bold text-slate-600 w-5">
                            {index + 1}.
                          </span>
                          <span className="font-medium text-sm text-slate-900 truncate">{student.name}</span>
                        </div>
                        <Badge variant="outline" className="bg-white text-xs">
                          {student.points}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-500 text-sm py-6">No students yet</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Cohort Health Table */}
        <Card>
          <CardHeader>
            <CardTitle>Cohort Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left p-3 text-sm font-semibold text-slate-700">Cohort</th>
                    <th className="text-left p-3 text-sm font-semibold text-slate-700">Dates</th>
                    <th className="text-center p-3 text-sm font-semibold text-slate-700">Students</th>
                    <th className="text-center p-3 text-sm font-semibold text-slate-700">Tutors</th>
                    <th className="text-center p-3 text-sm font-semibold text-slate-700">Pending</th>
                    <th className="text-center p-3 text-sm font-semibold text-slate-700">Revisions</th>
                    <th className="text-center p-3 text-sm font-semibold text-slate-700">Portfolio</th>
                    <th className="text-center p-3 text-sm font-semibold text-slate-700">Cert Passes</th>
                    <th className="text-center p-3 text-sm font-semibold text-slate-700">Pass Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {cohortHealthData.map((data) => (
                    <tr key={data.cohort.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3">
                        <Link 
                          to={createPageUrl(`AdminCohortOverview?id=${data.cohort.id}`)} 
                          className="font-medium text-violet-600 hover:text-violet-700"
                        >
                          {data.cohort.name}
                        </Link>
                      </td>
                      <td className="p-3 text-sm text-slate-600">
                        {data.cohort.start_date && new Date(data.cohort.start_date).toLocaleDateString()}
                        {' - '}
                        {data.cohort.end_date && new Date(data.cohort.end_date).toLocaleDateString()}
                      </td>
                      <td className="text-center p-3">
                        <Badge variant="secondary">{data.activeStudents}</Badge>
                      </td>
                      <td className="text-center p-3">
                        <Badge variant="secondary">{data.tutors}</Badge>
                      </td>
                      <td className="text-center p-3">
                        <Badge className={data.pendingSubmissions > 0 ? 'bg-amber-100 text-amber-700' : ''}>
                          {data.pendingSubmissions}
                        </Badge>
                      </td>
                      <td className="text-center p-3">
                        <Badge className={data.needsRevision > 0 ? 'bg-red-100 text-red-700' : ''}>
                          {data.needsRevision}
                        </Badge>
                      </td>
                      <td className="text-center p-3">
                        <Badge className={data.pendingPortfolio > 0 ? 'bg-cyan-100 text-cyan-700' : ''}>
                          {data.pendingPortfolio}
                        </Badge>
                      </td>
                      <td className="text-center p-3">
                        <Badge className="bg-green-100 text-green-700">{data.certPasses}</Badge>
                      </td>
                      <td className="text-center p-3">
                        <span className="font-semibold text-slate-900">{data.certPassRate}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-6">
          {/* Oldest Ungraded Submissions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                Oldest Ungraded Submissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {oldestSubmissions.map((sub) => (
                  <div key={sub.id} className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-slate-900">{sub.student?.full_name}</p>
                        <p className="text-sm text-slate-600">{sub.cohort?.name}</p>
                      </div>
                      <Badge variant="secondary">{sub.submission_kind}</Badge>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">
                        {sub.submitted_date && new Date(sub.submitted_date).toLocaleDateString()}
                      </span>
                      <span className="font-semibold text-amber-600">{sub.ageHours}h ago</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Oldest Pending Portfolio */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-600" />
                Oldest Pending Portfolio Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {oldestPortfolio.map((ps) => (
                  <div key={ps.id} className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-slate-900">{ps.student?.full_name}</p>
                        <p className="text-sm text-slate-600">{ps.cohort?.name}</p>
                      </div>
                      <Badge variant="secondary">{ps.template?.title}</Badge>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">
                        {ps.updated_date && new Date(ps.updated_date).toLocaleDateString()}
                      </span>
                      <span className="font-semibold text-cyan-600">{ps.ageHours}h ago</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tutor Workload */}
        <Card>
          <CardHeader>
            <CardTitle>Tutor Workload Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left p-3 text-sm font-semibold text-slate-700">Tutor</th>
                    <th className="text-center p-3 text-sm font-semibold text-slate-700">Assigned Cohorts</th>
                    <th className="text-center p-3 text-sm font-semibold text-slate-700">Submissions Waiting</th>
                    <th className="text-center p-3 text-sm font-semibold text-slate-700">Portfolio Waiting</th>
                    <th className="text-center p-3 text-sm font-semibold text-slate-700">Total Waiting</th>
                  </tr>
                </thead>
                <tbody>
                  {tutorWorkload.map((tw) => (
                    <tr key={tw.tutor.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-900">{tw.tutor.full_name}</td>
                      <td className="text-center p-3">
                        <Badge variant="secondary">{tw.assignedCount}</Badge>
                      </td>
                      <td className="text-center p-3">
                        <Badge className={tw.submissionsWaiting > 0 ? 'bg-amber-100 text-amber-700' : ''}>
                          {tw.submissionsWaiting}
                        </Badge>
                      </td>
                      <td className="text-center p-3">
                        <Badge className={tw.portfolioWaiting > 0 ? 'bg-cyan-100 text-cyan-700' : ''}>
                          {tw.portfolioWaiting}
                        </Badge>
                      </td>
                      <td className="text-center p-3">
                        <span className={`font-bold ${tw.totalWaiting > 10 ? 'text-red-600' : 'text-slate-900'}`}>
                          {tw.totalWaiting}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Engagement Snapshot */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-50 rounded-xl p-6">
                <p className="text-sm text-slate-600 mb-2">Logins Today</p>
                <p className="text-4xl font-bold text-slate-900">{engagement.loginsToday}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-6">
                <p className="text-sm text-slate-600 mb-2">7-Day Active Users</p>
                <p className="text-4xl font-bold text-slate-900">{engagement.uniqueUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
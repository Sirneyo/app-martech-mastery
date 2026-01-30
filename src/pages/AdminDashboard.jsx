import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Users, CheckCircle, Clock, Award, BookOpen, ExternalLink, Zap, ChevronRight, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

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
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="w-5 h-5 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalStudents}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Tutors</CardTitle>
              <Award className="w-5 h-5 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalTutors}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Cohorts</CardTitle>
              <TrendingUp className="w-5 h-5 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.activeCohorts}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Submissions</CardTitle>
              <Clock className="w-5 h-5 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.pendingSubmissions}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Portfolio Reviews</CardTitle>
              <Clock className="w-5 h-5 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.pendingPortfolioReviews}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed Exams</CardTitle>
              <CheckCircle className="w-5 h-5 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.completedExams}</div>
            </CardContent>
          </Card>
        </div>

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
      </div>
    </div>
  );
}
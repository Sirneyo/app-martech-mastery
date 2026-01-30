import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Users, CheckCircle, Clock, Award } from 'lucide-react';

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
      .slice(0, 10);

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
        .slice(0, 5);

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

        {/* Overall Leaderboard */}
        <Card className="border-2 border-orange-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b border-orange-200">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-orange-600" />
              <CardTitle className="text-2xl text-orange-900">Overall Leaderboard</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {overallLeaderboard.map((student, index) => (
                <div
                  key={student.userId}
                  className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-slate-50 to-white border border-slate-200 hover:border-orange-300 transition-all"
                >
                  <div className="flex-shrink-0">
                    {index === 0 && <Trophy className="w-8 h-8 text-yellow-500" />}
                    {index === 1 && <Trophy className="w-8 h-8 text-slate-400" />}
                    {index === 2 && <Trophy className="w-8 h-8 text-orange-600" />}
                    {index > 2 && (
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                        {index + 1}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{student.name}</p>
                    <p className="text-sm text-slate-500">{student.email}</p>
                  </div>
                  <Badge className="bg-orange-500 text-white text-lg px-4 py-1">
                    {student.points} pts
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cohort Leaderboards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {cohortLeaderboards.map(({ cohort, leaderboard }) => (
            <Card key={cohort.id} className="border border-slate-200">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="flex items-center justify-between">
                  <span className="text-lg">{cohort.name}</span>
                  <Badge variant={cohort.status === 'active' ? 'default' : 'secondary'}>
                    {cohort.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {leaderboard.length > 0 ? (
                  <div className="space-y-2">
                    {leaderboard.map((student, index) => (
                      <div
                        key={student.userId}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-slate-600 w-6">
                            {index + 1}.
                          </span>
                          <span className="font-medium text-slate-900">{student.name}</span>
                        </div>
                        <Badge variant="outline" className="bg-white">
                          {student.points} pts
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-500 py-8">No students yet</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
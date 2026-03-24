import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Users, CheckCircle, Clock, Award, ChevronRight, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
  const [showAllCohorts, setShowAllCohorts] = React.useState(false);
  const [showAllHealthCohorts, setShowAllHealthCohorts] = React.useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getAdminDashboardData', {});
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const stats = data?.stats || {};
  const overallLeaderboard = data?.overallLeaderboard || [];
  const cohortLeaderboards = data?.cohortLeaderboards || [];
  const cohortHealthData = data?.cohortHealthData || [];
  const oldestSubmissions = data?.oldestSubmissions || [];
  const oldestPortfolio = data?.oldestPortfolio || [];
  const tutorWorkload = data?.tutorWorkload || [];
  const engagement = data?.engagement || {};

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

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
          <Link to={createPageUrl('AdminUsers')}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 cursor-pointer hover:shadow-xl transition-all">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                  <Users className="w-5 h-5 opacity-80" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalStudents ?? '—'}</div>
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
                  <div className="text-3xl font-bold">{stats.totalTutors ?? '—'}</div>
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
                  <div className="text-3xl font-bold">{stats.activeCohorts ?? '—'}</div>
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
                  <div className="text-3xl font-bold">{stats.pendingSubmissions ?? '—'}</div>
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
                  <div className="text-3xl font-bold">{stats.pendingPortfolioReviews ?? '—'}</div>
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
                  <div className="text-3xl font-bold">{stats.completedExams ?? '—'}</div>
                </CardContent>
              </Card>
            </motion.div>
          </Link>
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
                  <div key={student.userId} className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-slate-50 to-white border border-slate-200">
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
                    {student.profile_picture ? (
                      <img src={student.profile_picture} alt={student.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-slate-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-900 truncate">{student.name}</p>
                    </div>
                    <Badge className="bg-orange-500 text-white text-sm px-2 py-0.5">{student.points}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Cohort Leaderboards */}
          {cohortLeaderboards.slice(0, showAllCohorts ? cohortLeaderboards.length : 2).map(({ cohort, leaderboard }) => (
            <Card key={cohort.id} className="border border-slate-200">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="flex items-center justify-between text-lg">
                  <span className="truncate">{cohort.name}</span>
                  <Badge variant={cohort.status === 'active' ? 'default' : 'secondary'} className="text-xs">{cohort.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {leaderboard.length > 0 ? (
                  <div className="space-y-2">
                    {leaderboard.map((student, index) => (
                      <div key={student.userId} className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50">
                        <span className="text-sm font-bold text-slate-600 w-5 flex-shrink-0">{index + 1}.</span>
                        {student.profile_picture ? (
                          <img src={student.profile_picture} alt={student.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                          </div>
                        )}
                        <span className="font-medium text-sm text-slate-900 truncate flex-1">{student.name}</span>
                        <Badge variant="outline" className="bg-white text-xs">{student.points}</Badge>
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

        {cohortLeaderboards.length > 2 && (
          <div className="flex justify-center">
            <button
              onClick={() => setShowAllCohorts(!showAllCohorts)}
              className="flex items-center gap-2 px-5 py-2 rounded-full bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm"
            >
              <ChevronRight className={`w-4 h-4 transition-transform ${showAllCohorts ? 'rotate-90' : ''}`} />
              {showAllCohorts ? 'Show Less' : `View ${cohortLeaderboards.length - 2} More Cohort${cohortLeaderboards.length - 2 > 1 ? 's' : ''}`}
            </button>
          </div>
        )}

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
                  {(showAllHealthCohorts ? cohortHealthData : cohortHealthData.slice(0, 3)).map((data) => (
                    <tr key={data.cohort.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3">
                        <Link to={createPageUrl(`AdminCohortOverview?id=${data.cohort.id}`)} className="font-medium text-violet-600 hover:text-violet-700">
                          {data.cohort.name}
                        </Link>
                      </td>
                      <td className="p-3 text-sm text-slate-600">
                        {data.cohort.start_date && new Date(data.cohort.start_date).toLocaleDateString()}
                        {' - '}
                        {data.cohort.end_date && new Date(data.cohort.end_date).toLocaleDateString()}
                      </td>
                      <td className="text-center p-3"><Badge variant="secondary">{data.activeStudents}</Badge></td>
                      <td className="text-center p-3"><Badge variant="secondary">{data.tutors}</Badge></td>
                      <td className="text-center p-3">
                        <Badge className={data.pendingSubmissions > 0 ? 'bg-amber-100 text-amber-700' : ''}>{data.pendingSubmissions}</Badge>
                      </td>
                      <td className="text-center p-3">
                        <Badge className={data.needsRevision > 0 ? 'bg-red-100 text-red-700' : ''}>{data.needsRevision}</Badge>
                      </td>
                      <td className="text-center p-3">
                        <Badge className={data.pendingPortfolio > 0 ? 'bg-cyan-100 text-cyan-700' : ''}>{data.pendingPortfolio}</Badge>
                      </td>
                      <td className="text-center p-3"><Badge className="bg-green-100 text-green-700">{data.certPasses}</Badge></td>
                      <td className="text-center p-3"><span className="font-semibold text-slate-900">{data.certPassRate}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {cohortHealthData.length > 3 && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => setShowAllHealthCohorts(!showAllHealthCohorts)}
                  className="flex items-center gap-2 px-5 py-2 rounded-full bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm"
                >
                  <ChevronRight className={`w-4 h-4 transition-transform ${showAllHealthCohorts ? 'rotate-90' : ''}`} />
                  {showAllHealthCohorts ? 'Show Less' : `View ${cohortHealthData.length - 3} More Cohort${cohortHealthData.length - 3 > 1 ? 's' : ''}`}
                </button>
              </div>
            )}
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
                      <span className="text-slate-500">{sub.submitted_date && new Date(sub.submitted_date).toLocaleDateString()}</span>
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
                      <span className="text-slate-500">{ps.updated_date && new Date(ps.updated_date).toLocaleDateString()}</span>
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
                      <td className="text-center p-3"><Badge variant="secondary">{tw.assignedCount}</Badge></td>
                      <td className="text-center p-3">
                        <Badge className={tw.submissionsWaiting > 0 ? 'bg-amber-100 text-amber-700' : ''}>{tw.submissionsWaiting}</Badge>
                      </td>
                      <td className="text-center p-3">
                        <Badge className={tw.portfolioWaiting > 0 ? 'bg-cyan-100 text-cyan-700' : ''}>{tw.portfolioWaiting}</Badge>
                      </td>
                      <td className="text-center p-3">
                        <span className={`font-bold ${tw.totalWaiting > 10 ? 'text-red-600' : 'text-slate-900'}`}>{tw.totalWaiting}</span>
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
                <p className="text-4xl font-bold text-slate-900">{engagement.loginsToday ?? '—'}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-6">
                <p className="text-sm text-slate-600 mb-2">7-Day Active Users</p>
                <p className="text-4xl font-bold text-slate-900">{engagement.uniqueUsers ?? '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
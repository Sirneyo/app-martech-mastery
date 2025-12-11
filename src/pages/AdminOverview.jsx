import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  GraduationCap,
  FileText,
  FolderCheck,
  ClipboardList,
  TrendingUp,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminOverview() {
  const [selectedCohort, setSelectedCohort] = useState('all');
  const [timeRange, setTimeRange] = useState('30');

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: cohorts = [] } = useQuery({
    queryKey: ['cohorts'],
    queryFn: () => base44.entities.Cohort.list('-start_date'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['memberships'],
    queryFn: () => base44.entities.CohortMembership.list(),
  });

  const { data: tutorAssignments = [] } = useQuery({
    queryKey: ['tutor-assignments'],
    queryFn: () => base44.entities.TutorCohortAssignment.list(),
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['submissions'],
    queryFn: () => base44.entities.Submission.list(),
  });

  const { data: portfolioStatuses = [] } = useQuery({
    queryKey: ['portfolio-statuses'],
    queryFn: () => base44.entities.PortfolioItemStatus.list(),
  });

  const { data: examAttempts = [] } = useQuery({
    queryKey: ['exam-attempts'],
    queryFn: () => base44.entities.ExamAttempt.list(),
  });

  const { data: loginEvents = [] } = useQuery({
    queryKey: ['login-events'],
    queryFn: () => base44.entities.LoginEvent.list('-login_time'),
  });

  const { data: portfolioTemplates = [] } = useQuery({
    queryKey: ['portfolio-templates'],
    queryFn: () => base44.entities.PortfolioItemTemplate.list(),
  });

  const { data: assignmentTemplates = [] } = useQuery({
    queryKey: ['assignment-templates'],
    queryFn: () => base44.entities.AssignmentTemplate.list(),
  });

  const { data: projectTemplates = [] } = useQuery({
    queryKey: ['project-templates'],
    queryFn: () => base44.entities.ProjectTemplate.list(),
  });

  // Access control
  if (currentUser && currentUser.app_role !== 'admin' && currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-slate-200">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">No Access</h1>
          <p className="text-slate-600">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  // Calculate KPIs
  const activeCohorts = cohorts.filter(c => c.status === 'active');
  const activeStudents = users.filter(u => u.app_role === 'student' && u.status === 'active');
  const activeTutors = users.filter(u => u.app_role === 'tutor' && u.status === 'active');
  const pendingSubmissions = submissions.filter(s => ['submitted', 'in_review'].includes(s.status));
  const pendingPortfolio = portfolioStatuses.filter(ps => ['submitted', 'in_review'].includes(ps.status));
  const examsInProgress = examAttempts.filter(ea => ea.attempt_status === 'in_progress' && !ea.submitted_at);

  // Exam pass rate (last 30 days)
  const daysAgo = parseInt(timeRange);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
  const recentAttempts = examAttempts.filter(ea => ea.submitted_at && new Date(ea.submitted_at) >= cutoffDate);
  const passedAttempts = recentAttempts.filter(ea => ea.pass_flag);
  const passRate = recentAttempts.length > 0 ? Math.round((passedAttempts.length / recentAttempts.length) * 100) : 0;

  // Cohort health data
  const cohortHealthData = activeCohorts.map(cohort => {
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

  // Oldest ungraded submissions
  const oldestSubmissions = submissions
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

  // Oldest pending portfolio
  const oldestPortfolio = portfolioStatuses
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

  // Tutor workload
  const tutorWorkload = activeTutors.map(tutor => {
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

  // Engagement
  const today = new Date().toISOString().split('T')[0];
  const loginsToday = loginEvents.filter(le => le.login_time && le.login_time.startsWith(today)).length;
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentLogins = loginEvents.filter(le => le.login_time && new Date(le.login_time) >= sevenDaysAgo);
  const uniqueUsers = new Set(recentLogins.map(le => le.user_id)).size;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Overview</h1>
            <p className="text-slate-500 mt-1">Operational control and monitoring</p>
          </div>
          <div className="flex gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedCohort} onValueChange={setSelectedCohort}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All cohorts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cohorts</SelectItem>
                {cohorts.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Active Cohorts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-slate-900">{activeCohorts.length}</p>
                  <Users className="w-8 h-8 text-violet-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Active Students</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-slate-900">{activeStudents.length}</p>
                  <GraduationCap className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Pending Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-slate-900">{pendingSubmissions.length}</p>
                  <FileText className="w-8 h-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Exam Pass Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-slate-900">{passRate}%</p>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Active Tutors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-slate-900">{activeTutors.length}</p>
                  <Users className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Pending Portfolio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-slate-900">{pendingPortfolio.length}</p>
                  <FolderCheck className="w-8 h-8 text-cyan-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Exams In Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-slate-900">{examsInProgress.length}</p>
                  <ClipboardList className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">7-Day Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-slate-900">{uniqueUsers}</p>
                  <TrendingUp className="w-8 h-8 text-indigo-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Cohort Health Table */}
        <Card className="mb-8">
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

        <div className="grid grid-cols-2 gap-8 mb-8">
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
        <Card className="mb-8">
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
                <p className="text-4xl font-bold text-slate-900">{loginsToday}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-6">
                <p className="text-sm text-slate-600 mb-2">7-Day Active Users</p>
                <p className="text-4xl font-bold text-slate-900">{uniqueUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Users,
  FileText,
  FolderCheck,
  ClipboardList,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminCohortOverview() {
  const urlParams = new URLSearchParams(window.location.search);
  const cohortId = urlParams.get('id');

  const [filterBehind, setFilterBehind] = useState(false);
  const [filterInactive, setFilterInactive] = useState(false);
  const [filterPortfolioBlocked, setFilterPortfolioBlocked] = useState(false);
  const [filterExamCooldown, setFilterExamCooldown] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: cohort } = useQuery({
    queryKey: ['cohort', cohortId],
    queryFn: async () => {
      const cohorts = await base44.entities.Cohort.filter({ id: cohortId });
      return cohorts[0];
    },
    enabled: !!cohortId,
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['cohort-memberships', cohortId],
    queryFn: () => base44.entities.CohortMembership.filter({ cohort_id: cohortId, status: 'active' }),
    enabled: !!cohortId,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: tutorAssignments = [] } = useQuery({
    queryKey: ['tutor-assignments', cohortId],
    queryFn: () => base44.entities.TutorCohortAssignment.filter({ cohort_id: cohortId }),
    enabled: !!cohortId,
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['submissions', cohortId],
    queryFn: () => base44.entities.Submission.filter({ cohort_id: cohortId }),
    enabled: !!cohortId,
  });

  const { data: portfolioStatuses = [] } = useQuery({
    queryKey: ['portfolio-statuses', cohortId],
    queryFn: () => base44.entities.PortfolioItemStatus.filter({ cohort_id: cohortId }),
    enabled: !!cohortId,
  });

  const { data: portfolioTemplates = [] } = useQuery({
    queryKey: ['portfolio-templates'],
    queryFn: () => base44.entities.PortfolioItemTemplate.list(),
  });

  const { data: examAttempts = [] } = useQuery({
    queryKey: ['exam-attempts', cohortId],
    queryFn: () => base44.entities.ExamAttempt.filter({ cohort_id: cohortId }),
    enabled: !!cohortId,
  });

  const { data: loginEvents = [] } = useQuery({
    queryKey: ['login-events'],
    queryFn: () => base44.entities.LoginEvent.list('-login_time'),
  });

  const { data: examConfig } = useQuery({
    queryKey: ['exam-config'],
    queryFn: async () => {
      const configs = await base44.entities.ExamConfig.filter({ is_active: true });
      return configs[0];
    },
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

  if (!cohort) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading cohort...</p>
      </div>
    );
  }

  // Calculate cohort stats
  const students = memberships.map(m => users.find(u => u.id === m.user_id)).filter(Boolean);
  const tutors = tutorAssignments.filter(ta => ta.is_primary).map(ta => users.find(u => u.id === ta.tutor_id)).filter(Boolean);
  
  const pendingSubmissions = submissions.filter(s => ['submitted', 'in_review'].includes(s.status));
  const needsRevision = submissions.filter(s => s.status === 'needs_revision');
  const pendingPortfolio = portfolioStatuses.filter(ps => ['submitted', 'in_review'].includes(ps.status));
  const certPasses = examAttempts.filter(ea => ea.pass_flag);
  const submittedAttempts = examAttempts.filter(ea => ea.submitted_at);
  const certPassRate = submittedAttempts.length > 0 ? Math.round((certPasses.length / submittedAttempts.length) * 100) : 0;

  // Required portfolio templates
  const requiredTemplates = portfolioTemplates.filter(pt => pt.required_flag);

  // Build student roster data
  const studentRosterData = students.map(student => {
    // Last login
    const studentLogins = loginEvents.filter(le => le.user_id === student.id);
    const lastLogin = studentLogins.length > 0 ? new Date(studentLogins[0].login_time) : null;
    const daysSinceLogin = lastLogin ? Math.floor((new Date() - lastLogin) / (1000 * 60 * 60 * 24)) : 999;

    // Submissions
    const studentSubmissions = submissions.filter(s => s.user_id === student.id);
    const studentPending = studentSubmissions.filter(s => ['submitted', 'in_review'].includes(s.status)).length;
    const studentRevisions = studentSubmissions.filter(s => s.status === 'needs_revision').length;

    // Portfolio
    const studentPortfolio = portfolioStatuses.filter(ps => ps.user_id === student.id);
    const approvedRequired = studentPortfolio.filter(ps => {
      const template = portfolioTemplates.find(pt => pt.id === ps.portfolio_item_id);
      return template?.required_flag && ps.status === 'approved';
    }).length;
    const totalRequired = requiredTemplates.length;

    // Exam status
    const studentAttempts = examAttempts.filter(ea => ea.student_user_id === student.id);
    let examStatus = 'not_started';
    let examStatusLabel = 'Not Started';
    let examCooldownLocked = false;

    if (studentAttempts.length > 0) {
      const hasPassed = studentAttempts.some(ea => ea.pass_flag);
      const activeAttempt = studentAttempts.find(ea => ['prepared', 'in_progress'].includes(ea.attempt_status) && !ea.submitted_at);
      
      if (hasPassed) {
        examStatus = 'passed';
        examStatusLabel = 'Passed';
      } else if (activeAttempt) {
        examStatus = activeAttempt.attempt_status;
        examStatusLabel = activeAttempt.attempt_status === 'prepared' ? 'Prepared' : 'In Progress';
      } else {
        const preparedAttempts = studentAttempts.filter(a => a.prepared_at);
        const attemptsUsed = preparedAttempts.length;
        const nextAttemptNumber = attemptsUsed + 1;
        
        // Check cooldown for attempt 3
        if (nextAttemptNumber === 3 && examConfig) {
          const attempt2 = studentAttempts.find(a => a.attempt_number === 2);
          if (attempt2?.submitted_at) {
            const cooldownHours = examConfig.cooldown_after_attempt_2_hours || 24;
            const eligibleAt = new Date(new Date(attempt2.submitted_at).getTime() + cooldownHours * 60 * 60 * 1000);
            if (new Date() < eligibleAt) {
              examCooldownLocked = true;
              examStatus = 'cooldown';
              examStatusLabel = 'Cooldown';
            }
          }
        }
        
        // Check cooldown for attempt 4
        if (nextAttemptNumber === 4 && examConfig) {
          const attempt3 = studentAttempts.find(a => a.attempt_number === 3);
          if (attempt3?.submitted_at && !attempt3.pass_flag) {
            const cooldownHours = examConfig.cooldown_after_attempt_3_fail_hours || 48;
            const eligibleAt = new Date(new Date(attempt3.submitted_at).getTime() + cooldownHours * 60 * 60 * 1000);
            if (new Date() < eligibleAt) {
              examCooldownLocked = true;
              examStatus = 'cooldown';
              examStatusLabel = 'Cooldown';
            }
          }
        }
        
        if (examStatus === 'not_started' && attemptsUsed > 0) {
          examStatus = 'failed';
          examStatusLabel = 'Failed';
        }
      }
    }

    // Exit interview unlocked
    const exitInterviewUnlocked = approvedRequired === totalRequired;

    return {
      student,
      lastLogin,
      daysSinceLogin,
      studentPending,
      studentRevisions,
      approvedRequired,
      totalRequired,
      examStatus,
      examStatusLabel,
      examCooldownLocked,
      exitInterviewUnlocked,
    };
  });

  // Apply filters
  let filteredRoster = studentRosterData;
  
  if (filterBehind) {
    filteredRoster = filteredRoster.filter(sr => sr.studentRevisions > 0 || sr.studentPending > 0);
  }
  
  if (filterInactive) {
    filteredRoster = filteredRoster.filter(sr => sr.daysSinceLogin >= 7);
  }
  
  if (filterPortfolioBlocked) {
    filteredRoster = filteredRoster.filter(sr => sr.approvedRequired < sr.totalRequired);
  }
  
  if (filterExamCooldown) {
    filteredRoster = filteredRoster.filter(sr => sr.examCooldownLocked);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link 
            to={createPageUrl('AdminOverview')} 
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Overview
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">{cohort.name}</h1>
          <p className="text-slate-500 mt-1">
            {cohort.start_date && new Date(cohort.start_date).toLocaleDateString()}
            {' - '}
            {cohort.end_date && new Date(cohort.end_date).toLocaleDateString()}
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Active Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-slate-900">{students.length}</p>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Assigned Tutors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-slate-900">{tutors.length}</p>
                <Users className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

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

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Cert Pass Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-slate-900">{certPassRate}%</p>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Needs Revision</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-slate-900">{needsRevision.length}</p>
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

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

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Cert Passes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-slate-900">{certPasses.length}</p>
                <ClipboardList className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Tutors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {tutors.map(tutor => (
                  <p key={tutor.id} className="text-sm text-slate-700">{tutor.full_name}</p>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Quick Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              <Button
                variant={filterBehind ? 'default' : 'outline'}
                onClick={() => setFilterBehind(!filterBehind)}
                size="sm"
              >
                Behind on Assignments
              </Button>
              <Button
                variant={filterInactive ? 'default' : 'outline'}
                onClick={() => setFilterInactive(!filterInactive)}
                size="sm"
              >
                Not Logged In 7+ Days
              </Button>
              <Button
                variant={filterPortfolioBlocked ? 'default' : 'outline'}
                onClick={() => setFilterPortfolioBlocked(!filterPortfolioBlocked)}
                size="sm"
              >
                Portfolio Blocked
              </Button>
              <Button
                variant={filterExamCooldown ? 'default' : 'outline'}
                onClick={() => setFilterExamCooldown(!filterExamCooldown)}
                size="sm"
              >
                Exam Cooldown Locked
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Student Roster */}
        <Card>
          <CardHeader>
            <CardTitle>Student Roster</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left p-3 text-sm font-semibold text-slate-700">Student</th>
                    <th className="text-left p-3 text-sm font-semibold text-slate-700">Last Login</th>
                    <th className="text-center p-3 text-sm font-semibold text-slate-700">Pending</th>
                    <th className="text-center p-3 text-sm font-semibold text-slate-700">Revisions</th>
                    <th className="text-center p-3 text-sm font-semibold text-slate-700">Portfolio</th>
                    <th className="text-center p-3 text-sm font-semibold text-slate-700">Exam Status</th>
                    <th className="text-center p-3 text-sm font-semibold text-slate-700">Exit Interview</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoster.map((sr) => (
                    <tr key={sr.student.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-900">{sr.student.full_name}</td>
                      <td className="p-3 text-sm">
                        {sr.lastLogin ? (
                          <span className={sr.daysSinceLogin >= 7 ? 'text-red-600 font-semibold' : 'text-slate-600'}>
                            {sr.lastLogin.toLocaleDateString()}
                            {sr.daysSinceLogin >= 7 && ` (${sr.daysSinceLogin}d ago)`}
                          </span>
                        ) : (
                          <span className="text-slate-400">Never</span>
                        )}
                      </td>
                      <td className="text-center p-3">
                        <Badge className={sr.studentPending > 0 ? 'bg-amber-100 text-amber-700' : ''}>
                          {sr.studentPending}
                        </Badge>
                      </td>
                      <td className="text-center p-3">
                        <Badge className={sr.studentRevisions > 0 ? 'bg-red-100 text-red-700' : ''}>
                          {sr.studentRevisions}
                        </Badge>
                      </td>
                      <td className="text-center p-3">
                        <span className={`text-sm font-semibold ${sr.approvedRequired === sr.totalRequired ? 'text-green-600' : 'text-slate-600'}`}>
                          {sr.approvedRequired} / {sr.totalRequired}
                        </span>
                      </td>
                      <td className="text-center p-3">
                        <Badge 
                          className={
                            sr.examStatus === 'passed' ? 'bg-green-100 text-green-700' :
                            sr.examStatus === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            sr.examStatus === 'prepared' ? 'bg-purple-100 text-purple-700' :
                            sr.examStatus === 'cooldown' ? 'bg-orange-100 text-orange-700' :
                            sr.examStatus === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-700'
                          }
                        >
                          {sr.examStatusLabel}
                        </Badge>
                      </td>
                      <td className="text-center p-3">
                        {sr.exitInterviewUnlocked ? (
                          <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                        ) : (
                          <XCircle className="w-5 h-5 text-slate-400 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
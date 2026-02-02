import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Award, FileText, FolderCheck, Calendar, TrendingUp, Mail, Clock } from 'lucide-react';

export default function StudentProfileModal({ student, isOpen, onClose }) {
  const { data: cohortMembership } = useQuery({
    queryKey: ['student-cohort', student?.id],
    queryFn: () => base44.entities.CohortMembership.filter({ user_id: student.id }),
    enabled: !!student,
  });

  const { data: cohort } = useQuery({
    queryKey: ['cohort', cohortMembership?.[0]?.cohort_id],
    queryFn: () => base44.entities.Cohort.list(),
    enabled: !!cohortMembership?.[0]?.cohort_id,
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['student-submissions', student?.id],
    queryFn: () => base44.entities.Submission.filter({ user_id: student.id }),
    enabled: !!student,
  });

  const { data: portfolioStatuses = [] } = useQuery({
    queryKey: ['student-portfolio', student?.id],
    queryFn: () => base44.entities.PortfolioItemStatus.filter({ user_id: student.id }),
    enabled: !!student,
  });

  const { data: examAttempts = [] } = useQuery({
    queryKey: ['student-exams', student?.id],
    queryFn: () => base44.entities.ExamAttempt.filter({ student_user_id: student.id }),
    enabled: !!student,
  });

  const { data: pointsLedger = [] } = useQuery({
    queryKey: ['student-points', student?.id],
    queryFn: () => base44.entities.PointsLedger.filter({ user_id: student.id }),
    enabled: !!student,
  });

  const { data: loginEvents = [] } = useQuery({
    queryKey: ['student-logins', student?.id],
    queryFn: () => base44.entities.LoginEvent.filter({ user_id: student.id }, '-login_time', 10),
    enabled: !!student,
  });

  const { data: grades = [] } = useQuery({
    queryKey: ['student-grades', student?.id],
    queryFn: async () => {
      const submissionIds = submissions.map(s => s.id);
      if (submissionIds.length === 0) return [];
      const allGrades = await base44.entities.SubmissionGrade.list();
      return allGrades.filter(g => submissionIds.includes(g.submission_id));
    },
    enabled: !!student && submissions.length > 0,
  });

  if (!student) return null;

  const studentCohort = cohort?.find(c => c.id === cohortMembership?.[0]?.cohort_id);
  const totalPoints = pointsLedger.reduce((sum, entry) => sum + entry.points, 0);
  const assignmentSubmissions = submissions.filter(s => s.submission_kind === 'assignment');
  const projectSubmissions = submissions.filter(s => s.submission_kind === 'project');
  const gradedSubmissions = submissions.filter(s => s.status === 'graded');
  const passedExams = examAttempts.filter(e => e.pass_flag === true);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
              {student.full_name?.charAt(0) || 'S'}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{student.full_name}</h2>
              <p className="text-sm text-slate-500">{student.email}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-8 h-8 text-violet-600" />
                  <div>
                    <p className="text-2xl font-bold">{totalPoints}</p>
                    <p className="text-xs text-slate-500">Total Points</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <FileText className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold">{submissions.length}</p>
                    <p className="text-xs text-slate-500">Submissions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <FolderCheck className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold">{portfolioStatuses.length}</p>
                    <p className="text-xs text-slate-500">Portfolio Items</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Award className="w-8 h-8 text-amber-600" />
                  <div>
                    <p className="text-2xl font-bold">{examAttempts.length}</p>
                    <p className="text-xs text-slate-500">Exam Attempts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Student Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="font-medium">{student.email}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Role</p>
                  <Badge>{student.app_role || 'student'}</Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Cohort</p>
                  <p className="font-medium">{studentCohort?.name || 'Not assigned'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                    {student.status || 'active'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Member Since</p>
                  <p className="font-medium">{new Date(student.created_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Last Login</p>
                  <p className="font-medium">
                    {loginEvents[0] ? new Date(loginEvents[0].login_time).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Information Tabs */}
          <Tabs defaultValue="submissions" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="submissions">Submissions</TabsTrigger>
              <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
              <TabsTrigger value="exams">Exams</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="submissions" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Assignments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{assignmentSubmissions.length}</p>
                    <p className="text-sm text-slate-500">
                      {assignmentSubmissions.filter(s => s.status === 'graded').length} graded
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Projects</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{projectSubmissions.length}</p>
                    <p className="text-sm text-slate-500">
                      {projectSubmissions.filter(s => s.status === 'graded').length} graded
                    </p>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {submissions.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No submissions yet</p>
                ) : (
                  submissions.map(submission => (
                    <div key={submission.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {submission.submission_kind === 'assignment' ? 'Assignment' : 'Project'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(submission.submitted_date || submission.created_date).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={
                        submission.status === 'graded' ? 'default' :
                        submission.status === 'submitted' ? 'secondary' : 'outline'
                      }>
                        {submission.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="portfolio" className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold">
                      {portfolioStatuses.filter(p => p.status === 'approved').length}
                    </p>
                    <p className="text-sm text-slate-500">Approved</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold">
                      {portfolioStatuses.filter(p => p.status === 'in_review').length}
                    </p>
                    <p className="text-sm text-slate-500">In Review</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold">
                      {portfolioStatuses.filter(p => p.status === 'in_progress').length}
                    </p>
                    <p className="text-sm text-slate-500">In Progress</p>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {portfolioStatuses.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No portfolio items yet</p>
                ) : (
                  portfolioStatuses.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">Portfolio Item</p>
                        <p className="text-xs text-slate-500">Progress: {item.progress}%</p>
                      </div>
                      <Badge>{item.status}</Badge>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="exams" className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold">{examAttempts.length}</p>
                    <p className="text-sm text-slate-500">Total Attempts</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold text-green-600">{passedExams.length}</p>
                    <p className="text-sm text-slate-500">Passed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold text-red-600">
                      {examAttempts.filter(e => e.pass_flag === false).length}
                    </p>
                    <p className="text-sm text-slate-500">Failed</p>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {examAttempts.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No exam attempts yet</p>
                ) : (
                  examAttempts.map(attempt => (
                    <div key={attempt.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">Attempt #{attempt.attempt_number}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(attempt.submitted_at || attempt.created_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{attempt.score_percent}%</span>
                        <Badge variant={attempt.pass_flag ? 'default' : 'destructive'}>
                          {attempt.pass_flag ? 'Pass' : 'Fail'}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Recent Login Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {loginEvents.length === 0 ? (
                      <p className="text-center text-slate-500 py-8">No login activity recorded</p>
                    ) : (
                      loginEvents.map(event => (
                        <div key={event.id} className="flex items-center justify-between p-2 border-b last:border-0">
                          <div>
                            <p className="text-sm font-medium">
                              {new Date(event.login_time).toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-500">{event.ip_address || 'N/A'}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Points History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {pointsLedger.length === 0 ? (
                      <p className="text-center text-slate-500 py-8">No points earned yet</p>
                    ) : (
                      pointsLedger.map(entry => (
                        <div key={entry.id} className="flex items-center justify-between p-2 border-b last:border-0">
                          <div>
                            <p className="text-sm font-medium">{entry.reason}</p>
                            <p className="text-xs text-slate-500">{entry.source_type}</p>
                          </div>
                          <span className={`font-bold ${entry.points >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {entry.points >= 0 ? '+' : ''}{entry.points}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
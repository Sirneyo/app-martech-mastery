import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function AdminExamDetail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const attemptId = urlParams.get('id');

  const { data: attempt } = useQuery({
    queryKey: ['exam-attempt', attemptId],
    queryFn: async () => {
      const attempts = await base44.entities.ExamAttempt.filter({ id: attemptId });
      return attempts[0];
    },
    enabled: !!attemptId,
  });

  const { data: student } = useQuery({
    queryKey: ['student', attempt?.student_user_id],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ id: attempt.student_user_id });
      return users[0];
    },
    enabled: !!attempt?.student_user_id,
  });

  const { data: cohort } = useQuery({
    queryKey: ['cohort', attempt?.cohort_id],
    queryFn: async () => {
      const cohorts = await base44.entities.Cohort.filter({ id: attempt.cohort_id });
      return cohorts[0];
    },
    enabled: !!attempt?.cohort_id,
  });

  const { data: examConfig } = useQuery({
    queryKey: ['exam-config', attempt?.exam_id],
    queryFn: async () => {
      const configs = await base44.entities.ExamConfig.filter({ id: attempt.exam_id });
      return configs[0];
    },
    enabled: !!attempt?.exam_id,
  });

  const { data: attemptQuestions = [] } = useQuery({
    queryKey: ['attempt-questions', attemptId],
    queryFn: () => base44.entities.ExamAttemptQuestion.filter({ attempt_id: attemptId }),
    enabled: !!attemptId && attempt?.attempt_status === 'submitted',
  });

  const { data: answers = [] } = useQuery({
    queryKey: ['exam-answers', attemptId],
    queryFn: () => base44.entities.ExamAnswer.filter({ attempt_id: attemptId }),
    enabled: !!attemptId && attempt?.attempt_status === 'submitted',
  });

  const { data: allQuestions = [] } = useQuery({
    queryKey: ['all-questions'],
    queryFn: () => base44.entities.ExamQuestion.list(),
    enabled: attemptQuestions.length > 0,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.ExamSection.list(),
  });

  if (!attempt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-slate-500">Loading exam attempt...</p>
        </div>
      </div>
    );
  }

  const correctAnswers = answers.filter(a => a.is_correct).length;
  const totalAnswered = answers.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl('AdminExams'))}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Exams
          </Button>
        </div>

        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl mb-2">Exam Attempt Details</CardTitle>
                <div className="flex gap-2">
                  {attempt.attempt_status === 'submitted' && (
                    <Badge className={attempt.pass_flag ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {attempt.pass_flag ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" /> Passed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <XCircle className="w-4 h-4" /> Failed
                        </span>
                      )}
                    </Badge>
                  )}
                  {attempt.attempt_status !== 'submitted' && (
                    <Badge className="bg-blue-100 text-blue-700">
                      {attempt.attempt_status === 'in_progress' ? 'In Progress' : 'Prepared'}
                    </Badge>
                  )}
                </div>
              </div>
              {attempt.score_percent !== null && attempt.score_percent !== undefined && (
                <div className="text-right">
                  <p className="text-4xl font-bold text-slate-900">{attempt.score_percent}%</p>
                  <p className="text-sm text-slate-600">Score</p>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Student</p>
                <p className="font-semibold text-slate-900">{student?.full_name || 'Loading...'}</p>
                <p className="text-sm text-slate-600">{student?.email}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Cohort</p>
                <p className="font-semibold text-slate-900">{cohort?.name || 'No cohort'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Exam</p>
                <p className="font-semibold text-slate-900">{examConfig?.title || 'Loading...'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Attempt Number</p>
                <p className="font-semibold text-slate-900">#{attempt.attempt_number}</p>
              </div>
              {attempt.started_at && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Started</p>
                  <p className="font-semibold text-slate-900">
                    {new Date(attempt.started_at).toLocaleString()}
                  </p>
                </div>
              )}
              {attempt.submitted_at && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Submitted</p>
                  <p className="font-semibold text-slate-900">
                    {new Date(attempt.submitted_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {attempt.attempt_status === 'submitted' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Correct Answers</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">{correctAnswers}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Answered</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{totalAnswered}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Pass Required</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{examConfig?.pass_correct_required || 65}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* In Progress Status */}
        {attempt.attempt_status === 'in_progress' && (
          <Card>
            <CardHeader>
              <CardTitle>Current Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-700">Current Question:</span>
                  <span className="font-bold text-slate-900">
                    {attempt.current_question_index || 1} / 80
                  </span>
                </div>
                {attempt.expires_at && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700">Expires At:</span>
                    <span className="font-semibold text-slate-900">
                      {new Date(attempt.expires_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Answers Review */}
        {attempt.attempt_status === 'submitted' && attemptQuestions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Answer Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sections.sort((a, b) => a.sort_order - b.sort_order).map(section => {
                  const sectionQuestions = attemptQuestions
                    .filter(aq => aq.exam_section_id === section.id)
                    .sort((a, b) => a.order_index - b.order_index);

                  if (sectionQuestions.length === 0) return null;

                  return (
                    <div key={section.id} className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
                      <h3 className="text-lg font-semibold text-slate-900 mb-3">{section.name}</h3>
                      <div className="space-y-3">
                        {sectionQuestions.map(aq => {
                          const question = allQuestions.find(q => q.id === aq.question_id);
                          const answer = answers.find(a => a.question_id === aq.question_id);
                          
                          if (!question) return null;

                          return (
                            <div key={aq.id} className="bg-slate-50 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-2">
                                <p className="font-medium text-slate-900">Q{aq.global_order}. {question.question_text}</p>
                                {answer && (
                                  <Badge className={answer.is_correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                    {answer.is_correct ? 'Correct' : 'Incorrect'}
                                  </Badge>
                                )}
                              </div>
                              {answer && (
                                <div className="text-sm text-slate-600 mt-2">
                                  <p><strong>Student Answer:</strong> {answer.answer_json}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
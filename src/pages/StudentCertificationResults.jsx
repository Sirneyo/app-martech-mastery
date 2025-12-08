import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, XCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StudentCertificationResults() {
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

  const { data: examConfig } = useQuery({
    queryKey: ['exam-config', attempt?.exam_id],
    queryFn: async () => {
      const configs = await base44.entities.ExamConfig.filter({ id: attempt.exam_id });
      return configs[0];
    },
    enabled: !!attempt?.exam_id,
  });

  const { data: answers = [] } = useQuery({
    queryKey: ['exam-answers', attemptId],
    queryFn: () => base44.entities.ExamAnswer.filter({ attempt_id: attemptId }),
    enabled: !!attemptId,
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['exam-questions', attempt?.exam_id],
    queryFn: () => base44.entities.ExamQuestion.filter({ exam_id: attempt.exam_id }),
    enabled: !!attempt?.exam_id,
  });

  const { data: allAttempts = [] } = useQuery({
    queryKey: ['my-exam-attempts', attempt?.cohort_id],
    queryFn: async () => {
      if (!attempt) return [];
      return base44.entities.ExamAttempt.filter({
        student_user_id: attempt.student_user_id,
        cohort_id: attempt.cohort_id
      });
    },
    enabled: !!attempt,
  });

  if (!attempt || !examConfig) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading results...</p>
      </div>
    );
  }

  const passed = attempt.pass_flag;
  const submittedAttempts = allAttempts.filter(a => a.submitted_at);
  const attemptsUsed = submittedAttempts.length;
  const attemptsAllowed = examConfig.attempts_allowed;
  const canRetry = !passed && attemptsUsed < attemptsAllowed;

  const correctAnswers = answers.filter(a => a.is_correct).length;
  const totalQuestions = examConfig?.total_questions || 80;
  const passCorrectRequired = examConfig?.pass_correct_required || 65;

  return (
    <div className={`min-h-screen ${passed ? 'bg-gradient-to-br from-green-50 to-emerald-50' : 'bg-gradient-to-br from-red-50 to-orange-50'} p-8`}>
      <div className="max-w-4xl mx-auto">
        <Link to={createPageUrl('StudentCertification')} className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Certification
        </Link>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-12 text-center shadow-xl border border-slate-200"
        >
          <div className={`w-24 h-24 ${passed ? 'bg-gradient-to-br from-green-500 to-emerald-500' : 'bg-gradient-to-br from-red-500 to-orange-500'} rounded-full flex items-center justify-center mx-auto mb-6`}>
            {passed ? (
              <Trophy className="w-12 h-12 text-white" />
            ) : (
              <XCircle className="w-12 h-12 text-white" />
            )}
          </div>

          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            {passed ? 'Congratulations!' : 'Not Quite There'}
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            {passed ? 'You have passed the exam!' : 'Keep studying and try again'}
          </p>

          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-50 rounded-xl p-6">
              <p className="text-3xl font-bold text-slate-900 mb-2">
                {correctAnswers}/{totalQuestions}
              </p>
              <p className="text-sm text-slate-500">Correct Answers</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-6">
              <p className="text-3xl font-bold text-slate-900 mb-2">
                {passCorrectRequired}/{totalQuestions}
              </p>
              <p className="text-sm text-slate-500">Required to Pass</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-6">
              <p className="text-3xl font-bold text-slate-900 mb-2">
                {attempt.score_percent}%
              </p>
              <p className="text-sm text-slate-500">Score Percentage</p>
            </div>
          </div>

          {passed && (
            <div className="bg-green-50 rounded-xl p-6 mb-6 border border-green-200">
              <div className="flex items-center justify-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <p className="font-bold text-green-900">What happens next?</p>
              </div>
              <div className="text-left space-y-2 text-sm text-green-800">
                <p>✓ Your certificate has been generated</p>
                <p>✓ Portfolio item "mm_cert_exam" has been approved</p>
                <p>✓ You've earned 100 points</p>
              </div>
            </div>
          )}

          {!passed && (
            <div className="mb-6">
              <p className="text-slate-600 mb-4">
                Attempts used: <span className="font-bold">{attemptsUsed} / {attemptsAllowed}</span>
              </p>
              {canRetry ? (
                <Link to={createPageUrl('StudentCertification')}>
                  <Button size="lg" className="bg-violet-600 hover:bg-violet-700">
                    Try Again
                  </Button>
                </Link>
              ) : (
                <Badge variant="secondary" className="text-lg py-2 px-4">
                  No attempts remaining
                </Badge>
              )}
            </div>
          )}

          <div className="border-t border-slate-200 pt-6">
            <h3 className="font-bold text-slate-900 mb-4">Summary</h3>
            <div className="bg-slate-50 rounded-xl p-6 text-center">
              <p className="text-lg text-slate-700 mb-2">
                You answered <span className="font-bold text-slate-900">{correctAnswers}</span> out of <span className="font-bold text-slate-900">{totalQuestions}</span> questions correctly
              </p>
              <p className="text-sm text-slate-500">
                {passed ? `You exceeded the requirement of ${passCorrectRequired} correct answers` : `You needed ${passCorrectRequired} correct answers to pass`}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
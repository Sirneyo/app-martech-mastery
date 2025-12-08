import React from 'react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Target, Trophy, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StudentCertificationReady() {
  const urlParams = new URLSearchParams(window.location.search);
  const attemptId = urlParams.get('id');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

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

  const startExamMutation = useMutation({
    mutationFn: async () => {
      const startedAt = new Date();
      const timeLimitMinutes = examConfig?.time_limit_minutes || 100;
      const expiresAt = new Date(startedAt.getTime() + timeLimitMinutes * 60000);
      
      await base44.entities.ExamAttempt.update(attemptId, {
        attempt_status: 'in_progress',
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      });
    },
    onSuccess: () => {
      window.location.href = createPageUrl(`StudentCertificationAttempt?id=${attemptId}`);
    },
  });

  const handleBeginExam = () => {
    startExamMutation.mutate();
  };

  // Access control
  if (attempt && user && attempt.student_user_id !== user.id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl p-8 max-w-md shadow-lg border border-red-200 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-6">This attempt belongs to another student.</p>
          <Button
            onClick={() => window.location.href = createPageUrl('StudentCertification')}
            className="w-full bg-violet-600 hover:bg-violet-700"
          >
            Back to Certification
          </Button>
        </div>
      </div>
    );
  }

  // Redirect if already started or submitted
  if (attempt && attempt.attempt_status !== 'prepared') {
    if (attempt.attempt_status === 'submitted') {
      window.location.href = createPageUrl(`StudentCertificationResults?id=${attemptId}`);
    } else {
      window.location.href = createPageUrl(`StudentCertificationAttempt?id=${attemptId}`);
    }
    return null;
  }

  if (!attempt || !examConfig) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  const preparedAttempts = allAttempts.filter(a => a.prepared_at);
  const attemptsUsed = preparedAttempts.length;
  const attemptsAllowed = examConfig.attempts_allowed || 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-50 flex items-center justify-center p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-8 max-w-2xl shadow-xl border border-violet-200"
      >
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Your Exam is Ready!
          </h1>
          <p className="text-lg text-slate-600">
            Everything is prepared. When you're ready, click below to begin.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-50 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Target className="w-6 h-6 text-violet-600" />
            </div>
            <p className="text-sm text-slate-500 mb-1">Total Questions</p>
            <p className="text-3xl font-bold text-slate-900">{examConfig.total_questions || 80}</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trophy className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm text-slate-500 mb-1">To Pass</p>
            <p className="text-3xl font-bold text-slate-900">
              {examConfig.pass_correct_required || 65}/{examConfig.total_questions || 80}
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-6 text-center col-span-2">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <p className="text-sm text-slate-500 mb-1">Time Limit</p>
            <p className="text-3xl font-bold text-slate-900">{examConfig?.time_limit_minutes || 100} minutes</p>
          </div>
        </div>

        <div className="bg-amber-50 rounded-xl p-6 mb-6 border border-amber-200">
          <p className="text-sm text-amber-900 mb-2">
            <strong>⚠️ Important:</strong> Using attempt {attemptsUsed} of {attemptsAllowed}
          </p>
          <p className="text-xs text-amber-800 font-medium">
            Once you begin, the {examConfig?.time_limit_minutes || 100}-minute timer will start and CANNOT be paused. 
            If you leave, the timer continues running. The exam will auto-submit when time expires.
          </p>
        </div>

        <Button
          onClick={handleBeginExam}
          disabled={startExamMutation.isPending}
          size="lg"
          className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-lg py-6"
        >
          {startExamMutation.isPending ? 'Starting...' : 'Begin Exam'}
        </Button>

        <p className="text-center text-xs text-slate-500 mt-4">
          By clicking "Begin Exam", you agree to complete the exam honestly and without external assistance.
        </p>
      </motion.div>
    </div>
  );
}
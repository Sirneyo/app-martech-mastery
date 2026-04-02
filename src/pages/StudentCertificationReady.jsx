import React, { useState } from 'react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Target, Trophy, AlertCircle } from 'lucide-react';
import ExamCameraGate from '@/components/ExamCameraGate';
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

  const [cameraCleared, setCameraCleared] = useState(false);

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
  const attemptsAllowed = examConfig.attempts_allowed || 4;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden bg-slate-800/80 rounded-3xl p-10 max-w-2xl w-full border border-slate-700 shadow-2xl backdrop-blur-sm"
      >
        {/* Top shimmer */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/10 via-transparent to-purple-900/10 pointer-events-none" />

        <div className="relative text-center mb-8">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 180 }}
            className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl shadow-emerald-900/40"
          >
            <CheckCircle className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">Your Exam is Ready</h1>
          <p className="text-slate-400">Everything is prepared. Complete the camera check and begin when ready.</p>
        </div>

        <div className="relative grid grid-cols-2 gap-4 mb-6">
          {[
            { icon: Target, label: 'Total Questions', value: examConfig.total_questions || 80, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
            { icon: Trophy, label: 'To Pass', value: `${examConfig.pass_correct_required || 65}/${examConfig.total_questions || 80}`, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className={`rounded-2xl border p-5 text-center ${bg}`}>
              <Icon className={`w-6 h-6 mx-auto mb-2 ${color}`} />
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
          <div className="col-span-2 rounded-2xl border bg-amber-500/10 border-amber-500/20 p-5 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-amber-400" />
            <p className="text-xs text-slate-500 mb-1">Time Limit</p>
            <p className="text-2xl font-bold text-amber-400">{examConfig?.time_limit_minutes || 100} minutes</p>
          </div>
        </div>

        <div className="relative bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 mb-6">
          <p className="text-amber-300 text-sm font-semibold mb-1">⚠️ Attempt {attemptsUsed} of {attemptsAllowed}</p>
          <p className="text-amber-500/80 text-xs">
            Once you begin, the {examConfig?.time_limit_minutes || 100}-minute timer starts and cannot be paused. The exam will auto-submit when time expires.
          </p>
        </div>

        <div className="relative">
          {!cameraCleared ? (
            <ExamCameraGate onPass={() => setCameraCleared(true)} />
          ) : (
            <>
              <Button
                onClick={handleBeginExam}
                disabled={startExamMutation.isPending}
                size="lg"
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-base py-6 rounded-xl shadow-lg shadow-violet-900/40 transition-all"
              >
                {startExamMutation.isPending ? 'Starting...' : 'Begin Exam'}
              </Button>
              <p className="text-center text-xs text-slate-500 mt-3">
                By clicking "Begin Exam", you agree to complete the exam honestly and without external assistance.
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
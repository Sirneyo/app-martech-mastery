import React, { useState } from 'react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
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
    <div
      className="min-h-screen flex items-center justify-center p-8"
      style={{ background: '#0a0a0f', backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(109,40,217,0.15) 0%, transparent 60%)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-2xl rounded-3xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)' }}
      >
        {/* Top shimmer */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.6), transparent)' }} />

        <div className="px-8 pt-10 pb-8">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 180 }}
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 12px 32px rgba(16,185,129,0.3)' }}
            >
              <CheckCircle className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2">Your Exam is Ready</h1>
            <p className="text-slate-400 text-sm">Complete camera verification below, then begin when you are ready.</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { icon: Target, label: 'Questions', value: examConfig.total_questions || 80, color: 'text-violet-400' },
              { icon: Trophy, label: 'To Pass', value: `${examConfig.pass_correct_required || 65}/${examConfig.total_questions || 80}`, color: 'text-emerald-400' },
              { icon: Clock, label: 'Time Limit', value: `${examConfig.time_limit_minutes || 100}m`, color: 'text-amber-400' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="rounded-2xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <Icon className={`w-5 h-5 mx-auto mb-1.5 ${color}`} />
                <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                <p className={`text-lg font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Warning */}
          <div className="rounded-2xl p-4 mb-6" style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)' }}>
            <p className="text-amber-300 text-xs font-semibold mb-1">Attempt {attemptsUsed} of {attemptsAllowed}</p>
            <p className="text-amber-500/80 text-xs">Once started, the {examConfig?.time_limit_minutes || 100}-minute timer cannot be paused. The exam auto-submits on expiry.</p>
          </div>

          {/* Camera gate or begin */}
          {!cameraCleared ? (
            <ExamCameraGate onPass={() => setCameraCleared(true)} />
          ) : (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <button
                onClick={handleBeginExam}
                disabled={startExamMutation.isPending}
                className="w-full py-4 rounded-xl text-base font-bold text-white transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 12px 32px rgba(109,40,217,0.4)' }}
              >
                {startExamMutation.isPending ? 'Starting…' : 'Begin Exam'}
              </button>
              <p className="text-center text-xs text-slate-600 mt-3">
                By clicking "Begin Exam", you agree to complete the exam honestly and without external assistance.
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
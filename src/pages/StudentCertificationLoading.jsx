import React, { useEffect, useState } from 'react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Shield, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export default function StudentCertificationLoading() {
  const urlParams = new URLSearchParams(window.location.search);
  const attemptId = urlParams.get('id');

  const [stage, setStage] = useState(0);
  const [error, setError] = useState(null);
  const [screenShareStatus, setScreenShareStatus] = useState('pending'); // pending | requesting | granted | denied
  const [screenStream, setScreenStream] = useState(null);

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

  const stages = [
    'Gathering your questions…',
    'Randomising your sections…',
    'Preparing exam environment…',
    'Securing your attempt…',
    'Almost there…',
  ];

  const requestScreenShare = async () => {
    setScreenShareStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always', displaySurface: 'monitor' },
        audio: false,
      });
      setScreenStream(stream);
      setScreenShareStatus('granted');
    } catch (err) {
      setScreenShareStatus('denied');
    }
  };

  const proceedToExam = async () => {
    try {
      setStage(1);
      const startedAt = new Date();
      const timeLimitMinutes = examConfig?.time_limit_minutes || 100;
      const expiresAt = new Date(startedAt.getTime() + timeLimitMinutes * 60000);

      await base44.entities.ExamAttempt.update(attemptId, {
        attempt_status: 'in_progress',
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      });

      setStage(2);
      window.location.href = createPageUrl(`StudentCertificationAttempt?id=${attemptId}`);
    } catch (err) {
      setError(err.message || 'Failed to start exam. Please try again.');
    }
  };

  useEffect(() => {
    if (!user?.id || !attempt?.id || !examConfig) return;

    if (attempt.student_user_id !== user.id) {
      setError('Access denied: This attempt belongs to another student.');
      return;
    }

    if (attempt.attempt_status === 'submitted') {
      window.location.href = createPageUrl(`StudentCertificationResults?id=${attemptId}`);
      return;
    }

    if (attempt.attempt_status === 'in_progress') {
      window.location.href = createPageUrl(`StudentCertificationAttempt?id=${attemptId}`);
      return;
    }

    // attempt_status === 'prepared' — show screen share request
  }, [user?.id, attempt?.id, attempt?.student_user_id, attempt?.attempt_status, examConfig]);

  // Once screen share is granted, auto-proceed
  useEffect(() => {
    if (screenShareStatus === 'granted') {
      proceedToExam();
    }
  }, [screenShareStatus]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background: '#0a0a0f' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900 rounded-2xl p-8 max-w-md border border-red-500/30 text-center"
        >
          <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Unable to Start Exam</h2>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <Button onClick={() => window.location.href = createPageUrl('StudentCertification')} className="w-full bg-violet-600 hover:bg-violet-700">
            Back to Certification
          </Button>
        </motion.div>
      </div>
    );
  }

  // Screen share prompt
  if (screenShareStatus === 'pending' || screenShareStatus === 'requesting' || screenShareStatus === 'denied') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0a0a0f', backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(109,40,217,0.15) 0%, transparent 60%)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-lg"
        >
          <div className="relative rounded-3xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.6), transparent)' }} />

            <div className="px-8 pt-10 pb-8">
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 180 }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 12px 32px rgba(109,40,217,0.4)' }}
                >
                  <Monitor className="w-8 h-8 text-white" />
                </motion.div>
                <p className="text-violet-400 text-xs font-bold tracking-widest uppercase mb-2">Exam Proctoring</p>
                <h1 className="text-2xl font-bold text-white mb-2">Screen Sharing & Camera Recording Required</h1>
                <p className="text-slate-400 text-sm leading-relaxed">
                  To maintain academic integrity, you must share your <strong className="text-slate-300">entire screen</strong> and allow camera recording for the full duration of this exam. When prompted, select <strong className="text-slate-300">&ldquo;Entire Screen&rdquo;</strong> — not a tab or window.
                </p>
              </div>

              {/* Exam summary */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { label: 'Questions', value: examConfig?.total_questions || 80 },
                  { label: 'To Pass', value: `${examConfig?.pass_correct_required || 65}/${examConfig?.total_questions || 80}` },
                  { label: 'Duration', value: `${examConfig?.time_limit_minutes || 100}m` },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl py-4 px-3 text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                    <p className="text-lg font-bold text-white">{value}</p>
                  </div>
                ))}
              </div>

              {/* Requirements */}
              <div className="rounded-2xl p-5 mb-6 space-y-2.5" style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)' }}>
                <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-3">By proceeding you agree to:</p>
                {[
                  'Share your entire screen for the full duration of the exam',
                  'Not switch to any other application, browser tab, or window',
                  'Complete the exam independently without external assistance',
                  'Allow your screen activity to be recorded and reviewed',
                ].map((rule, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 flex-shrink-0" />
                    <p className="text-sm text-slate-300">{rule}</p>
                  </div>
                ))}
              </div>

              {screenShareStatus === 'denied' && (
                <div className="rounded-xl p-4 mb-5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <p className="text-red-400 text-sm font-medium">Screen share was denied or cancelled. You must share your screen to proceed with the exam.</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => window.location.href = createPageUrl('StudentCertification')}
                  disabled={screenShareStatus === 'requesting'}
                  className="flex-1 py-3.5 rounded-xl text-sm font-semibold text-slate-400 transition-all hover:text-white disabled:opacity-30"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={requestScreenShare}
                  disabled={screenShareStatus === 'requesting'}
                  className="flex-1 py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 8px 24px rgba(109,40,217,0.35)' }}
                >
                  {screenShareStatus === 'requesting' ? 'Waiting for permission…' : screenShareStatus === 'denied' ? 'Try Again' : 'Share Screen & Begin'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Screen share granted — loading/starting exam
  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: '#0a0a0f', backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(109,40,217,0.12) 0%, transparent 60%)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-5"
      >
        <div className="relative w-20 h-20 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2.5, ease: 'linear', repeat: Infinity }}
            className="absolute inset-0 rounded-full"
            style={{ border: '2px solid transparent', borderTopColor: 'rgba(139,92,246,0.8)', borderRightColor: 'rgba(139,92,246,0.2)' }}
          />
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 0 32px rgba(109,40,217,0.5)' }}>
            <Shield className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-violet-400 text-xs font-bold tracking-widest uppercase mb-2">Secure Exam Environment</p>
          <motion.p key={stage} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-white text-xl font-semibold">
            {stages[stage]}
          </motion.p>
          <p className="text-slate-500 text-sm mt-1">Screen monitoring active</p>
        </div>
        <div className="flex items-center gap-2">
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(139,92,246,0.8)' }}
              animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.22 }} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
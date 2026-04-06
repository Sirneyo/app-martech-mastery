import React, { useEffect, useState } from 'react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Monitor, Shield } from 'lucide-react';

export default function StudentCertificationLoading() {
  const urlParams = new URLSearchParams(window.location.search);
  const attemptId = urlParams.get('id');

  const [stage, setStage] = useState(0);
  const [error, setError] = useState(null);
  const [screenShareStatus, setScreenShareStatus] = useState('pending');
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

  const requestScreenShare = async () => {
    setScreenShareStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always', displaySurface: 'monitor' },
        audio: false,
      });
      setScreenStream(stream);
      setScreenShareStatus('granted');
    } catch {
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
    if (attempt.student_user_id !== user.id) { setError('Access denied: This attempt belongs to another student.'); return; }
    if (attempt.attempt_status === 'submitted') { window.location.href = createPageUrl(`StudentCertificationResults?id=${attemptId}`); return; }
    if (attempt.attempt_status === 'in_progress') { window.location.href = createPageUrl(`StudentCertificationAttempt?id=${attemptId}`); return; }
  }, [user?.id, attempt?.id, attempt?.student_user_id, attempt?.attempt_status, examConfig]);

  useEffect(() => {
    if (screenShareStatus === 'granted') proceedToExam();
  }, [screenShareStatus]);

  const stageLabels = ['Preparing environment…', 'Activating session…', 'Redirecting…'];

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-8">
        <div className="bg-[#181c25] border border-[#2a2f3d] rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Unable to Start Exam</h2>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <button
            onClick={() => window.location.href = createPageUrl('StudentCertification')}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            Back to Certification
          </button>
        </div>
      </div>
    );
  }

  // Screen share prompt
  if (screenShareStatus === 'pending' || screenShareStatus === 'requesting' || screenShareStatus === 'denied') {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em] mb-3">Exam Proctoring</p>
            <h1 className="text-3xl font-bold text-white tracking-tight">Screen Sharing Required</h1>
            <p className="text-slate-400 text-sm mt-2">You must share your screen before the exam can begin</p>
          </div>

          <div className="bg-[#181c25] border border-[#2a2f3d] rounded-2xl overflow-hidden">
            {/* Stat row */}
            <div className="grid grid-cols-3 divide-x divide-[#2a2f3d] border-b border-[#2a2f3d]">
              {[
                { label: 'Questions', value: examConfig?.total_questions || 80 },
                { label: 'Pass Mark', value: `${examConfig?.pass_correct_required || 65} correct` },
                { label: 'Duration', value: `${examConfig?.time_limit_minutes || 100} min` },
              ].map(({ label, value }) => (
                <div key={label} className="px-4 py-5 text-center">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">{label}</p>
                  <p className="text-lg font-bold text-white">{value}</p>
                </div>
              ))}
            </div>

            <div className="p-7">
              <div className="mb-6">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-4">By proceeding you confirm</p>
                <div className="space-y-3">
                  {[
                    'You will share your entire screen for the full duration of the exam.',
                    'You will not switch to any other application, tab, or window.',
                    'You will complete the exam independently without assistance.',
                    'Your screen activity may be recorded and reviewed.',
                  ].map((rule, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 text-[11px] font-bold text-slate-600 w-5 flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                      <p className="text-sm text-slate-300 leading-relaxed">{rule}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-[#2a2f3d] mb-6" />

              {screenShareStatus === 'denied' && (
                <div className="flex items-start gap-3 bg-red-500/8 border border-red-500/20 rounded-xl p-4 mb-5">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-red-400 text-sm">Screen sharing was denied or cancelled. You must share your entire screen to proceed.</p>
                </div>
              )}

              <div className="bg-[#0f1117] border border-[#2a2f3d] rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Monitor className="w-4 h-4 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-300">When prompted by your browser</p>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Select <span className="text-white font-semibold">"Entire Screen"</span> — not a window or browser tab. This ensures full proctoring coverage.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => window.location.href = createPageUrl('StudentCertification')}
                  disabled={screenShareStatus === 'requesting'}
                  className="flex-1 py-3.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-colors border border-[#2a2f3d] bg-transparent hover:bg-[#2a2f3d] disabled:opacity-30"
                >
                  Cancel
                </button>
                <button
                  onClick={requestScreenShare}
                  disabled={screenShareStatus === 'requesting'}
                  className="flex-1 py-3.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50 bg-indigo-600 hover:bg-indigo-700"
                >
                  {screenShareStatus === 'requesting' ? 'Awaiting permission…' : screenShareStatus === 'denied' ? 'Try Again' : 'Share Screen & Begin'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-8">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center mx-auto mb-6">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em] mb-3">Secure Exam Environment</p>
        <p className="text-white text-xl font-semibold mb-1">{stageLabels[stage]}</p>
        <p className="text-slate-500 text-sm">Screen monitoring active — please do not close this tab</p>
      </div>
    </div>
  );
}
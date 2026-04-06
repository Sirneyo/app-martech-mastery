import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Lock, Trophy, CheckCircle, Award, AlertTriangle, FileText, ChevronRight, Shield } from 'lucide-react';
import CertificatePreviewModal from '@/components/CertificatePreviewModal';

export default function StudentCertification() {
  const [generatingCert, setGeneratingCert] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [now, setNow] = useState(new Date());

  const { data: user } = useQuery({ queryKey: ['current-user'], queryFn: () => base44.auth.me() });

  const { data: membership } = useQuery({
    queryKey: ['my-cohort-membership'],
    queryFn: async () => {
      if (!user?.id) return null;
      const memberships = await base44.entities.CohortMembership.filter({ user_id: user.id, status: 'active' });
      return memberships[0];
    },
    enabled: !!user?.id,
  });

  const { data: cohort } = useQuery({
    queryKey: ['my-cohort', membership?.cohort_id],
    queryFn: () => base44.entities.Cohort.filter({ id: membership.cohort_id }).then(r => r[0]),
    enabled: !!membership?.cohort_id,
  });

  const { data: examConfig } = useQuery({
    queryKey: ['exam-config'],
    queryFn: async () => { const configs = await base44.entities.ExamConfig.filter({ is_active: true }); return configs[0]; },
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ['my-exam-attempts', membership?.cohort_id],
    queryFn: async () => {
      if (!user?.id || !membership?.cohort_id) return [];
      return base44.entities.ExamAttempt.filter({ student_user_id: user.id, cohort_id: membership.cohort_id });
    },
    enabled: !!user?.id && !!membership?.cohort_id,
  });

  const activeAttempt = attempts.find(a => ['prepared', 'in_progress'].includes(a.attempt_status) && !a.submitted_at);

  const { data: certificate, refetch: refetchCertificate } = useQuery({
    queryKey: ['my-certificate', membership?.cohort_id],
    queryFn: async () => {
      if (!user?.id || !membership?.cohort_id) return null;
      const certs = await base44.entities.Certificate.filter({ student_user_id: user.id, cohort_id: membership.cohort_id });
      return certs[0];
    },
    enabled: !!user?.id && !!membership?.cohort_id,
    refetchInterval: (data) => (data && !data.certificate_url ? 2000 : false),
  });

  const generateCertMutation = useMutation({
    mutationFn: (certificateId) => base44.functions.invoke('generateCertificate', { certificate_id: certificateId }),
    onSuccess: () => refetchCertificate(),
  });

  useEffect(() => {
    if (certificate && !certificate.certificate_url && !generatingCert && !generateCertMutation.isPending) {
      setGeneratingCert(true);
      generateCertMutation.mutate(certificate.id);
    }
    if (certificate?.certificate_url) setGeneratingCert(false);
  }, [certificate?.id, certificate?.certificate_url]);

  const getCurrentWeek = () => {
    if (!cohort?.start_date) return 0;
    const diffDays = Math.floor((new Date() - new Date(cohort.start_date)) / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7) + 1;
  };

  const currentWeek = getCurrentWeek();
  const unlockWeek = examConfig?.unlock_week || 8;
  const isUnlocked = currentWeek >= unlockWeek;

  useEffect(() => {
    if (isUnlocked) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [isUnlocked]);

  const preparedAttempts = attempts.filter(a => a.prepared_at);
  const attemptsUsed = preparedAttempts.length;
  const attemptsAllowed = examConfig?.attempts_allowed || 4;
  const hasPassed = attempts.some(a => a.pass_flag);
  const isTesterAccount = user?.email === 'nixelainc@gmail.com';

  const [cooldownStatus, setCooldownStatus] = useState(null);
  const [timeUntilEligible, setTimeUntilEligible] = useState(null);

  useEffect(() => {
    if (!examConfig || hasPassed || activeAttempt || isTesterAccount) { setCooldownStatus(null); return; }
    const nextAttemptNumber = attemptsUsed + 1;
    if (nextAttemptNumber === 2) { setCooldownStatus(null); return; }
    if (nextAttemptNumber === 3) {
      const attempt2 = attempts.find(a => a.attempt_number === 2);
      if (!attempt2?.submitted_at) { setCooldownStatus({ blocked: true, message: 'You must complete your previous attempts before starting the next one.' }); return; }
      const eligibleAt = new Date(new Date(attempt2.submitted_at).getTime() + (examConfig.cooldown_after_attempt_2_hours || 24) * 3600000);
      if (new Date() < eligibleAt) { setCooldownStatus({ blocked: true, eligibleAt, message: `Your next attempt will be available on ${eligibleAt.toLocaleString()}.` }); setTimeUntilEligible(eligibleAt - new Date()); }
      else setCooldownStatus(null);
      return;
    }
    if (nextAttemptNumber === 4) {
      const attempt3 = attempts.find(a => a.attempt_number === 3);
      if (!attempt3?.submitted_at) { setCooldownStatus({ blocked: true, message: 'You must complete your previous attempts before starting the next one.' }); return; }
      if (attempt3.pass_flag) { setCooldownStatus({ blocked: true, message: 'Attempt 3 was passed. No further attempts allowed.' }); return; }
      const eligibleAt = new Date(new Date(attempt3.submitted_at).getTime() + (examConfig.cooldown_after_attempt_3_fail_hours || 48) * 3600000);
      if (new Date() < eligibleAt) { setCooldownStatus({ blocked: true, eligibleAt, message: `Your next attempt will be available on ${eligibleAt.toLocaleString()}.` }); setTimeUntilEligible(eligibleAt - new Date()); }
      else setCooldownStatus(null);
      return;
    }
    setCooldownStatus(null);
  }, [attempts, examConfig, hasPassed, activeAttempt, attemptsUsed]);

  useEffect(() => {
    if (!cooldownStatus?.eligibleAt) return;
    const interval = setInterval(() => {
      const remaining = cooldownStatus.eligibleAt - new Date();
      if (remaining <= 0) { setCooldownStatus(null); setTimeUntilEligible(null); }
      else setTimeUntilEligible(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownStatus?.eligibleAt]);

  const formatTimeRemaining = (ms) => {
    if (!ms || ms <= 0) return '';
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  const canStartAttempt = isUnlocked && !hasPassed && (isTesterAccount || attemptsUsed < attemptsAllowed) && !activeAttempt && (isTesterAccount || !cooldownStatus?.blocked);

  const handleStartExam = () => {
    if (activeAttempt) {
      window.location.href = activeAttempt.attempt_status === 'prepared'
        ? createPageUrl(`StudentCertificationLoading?id=${activeAttempt.id}`)
        : createPageUrl(`StudentCertificationAttempt?id=${activeAttempt.id}`);
    } else {
      window.location.href = createPageUrl('StudentCertificationConfirm');
    }
  };

  // --- LOCKED STATE ---
  if (!isUnlocked) {
    const unlockDate = cohort?.start_date ? (() => { const d = new Date(cohort.start_date); d.setDate(d.getDate() + (unlockWeek - 1) * 7); return d; })() : null;
    const msLeft = unlockDate ? Math.max(0, unlockDate - now) : 0;
    const daysLeft = Math.floor(msLeft / 86400000);
    const hoursLeft = Math.floor((msLeft % 86400000) / 3600000);
    const minsLeft = Math.floor((msLeft % 3600000) / 60000);
    const secsLeft = Math.floor((msLeft % 60000) / 1000);

    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em] mb-3">MarTech Mastery</p>
            <h1 className="text-3xl font-bold text-white tracking-tight">Certification Exam</h1>
            <p className="text-slate-400 text-sm mt-2">Unlocks at Week {unlockWeek} of your cohort</p>
          </div>
          <div className="bg-[#181c25] border border-[#2a2f3d] rounded-2xl overflow-hidden">
            <div className="p-7 flex justify-center">
              <div className="w-12 h-12 bg-[#0f1117] border border-[#2a2f3d] rounded-xl flex items-center justify-center">
                <Lock className="w-6 h-6 text-slate-500" />
              </div>
            </div>
            <div className="border-t border-[#2a2f3d] px-7 py-6">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-4 text-center">Time until unlock</p>
              <div className="grid grid-cols-4 gap-3 max-w-sm mx-auto mb-6">
                {[{ val: daysLeft, label: 'Days' }, { val: hoursLeft, label: 'Hours' }, { val: minsLeft, label: 'Mins' }, { val: secsLeft, label: 'Secs' }].map(({ val, label }) => (
                  <div key={label} className="bg-[#0f1117] border border-[#2a2f3d] rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-white font-mono">{String(val).padStart(2, '0')}</p>
                    <p className="text-xs text-slate-500 mt-1">{label}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-500 text-center">Keep completing your assignments to prepare!</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- PASSED STATE ---
  if (hasPassed) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em] mb-3">MarTech Mastery</p>
            <h1 className="text-3xl font-bold text-white tracking-tight">Certification Exam</h1>
          </div>
          <div className="bg-[#181c25] border border-[#2a2f3d] rounded-2xl overflow-hidden">
            {/* Pass header */}
            <div className="px-7 py-6 border-b border-[#2a2f3d] bg-emerald-500/6 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-widest mb-1">Certified</p>
                <h2 className="text-lg font-bold text-white">You have passed!</h2>
              </div>
            </div>

            <div className="p-7">
              {certificate && (
                <div className="mb-5 p-5 bg-[#0f1117] border border-[#2a2f3d] rounded-xl">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Certificate ID</p>
                  <p className="text-lg font-mono font-bold text-white mb-4">{certificate.certificate_id_code}</p>
                  <button
                    onClick={() => setShowPreview(true)}
                    disabled={!certificate.certificate_url || generatingCert}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-40"
                  >
                    <FileText className="w-4 h-4" />
                    {certificate.certificate_url ? 'View Certificate' : 'Generating…'}
                  </button>
                  <CertificatePreviewModal
                    isOpen={showPreview}
                    onClose={() => setShowPreview(false)}
                    certificateUrl={certificate.certificate_url}
                    certificateId={certificate.certificate_id_code}
                  />
                </div>
              )}

              <div className="p-5 bg-emerald-500/6 border border-emerald-500/20 rounded-xl">
                <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-widest mb-3">Automatically Applied</p>
                <div className="space-y-2 text-sm text-slate-300">
                  <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" /><span>Certificate generated and issued</span></div>
                  <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" /><span>Portfolio item approved</span></div>
                  <div className="flex items-center gap-2"><Award className="w-4 h-4 text-emerald-400 flex-shrink-0" /><span>100 points awarded</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN STATE ---
  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em] mb-3">MarTech Mastery</p>
          <h1 className="text-3xl font-bold text-white tracking-tight">Certification Exam</h1>
          <p className="text-slate-400 text-sm mt-2">{examConfig?.description || 'Complete the exam to earn your certification'}</p>
        </div>

        <div className="bg-[#181c25] border border-[#2a2f3d] rounded-2xl overflow-hidden">
          {/* Stat row */}
          <div className="grid grid-cols-3 divide-x divide-[#2a2f3d] border-b border-[#2a2f3d]">
            {[
              { label: 'Attempts Used', value: `${attemptsUsed} / ${attemptsAllowed}` },
              { label: 'Pass Mark', value: `${examConfig?.pass_correct_required || 65} / ${examConfig?.total_questions || 80}` },
              { label: 'Duration', value: `${examConfig?.time_limit_minutes || 100} min` },
            ].map(({ label, value }) => (
              <div key={label} className="px-5 py-5 text-center">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">{label}</p>
                <p className="text-xl font-bold text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="p-7">
            {/* Previous attempts */}
            {preparedAttempts.filter(a => a.submitted_at).length > 0 && (
              <div className="mb-6">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Previous Attempts</p>
                <div className="space-y-2">
                  {preparedAttempts.filter(a => a.submitted_at).map((attempt, idx) => (
                    <Link
                      key={attempt.id}
                      to={createPageUrl(`StudentCertificationResults?id=${attempt.id}`)}
                      className="flex items-center justify-between bg-[#0f1117] hover:bg-[#0a0d14] border border-[#2a2f3d] hover:border-slate-500 rounded-xl px-5 py-3 transition-colors group"
                    >
                      <div>
                        <p className="font-semibold text-slate-200 text-sm">Attempt {idx + 1}</p>
                        <p className="text-xs text-slate-500">{new Date(attempt.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold font-mono ${attempt.pass_flag ? 'text-emerald-400' : 'text-red-400'}`}>{attempt.score_percent}%</span>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${attempt.pass_flag ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                          {attempt.pass_flag ? 'Passed' : 'Failed'}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="border-t border-[#2a2f3d] mt-6" />
              </div>
            )}

            {/* Cooldown warning */}
            {cooldownStatus?.blocked && (
              <div className="flex items-start gap-3 bg-amber-500/8 border border-amber-500/20 rounded-xl p-4 mb-6">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-amber-300 font-semibold text-sm">{cooldownStatus.message}</p>
                  {timeUntilEligible && (
                    <p className="text-amber-500 text-xs mt-1">Time remaining: <span className="font-mono font-bold">{formatTimeRemaining(timeUntilEligible)}</span></p>
                  )}
                </div>
              </div>
            )}

            {/* Active attempt notice */}
            {activeAttempt && (
              <div className="flex items-start gap-3 bg-indigo-500/8 border border-indigo-500/20 rounded-xl p-4 mb-5">
                <Shield className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                <p className="text-indigo-300 text-sm font-medium">You have an active attempt in progress.</p>
              </div>
            )}

            {/* CTA */}
            {(activeAttempt || canStartAttempt) && (
              <button
                onClick={handleStartExam}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-colors bg-indigo-600 hover:bg-indigo-700"
              >
                {activeAttempt
                  ? (activeAttempt.attempt_status === 'prepared' ? 'Continue to Exam' : 'Resume Exam')
                  : 'Begin Certification Exam'}
              </button>
            )}

            {!canStartAttempt && !hasPassed && !activeAttempt && !cooldownStatus?.blocked && attemptsUsed >= attemptsAllowed && (
              <p className="text-center text-red-400 font-semibold text-sm py-2">No attempts remaining.</p>
            )}

            {(activeAttempt || canStartAttempt) && (
              <p className="text-xs text-slate-600 text-center mt-3">
                {examConfig?.time_limit_minutes || 100} minutes · Timer cannot be paused · Camera required
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
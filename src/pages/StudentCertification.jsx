import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Trophy, CheckCircle, Clock, Award, AlertTriangle, FileText, Target, ChevronRight, Sparkles, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CertificatePreviewModal from '@/components/CertificatePreviewModal';

export default function StudentCertification() {
  const queryClient = useQueryClient();
  const [generatingCert, setGeneratingCert] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);
  
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: membership } = useQuery({
    queryKey: ['my-cohort-membership'],
    queryFn: async () => {
      if (!user?.id) return null;
      const memberships = await base44.entities.CohortMembership.filter({ 
        user_id: user.id, 
        status: 'active' 
      });
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
    queryFn: async () => {
      const configs = await base44.entities.ExamConfig.filter({ is_active: true });
      return configs[0];
    },
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ['my-exam-attempts', membership?.cohort_id],
    queryFn: async () => {
      if (!user?.id || !membership?.cohort_id) return [];
      return base44.entities.ExamAttempt.filter({
        student_user_id: user.id,
        cohort_id: membership.cohort_id
      });
    },
    enabled: !!user?.id && !!membership?.cohort_id,
  });

  // Check for existing active attempt
  const activeAttempt = attempts.find(a => 
    ['prepared', 'in_progress'].includes(a.attempt_status) && !a.submitted_at
  );

  const { data: certificate, refetch: refetchCertificate } = useQuery({
    queryKey: ['my-certificate', membership?.cohort_id],
    queryFn: async () => {
      if (!user?.id || !membership?.cohort_id) return null;
      const certs = await base44.entities.Certificate.filter({
        student_user_id: user.id,
        cohort_id: membership.cohort_id
      });
      return certs[0];
    },
    enabled: !!user?.id && !!membership?.cohort_id,
    refetchInterval: (data) => {
      // Keep refetching every 2 seconds if certificate exists but has no URL
      if (data && !data.certificate_url) {
        return 2000;
      }
      return false;
    },
  });

  const generateCertMutation = useMutation({
    mutationFn: async (certificateId) => {
      return await base44.functions.invoke('generateCertificate', {
        certificate_id: certificateId
      });
    },
    onSuccess: () => {
      refetchCertificate();
    },
  });

  React.useEffect(() => {
    if (certificate && !certificate.certificate_url && !generatingCert && !generateCertMutation.isPending) {
      setGeneratingCert(true);
      generateCertMutation.mutate(certificate.id);
    }
    if (certificate?.certificate_url) {
      setGeneratingCert(false);
    }
  }, [certificate?.id, certificate?.certificate_url]);

  const getCurrentWeek = () => {
    if (!cohort?.start_date) return 0;
    const startDate = new Date(cohort.start_date);
    const today = new Date();
    const diffTime = today - startDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7) + 1;
  };

  const currentWeek = getCurrentWeek();
  const unlockWeek = examConfig?.unlock_week || 8;
  const isUnlocked = currentWeek >= unlockWeek;

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    if (isUnlocked) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [isUnlocked]);
  
  const preparedAttempts = attempts.filter(a => a.prepared_at);
  const attemptsUsed = preparedAttempts.length;
  const attemptsAllowed = examConfig?.attempts_allowed || 4;
  const hasPassed = attempts.some(a => a.pass_flag);
  
  // Calculate cooldown eligibility
  const [cooldownStatus, setCooldownStatus] = useState(null);
  const [timeUntilEligible, setTimeUntilEligible] = useState(null);

  useEffect(() => {
    if (!examConfig || hasPassed || activeAttempt || isTesterAccount) {
      setCooldownStatus(null);
      return;
    }

    const nextAttemptNumber = attemptsUsed + 1;

    // Attempt 2: no cooldown
    if (nextAttemptNumber === 2) {
      setCooldownStatus(null);
      return;
    }

    // Attempt 3: requires 24 hours after attempt 2
    if (nextAttemptNumber === 3) {
      const attempt2 = attempts.find(a => a.attempt_number === 2);
      if (!attempt2 || !attempt2.submitted_at) {
        setCooldownStatus({
          blocked: true,
          message: 'You must complete your previous attempts before starting the next one.'
        });
        return;
      }

      const submittedAt = new Date(attempt2.submitted_at);
      const cooldownHours = examConfig.cooldown_after_attempt_2_hours || 24;
      const eligibleAt = new Date(submittedAt.getTime() + cooldownHours * 60 * 60 * 1000);
      const now = new Date();

      if (now < eligibleAt) {
        setCooldownStatus({
          blocked: true,
          eligibleAt: eligibleAt,
          message: `Your next attempt will be available on ${eligibleAt.toLocaleString()}.`
        });
        setTimeUntilEligible(eligibleAt.getTime() - now.getTime());
      } else {
        setCooldownStatus(null);
      }
      return;
    }

    // Attempt 4: requires 48 hours after attempt 3 AND attempt 3 must have failed
    if (nextAttemptNumber === 4) {
      const attempt3 = attempts.find(a => a.attempt_number === 3);
      if (!attempt3 || !attempt3.submitted_at) {
        setCooldownStatus({
          blocked: true,
          message: 'You must complete your previous attempts before starting the next one.'
        });
        return;
      }

      if (attempt3.pass_flag === true) {
        setCooldownStatus({
          blocked: true,
          message: 'Attempt 3 was passed. No further attempts allowed.'
        });
        return;
      }

      const submittedAt = new Date(attempt3.submitted_at);
      const cooldownHours = examConfig.cooldown_after_attempt_3_fail_hours || 48;
      const eligibleAt = new Date(submittedAt.getTime() + cooldownHours * 60 * 60 * 1000);
      const now = new Date();

      if (now < eligibleAt) {
        setCooldownStatus({
          blocked: true,
          eligibleAt: eligibleAt,
          message: `Your next attempt will be available on ${eligibleAt.toLocaleString()}.`
        });
        setTimeUntilEligible(eligibleAt.getTime() - now.getTime());
      } else {
        setCooldownStatus(null);
      }
      return;
    }

    setCooldownStatus(null);
  }, [attempts, examConfig, hasPassed, activeAttempt, attemptsUsed]);

  // Update countdown timer
  useEffect(() => {
    if (!cooldownStatus?.eligibleAt) return;

    const interval = setInterval(() => {
      const now = new Date();
      const remaining = cooldownStatus.eligibleAt.getTime() - now.getTime();
      
      if (remaining <= 0) {
        setCooldownStatus(null);
        setTimeUntilEligible(null);
      } else {
        setTimeUntilEligible(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownStatus?.eligibleAt]);

  const formatTimeRemaining = (ms) => {
    if (!ms || ms <= 0) return '';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Tester bypass: nixelainc@gmail.com gets unlimited attempts and no cooldowns
  const isTesterAccount = user?.email === 'nixelainc@gmail.com';

  const canStartAttempt = isUnlocked && !hasPassed && (isTesterAccount || attemptsUsed < attemptsAllowed) && !activeAttempt && (isTesterAccount || !cooldownStatus?.blocked);

  const [launching, setLaunching] = useState(false);

  const handleStartExam = () => {
    setLaunching(true);
    setTimeout(() => {
      if (activeAttempt) {
        if (activeAttempt.attempt_status === 'prepared') {
          window.location.href = createPageUrl(`StudentCertificationReady?id=${activeAttempt.id}`);
        } else {
          window.location.href = createPageUrl(`StudentCertificationAttempt?id=${activeAttempt.id}`);
        }
      } else {
        window.location.href = createPageUrl('StudentCertificationConfirm');
      }
    }, 1800);
  };

  if (launching) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex flex-col items-center gap-6"
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 2, ease: 'linear', repeat: Infinity }}
            className="w-20 h-20 rounded-full border-2 border-violet-500/30 border-t-violet-400 flex items-center justify-center"
          />
          <div className="absolute w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center shadow-2xl shadow-violet-900/60">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div className="text-center mt-8">
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-violet-400 text-xs font-bold tracking-widest uppercase mb-2"
            >
              Preparing Secure Environment
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-white text-xl font-semibold"
            >
              {examConfig?.title || 'MarTech Mastery Certification'}
            </motion.p>
          </div>
          <div className="flex items-center gap-2 mt-2">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-violet-500"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  if (!isUnlocked) {
    const unlockDate = cohort?.start_date ? (() => {
      const d = new Date(cohort.start_date);
      d.setDate(d.getDate() + (unlockWeek - 1) * 7);
      return d;
    })() : null;
    const msLeft = unlockDate ? Math.max(0, unlockDate - now) : 0;
    const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
    const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minsLeft = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
    const secsLeft = Math.floor((msLeft % (1000 * 60)) / 1000);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-8 py-10 text-center text-white">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold mb-1">MarTech Mastery Certification</h1>
              <p className="text-white/80 text-sm">Unlocks at Week {unlockWeek} of your cohort</p>
            </div>
            <div className="px-8 py-8 text-center">
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-5">Time until unlock</p>
              <div className="grid grid-cols-4 gap-3 max-w-sm mx-auto mb-6">
                {[{ val: daysLeft, label: 'Days' }, { val: hoursLeft, label: 'Hours' }, { val: minsLeft, label: 'Mins' }, { val: secsLeft, label: 'Secs' }].map(({ val, label }) => (
                  <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <p className="text-2xl font-bold text-slate-900 font-mono">{String(val).padStart(2, '0')}</p>
                    <p className="text-xs text-slate-500 mt-1">{label}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-500">Keep completing your assignments to prepare!</p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (hasPassed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 flex items-center justify-center">
        <div className="max-w-3xl w-full mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-12 text-center border border-slate-700 shadow-2xl"
          >
            {/* Gold shimmer */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-violet-500/5 pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
            
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-28 h-28 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-amber-900/40"
            >
              <Trophy className="w-14 h-14 text-white" />
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="text-4xl font-bold text-white mb-3"
            >
              Congratulations!
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="text-lg text-slate-300 mb-8"
            >
              You have passed the MarTech Mastery Certification
            </motion.p>

            {certificate && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="bg-slate-900/60 border border-slate-700 rounded-2xl p-6 mb-8 backdrop-blur-sm"
              >
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Certificate ID</p>
                <p className="text-xl font-mono font-bold text-amber-400 mb-4">
                  {certificate.certificate_id_code}
                </p>
                <Button
                  onClick={() => setShowPreview(true)}
                  disabled={!certificate.certificate_url || generatingCert}
                  size="lg"
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-bold text-base py-6 disabled:opacity-50"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  {certificate.certificate_url ? 'View Certificate' : 'Generating Certificate...'}
                </Button>
                {certificate && (
                  <CertificatePreviewModal
                    isOpen={showPreview}
                    onClose={() => setShowPreview(false)}
                    certificateUrl={certificate.certificate_url}
                    certificateId={certificate.certificate_id_code}
                  />
                )}
              </motion.div>
            )}

            <div className="flex items-center justify-center gap-8 text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span className="text-sm">Exam Passed</span>
              </div>
              <div className="w-px h-4 bg-slate-700" />
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-violet-400" />
                <span className="text-sm">Portfolio Approved</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden bg-slate-800/80 rounded-3xl border border-slate-700 shadow-2xl backdrop-blur-sm"
        >
          {/* Decorative top shimmer */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/10 via-transparent to-purple-900/10 pointer-events-none" />

          {/* Header */}
          <div className="relative px-8 pt-10 pb-8 border-b border-slate-700/60">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-900/40 flex-shrink-0">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-violet-400 text-xs font-bold tracking-widest uppercase">Certification Exam</p>
                <h1 className="text-2xl font-bold text-white mt-0.5">
                  {examConfig?.title || 'MarTech Mastery Certification'}
                </h1>
              </div>
            </div>
            {examConfig?.description && (
              <p className="text-slate-400 text-sm leading-relaxed">{examConfig.description}</p>
            )}
          </div>

          {/* Stats */}
          <div className="relative px-8 py-6 grid grid-cols-3 gap-4 border-b border-slate-700/60">
            {[
              { label: 'Attempts Used', value: `${attemptsUsed} / ${attemptsAllowed}`, icon: Shield, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
              { label: 'Required to Pass', value: `${examConfig?.pass_correct_required || 65} / ${examConfig?.total_questions || 80}`, icon: Target, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
              { label: 'Time Limit', value: `${examConfig?.time_limit_minutes || 100} min`, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className={`rounded-2xl border p-4 text-center ${bg}`}>
                <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
                <p className="text-xs text-slate-500 mb-1">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Attempt history */}
          {preparedAttempts.filter(a => a.submitted_at).length > 0 && (
            <div className="relative px-8 py-6 border-b border-slate-700/60">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Previous Attempts</h3>
              <div className="space-y-2">
                {preparedAttempts.filter(a => a.submitted_at).map((attempt, idx) => (
                  <Link
                    key={attempt.id}
                    to={createPageUrl(`StudentCertificationResults?id=${attempt.id}`)}
                    className="flex items-center justify-between bg-slate-900/60 hover:bg-slate-900 border border-slate-700/50 hover:border-slate-600 rounded-xl px-5 py-3.5 transition-all group"
                  >
                    <div>
                      <p className="font-semibold text-slate-200 text-sm">Attempt {idx + 1}</p>
                      <p className="text-xs text-slate-500">{new Date(attempt.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold font-mono ${attempt.pass_flag ? 'text-emerald-400' : 'text-red-400'}`}>
                        {attempt.score_percent}%
                      </span>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        attempt.pass_flag 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-red-500/10 text-red-400 border-red-500/30'
                      }`}>
                        {attempt.pass_flag ? 'Passed' : 'Failed'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Cooldown warning */}
          {cooldownStatus?.blocked && (
            <div className="relative px-8 py-5 border-b border-slate-700/60">
              <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5">
                <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-amber-300 font-semibold text-sm mb-1">{cooldownStatus.message}</p>
                  {timeUntilEligible && (
                    <p className="text-amber-500 text-xs">
                      Time remaining: <span className="font-mono font-bold">{formatTimeRemaining(timeUntilEligible)}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="relative px-8 py-8">
            {activeAttempt && (
              <div className="text-center">
                <p className="text-slate-400 text-sm mb-4">You have an active attempt in progress</p>
                <Button
                  onClick={handleStartExam}
                  size="lg"
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-base py-6 rounded-xl shadow-lg shadow-violet-900/40 transition-all"
                >
                  <Trophy className="w-5 h-5 mr-2" />
                  {activeAttempt.attempt_status === 'prepared' ? 'Continue to Ready Screen' : 'Resume Exam'}
                </Button>
              </div>
            )}

            {canStartAttempt && !activeAttempt && !cooldownStatus?.blocked && (
              <div className="text-center">
                <Button
                  onClick={handleStartExam}
                  size="lg"
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-base py-6 rounded-xl shadow-lg shadow-violet-900/40 transition-all"
                >
                  <Trophy className="w-5 h-5 mr-2" />
                  Begin Certification Exam
                </Button>
                <p className="text-xs text-slate-500 mt-3">
                  Duration: {examConfig?.time_limit_minutes || 100} minutes · Timer cannot be paused · Camera required
                </p>
              </div>
            )}

            {!canStartAttempt && !hasPassed && !activeAttempt && !cooldownStatus?.blocked && attemptsUsed >= attemptsAllowed && (
              <div className="text-center py-4">
                <p className="text-red-400 font-semibold text-sm">No attempts remaining</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
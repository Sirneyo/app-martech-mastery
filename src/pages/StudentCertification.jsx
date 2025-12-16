import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Trophy, CheckCircle, Clock, Award, AlertTriangle, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
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
  
  const preparedAttempts = attempts.filter(a => a.prepared_at);
  const attemptsUsed = preparedAttempts.length;
  const attemptsAllowed = examConfig?.attempts_allowed || 4;
  const hasPassed = attempts.some(a => a.pass_flag);
  
  // Calculate cooldown eligibility
  const [cooldownStatus, setCooldownStatus] = useState(null);
  const [timeUntilEligible, setTimeUntilEligible] = useState(null);

  useEffect(() => {
    if (!examConfig || hasPassed || activeAttempt) {
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

  const canStartAttempt = isUnlocked && !hasPassed && attemptsUsed < attemptsAllowed && !activeAttempt && !cooldownStatus?.blocked;

  const handleStartExam = () => {
    if (activeAttempt) {
      // Resume existing attempt
      if (activeAttempt.attempt_status === 'prepared') {
        window.location.href = createPageUrl(`StudentCertificationReady?id=${activeAttempt.id}`);
      } else {
        window.location.href = createPageUrl(`StudentCertificationAttempt?id=${activeAttempt.id}`);
      }
    } else {
      // Start new attempt
      window.location.href = createPageUrl('StudentCertificationConfirm');
    }
  };

  if (!isUnlocked) {
    const weeksRemaining = unlockWeek - currentWeek;
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-3xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-12 text-center shadow-lg border border-slate-200"
          >
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-slate-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">
              MarTech Mastery Certification
            </h1>
            <p className="text-lg text-slate-600 mb-6">
              Exam unlocks in week {unlockWeek}
            </p>
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-slate-100 rounded-lg">
              <Clock className="w-5 h-5 text-slate-600" />
              <span className="font-semibold text-slate-900">
                {weeksRemaining} {weeksRemaining === 1 ? 'week' : 'weeks'} remaining
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (hasPassed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-8">
        <div className="max-w-3xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-12 text-center shadow-xl border border-green-200"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-4">
              Congratulations!
            </h1>
            <p className="text-xl text-slate-600 mb-8">
              You have passed the MarTech Mastery Certification
            </p>
            {certificate && (
              <div className="bg-slate-50 rounded-xl p-6 mb-6">
                <p className="text-sm text-slate-500 mb-2">Certificate ID</p>
                <p className="text-2xl font-mono font-bold text-slate-900 mb-4">
                  {certificate.certificate_id_code}
                </p>
                <Button
                  onClick={() => setShowPreview(true)}
                  disabled={!certificate.certificate_url || generatingCert}
                  size="lg"
                  className="w-full bg-violet-600 hover:bg-violet-700 text-lg py-6 disabled:opacity-50"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  {certificate.certificate_url ? 'View Credential' : 'Generating Certificate...'}
                </Button>
                {certificate && (
                  <CertificatePreviewModal
                    isOpen={showPreview}
                    onClose={() => setShowPreview(false)}
                    certificateUrl={certificate.certificate_url}
                    certificateId={certificate.certificate_id_code}
                  />
                )}
              </div>
            )}
            <div className="flex items-center justify-center gap-6 text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Exam Passed</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-violet-500" />
                <span>Portfolio Approved</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-3xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              MarTech Mastery Certification
            </h1>
            <p className="text-slate-600">
              {examConfig?.description || 'Complete the certification exam to earn your certificate'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-50 rounded-xl p-6 text-center">
              <p className="text-sm text-slate-500 mb-2">Attempts Used</p>
              <p className="text-3xl font-bold text-slate-900">
                {attemptsUsed} / {attemptsAllowed}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-6 text-center">
              <p className="text-sm text-slate-500 mb-2">Required to Pass</p>
              <p className="text-3xl font-bold text-slate-900">
                {examConfig?.pass_correct_required || 65} / {examConfig?.total_questions || 80}
              </p>
            </div>
            {examConfig?.time_limit_minutes && (
              <div className="bg-slate-50 rounded-xl p-6 text-center">
                <p className="text-sm text-slate-500 mb-2">Time Limit</p>
                <p className="text-3xl font-bold text-slate-900">
                  {examConfig.time_limit_minutes} min
                </p>
              </div>
            )}
          </div>

          {preparedAttempts.filter(a => a.submitted_at).length > 0 && (
            <div className="mb-8">
              <h3 className="font-bold text-slate-900 mb-4">Previous Attempts</h3>
              <div className="space-y-3">
                {preparedAttempts.filter(a => a.submitted_at).map((attempt, idx) => (
                  <Link
                    key={attempt.id}
                    to={createPageUrl(`StudentCertificationResults?id=${attempt.id}`)}
                    className="block bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">
                          Attempt {idx + 1}
                        </p>
                        <p className="text-sm text-slate-500">
                          {new Date(attempt.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={attempt.pass_flag ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {attempt.score_percent}%
                        </Badge>
                        <Badge variant={attempt.pass_flag ? 'default' : 'secondary'}>
                          {attempt.pass_flag ? 'Passed' : 'Failed'}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {cooldownStatus?.blocked && (
            <Alert className="mb-6 border-amber-200 bg-amber-50">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <p className="font-semibold mb-2">{cooldownStatus.message}</p>
                {timeUntilEligible && (
                  <p className="text-sm">
                    Time remaining: <span className="font-mono font-bold">{formatTimeRemaining(timeUntilEligible)}</span>
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {activeAttempt && (
            <div className="text-center p-6 bg-violet-50 rounded-xl border border-violet-200">
              <p className="text-violet-700 font-medium mb-4">
                You have an active attempt in progress
              </p>
              <Button 
                onClick={handleStartExam}
                size="lg"
                className="bg-violet-600 hover:bg-violet-700"
              >
                {activeAttempt.attempt_status === 'prepared' ? 'Continue to Ready Screen' : 'Resume Exam'}
              </Button>
            </div>
          )}

          {canStartAttempt && !activeAttempt && !cooldownStatus?.blocked && (
            <div className="text-center">
              <Button 
                onClick={handleStartExam}
                size="lg"
                className="bg-violet-600 hover:bg-violet-700 text-lg px-8 py-6"
              >
                <Trophy className="w-5 h-5 mr-2" />
                Start Exam
              </Button>
              <p className="text-sm text-slate-500 mt-4">
                Duration: {examConfig?.time_limit_minutes || 100} minutes • Timer cannot be paused
              </p>
            </div>
          )}

          {!canStartAttempt && !hasPassed && !activeAttempt && !cooldownStatus?.blocked && attemptsUsed >= attemptsAllowed && (
            <div className="text-center p-6 bg-red-50 rounded-xl">
              <p className="text-red-700 font-medium">
                No attempts remaining
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
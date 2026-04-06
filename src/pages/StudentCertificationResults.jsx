import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Trophy, XCircle, Download, ArrowLeft } from 'lucide-react';
import CertificatePreviewModal from '@/components/CertificatePreviewModal';

export default function StudentCertificationResults() {
  const [showPreview, setShowPreview] = React.useState(false);
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

  const { data: certificate } = useQuery({
    queryKey: ['my-certificate', attempt?.cohort_id],
    queryFn: async () => {
      if (!attempt) return null;
      const certs = await base44.entities.Certificate.filter({
        student_user_id: attempt.student_user_id,
        cohort_id: attempt.cohort_id
      });
      const cert = certs[0];
      
      // Generate PDF if certificate exists but has no URL
      if (cert && !cert.certificate_url) {
        await base44.functions.invoke('generateCertificate', {
          certificate_id: cert.id
        });
        // Fetch updated certificate
        const updatedCerts = await base44.entities.Certificate.filter({ id: cert.id });
        return updatedCerts[0];
      }
      
      return cert;
    },
    enabled: !!attempt,
  });

  if (!attempt || !examConfig) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <p className="text-slate-500 text-sm">Loading results…</p>
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
    <div className="min-h-screen bg-[#0f1117] py-10 px-6">
      <div className="max-w-2xl mx-auto">
        <Link to={createPageUrl('StudentCertification')} className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm font-medium transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Certification
        </Link>

        <div className="bg-[#181c25] border border-[#2a2f3d] rounded-2xl overflow-hidden">
          {/* Result header */}
          <div className={`px-8 py-6 border-b border-[#2a2f3d] flex items-center gap-5 ${passed ? 'bg-emerald-500/6' : 'bg-red-500/6'}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${passed ? 'bg-emerald-600' : 'bg-red-600'}`}>
              {passed ? <Trophy className="w-6 h-6 text-white" /> : <XCircle className="w-6 h-6 text-white" />}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: passed ? '#34d399' : '#f87171' }}>
                {passed ? 'Passed' : 'Not Passed'}
              </p>
              <h1 className="text-xl font-bold text-white">{passed ? 'Exam Complete — Well Done' : 'Exam Complete — Review Required'}</h1>
            </div>
          </div>

          {/* Score grid */}
          <div className="grid grid-cols-3 divide-x divide-[#2a2f3d] border-b border-[#2a2f3d]">
            {[
              { label: 'Correct Answers', value: `${correctAnswers} / ${totalQuestions}` },
              { label: 'Pass Requirement', value: `${passCorrectRequired} / ${totalQuestions}` },
              { label: 'Score', value: `${attempt.score_percent}%` },
            ].map(({ label, value }) => (
              <div key={label} className="px-5 py-5 text-center">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">{label}</p>
                <p className="text-xl font-bold text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="p-7">
            {passed && certificate && (
              <div className="mb-6 p-5 bg-[#0f1117] border border-[#2a2f3d] rounded-xl">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Certificate ID</p>
                <p className="text-lg font-mono font-bold text-white mb-4">{certificate.certificate_id_code}</p>
                {certificate.certificate_url && (
                  <>
                    <button
                      onClick={() => setShowPreview(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                    >
                      <Download className="w-4 h-4" /> View Certificate
                    </button>
                    <CertificatePreviewModal
                      isOpen={showPreview}
                      onClose={() => setShowPreview(false)}
                      certificateUrl={certificate.certificate_url}
                      certificateId={certificate.certificate_id_code}
                    />
                  </>
                )}
              </div>
            )}

            {passed && (
              <div className="mb-6 p-5 bg-emerald-500/6 border border-emerald-500/20 rounded-xl">
                <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-widest mb-3">Automatically Applied</p>
                <div className="space-y-2 text-sm text-slate-300">
                  <p>Certificate generated and issued</p>
                  <p>Portfolio item approved</p>
                  <p>100 points awarded</p>
                </div>
              </div>
            )}

            {!passed && (
              <div className="mb-6 p-5 bg-[#0f1117] border border-[#2a2f3d] rounded-xl">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Attempts</p>
                <p className="text-white text-sm mb-4">{attemptsUsed} of {attemptsAllowed} used</p>
                {canRetry ? (
                  <Link to={createPageUrl('StudentCertification')} className="inline-flex items-center px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">
                    Retry Exam
                  </Link>
                ) : (
                  <p className="text-slate-500 text-sm">No attempts remaining.</p>
                )}
              </div>
            )}

            <Link to={createPageUrl('StudentCertification')} className="text-slate-400 hover:text-white text-sm font-medium transition-colors">
              ← Return to Certification Hub
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
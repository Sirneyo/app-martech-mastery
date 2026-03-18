import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, PlayCircle, FileText, ChevronRight, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProjectOnboarding({ project, enrollment, user, onComplete }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(enrollment.onboarding_video_watched ? 2 : 1);
  const [videoWatched, setVideoWatched] = useState(enrollment.onboarding_video_watched || false);
  const [signatureName, setSignatureName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const videoRef = useRef(null);
  const [videoEnded, setVideoEnded] = useState(false);

  // If video already watched, allow proceeding
  const canProceedVideo = videoWatched || videoEnded;

  const markVideoMutation = useMutation({
    mutationFn: () => base44.entities.SimProjectEnrollment.update(enrollment.id, { onboarding_video_watched: true }),
    onSuccess: () => {
      setVideoWatched(true);
      setStep(2);
      queryClient.invalidateQueries({ queryKey: ['my-sim-enrollment'] });
    },
  });

  const signMutation = useMutation({
    mutationFn: () => base44.entities.SimProjectEnrollment.update(enrollment.id, {
      onboarding_agreement_signed: true,
      agreement_signed_name: signatureName,
      agreement_signed_date: new Date().toISOString(),
      status: 'active',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-sim-enrollment'] });
      onComplete();
    },
  });

  const isYouTubeUrl = (url) => url && (url.includes('youtube.com') || url.includes('youtu.be'));
  const isVimeoUrl = (url) => url && url.includes('vimeo.com');

  const getEmbedUrl = (url) => {
    if (!url) return null;
    if (url.includes('youtube.com/watch?v=')) {
      const id = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${id}?enablejsapi=1`;
    }
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${id}?enablejsapi=1`;
    }
    if (url.includes('vimeo.com/')) {
      const id = url.split('vimeo.com/')[1]?.split('?')[0];
      return `https://player.vimeo.com/video/${id}`;
    }
    return null;
  };

  const embedUrl = getEmbedUrl(project.intro_video_url);
  const isEmbed = !!embedUrl;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Progress steps */}
        <div className="flex items-center gap-4 mb-8 justify-center">
          {[
            { num: 1, label: 'Watch Briefing', done: videoWatched },
            { num: 2, label: 'Sign Agreement', done: enrollment.onboarding_agreement_signed },
            { num: 3, label: 'Start Project', done: false },
          ].map((s, i) => (
            <React.Fragment key={s.num}>
              <div className={`flex items-center gap-2 ${step === s.num ? 'text-slate-900' : s.done ? 'text-green-600' : 'text-slate-400'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                  s.done ? 'bg-green-500 border-green-500 text-white' :
                  step === s.num ? 'border-slate-900 text-slate-900' :
                  'border-slate-300 text-slate-400'
                }`}>
                  {s.done ? <CheckCircle className="w-4 h-4" /> : s.num}
                </div>
                <span className="text-sm font-medium hidden sm:block">{s.label}</span>
              </div>
              {i < 2 && <div className="flex-1 h-px bg-slate-200 max-w-12" />}
            </React.Fragment>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1 — Video */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-5 text-white">
                <div className="flex items-center gap-3">
                  <PlayCircle className="w-6 h-6" />
                  <div>
                    <h2 className="font-bold text-lg">Project Briefing</h2>
                    <p className="text-white/70 text-sm">{project.company_name || project.title}</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-slate-600 text-sm mb-4">
                  Watch the full project briefing video before proceeding. This sets the context for the simulation you are about to begin.
                </p>
                {project.intro_video_url ? (
                  isEmbed ? (
                    <div className="relative w-full aspect-video bg-slate-900 rounded-xl overflow-hidden mb-5">
                      <iframe
                        src={embedUrl}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="Project Briefing"
                      />
                    </div>
                  ) : (
                    <video
                      ref={videoRef}
                      src={project.intro_video_url}
                      controls
                      controlsList="nodownload"
                      className="w-full rounded-xl mb-5 bg-slate-900"
                      onEnded={() => setVideoEnded(true)}
                    />
                  )
                ) : (
                  <div className="bg-slate-100 rounded-xl p-8 text-center mb-5">
                    <PlayCircle className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">No briefing video uploaded yet.</p>
                  </div>
                )}
                <div className="bg-slate-50 rounded-xl p-4 mb-5">
                  <h3 className="font-semibold text-slate-800 mb-1">{project.title}</h3>
                  <p className="text-sm text-slate-600">{project.overview}</p>
                </div>
                {isEmbed && !videoWatched && (
                  <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-4">
                    After watching the full video, click "I've Watched the Briefing" to continue.
                  </p>
                )}
                <Button
                  className="w-full gap-2"
                  onClick={() => markVideoMutation.mutate()}
                  disabled={markVideoMutation.isPending || (!canProceedVideo && !isEmbed && !!project.intro_video_url)}
                >
                  {markVideoMutation.isPending ? 'Saving...' : "I've Watched the Briefing"}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2 — Agreement */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5 text-white">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6" />
                  <div>
                    <h2 className="font-bold text-lg">Participation Agreement</h2>
                    <p className="text-white/70 text-sm">Sign before accessing the project</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {project.agreement_text ? (
                  <div className="bg-slate-50 rounded-xl p-4 mb-5 max-h-52 overflow-y-auto text-sm text-slate-700 leading-relaxed border border-slate-200">
                    {project.agreement_text}
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-xl p-4 mb-5 text-sm text-slate-500 text-center">
                    No agreement text provided.
                  </div>
                )}

                {project.agreement_doc_url && (
                  <a href={project.agreement_doc_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-violet-600 hover:underline mb-5">
                    <FileText className="w-4 h-4" /> View full agreement document
                  </a>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">
                      Type your full name as your digital signature
                    </label>
                    <Input
                      value={signatureName}
                      onChange={e => setSignatureName(e.target.value)}
                      placeholder={user?.full_name || 'Your full name'}
                      className="font-medium"
                    />
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={e => setAgreed(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded accent-violet-600"
                    />
                    <span className="text-sm text-slate-600">
                      I have read and agree to the participation agreement. I understand this is a professional simulation and I will conduct myself accordingly.
                    </span>
                  </label>
                </div>

                <Button
                  className="w-full mt-5 gap-2"
                  onClick={() => signMutation.mutate()}
                  disabled={!signatureName.trim() || !agreed || signMutation.isPending}
                >
                  {signMutation.isPending ? 'Signing...' : 'Sign & Enter Project'}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
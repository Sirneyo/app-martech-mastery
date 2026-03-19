import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, FolderKanban, ChevronRight, PlayCircle, FileText, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const STATUS_STYLES = {
  onboarding: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-violet-100 text-violet-700',
  withdrawn: 'bg-slate-100 text-slate-500',
};

// Step 1: Intro Video
function IntroStep({ projects, onContinue }) {
  // Use the first enrolled project's intro video if available
  const videoUrl = projects[0]?.intro_video_url;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-8 py-10 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <PlayCircle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold mb-1">Welcome to Projects</h1>
            <p className="text-white/80 text-sm">Real-world client simulations to build your portfolio</p>
          </div>

          <div className="p-8">
            {videoUrl ? (
              <>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Project Briefing Video</h2>
                <div className="aspect-video rounded-xl overflow-hidden bg-slate-100 mb-6">
                  <iframe src={videoUrl} className="w-full h-full" allowFullScreen title="Project Introduction" />
                </div>
              </>
            ) : (
              <div className="aspect-video rounded-xl bg-slate-100 flex flex-col items-center justify-center mb-6 border border-dashed border-slate-300">
                <PlayCircle className="w-12 h-12 text-slate-300 mb-2" />
                <p className="text-slate-400 text-sm">Intro video coming soon</p>
              </div>
            )}
            <p className="text-slate-600 text-sm mb-6 text-center">
              Watch the briefing above to understand what to expect from the project experience.
            </p>
            <Button className="w-full" onClick={onContinue}>
              Continue to Agreement <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Step 2: Agreement
function AgreementStep({ projects, onContinue }) {
  const agreementText = projects[0]?.agreement_text;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-8 py-10 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold mb-1">Participation Agreement</h1>
            <p className="text-white/80 text-sm">Please read and accept the terms before proceeding</p>
          </div>

          <div className="p-8">
            {agreementText ? (
              <div className="bg-slate-50 rounded-xl p-5 text-sm text-slate-600 whitespace-pre-wrap border border-slate-200 max-h-72 overflow-y-auto mb-6 leading-relaxed">
                {agreementText}
              </div>
            ) : (
              <div className="bg-slate-50 rounded-xl p-5 text-sm text-slate-500 border border-dashed border-slate-200 mb-6 text-center">
                Agreement text will be added here by your program coordinator.
              </div>
            )}
            <Button className="w-full" onClick={onContinue}>
              I Agree — View My Projects <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Step 3: Project List
function ProjectListStep({ projects, enrollments }) {
  const getEnrollment = (projectId) => enrollments.find(e => e.project_id === projectId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900">My Projects</h1>
        <p className="text-slate-500 mt-1">Your assigned client simulation projects</p>
      </motion.div>

      <div className="max-w-4xl mx-auto space-y-4">
        {projects.map((project, i) => {
          const enrollment = getEnrollment(project.id);
          if (!enrollment) return null;
          return (
            <motion.div key={project.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link
                to={createPageUrl(`StudentSimProjectDetail?id=${project.id}`)}
                className="block bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <FolderKanban className="w-6 h-6 text-violet-600" />
                  </div>
                  <div className="flex-1">
                    {project.company_name && <p className="text-xs text-slate-400 font-medium mb-0.5">{project.company_name}</p>}
                    <h3 className="text-lg font-bold text-slate-900">{project.title}</h3>
                    {project.overview && <p className="text-sm text-slate-500 line-clamp-1 mt-0.5">{project.overview}</p>}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Badge className={STATUS_STYLES[enrollment.status] || 'bg-slate-100 text-slate-500'}>
                      {enrollment.status}
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// Not assigned screen
function NotAssignedScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-500 to-slate-700 px-8 py-10 text-center text-white">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold mb-1">Projects</h1>
            <p className="text-white/80 text-sm">Not yet available</p>
          </div>
          <div className="px-8 py-8 text-center">
            <p className="text-slate-600 mb-2">You haven't been assigned to a project yet.</p>
            <p className="text-slate-400 text-sm">Your program coordinator will assign you a project when you're ready. Check back soon!</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function StudentSimProjects() {
  // step: 'intro' | 'agreement' | 'list'
  const [step, setStep] = useState('intro');

  const { data: user } = useQuery({ queryKey: ['current-user'], queryFn: () => base44.auth.me() });

  const { data: enrollments = [], isLoading: loadingEnrollments } = useQuery({
    queryKey: ['my-sim-enrollments', user?.id],
    queryFn: () => base44.entities.SimProjectEnrollment.filter({ student_user_id: user.id }),
    enabled: !!user?.id,
  });

  const enrolledProjectIds = enrollments.map(e => e.project_id);

  const { data: allActiveProjects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['active-sim-projects'],
    queryFn: () => base44.entities.SimProject.filter({ status: 'active' }),
    enabled: enrolledProjectIds.length > 0,
  });

  if (loadingEnrollments || (enrolledProjectIds.length > 0 && loadingProjects)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Only show projects the student is enrolled in
  const myProjects = allActiveProjects.filter(p => enrolledProjectIds.includes(p.id));

  // If no enrollments at all, show not-assigned screen
  if (enrollments.length === 0 || myProjects.length === 0) {
    return <NotAssignedScreen />;
  }

  if (step === 'intro') {
    return <IntroStep projects={myProjects} onContinue={() => setStep('agreement')} />;
  }

  if (step === 'agreement') {
    return <AgreementStep projects={myProjects} onContinue={() => setStep('list')} />;
  }

  return <ProjectListStep projects={myProjects} enrollments={enrollments} />;
}
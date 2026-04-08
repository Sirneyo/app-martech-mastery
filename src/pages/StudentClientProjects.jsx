import React, { useState } from 'react';
import OpsbaseAgreementStep from '@/components/OpsbaseAgreementStep';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
  import { Button } from '@/components/ui/button';
  import { Lock, FolderKanban, ChevronRight, PlayCircle, FileText, ArrowRight, Briefcase, Send } from 'lucide-react';
  import { motion } from 'framer-motion';

const OPSBASE_LOGO = 'https://media.base44.com/images/public/693261f4a46b591b7d38e623/6610419bc_5e2c44538_OpsbaseLogo500x100px.png';

const STATUS_STYLES = {
  onboarding: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
  active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  completed: 'bg-teal-50 text-teal-700 border border-teal-200',
  withdrawn: 'bg-slate-100 text-slate-500 border border-slate-200',
};

const STATUS_LABELS = {
  onboarding: 'Onboarding',
  active: 'Active',
  completed: 'Completed',
  withdrawn: 'Withdrawn',
};

// Step 1: Intro Video
function IntroStep({ projects, onContinue }) {
  const videoUrl = projects[0]?.intro_video_url;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="flex-1 flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="mb-8 text-center">
              <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-200 text-teal-700 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-4">
                <PlayCircle className="w-3.5 h-3.5" />
                Project Briefing
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome to Your Client Project</h1>
              <p className="text-slate-500 text-base max-w-xl mx-auto">
                Watch the briefing video below to understand the project scope, expectations and deliverables before getting started.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
              {videoUrl ? (
                <div className="aspect-video">
                  <iframe src={videoUrl} className="w-full h-full" allowFullScreen title="Project Introduction" />
                </div>
              ) : (
                <div className="aspect-video flex flex-col items-center justify-center bg-slate-50 border-b border-slate-100">
                  <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center mb-3">
                    <PlayCircle className="w-8 h-8 text-teal-500" />
                  </div>
                  <p className="text-slate-400 text-sm font-medium">Briefing video coming soon</p>
                  <p className="text-slate-300 text-xs mt-1">Your coordinator will add this shortly</p>
                </div>
              )}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                <p className="text-xs text-slate-400 text-center">
                  This video has been produced in partnership with <span className="font-semibold text-slate-600">Opsbase</span> and <span className="font-semibold text-slate-600">MarTech Mastery</span>
                </p>
              </div>
            </div>

            <Button
              className="w-full h-12 text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-sm"
              onClick={onContinue}
            >
              Continue to Participation Agreement
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// Step 3: Project List
function ProjectListStep({ projects, enrollments, onPushOrder, isPushing, userRole }) {
  const getEnrollment = (projectId) => enrollments.find(e => e.project_id === projectId);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-1">My Projects</h1>
            <p className="text-slate-500 text-sm">Your assigned client projects — delivered in partnership with Opsbase</p>
          </motion.div>
          {userRole === 'admin' && (
            <Button onClick={onPushOrder} disabled={isPushing} className="gap-2 h-9" variant="outline">
              <Send className="w-4 h-4" /> Sync Order
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-4">
        {projects.map((project, i) => {
          const enrollment = getEnrollment(project.id);
          if (!enrollment) return null;
          const status = enrollment.status;
          return (
            <motion.div key={project.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.35 }}
            >
              <Link
                to={createPageUrl(`StudentClientProjectDetail?id=${project.id}`)}
                className="group flex flex-col md:flex-row md:items-center gap-4 md:gap-6 bg-white rounded-2xl p-4 md:p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-200 transition-all duration-200"
              >

                <div className="flex-1 min-w-0">
                  {project.company_name && (
                    <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider mb-1">{project.company_name}</p>
                  )}
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors truncate">{project.title}</h3>
                  {project.overview && (
                    <p className="text-sm text-slate-500 line-clamp-1 mt-0.5">{project.overview}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <Badge className={`text-xs ${STATUS_STYLES[status] || 'bg-slate-100 text-slate-500'}`}>
                      {STATUS_LABELS[status] || status}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <img src={OPSBASE_LOGO} alt="Opsbase" className="h-3.5 w-auto opacity-60" />
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <div className="w-9 h-9 rounded-xl border border-slate-200 group-hover:border-teal-200 group-hover:bg-teal-50 flex items-center justify-center transition-all">
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
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

function NotAssignedScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md w-full overflow-hidden text-center">
        <div className="bg-gradient-to-br from-slate-700 to-slate-900 px-8 py-10">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-white/80" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Projects</h2>
          <p className="text-white/60 text-sm">Not yet assigned</p>
        </div>
        <div className="px-8 py-8">
          <p className="text-slate-600 text-sm mb-1 font-medium">You haven't been assigned to a project yet.</p>
          <p className="text-slate-400 text-sm leading-relaxed">
            Your program coordinator will assign you a project when you're ready. Check back here soon!
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function StudentClientProjects() {
  const [step, setStep] = useState('intro');
  const [pushingOrder, setPushingOrder] = useState(false);

  const { data: user } = useQuery({ queryKey: ['current-user'], queryFn: () => base44.auth.me() });

  const { data: membership } = useQuery({
    queryKey: ['my-cohort-membership', user?.id],
    queryFn: async () => {
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

  const { data: enrollments = [], isLoading: loadingEnrollments } = useQuery({
    queryKey: ['my-enrollments', user?.id],
    queryFn: () => base44.entities.ProjectEnrollment.filter({ student_user_id: user.id }),
    enabled: !!user?.id,
  });

  const enrolledProjectIds = enrollments.map(e => e.project_id);

  const { data: allActiveProjects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['active-projects'],
    queryFn: () => base44.entities.Project.filter({ status: 'active' }),
    enabled: enrolledProjectIds.length > 0,
  });

  if (loadingEnrollments || (enrolledProjectIds.length > 0 && loadingProjects)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-teal-100 border-t-teal-600 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading your projects…</p>
        </div>
      </div>
    );
  }

  const myProjects = allActiveProjects.filter(p => enrolledProjectIds.includes(p.id));

  if (enrollments.length === 0 || myProjects.length === 0) {
    return <NotAssignedScreen />;
  }

  const handlePushOrder = async () => {
    setPushingOrder(true);
    const adminProjects = await base44.entities.Project.list();
    const sorted = adminProjects.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    setPushingOrder(false);
  };

  const agreementSigned = user?.opsbase_agreement_signed;

  if (step === 'intro') return <IntroStep projects={myProjects} onContinue={() => setStep(agreementSigned ? 'list' : 'agreement')} />;
  if (step === 'agreement') return <OpsbaseAgreementStep user={user} cohortName={cohort?.name} onContinue={() => setStep('list')} />;
  return <ProjectListStep projects={myProjects} enrollments={enrollments} onPushOrder={handlePushOrder} isPushing={pushingOrder} userRole={user?.app_role} />;
}
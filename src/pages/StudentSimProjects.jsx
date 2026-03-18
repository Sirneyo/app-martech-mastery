import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { FolderKanban, Lock, Clock, CheckCircle, ChevronRight, PlayCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const STATUS_STYLES = {
  onboarding: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-violet-100 text-violet-700',
};

const STATUS_LABELS = {
  onboarding: 'Getting Started',
  active: 'In Progress',
  completed: 'Completed',
};

export default function StudentSimProjects() {
  const { data: user } = useQuery({ queryKey: ['current-user'], queryFn: () => base44.auth.me() });

  const { data: membership } = useQuery({
    queryKey: ['my-cohort-membership'],
    queryFn: async () => {
      if (!user?.id) return null;
      const m = await base44.entities.CohortMembership.filter({ user_id: user.id, status: 'active' });
      return m[0] || null;
    },
    enabled: !!user?.id,
  });

  const { data: cohort } = useQuery({
    queryKey: ['my-cohort', membership?.cohort_id],
    queryFn: async () => {
      const r = await base44.entities.Cohort.filter({ id: membership.cohort_id });
      return r[0] || null;
    },
    enabled: !!membership?.cohort_id,
  });

  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const currentWeek = (() => {
    if (!cohort?.start_date) return 0;
    const diff = now - new Date(cohort.start_date);
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 7)) + 1;
  })();

  const UNLOCK_WEEK = 8;
  const isUnlocked = currentWeek >= UNLOCK_WEEK;

  const { data: enrollments = [] } = useQuery({
    queryKey: ['my-sim-enrollments', user?.id],
    queryFn: () => base44.entities.SimProjectEnrollment.filter({ student_user_id: user.id }),
    enabled: !!user?.id && isUnlocked,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['sim-projects-active'],
    queryFn: () => base44.entities.SimProject.filter({ status: 'active' }),
    enabled: isUnlocked,
  });

  // Locked countdown screen
  if (!isUnlocked && cohort) {
    const unlockDate = new Date(cohort.start_date);
    unlockDate.setDate(unlockDate.getDate() + (UNLOCK_WEEK - 1) * 7);
    const msLeft = Math.max(0, unlockDate - now);
    const d = Math.floor(msLeft / 86400000);
    const h = Math.floor((msLeft % 86400000) / 3600000);
    const m = Math.floor((msLeft % 3600000) / 60000);
    const s = Math.floor((msLeft % 60000) / 1000);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden max-w-md w-full">
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-8 py-10 text-center text-white">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-1">Simulation Projects</h1>
            <p className="text-white/80 text-sm">Unlocks at Week {UNLOCK_WEEK} of your cohort</p>
          </div>
          <div className="px-8 py-8 text-center">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-5">Time until unlock</p>
            <div className="grid grid-cols-4 gap-3 max-w-sm mx-auto mb-6">
              {[{ val: d, label: 'Days' }, { val: h, label: 'Hours' }, { val: m, label: 'Mins' }, { val: s, label: 'Secs' }].map(({ val, label }) => (
                <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <p className="text-2xl font-bold text-slate-900 font-mono">{String(val).padStart(2, '0')}</p>
                  <p className="text-xs text-slate-500 mt-1">{label}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-500">Complete your assignments to prepare for real-world projects!</p>
          </div>
        </motion.div>
      </div>
    );
  }

  const enrolledMap = Object.fromEntries(enrollments.map(e => [e.project_id, e]));
  const myProjects = projects.filter(p => enrolledMap[p.id]);
  const notEnrolled = projects.filter(p => !enrolledMap[p.id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Simulation Projects</h1>
          <p className="text-slate-500 mt-1">Real-world marketing projects in a professional environment</p>
        </motion.div>

        {myProjects.length === 0 && notEnrolled.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center">
            <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No projects available yet</p>
            <p className="text-slate-400 text-sm">Check back soon — your tutor will enrol you when ready.</p>
          </div>
        )}

        {myProjects.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">My Projects</h2>
            <div className="space-y-3">
              {myProjects.map((project, i) => {
                const enrollment = enrolledMap[project.id];
                return (
                  <motion.div key={project.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Link
                      to={createPageUrl(`StudentSimProjectDetail?id=${project.id}`)}
                      className="flex items-center gap-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                        <FolderKanban className="w-6 h-6 text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {project.company_name && <p className="text-xs text-slate-400 font-medium mb-0.5">{project.company_name}</p>}
                        <h3 className="font-bold text-slate-900">{project.title}</h3>
                        <p className="text-sm text-slate-500 line-clamp-1 mt-0.5">{project.overview}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <Badge className={STATUS_STYLES[enrollment.status] || 'bg-slate-100 text-slate-600'}>
                          {STATUS_LABELS[enrollment.status] || enrollment.status}
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {notEnrolled.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Available Projects</h2>
            <div className="space-y-3">
              {notEnrolled.map((project, i) => (
                <motion.div key={project.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <div className="flex items-center gap-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm opacity-60">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Lock className="w-6 h-6 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {project.company_name && <p className="text-xs text-slate-400 font-medium mb-0.5">{project.company_name}</p>}
                      <h3 className="font-bold text-slate-900">{project.title}</h3>
                      <p className="text-sm text-slate-400">Awaiting enrolment from your tutor</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
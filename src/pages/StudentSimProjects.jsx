import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Lock, FolderKanban, Clock, ChevronRight, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { differenceInWeeks } from 'date-fns';

const STATUS_STYLES = {
  onboarding: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-violet-100 text-violet-700',
  withdrawn: 'bg-slate-100 text-slate-500',
};

function useCurrentWeek(cohort) {
  if (!cohort?.start_date) return 0;
  const weeks = differenceInWeeks(new Date(), new Date(cohort.start_date));
  return Math.max(0, weeks) + 1;
}

function LockedScreen({ cohort, unlockWeek }) {
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const unlockDate = cohort?.start_date
    ? new Date(new Date(cohort.start_date).getTime() + (unlockWeek - 1) * 7 * 24 * 60 * 60 * 1000)
    : null;

  const msLeft = unlockDate ? Math.max(0, unlockDate - now) : 0;
  const d = Math.floor(msLeft / 86400000);
  const h = Math.floor((msLeft % 86400000) / 3600000);
  const m = Math.floor((msLeft % 3600000) / 60000);
  const s = Math.floor((msLeft % 60000) / 1000);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-8 py-10 text-center text-white">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold mb-1">Simulation Projects</h1>
            <p className="text-white/80 text-sm">Unlocks at Week {unlockWeek} of your cohort</p>
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
            <p className="text-sm text-slate-500">Keep completing your assignments to prepare!</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function StudentSimProjects() {
  const { data: user } = useQuery({ queryKey: ['current-user'], queryFn: () => base44.auth.me() });

  const { data: membership } = useQuery({
    queryKey: ['my-cohort-membership'],
    queryFn: async () => {
      if (!user?.id) return null;
      const list = await base44.entities.CohortMembership.filter({ user_id: user.id, status: 'active' });
      return list[0];
    },
    enabled: !!user?.id,
  });

  const { data: cohort } = useQuery({
    queryKey: ['my-cohort', membership?.cohort_id],
    queryFn: async () => {
      if (!membership?.cohort_id) return null;
      const list = await base44.entities.Cohort.filter({ id: membership.cohort_id });
      return list[0];
    },
    enabled: !!membership?.cohort_id,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['my-sim-enrollments', user?.id],
    queryFn: () => base44.entities.SimProjectEnrollment.filter({ student_user_id: user.id }),
    enabled: !!user?.id,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['active-sim-projects'],
    queryFn: () => base44.entities.SimProject.filter({ status: 'active' }),
  });

  const currentWeek = useCurrentWeek(cohort);
  const UNLOCK_WEEK = 8;

  if (cohort && currentWeek < UNLOCK_WEEK) {
    return <LockedScreen cohort={cohort} unlockWeek={UNLOCK_WEEK} />;
  }

  const getEnrollment = (projectId) => enrollments.find(e => e.project_id === projectId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Simulation Projects</h1>
        <p className="text-slate-500 mt-1">Real-world work simulations to build your portfolio</p>
      </motion.div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center">
          <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No projects available yet. Check back soon.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project, i) => {
            const enrollment = getEnrollment(project.id);
            return (
              <motion.div key={project.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                {enrollment ? (
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
                        <p className="text-sm text-slate-500 line-clamp-1 mt-0.5">{project.overview}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <Badge className={STATUS_STYLES[enrollment.status]}>{enrollment.status}</Badge>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <FolderKanban className="w-6 h-6 text-slate-400" />
                      </div>
                      <div className="flex-1">
                        {project.company_name && <p className="text-xs text-slate-400 font-medium mb-0.5">{project.company_name}</p>}
                        <h3 className="text-lg font-bold text-slate-900">{project.title}</h3>
                        <p className="text-sm text-slate-500 line-clamp-1 mt-0.5">{project.overview}</p>
                      </div>
                      <Badge className="bg-slate-100 text-slate-500">Not enrolled</Badge>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
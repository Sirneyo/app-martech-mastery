import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Lock, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StudentProjects() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

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
    queryFn: async () => {
      if (!membership?.cohort_id) return null;
      const cohorts = await base44.entities.Cohort.filter({ id: membership.cohort_id });
      return cohorts[0];
    },
    enabled: !!membership?.cohort_id,
  });

  const getCurrentWeek = () => {
    if (!cohort?.start_date) return 0;
    const startDate = new Date(cohort.start_date);
    const today = new Date();
    const diffTime = today - startDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7) + 1;
  };

  const currentWeek = getCurrentWeek();
  const UNLOCK_WEEK = 8;
  const isUnlocked = currentWeek >= UNLOCK_WEEK;

  const { data: projects = [] } = useQuery({
    queryKey: ['project-templates'],
    queryFn: () => base44.entities.ProjectTemplate.list('week_number'),
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['my-project-submissions'],
    queryFn: async () => {
      if (!user?.id) return [];
      return base44.entities.Submission.filter({ user_id: user.id, submission_kind: 'project' });
    },
    enabled: !!user?.id,
  });

  const getSubmissionStatus = (projectId) => {
    const submission = submissions.find(s => s.project_template_id === projectId);
    if (!submission) return { status: 'not_started', label: 'Not Started', color: 'bg-slate-100 text-slate-600' };
    
    if (submission.status === 'draft') return { status: 'draft', label: 'Draft', color: 'bg-blue-100 text-blue-700' };
    if (submission.status === 'submitted') return { status: 'submitted', label: 'Submitted', color: 'bg-amber-100 text-amber-700' };
    if (submission.status === 'graded') return { status: 'graded', label: 'Graded', color: 'bg-green-100 text-green-700' };
    if (submission.status === 'needs_revision') return { status: 'needs_revision', label: 'Needs Revision', color: 'bg-red-100 text-red-700' };
    
    return { status: 'not_started', label: 'Not Started', color: 'bg-slate-100 text-slate-600' };
  };

  const isProjectLocked = (projectIndex) => {
    if (projectIndex === 0) return false;
    const previousProject = projects[projectIndex - 1];
    const previousSubmission = submissions.find(s => s.project_template_id === previousProject.id);
    return !previousSubmission || previousSubmission.status !== 'graded';
  };

  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isUnlocked && cohort) {
    const unlockDate = new Date(cohort.start_date);
    unlockDate.setDate(unlockDate.getDate() + (UNLOCK_WEEK - 1) * 7);
    const msLeft = Math.max(0, unlockDate - now);
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
              <h1 className="text-2xl font-bold mb-1">Projects</h1>
              <p className="text-white/80 text-sm">Unlocks at Week {UNLOCK_WEEK} of your cohort</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Projects</h1>
        <p className="text-slate-500 mt-1">Complete projects to demonstrate your skills</p>
      </motion.div>

      <div className="space-y-4">
        {projects.map((project, index) => {
          const submissionStatus = getSubmissionStatus(project.id);
          const isLocked = isProjectLocked(index);
          
          return (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {isLocked ? (
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm opacity-60">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Lock className="w-6 h-6 text-slate-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">Week {project.week_number}</Badge>
                        <Badge className="bg-slate-100 text-slate-600">Locked</Badge>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1">{project.title}</h3>
                      <p className="text-sm text-slate-500">Complete the previous project to unlock</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <FolderOpen className="w-4 h-4" />
                      <span>{project.points} points</span>
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  to={createPageUrl(`StudentProjectDetail?id=${project.id}`)}
                  className="block bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-violet-100">
                      <FolderOpen className="w-6 h-6 text-violet-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">Week {project.week_number}</Badge>
                        <Badge className={submissionStatus.color}>{submissionStatus.label}</Badge>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1">{project.title}</h3>
                      <p className="text-sm text-slate-600 line-clamp-1">{project.short_description || project.title}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <FolderOpen className="w-4 h-4" />
                      <span>{project.points} points</span>
                    </div>
                  </div>
                </Link>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
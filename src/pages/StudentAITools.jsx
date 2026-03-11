import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Lock } from 'lucide-react';

const UNLOCK_WEEK = 8;

export default function StudentAITools() {
  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const result = await base44.entities.AppSettings.list();
      return result[0] || {};
    },
  });

  const { data: cohort } = useQuery({
    queryKey: ['student-cohort'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const memberships = await base44.entities.CohortMembership.filter({ user_id: user.id, status: 'active' });
      if (!memberships.length) return null;
      const cohorts = await base44.entities.Cohort.filter({ id: memberships[0].cohort_id });
      return cohorts[0] || null;
    },
  });

  const currentWeek = cohort?.current_week || 0;
  const isLocked = currentWeek < UNLOCK_WEEK;

  if (isLocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-8 py-10 text-center text-white">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold mb-1">AI Tools</h1>
              <p className="text-white/80 text-sm">Unlocks at Week {UNLOCK_WEEK} of your cohort</p>
            </div>
            <div className="px-8 py-8 text-center">
              <p className="text-slate-600 mb-2">
                You are currently on <span className="font-semibold">Week {currentWeek}</span>.
              </p>
              <p className="text-slate-500 text-sm">
                Keep going — only {UNLOCK_WEEK - currentWeek} week{UNLOCK_WEEK - currentWeek !== 1 ? 's' : ''} to go!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full">
      <iframe
        src={settings?.ai_tools_url || "https://ai.martech-mastery.com/"}
        className="w-full h-full border-0"
        title="AI Tools"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
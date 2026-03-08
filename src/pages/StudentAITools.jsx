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
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">AI Tools Locked</h2>
          <p className="text-gray-600 mb-2">
            AI Tools unlock at <span className="font-semibold text-purple-700">Week {UNLOCK_WEEK}</span> of your program.
          </p>
          <p className="text-gray-500 text-sm">
            You are currently on <span className="font-semibold">Week {currentWeek}</span>. Keep going — only {UNLOCK_WEEK - currentWeek} week{UNLOCK_WEEK - currentWeek !== 1 ? 's' : ''} to go!
          </p>
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
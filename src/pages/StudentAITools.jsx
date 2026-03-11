import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Lock } from 'lucide-react';
import { motion } from 'framer-motion';

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

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    if (!isLocked) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [isLocked]);

  if (isLocked) {
    const unlockDate = cohort?.start_date ? (() => {
      const d = new Date(cohort.start_date);
      d.setDate(d.getDate() + (UNLOCK_WEEK - 1) * 7);
      return d;
    })() : null;
    const msLeft = unlockDate ? Math.max(0, unlockDate - now) : 0;
    const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
    const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minsLeft = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
    const secsLeft = Math.floor((msLeft % (1000 * 60)) / 1000);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-8 py-10 text-center text-white">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold mb-1">AI Tools</h1>
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
import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  Play, 
  Clock, 
  TrendingUp, 
  Award, 
  BookOpen,
  ChevronRight,
  Zap,
  Target,
  Trophy,
  User,
  Mail,
  MessageCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function StudentDashboard() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const result = await base44.entities.AppSettings.list();
      return result[0] || {};
    },
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

  const { data: tutor } = useQuery({
    queryKey: ['my-tutor', membership?.cohort_id],
    queryFn: async () => {
      if (!membership?.cohort_id) return null;
      const assignments = await base44.entities.TutorCohortAssignment.filter({ 
        cohort_id: membership.cohort_id,
        is_primary: true 
      });
      if (assignments.length === 0) return null;
      
      const users = await base44.entities.User.filter({ id: assignments[0].tutor_id });
      return users[0];
    },
    enabled: !!membership?.cohort_id,
  });

  const { data: streak } = useQuery({
    queryKey: ['login-streak'],
    queryFn: async () => {
      if (!user?.id) return 0;
      const events = await base44.entities.LoginEvent.filter({ user_id: user.id });
      
      const dates = events.map(e => e.login_time.split('T')[0]).sort().reverse();
      const uniqueDates = [...new Set(dates)];
      
      let streakCount = 0;
      const today = new Date().toISOString().split('T')[0];
      
      for (let i = 0; i < uniqueDates.length; i++) {
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() - i);
        const expected = expectedDate.toISOString().split('T')[0];
        
        if (uniqueDates[i] === expected) {
          streakCount++;
        } else {
          break;
        }
      }
      
      return streakCount;
    },
    enabled: !!user?.id,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}! 👋
        </h1>
        <p className="text-slate-500 mt-1">Continue your MarTech journey</p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
      >
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/50 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Current Streak</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{streak || 0} days</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        {cohort && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/50 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Cohort</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{cohort.name}</p>
                <p className="text-xs text-slate-400 mt-1">Week {cohort.current_week}/12</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                <Trophy className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        )}

        {tutor && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/50 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Your Tutor</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{tutor.full_name}</p>
                <a href={`mailto:${tutor.email}`} className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                  Contact
                </a>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg">
                <User className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        )}
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <a
          href={settings?.kajabi_url || "https://www.the-growth-academy.co/library"}
          target="_blank"
          rel="noopener noreferrer"
          className="block group"
        >
          <div className="bg-gradient-to-br from-purple-600 to-violet-500 rounded-3xl p-12 text-white hover:shadow-2xl hover:shadow-purple-500/30 transition-all duration-300 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
            </div>

            <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-4xl font-bold mb-3">Continue Your Learning</h2>
                <p className="text-white/90 text-lg mb-6">
                  Access all course materials, videos, and resources on the Growth Academy platform
                </p>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span className="flex items-center gap-2">
                    <Play className="w-4 h-4" /> Video lessons
                  </span>
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Course materials
                  </span>
                  <span className="flex items-center gap-2">
                    <Target className="w-4 h-4" /> Live sessions
                  </span>
                </div>
              </div>

              <div className="flex-shrink-0">
                <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                  <Play className="w-10 h-10 text-purple-600 ml-1" />
                </div>
              </div>
            </div>
          </div>
        </a>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <a 
          href={settings?.marketo_url || "https://experience.adobe.com/#/@oadsolutionsltd/"}
          target="_blank"
          rel="noopener noreferrer"
          className="group bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl p-6 text-white hover:shadow-xl hover:shadow-red-500/25 transition-all duration-300"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Target className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">Practice in Marketo</h3>
              <p className="text-white/80 text-sm">Apply your skills</p>
            </div>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </div>
        </a>

        {settings?.whatsapp_community_url && (
          <a 
            href={settings.whatsapp_community_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-6 text-white hover:shadow-xl hover:shadow-green-500/25 transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">WhatsApp Community</h3>
                <p className="text-white/80 text-sm">Join the chat</p>
              </div>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </a>
        )}

        {cohort && cohort.start_date && cohort.end_date && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-3">Program Timeline</h3>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Started:</span>
                <span className="font-medium">{format(new Date(cohort.start_date), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span>Ends:</span>
                <span className="font-medium">{format(new Date(cohort.end_date), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <Badge className="bg-green-100 text-green-700">{cohort.status}</Badge>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
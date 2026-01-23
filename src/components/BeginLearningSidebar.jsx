import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Home,
  BookOpen, 
  Video, 
  FileText,
  Users,
  Award,
  ExternalLink
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function BeginLearningSidebar({ currentPageName, onNavigate }) {
  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const result = await base44.entities.AppSettings.list();
      return result[0] || {};
    },
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const getDashboardPage = () => {
    if (user?.app_role === 'admin') return 'AdminOverview';
    if (user?.app_role === 'tutor') return 'TutorDashboard';
    return 'StudentDashboard';
  };

  const navItems = [
    { name: 'Learning Home', icon: BookOpen, page: 'BeginLearning' },
    { name: 'All Courses', icon: Video, page: 'CoursesLMS' },
    { name: 'Resources', icon: FileText, page: 'BeginLearning' },
    { name: 'Live Sessions', icon: Users, page: 'BeginLearning' },
  ];

  return (
    <aside className="w-72 bg-gradient-to-b from-purple-100 to-purple-200 min-h-screen flex flex-col border-r border-purple-300">
      <div className="p-4 border-b border-purple-300">
        <Link to={createPageUrl('BeginLearning')}>
          <img 
            src="https://storage.googleapis.com/msgsndr/DVqsiywKVWkfZ4I0mXQ1/media/693348610439b8283bf88818.svg" 
            alt="MarTech Mastery" 
            className="w-[90%] h-auto"
          />
        </Link>
      </div>

      <div className="p-4">
        <Link
          to={createPageUrl(getDashboardPage())}
          className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group bg-white/50 hover:bg-white border border-purple-200 hover:border-purple-300"
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-slate-600 to-slate-500">
            <Home className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">
              Back to Dashboard
            </p>
            <p className="text-[10px] text-slate-500">Main platform</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 border-t border-purple-300">
        <p className="text-[10px] uppercase tracking-wider text-purple-700 font-semibold px-3 mb-3">
          Learning Platform
        </p>
        {navItems.map((item) => {
          const isActive = currentPageName === item.page;
          return (
            <Link
              key={item.name}
              to={createPageUrl(item.page)}
              onClick={onNavigate}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                ${isActive 
                  ? 'bg-purple-500/10 text-purple-700' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }
              `}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-purple-700' : 'text-slate-500 group-hover:text-slate-700'}`} />
              <span className="font-medium text-sm">{item.name}</span>
              {isActive && (
                <motion.div 
                  layoutId="learningActiveIndicator"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-700"
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-purple-300">
        <a
          href={settings?.kajabi_url || "https://www.the-growth-academy.co/library"}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Award className="w-5 h-5" />
          <div className="flex-1">
            <p className="text-sm font-semibold">
              Full Learning Platform
            </p>
            <p className="text-[10px] text-purple-100">Opens in new tab</p>
          </div>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </aside>
  );
}
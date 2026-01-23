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
  ExternalLink,
  Users,
  Play
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function LearningSidebar() {
  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const result = await base44.entities.AppSettings.list();
      return result[0] || {};
    },
  });

  const learningLinks = [
    {
      name: 'Course Library',
      icon: BookOpen,
      url: settings?.kajabi_url || 'https://www.the-growth-academy.co/library',
      external: true,
      color: 'from-purple-600 to-violet-500'
    },
    {
      name: 'Join Live Sessions',
      icon: Play,
      url: settings?.kajabi_url || 'https://www.the-growth-academy.co/library',
      external: true,
      color: 'from-orange-600 to-red-500',
      featured: true
    },
    {
      name: 'Video Tutorials',
      icon: Video,
      url: settings?.kajabi_url || 'https://www.the-growth-academy.co/library',
      external: true,
      color: 'from-blue-600 to-cyan-500'
    },
    {
      name: 'Resources & Downloads',
      icon: FileText,
      url: settings?.kajabi_url || 'https://www.the-growth-academy.co/library',
      external: true,
      color: 'from-green-600 to-emerald-500'
    },
    {
      name: 'Community',
      icon: Users,
      url: settings?.whatsapp_community_url || settings?.kajabi_url || 'https://www.the-growth-academy.co/library',
      external: true,
      color: 'from-pink-600 to-rose-500'
    }
  ];

  return (
    <aside className="w-80 bg-gradient-to-b from-slate-900 to-slate-800 min-h-screen flex flex-col border-r border-slate-700">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <img 
          src="https://storage.googleapis.com/msgsndr/DVqsiywKVWkfZ4I0mXQ1/media/693348610439b8283bf88818.svg" 
          alt="MarTech Mastery" 
          className="w-[90%] h-auto brightness-0 invert"
        />
        <p className="text-slate-400 text-sm mt-3">Learning Hub</p>
      </div>

      {/* Back to Dashboard */}
      <div className="p-4 border-b border-slate-700">
        <Link
          to={createPageUrl('StudentDashboard')}
          className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group bg-orange-600 hover:bg-orange-700"
        >
          <Home className="w-5 h-5 text-white" />
          <span className="font-semibold text-white text-sm">Back to Dashboard</span>
        </Link>
      </div>

      {/* Learning Links */}
      <nav className="flex-1 p-4 space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold px-3 mb-4">
          Learning Resources
        </p>
        {learningLinks.map((link, index) => (
          <motion.div
            key={link.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`
                flex items-center gap-3 px-3 py-3.5 rounded-xl transition-all duration-200 group
                ${link.featured 
                  ? 'bg-orange-600/20 border-2 border-orange-500 hover:bg-orange-600/30' 
                  : 'hover:bg-slate-700/50'
                }
              `}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${link.color} flex-shrink-0`}>
                <link.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${link.featured ? 'text-orange-400' : 'text-slate-200'} group-hover:text-white`}>
                  {link.name}
                </p>
                {link.featured && (
                  <p className="text-[10px] text-orange-300">Live now</p>
                )}
              </div>
              <ExternalLink className={`w-4 h-4 flex-shrink-0 ${link.featured ? 'text-orange-400' : 'text-slate-500'} group-hover:text-slate-300`} />
            </a>
          </motion.div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <p className="text-xs text-slate-500 text-center">
          MarTech Mastery © 2026
        </p>
      </div>
    </aside>
  );
}
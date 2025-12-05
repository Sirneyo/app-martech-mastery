import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  LayoutDashboard, 
  BookOpen, 
  GraduationCap, 
  Award, 
  ExternalLink,
  ChevronRight,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Sidebar({ currentPageName }) {
  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
    { name: 'Courses', icon: BookOpen, page: 'Courses' },
    { name: 'Certifications', icon: Award, page: 'Certifications' },
  ];

  return (
    <aside className="w-72 bg-gradient-to-b from-slate-950 to-slate-900 min-h-screen flex flex-col border-r border-slate-800/50">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800/50">
        <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">MarTech</h1>
            <p className="text-xs text-slate-400 font-medium">Mastery Program</p>
          </div>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold px-3 mb-3">
          Learning
        </p>
        {navItems.map((item) => {
          const isActive = currentPageName === item.page;
          return (
            <Link
              key={item.name}
              to={createPageUrl(item.page)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                ${isActive 
                  ? 'bg-blue-500/10 text-blue-400' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }
              `}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <span className="font-medium text-sm">{item.name}</span>
              {isActive && (
                <motion.div 
                  layoutId="activeIndicator"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Tools Section */}
      <div className="p-4 border-t border-slate-800/50">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold px-3 mb-3">
          Tools
        </p>
        
        {/* Begin Learning - Kajabi */}
        <a
          href="https://www.the-growth-academy.co/library"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group mb-2 bg-slate-800/30 hover:bg-slate-800/60 border border-transparent"
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-500">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-300 group-hover:text-white">
              Begin Learning
            </p>
            <p className="text-[10px] text-slate-500">Opens in new tab</p>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
        </a>

        {/* Visit Marketo - Opens in new tab */}
        <a
          href="https://experience.adobe.com/#/@oadsolutionsltd/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group bg-slate-800/30 hover:bg-slate-800/60 border border-transparent"
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-red-600 to-orange-500">
            <ExternalLink className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-300 group-hover:text-white">
              Visit Marketo
            </p>
            <p className="text-[10px] text-slate-500">Opens in new tab</p>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
        </a>
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-slate-800/50">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-slate-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">Student</p>
            <p className="text-[10px] text-slate-500">Pro Member</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
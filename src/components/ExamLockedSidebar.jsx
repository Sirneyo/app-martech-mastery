import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LayoutDashboard, BookOpen, FolderKanban, Award, Briefcase, GraduationCap, Lock } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard',    icon: LayoutDashboard, page: 'StudentDashboard' },
  { label: 'Assignments',  icon: BookOpen,         page: 'StudentAssignments' },
  { label: 'Projects',     icon: FolderKanban,     page: 'StudentProjects' },
  { label: 'Portfolio',    icon: Award,            page: 'StudentPortfolio' },
  { label: 'Certification',icon: GraduationCap,    page: 'StudentCertification' },
  { label: 'Client Work',  icon: Briefcase,        page: 'StudentClientProjects' },
];

/**
 * Sidebar shown during the exam.
 * isPaused=true  → links are active (exam paused, student can navigate away)
 * isPaused=false → links are blocked with a lock overlay
 */
export default function ExamLockedSidebar({ isPaused }) {
  return (
    <div className="relative flex-shrink-0 w-[68px] bg-slate-900 border-r border-slate-800 flex flex-col items-center py-4 gap-1 overflow-hidden">
      {/* Logo mark */}
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center mb-3 flex-shrink-0">
        <GraduationCap className="w-4 h-4 text-white" />
      </div>

      {NAV_ITEMS.map(({ label, icon: Icon, page }) =>
        isPaused ? (
          <Link
            key={page}
            to={createPageUrl(page)}
            title={label}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <Icon className="w-5 h-5" />
          </Link>
        ) : (
          <div
            key={page}
            title={`${label} — locked during exam`}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-700 cursor-not-allowed"
          >
            <Icon className="w-5 h-5" />
          </div>
        )
      )}

      {/* Lock badge */}
      {!isPaused && (
        <div className="mt-auto pb-2 flex flex-col items-center gap-1">
          <div className="w-7 h-7 rounded-lg bg-red-900/40 border border-red-700/40 flex items-center justify-center">
            <Lock className="w-3.5 h-3.5 text-red-400" />
          </div>
        </div>
      )}
    </div>
  );
}
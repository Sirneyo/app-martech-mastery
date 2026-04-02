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
    <div
      className="relative flex-shrink-0 w-[68px] flex flex-col items-center py-4 gap-1 overflow-hidden"
      style={{ background: 'rgba(10,10,15,0.95)', borderRight: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}
    >
      {/* Logo mark */}
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
        <GraduationCap className="w-4 h-4 text-white" />
      </div>

      {NAV_ITEMS.map(({ label, icon: Icon, page }) =>
        isPaused ? (
          <Link
            key={page}
            to={createPageUrl(page)}
            title={label}
            className="w-11 h-11 rounded-xl flex items-center justify-center transition-all"
            style={{ color: 'rgba(148,163,184,0.8)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(148,163,184,0.8)'; }}
          >
            <Icon className="w-5 h-5" />
          </Link>
        ) : (
          <div
            key={page}
            title={`${label} — locked during exam`}
            className="w-11 h-11 rounded-xl flex items-center justify-center cursor-not-allowed"
            style={{ color: 'rgba(255,255,255,0.15)' }}
          >
            <Icon className="w-5 h-5" />
          </div>
        )
      )}

      {/* Lock badge */}
      {!isPaused && (
        <div className="mt-auto pb-2 flex flex-col items-center">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <Lock className="w-3.5 h-3.5 text-red-400/70" />
          </div>
        </div>
      )}
    </div>
  );
}
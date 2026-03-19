import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  LayoutDashboard, 
  Award, 
  ExternalLink,
  ChevronRight,
  Zap,
  ClipboardList,
  FolderOpen,
  Briefcase,
  ChevronLeft,
  LifeBuoy,
  Lock,
  GraduationCap,
  Video,
  BarChart2,
  Library,
  Target,
  BookOpen
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function StudentSidebar({ currentPageName, onNavigate }) {
  const isProjectPage = currentPageName === 'StudentSimProjects' || currentPageName === 'StudentSimProjectDetail';
  const [isCollapsed, setIsCollapsed] = useState(isProjectPage);
  const [userHasToggled, setUserHasToggled] = useState(false);

  // Auto-collapse on project pages only if the user hasn't manually toggled
  React.useEffect(() => {
    if (!userHasToggled) {
      setIsCollapsed(isProjectPage);
    }
  }, [currentPageName]);

  const collapsed = isCollapsed;

  const handleToggle = () => {
    setUserHasToggled(true);
    setIsCollapsed(prev => !prev);
  };

  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const result = await base44.entities.AppSettings.list();
      return result[0] || {};
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: membership } = useQuery({
    queryKey: ['my-cohort-membership'],
    queryFn: async () => {
      if (!currentUser?.id) return null;
      const memberships = await base44.entities.CohortMembership.filter({ user_id: currentUser.id, status: 'active' });
      return memberships[0];
    },
    enabled: !!currentUser?.id,
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

  const isMarketoLocked = (() => {
    if (!cohort?.start_date) return true;
    const unlockTime = new Date(cohort.start_date);
    unlockTime.setHours(11, 0, 0, 0);
    return new Date() < unlockTime;
  })();

  const currentWeek = cohort?.current_week || 0;

  const certItems = [
    { name: 'Glossary', icon: Library, page: 'StudentGlossary' },
    { name: 'Assignments', icon: ClipboardList, page: 'StudentAssignments' },
  ];

  const careerItems = [
    { name: 'Projects', icon: FolderOpen, page: 'StudentSimProjects' },
    { name: 'Portfolio', icon: Briefcase, page: 'StudentPortfolio' },
    { name: 'AI Tools', icon: Zap, page: 'StudentAITools' },
    { name: 'Resources', icon: BookOpen, page: 'StudentAssignments', unlock_week: 8 },
  ];

  const NavLink = ({ item }) => {
    const isActive = currentPageName === item.page;
    const isLocked = item.unlock_week && currentWeek < item.unlock_week;

    if (isLocked) {
      return (
        <div
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl opacity-50 cursor-not-allowed ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? `${item.name} (Week ${item.unlock_week})` : `Unlocks at Week ${item.unlock_week}`}
        >
          <item.icon className="w-5 h-5 flex-shrink-0 text-slate-400" />
          {!collapsed && (
            <>
              <span className="font-medium text-sm flex-1 text-slate-400">{item.name}</span>
              <Lock className="w-3.5 h-3.5 text-slate-400" />
            </>
          )}
        </div>
      );
    }

    return (
      <Link
        to={createPageUrl(item.page)}
        onClick={onNavigate}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
          isActive ? 'bg-white text-slate-900' : 'text-slate-600 hover:bg-white/60'
        } ${collapsed ? 'justify-center' : ''}`}
        title={collapsed ? item.name : ''}
      >
        <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-slate-800' : 'text-slate-500'}`} />
        {!collapsed && <span className="font-medium text-sm flex-1">{item.name}</span>}
        {isActive && !collapsed && (
          <motion.div layoutId="activeIndicator" className="ml-auto w-1.5 h-1.5 rounded-full bg-slate-500" />
        )}
      </Link>
    );
  };

  return (
    <aside className={`${collapsed ? 'w-20' : 'w-72'} bg-gradient-to-b from-slate-100 to-slate-200 h-screen flex flex-col border-r border-slate-300 transition-all duration-300 relative overflow-hidden`}>
      {/* Logo */}
      <div className="p-4 border-b border-slate-300 flex items-center justify-between">
        {!collapsed && (
          <Link to={createPageUrl('StudentDashboard')}>
            <img 
              src="https://storage.googleapis.com/msgsndr/DVqsiywKVWkfZ4I0mXQ1/media/693348610439b8283bf88818.svg" 
              alt="MarTech Mastery" 
              className="w-[90%] h-auto"
            />
          </Link>
        )}
        {collapsed && (
          <Link to={createPageUrl('StudentDashboard')} className="mx-auto">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693261f4a46b591b7d38e623/96938fb06_OADSolutionsRebrand1.png" 
              alt="M" 
              className="w-10 h-10"
            />
          </Link>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsCollapsed(prev => !prev)}
        className="absolute -right-3 bottom-8 z-50 h-6 w-6 rounded-full bg-white border border-slate-300 hover:bg-slate-100"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </Button>

      <div className="flex-1 overflow-y-auto">
        {/* Tools section (original) */}
        <div className="px-4 pb-2 border-t border-slate-300 pt-4">
          {!collapsed && (
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold px-3 mb-3">
              Tools
            </p>
          )}
          <div className="space-y-1">
            <a
              href={settings?.kajabi_url || 'https://www.the-growth-academy.co/library'}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group bg-white/50 border border-slate-200 ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? 'Begin Learning' : ''}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-purple-600 to-violet-500 flex-shrink-0">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700">Begin Learning</p>
                    <p className="text-[10px] text-slate-500">Courses & Live Sessions</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </>
              )}
            </a>

            {isMarketoLocked ? (
              <div
                className={`flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-100 border border-slate-200 opacity-60 cursor-not-allowed ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? 'Marketo (Locked)' : 'Available from 11:00am on your cohort start date'}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white relative flex-shrink-0">
                  <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693261f4a46b591b7d38e623/81e4b8812_AdobeIcon.png" alt="Adobe" className="w-6 h-6 grayscale" />
                  <Lock className="w-3 h-3 text-slate-500 absolute -bottom-1 -right-1" />
                </div>
                {!collapsed && (
                  <>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-400">Launch Marketo</p>
                      <p className="text-[10px] text-slate-400">Unlocks at 11:00am on start date</p>
                    </div>
                    <Lock className="w-4 h-4 text-slate-400" />
                  </>
                )}
              </div>
            ) : (
              <Link
                to={createPageUrl('MarketoAccess')}
                onClick={onNavigate}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group bg-white/50 border border-slate-200 ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? 'Launch Marketo' : ''}
                >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white flex-shrink-0">
                  <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693261f4a46b591b7d38e623/81e4b8812_AdobeIcon.png" alt="Adobe" className="w-6 h-6" />
                </div>
                {!collapsed && (
                  <>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-700">Launch Marketo</p>
                      <p className="text-[10px] text-slate-500">Access Marketo</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </>
                )}
              </Link>
            )}

            <Link
              to={createPageUrl('StudentAITools')}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group bg-white/50 border border-slate-200 ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? 'AI Tools' : ''}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-500 flex-shrink-0">
                <Zap className="w-4 h-4 text-white" />
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700">AI Tools</p>
                    <p className="text-[10px] text-slate-500">MarTech AI Assistant</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </>
              )}
            </Link>
          </div>
        </div>

        {/* Section 1: MarTech Mastery Certification */}
        <div className="px-4 pb-2 mt-4 border-t border-slate-300 pt-4">
          <div className="space-y-1 mb-3">
            <Link
              to={createPageUrl('StudentDashboard')}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                currentPageName === 'StudentDashboard' ? 'bg-white text-slate-900' : 'text-slate-600 hover:bg-white/60'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? 'Dashboard' : ''}
            >
              <LayoutDashboard className={`w-5 h-5 flex-shrink-0 ${currentPageName === 'StudentDashboard' ? 'text-slate-800' : 'text-slate-500'}`} />
              {!collapsed && <span className="font-medium text-sm flex-1">Dashboard</span>}
              {currentPageName === 'StudentDashboard' && !collapsed && (
                <motion.div layoutId="activeIndicator" className="ml-auto w-1.5 h-1.5 rounded-full bg-slate-500" />
              )}
            </Link>
          </div>
          {!collapsed && (
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold px-3 mb-3">
              MarTech Mastery Certification
            </p>
          )}
          <div className="space-y-1">
            {certItems.map(item => <NavLink key={item.name} item={item} />)}

            {/* Videos & Live Sessions — external */}
            <a
              href={settings?.kajabi_url || 'https://www.the-growth-academy.co/library'}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-slate-600 hover:bg-white/60 ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? 'Videos & Live Sessions' : ''}
            >
              <Video className="w-5 h-5 flex-shrink-0 text-slate-500 group-hover:text-slate-700" />
              {!collapsed && (
                <>
                  <span className="font-medium text-sm flex-1">Videos &amp; Live Sessions</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </>
              )}
            </a>

            {/* Marketo — with lock logic */}
            {isMarketoLocked ? (
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl opacity-50 cursor-not-allowed ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? 'Marketo (Locked)' : 'Available from 11:00am on your cohort start date'}
              >
                <div className="relative flex-shrink-0">
                  <BarChart2 className="w-5 h-5 text-slate-400" />
                  <Lock className="w-2.5 h-2.5 text-slate-400 absolute -bottom-1 -right-1" />
                </div>
                {!collapsed && <span className="font-medium text-sm text-slate-400">Marketo</span>}
              </div>
            ) : (
              <Link
                to={createPageUrl('MarketoAccess')}
                onClick={onNavigate}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                  currentPageName === 'MarketoAccess' ? 'bg-white text-slate-900' : 'text-slate-600 hover:bg-white/60'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? 'Marketo' : ''}
              >
                <BarChart2 className={`w-5 h-5 flex-shrink-0 ${currentPageName === 'MarketoAccess' ? 'text-slate-800' : 'text-slate-500'}`} />
                {!collapsed && <span className="font-medium text-sm flex-1">Marketo</span>}
              </Link>
            )}

            {/* Certification Exams */}
            <NavLink item={{ name: 'Certification Exams', icon: Award, page: 'StudentCertification' }} />
          </div>
        </div>

        {/* Section 2: Career Acceleration */}
        <div className="px-4 pb-2 mt-4 border-t border-slate-300 pt-4">
          {!collapsed && (
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold px-3 mb-3">
              Career Acceleration
            </p>
          )}
          <div className="space-y-1">
            {careerItems.map(item => <NavLink key={item.name} item={item} />)}
          </div>
        </div>
      </div>

      {/* Support at bottom */}
      <div className="p-4 border-t border-slate-300">
        <Link
          to={createPageUrl('StudentSupport')}
          onClick={onNavigate}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
            currentPageName === 'StudentSupport' ? 'bg-orange-500/10 text-orange-600' : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
          } ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Support' : ''}
        >
          <LifeBuoy className={`w-5 h-5 flex-shrink-0 ${currentPageName === 'StudentSupport' ? 'text-orange-600' : 'text-slate-500 group-hover:text-slate-700'}`} />
          {!collapsed && <span className="font-medium text-sm">Support</span>}
        </Link>
      </div>
    </aside>
  );
}
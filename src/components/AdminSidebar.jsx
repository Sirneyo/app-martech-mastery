import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Calendar, FileText, LayoutDashboard, ChevronLeft, ChevronRight, ClipboardList, FolderCheck, Award, GraduationCap, ExternalLink, Zap, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function AdminSidebar({ currentPageName, onNavigate }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const result = await base44.entities.AppSettings.list();
      return result[0] || {};
    },
  });

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'AdminDashboard' },
    { name: 'Users', icon: Users, page: 'AdminUsers' },
    { name: 'Students', icon: GraduationCap, page: 'AdminStudents' },
    { name: 'Cohorts', icon: Calendar, page: 'AdminCohorts' },
    { name: 'Attendance', icon: ClipboardList, page: 'AdminAttendance' },
    { name: 'Submissions', icon: ClipboardList, page: 'AdminSubmissions' },
    { name: 'Portfolio', icon: FolderCheck, page: 'AdminPortfolio' },
    { name: 'Exams', icon: Award, page: 'AdminExams' },
    { name: 'Templates', icon: FileText, page: 'AdminTemplates' },
    { name: 'Exam Bank Import', icon: FileText, page: 'AdminExamBankImport' },
  ];

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-72'} bg-gradient-to-b from-slate-100 to-slate-200 h-screen flex flex-col border-r border-slate-300 transition-all duration-300 relative overflow-hidden`}>
      <div className="p-4 border-b border-slate-300 flex items-center justify-between">
        {!isCollapsed && (
          <Link to={createPageUrl('AdminUsers')}>
            <img 
              src="https://storage.googleapis.com/msgsndr/DVqsiywKVWkfZ4I0mXQ1/media/693348610439b8283bf88818.svg" 
              alt="MarTech Mastery" 
              className="w-[90%] h-auto"
            />
          </Link>
        )}
        {isCollapsed && (
          <Link to={createPageUrl('AdminUsers')} className="mx-auto">
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
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 bottom-8 z-50 h-6 w-6 rounded-full bg-white border border-slate-300 hover:bg-slate-100"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </Button>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {!isCollapsed && (
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold px-3 mb-3">
            Administration
          </p>
        )}
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
                  ? 'bg-orange-500/10 text-orange-600' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }
                ${isCollapsed ? 'justify-center' : ''}
              `}
              title={isCollapsed ? item.name : ''}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-orange-600' : 'text-slate-500 group-hover:text-slate-700'}`} />
              {!isCollapsed && <span className="font-medium text-sm">{item.name}</span>}
              {isActive && !isCollapsed && (
                <motion.div 
                  layoutId="activeIndicator"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-600"
                />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
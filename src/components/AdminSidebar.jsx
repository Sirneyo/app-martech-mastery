import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Users, Calendar, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminSidebar({ currentPageName, onNavigate }) {
  const navItems = [
    { name: 'Users', icon: Users, page: 'AdminUsers' },
    { name: 'Cohorts', icon: Calendar, page: 'AdminCohorts' },
    { name: 'Templates', icon: FileText, page: 'AdminTemplates' },
  ];

  return (
    <aside className="w-72 bg-gradient-to-b from-slate-100 to-slate-200 min-h-screen flex flex-col border-r border-slate-300">
      <div className="p-4 border-b border-slate-300">
        <Link to={createPageUrl('AdminUsers')}>
          <img 
            src="https://storage.googleapis.com/msgsndr/DVqsiywKVWkfZ4I0mXQ1/media/693348610439b8283bf88818.svg" 
            alt="MarTech Mastery" 
            className="w-full h-auto"
          />
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold px-3 mb-3">
          Administration
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
                  ? 'bg-orange-500/10 text-orange-600' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }
              `}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-orange-600' : 'text-slate-500 group-hover:text-slate-700'}`} />
              <span className="font-medium text-sm">{item.name}</span>
              {isActive && (
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
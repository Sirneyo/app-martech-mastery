import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Menu, X, Settings, User, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import StudentSidebar from '@/components/StudentSidebar';
import TutorSidebar from '@/components/TutorSidebar';
import AdminSidebar from '@/components/AdminSidebar';
import LoadingLogo from '@/components/LoadingLogo';
import AIAssistant from '@/components/AIAssistant';
import { Toaster } from 'sonner';

export default function RoleBasedLayout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserAndTrackLogin();
  }, []);

  const loadUserAndTrackLogin = async () => {
    try {
      const userData = await base44.auth.me();
      if (!userData) {
        setLoading(false);
        base44.auth.redirectToLogin(window.location.pathname);
        return;
      }

      setUser(userData);
      setLoading(false);
      
      // Track login event in background
      trackLoginEvent(userData).catch(err => console.error('Login tracking error:', err));
    } catch (error) {
      console.error('Error loading user:', error);
      setLoading(false);
      base44.auth.redirectToLogin(window.location.pathname);
    }
  };

  const trackLoginEvent = async (userData) => {
    const today = new Date().toISOString().split('T')[0];
    const loginEvents = await base44.entities.LoginEvent.filter({ 
      user_id: userData.id,
      login_time: today
    });
    
    if (loginEvents.length === 0) {
      await base44.entities.LoginEvent.create({
        user_id: userData.id,
        login_time: new Date().toISOString(),
        ip_address: '',
        user_agent: navigator.userAgent
      });
      
      const todayPoints = await base44.entities.PointsLedger.filter({
        user_id: userData.id,
        created_date: today
      });
      
      const hasLoginPoints = todayPoints.some(p => p.reason === 'daily_login');
      if (!hasLoginPoints) {
        await base44.entities.PointsLedger.create({
          user_id: userData.id,
          points: 5,
          reason: 'daily_login',
          source_type: 'bonus',
          source_id: today
        });
      }
    }
  };

  const SidebarComponent = user?.app_role === 'admin' ? AdminSidebar : 
                            user?.app_role === 'tutor' ? TutorSidebar : 
                            StudentSidebar;

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <LoadingLogo />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white rounded-lg shadow-md border border-slate-200"
      >
        <Menu className="w-6 h-6 text-slate-700" />
      </button>

      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="relative">
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden absolute top-4 right-4 z-50 p-1 text-slate-500 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
          <SidebarComponent currentPageName={currentPageName} onNavigate={() => setSidebarOpen(false)} />
        </div>
      </div>

      <main className="flex-1 h-screen overflow-y-auto lg:ml-0">
        <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3">
          <div className="flex items-center justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-all group">
                  {user?.profile_picture ? (
                    <img
                      src={user.profile_picture}
                      alt={user.full_name}
                      className="w-9 h-9 rounded-full object-cover border-2 border-slate-200"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-500 flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-medium text-slate-700">
                      {user?.full_name || 'Loading...'}
                    </p>
                    <p className="text-[10px] text-slate-500 capitalize">
                      {user?.app_role || 'student'}
                    </p>
                  </div>
                  <Settings className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl(
                    user?.app_role === 'admin' ? 'AdminProfile' :
                    user?.app_role === 'tutor' ? 'TutorProfile' :
                    'StudentProfile'
                  )}>
                    <User className="w-4 h-4 mr-2" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => base44.auth.logout()}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {children}
      </main>
      {user?.app_role === 'student' && <AIAssistant />}
      <Toaster position="top-right" />
    </div>
  );
}
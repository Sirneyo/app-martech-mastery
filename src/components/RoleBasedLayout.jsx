import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Menu, X, Settings, User, LogOut } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ProfileModal from '@/components/ProfileModal';
import StudentSidebar from '@/components/StudentSidebar';
import TutorSidebar from '@/components/TutorSidebar';
import AdminSidebar from '@/components/AdminSidebar';

export default function RoleBasedLayout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  useEffect(() => {
    loadUserAndTrackLogin();
  }, []);

  const loadUserAndTrackLogin = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      
      // Track login event
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
        
        // Award daily login points
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
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const SidebarComponent = user?.role === 'admin' ? AdminSidebar : 
                          currentPageName?.startsWith('Tutor') ? TutorSidebar : 
                          StudentSidebar;

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
                      {user?.role || 'user'}
                    </p>
                  </div>
                  <Settings className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setProfileModalOpen(true)}>
                  <User className="w-4 h-4 mr-2" />
                  Profile Settings
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

      <ProfileModal open={profileModalOpen} onOpenChange={setProfileModalOpen} />
    </div>
  );
}
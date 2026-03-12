import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Menu, X, Settings, User, LogOut, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import StudentSidebar from '@/components/StudentSidebar';
import TutorSidebar from '@/components/TutorSidebar';
import AdminSidebar from '@/components/AdminSidebar';
import LoadingLogo from '@/components/LoadingLogo';
import AIAssistant from '@/components/AIAssistant';
import NotificationBell from '@/components/NotificationBell';
import { Toaster } from 'sonner';

// Infer which role's sidebar a super_admin should see based on the current page name
function inferViewAsRole(pageName) {
  if (!pageName) return null;
  if (pageName.startsWith('Student') || pageName === 'MarketoAccess') return 'student';
  if (pageName.startsWith('Tutor')) return 'tutor';
  return null; // admin / super_admin pages
}

export default function RoleBasedLayout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loginTracked, setLoginTracked] = useState(false);
  const queryClient = useQueryClient();

  const { data: user, isLoading: loading } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const userData = await base44.auth.me();
      if (!userData) {
        base44.auth.redirectToLogin(window.location.pathname);
        return null;
      }

      // If impersonating, override the 'current-user' query cache so all pages
      // fetch data for the impersonated user instead of the real super admin
      const impersonated = (() => {
        if (userData.app_role !== 'super_admin') return null;
        try { return JSON.parse(sessionStorage.getItem('impersonatingUser') || 'null'); } catch { return null; }
      })();
      if (impersonated) {
        return {
          ...userData,
          id: impersonated.id,
          full_name: impersonated.full_name,
          email: impersonated.email,
          app_role: impersonated.app_role,
          _realRole: userData.app_role,
        };
      }

      return userData;
    },
    staleTime: 0,
  });

  useEffect(() => {
    if (user && !loginTracked) {
      setLoginTracked(true);
      // Track login event in background
      trackLoginEvent(user).catch(err => console.error('Login tracking error:', err));
      // Cleanup: remove any stale daily_login points created by old cached code
      base44.entities.PointsLedger.filter({ user_id: user.id, reason: 'daily_login' })
        .then(entries => entries.forEach(e => base44.entities.PointsLedger.delete(e.id)))
        .catch(() => {});
    }
  }, [user, loginTracked]);

  const trackLoginEvent = async (userData) => {
    const today = new Date().toISOString().split('T')[0];
    const existingEvents = await base44.entities.LoginEvent.filter({ user_id: userData.id });
    const alreadyLoggedToday = existingEvents.some(e => e.login_time?.startsWith(today));
    if (alreadyLoggedToday) return;
    await base44.entities.LoginEvent.create({
      user_id: userData.id,
      login_time: new Date().toISOString(),
      ip_address: '',
      user_agent: navigator.userAgent
    });
  };

  // User-level impersonation (View as User feature) — super_admin only
  const impersonatingUser = (() => {
    if (user?.app_role !== 'super_admin' && user?._realRole !== 'super_admin') return null;
    try { return JSON.parse(sessionStorage.getItem('impersonatingUser') || 'null'); } catch { return null; }
  })();

  // For super admins, infer from page name first; fall back to sessionStorage for mixed pages
  const pageInferredRole = inferViewAsRole(currentPageName);
  const viewAsRole = impersonatingUser?.app_role || pageInferredRole || sessionStorage.getItem('superAdminViewAs') || null;

  // Super admins viewing another role's pages use the inferred role for sidebar
  const isSuperAdminViewing = user?.app_role === 'super_admin' && !!viewAsRole;
  const effectiveRole = isSuperAdminViewing ? viewAsRole : user?.app_role;
  const roleForSidebar = effectiveRole;
  const SidebarComponent = (roleForSidebar === 'admin' || roleForSidebar === 'super_admin') ? AdminSidebar : 
                            roleForSidebar === 'tutor' ? TutorSidebar : 
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
          <div className="flex items-center justify-end gap-2">
            <NotificationBell />
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
                    (user?.app_role === 'admin' || user?.app_role === 'super_admin') ? 'AdminProfile' :
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

        {impersonatingUser ? (
          <div className="bg-amber-500 text-white px-6 py-2.5 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Eye className="w-4 h-4 shrink-0" />
              Viewing as <strong className="ml-1">{impersonatingUser.full_name || impersonatingUser.email}</strong>
              <span className="opacity-75">({impersonatingUser.email})</span>
            </span>
            <button
              onClick={async () => {
                // Log exit
                try {
                  const me = await base44.auth.me();
                  await base44.entities.AdminAuditLog.create({
                    action: 'impersonate_end',
                    admin_id: me?.id,
                    admin_name: me?.full_name || me?.email,
                    target_user_id: impersonatingUser.id,
                    target_user_name: impersonatingUser.full_name,
                    target_user_email: impersonatingUser.email,
                    target_user_role: impersonatingUser.app_role,
                    timestamp: new Date().toISOString(),
                  });
                } catch(e) { /* silent */ }
                sessionStorage.removeItem('impersonatingUser');
                window.location.href = createPageUrl('SuperAdminDashboard');
              }}
              className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md font-medium transition-colors whitespace-nowrap ml-4"
            >
              Exit
            </button>
          </div>
        ) : isSuperAdminViewing && (
          <div className="bg-violet-600 text-white px-6 py-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Viewing as <strong className="capitalize ml-1">{viewAsRole}</strong>
            </span>
            <button
              onClick={() => {
                sessionStorage.removeItem('superAdminViewAs');
                window.location.href = createPageUrl('SuperAdminDashboard');
              }}
              className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md font-medium transition-colors"
            >
              Exit View → Super Admin
            </button>
          </div>
        )}
        {children}
      </main>
      {effectiveRole === 'student' && <AIAssistant />}
      <Toaster position="top-right" />
    </div>
  );
}
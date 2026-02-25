import React from 'react';
import { Navigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import LoadingLogo from '@/components/LoadingLogo';

export default function Dashboard() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (error) {
      console.error('Error loading user:', error);
      // User not authenticated, redirect to custom login
      window.location.href = createPageUrl('Home');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <LoadingLogo />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Redirect based on role
  if (user.app_role === 'admin') {
    return <Navigate to={createPageUrl('AdminDashboard')} replace />;
  }

  if (user.app_role === 'tutor') {
    return <Navigate to={createPageUrl('TutorDashboard')} replace />;
  }

  return <Navigate to={createPageUrl('StudentDashboard')} replace />;
}
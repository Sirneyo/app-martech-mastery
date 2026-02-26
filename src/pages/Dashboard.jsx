import React from 'react';
import { Navigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import LoadingLogo from '@/components/LoadingLogo';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

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
      base44.auth.redirectToLogin();
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

  // Users who signed up without an invitation have no app_role — block them
  if (!user.app_role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <ShieldAlert className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <CardTitle className="text-xl">Access Not Granted</CardTitle>
            <CardDescription className="text-base mt-2">
              This platform is invite-only. Your account does not have access yet. Please contact your programme administrator for an invitation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full bg-orange-500 hover:bg-orange-600"
              onClick={() => base44.auth.logout()}
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
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
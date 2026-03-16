import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function AccessDenied() {
  const [userRole, setUserRole] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(u => setUserRole(u?.app_role)).catch(() => {});
  }, []);

  const dashboardLink =
    userRole === 'admin' || userRole === 'super_admin' ? '/AdminDashboard' :
    userRole === 'tutor' ? '/TutorDashboard' :
    '/StudentDashboard';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <ShieldX className="w-10 h-10 text-red-500" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Access Denied</h1>
        <p className="text-slate-500 mb-8">
          You don't have permission to view this page. Please contact your administrator if you believe this is a mistake.
        </p>
        <Button asChild>
          <Link to={dashboardLink}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
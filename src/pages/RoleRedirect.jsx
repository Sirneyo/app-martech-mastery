import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Loader2 } from 'lucide-react';

export default function RoleRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    redirectBasedOnRole();
  }, []);

  const redirectBasedOnRole = async () => {
    try {
      const user = await base44.auth.me();
      
      if (user.app_role === 'admin') {
        navigate(createPageUrl('AdminUsers'));
      } else if (user.app_role === 'tutor') {
        navigate(createPageUrl('TutorDashboard'));
      } else {
        navigate(createPageUrl('StudentDashboard'));
      }
    } catch (error) {
      console.error('Error redirecting:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-violet-600 mx-auto mb-4" />
        <p className="text-slate-600">Redirecting...</p>
      </div>
    </div>
  );
}
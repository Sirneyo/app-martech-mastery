import React from 'react';
import RoleBasedLayout from '@/components/RoleBasedLayout';

export default function Layout({ children, currentPageName }) {
  // Pages that don't require authentication
  const publicPages = ['AcceptInvitation', 'Dashboard'];
  
  if (publicPages.includes(currentPageName)) {
    return <>{children}</>;
  }

  // Map page names to sidebar roles for super admin view-as functionality
  const roleOverrideMap = {
    'StudentDashboard': 'student',
    'TutorDashboard': 'tutor',
    'AdminDashboard': 'admin'
  };

  return (
    <RoleBasedLayout currentPageName={currentPageName} overrideSidebarRole={roleOverrideMap[currentPageName]}>
      {children}
    </RoleBasedLayout>
  );
}
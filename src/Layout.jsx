import React from 'react';
import RoleBasedLayout from '@/components/RoleBasedLayout';

export default function Layout({ children, currentPageName }) {
  // Pages that don't require authentication
  const publicPages = ['AcceptInvitation', 'Dashboard'];
  
  if (publicPages.includes(currentPageName)) {
    return <>{children}</>;
  }

  return (
    <RoleBasedLayout currentPageName={currentPageName}>
      {children}
    </RoleBasedLayout>
  );
}
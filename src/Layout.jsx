import React from 'react';
import RoleBasedLayout from '@/components/RoleBasedLayout';

export default function Layout({ children, currentPageName }) {
  return (
    <RoleBasedLayout currentPageName={currentPageName}>
      {children}
    </RoleBasedLayout>
  );
}
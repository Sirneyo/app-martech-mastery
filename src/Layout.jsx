import React, { useState, useEffect } from 'react';
import 'react-quill/dist/quill.snow.css';
import RoleBasedLayout from '@/components/RoleBasedLayout';
import PausedAccountScreen from '@/components/PausedAccountScreen';
import { base44 } from '@/api/base44Client';

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Pages that don't require authentication
  const publicPages = ['AcceptInvitation', 'Dashboard'];

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.log('User not authenticated');
      } finally {
        setLoading(false);
      }
    };

    checkUserStatus();
  }, []);

  if (loading) {
    return null;
  }

  const isPaused = user?.status === 'paused' && !publicPages.includes(currentPageName);

  if (publicPages.includes(currentPageName)) {
    return <>{children}</>;
  }

  return (
    <>
      <div style={{ pointerEvents: isPaused ? 'none' : 'auto', userSelect: isPaused ? 'none' : 'auto' }}>
        <RoleBasedLayout currentPageName={currentPageName}>
          {children}
        </RoleBasedLayout>
      </div>
      {isPaused && <PausedAccountScreen />}
    </>
  );
}
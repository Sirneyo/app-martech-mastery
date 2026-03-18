import React, { useState, useEffect } from 'react';
import 'react-quill/dist/quill.snow.css';
import RoleBasedLayout from '@/components/RoleBasedLayout';
import PausedAccountScreen from '@/components/PausedAccountScreen';
import AccessDenied from '@/pages/AccessDenied';
import { base44 } from '@/api/base44Client';

// Central page access map — list of allowed roles per page.
// super_admin is always allowed everywhere (handled separately).
const PAGE_ACCESS = {
  // Student-only pages
  StudentDashboard: ['student'],
  StudentAssignments: ['student'],
  StudentAssignmentDetail: ['student'],
  StudentProjects: ['student'],
  StudentProjectDetail: ['student'],
  StudentPortfolio: ['student'],
  StudentPortfolioItemDetail: ['student'],
  StudentCertification: ['student'],
  StudentCertificationAttempt: ['student'],
  StudentCertificationConfirm: ['student'],
  StudentCertificationReady: ['student'],
  StudentCertificationResults: ['student'],
  StudentCertificationLoading: ['student'],
  StudentCertificationReview: ['student'],
  StudentGlossary: ['student'],
  StudentGlossaryDetail: ['student'],
  StudentSupport: ['student'],
  StudentAITools: ['student'],
  MyCertification: ['student'],
  MyPortfolio: ['student'],
  MyProjects: ['student'],
  StudentProfile: ['student'],

  // Tutor-only pages
  TutorDashboard: ['tutor'],
  TutorStudents: ['tutor'],
  TutorCohorts: ['tutor'],
  TutorAssignmentSubmissions: ['tutor'],
  TutorProjectSubmissions: ['tutor'],
  TutorSubmissionReview: ['tutor'],
  TutorPortfolioReviews: ['tutor'],
  TutorPortfolioReview: ['tutor'],
  TutorAITools: ['tutor'],
  TutorAttendance: ['tutor'],
  TutorQuizGrading: ['tutor'],
  TutorProfile: ['tutor'],

  // Admin-only pages
  AdminDashboard: ['admin'],
  AdminUsers: ['admin'],
  AdminStudents: ['admin'],
  AdminSupportTickets: ['admin'],
  AdminCohortOverview: ['admin'],
  AdminCohorts: ['admin'],
  AdminExams: ['admin'],
  AdminPortfolio: ['admin'],
  AdminSubmissions: ['admin'],
  AdminSubmissionDetail: ['admin'],
  AdminGlossary: ['admin'],
  AdminMediaLibrary: ['admin'],
  AdminTemplates: ['admin'],
  AdminTemplatesStudio: ['admin'],
  AdminTemplatesStudioDuplicate: ['admin'],
  AdminTemplatesStudioEdit: ['admin'],
  AdminTemplatesStudioPreview: ['admin'],
  AdminAnnouncements: ['admin'],
  AdminAttendance: ['admin'],
  AdminCredentials: ['admin'],
  AdminExamBankImport: ['admin'],
  AdminExamDetail: ['admin'],
  AdminOverview: ['admin'],
  AdminQuizResults: ['admin'],
  AdminProfile: ['admin'],
  AdminProjects: ['admin'],
  AdminProjectDetail: ['admin'],
  SuperAdminDashboard: ['admin'],
  MarketoAccess: ['admin', 'student'],
  StaffSupport: ['admin', 'tutor'],
};

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

  // Role-based access check
  // super_admin is always allowed everywhere
  // If impersonating, check against the impersonated user's role
  const impersonatingUser = (() => {
    if (user?.app_role !== 'super_admin') return null;
    try { return JSON.parse(sessionStorage.getItem('impersonatingUser') || 'null'); } catch { return null; }
  })();
  const effectiveRole = impersonatingUser?.app_role || user?.app_role;
  const allowedRoles = PAGE_ACCESS[currentPageName];
  const isSuperAdmin = user?.app_role === 'super_admin';

  if (allowedRoles && !isSuperAdmin && !allowedRoles.includes(effectiveRole)) {
    return <AccessDenied />;
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
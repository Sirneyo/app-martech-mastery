import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import ProjectOnboarding from '@/components/student-projects/ProjectOnboarding';
import ProjectWorkspace from '@/components/student-projects/ProjectWorkspace';

export default function StudentSimProjectDetail() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get('id');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['current-user'], queryFn: () => base44.auth.me() });

  const { data: project } = useQuery({
    queryKey: ['sim-project', projectId],
    queryFn: async () => {
      const r = await base44.entities.SimProject.filter({ id: projectId });
      return r[0] || null;
    },
    enabled: !!projectId,
  });

  const { data: enrollment, isLoading: loadingEnrollment } = useQuery({
    queryKey: ['my-sim-enrollment', projectId, user?.id],
    queryFn: async () => {
      const r = await base44.entities.SimProjectEnrollment.filter({ project_id: projectId, student_user_id: user.id });
      return r[0] || null;
    },
    enabled: !!projectId && !!user?.id,
  });

  if (!projectId || (!project && !loadingEnrollment)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Project not found.</p>
          <Button variant="outline" onClick={() => navigate(createPageUrl('StudentSimProjects'))}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  if (loadingEnrollment || !project) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">Loading...</div>;
  }

  if (!enrollment) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">You are not enrolled in this project.</p>
          <Button variant="outline" onClick={() => navigate(createPageUrl('StudentSimProjects'))}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  const onboardingComplete = enrollment.onboarding_video_watched && enrollment.onboarding_agreement_signed;

  const handleOnboardingComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['my-sim-enrollment', projectId, user?.id] });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {!onboardingComplete ? (
        <ProjectOnboarding
          project={project}
          enrollment={enrollment}
          user={user}
          onComplete={handleOnboardingComplete}
        />
      ) : (
        <ProjectWorkspace
          project={project}
          enrollment={enrollment}
          user={user}
        />
      )}
    </div>
  );
}
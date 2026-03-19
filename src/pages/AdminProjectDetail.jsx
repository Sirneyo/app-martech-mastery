import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Layers, Users, UserCheck, BarChart3 } from 'lucide-react';
import PhasesTab from '@/components/admin-projects/PhasesTab';
import TutorsTab from '@/components/admin-projects/TutorsTab';
import EnrollmentsTab from '@/components/admin-projects/EnrollmentsTab';
import MonitoringTab from '@/components/admin-projects/MonitoringTab';

export default function AdminProjectDetail() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get('id');

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const results = await base44.entities.Project.filter({ id: projectId });
      return results[0] || null;
    },
    enabled: !!projectId,
  });

  if (!projectId) {
    navigate(createPageUrl('AdminProjects'));
    return null;
  }

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">Loading...</div>;
  }

  if (!project) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">Project not found.</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('AdminProjects'))}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">{project.company_name || 'Project'}</p>
            <h1 className="text-2xl font-bold text-slate-900">{project.title}</h1>
          </div>
        </div>

        <Tabs defaultValue="phases">
          <TabsList className="mb-6">
            <TabsTrigger value="phases" className="gap-1.5"><Layers className="w-4 h-4" /> Phases & Tasks</TabsTrigger>
            <TabsTrigger value="tutors" className="gap-1.5"><UserCheck className="w-4 h-4" /> Tutors</TabsTrigger>
            <TabsTrigger value="enrollments" className="gap-1.5"><Users className="w-4 h-4" /> Students</TabsTrigger>
            <TabsTrigger value="monitoring" className="gap-1.5"><BarChart3 className="w-4 h-4" /> Monitoring</TabsTrigger>
          </TabsList>

          <TabsContent value="phases">
            <PhasesTab project={project} />
          </TabsContent>
          <TabsContent value="tutors">
            <TutorsTab project={project} />
          </TabsContent>
          <TabsContent value="enrollments">
            <EnrollmentsTab project={project} />
          </TabsContent>
          <TabsContent value="monitoring">
            <MonitoringTab project={project} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
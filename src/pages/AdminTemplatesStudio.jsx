import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Edit, Eye, Copy } from 'lucide-react';

export default function AdminTemplatesStudio() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignment-templates'],
    queryFn: () => base44.entities.AssignmentTemplate.list('-updated_date'),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['project-templates'],
    queryFn: () => base44.entities.ProjectTemplate.list('-updated_date'),
  });

  const { data: portfolio = [] } = useQuery({
    queryKey: ['portfolio-templates'],
    queryFn: () => base44.entities.PortfolioItemTemplate.list('-updated_date'),
  });

  if (user?.app_role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Access restricted to administrators</p>
      </div>
    );
  }

  // Get latest version per template_key
  const getLatestVersions = (templates) => {
    const grouped = {};
    templates.forEach(t => {
      const key = t.template_key || `legacy-${t.id}`;
      if (!grouped[key] || t.version > grouped[key].version) {
        grouped[key] = t;
      }
    });
    return Object.values(grouped);
  };

  const latestAssignments = getLatestVersions(assignments);
  const latestProjects = getLatestVersions(projects);
  const latestPortfolio = getLatestVersions(portfolio);

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB');
  };

  const TemplateTable = ({ templates, type }) => (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                No templates yet
              </TableCell>
            </TableRow>
          ) : (
            templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="font-medium">{template.title}</TableCell>
                <TableCell>
                  <Badge variant={template.status === 'published' ? 'default' : 'secondary'}>
                    {template.status}
                  </Badge>
                </TableCell>
                <TableCell>v{template.version || 1}</TableCell>
                <TableCell>{formatDate(template.updated_date)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link to={createPageUrl(`AdminTemplatesStudioEdit?type=${type}&id=${template.id}`)}>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </Link>
                    <Link to={createPageUrl(`AdminTemplatesStudioPreview?type=${type}&id=${template.id}`)}>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                    </Link>
                    <Link to={createPageUrl(`AdminTemplatesStudioDuplicate?type=${type}&id=${template.id}`)}>
                      <Button variant="ghost" size="sm">
                        <Copy className="w-4 h-4 mr-1" />
                        Duplicate
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Template Studio</h1>
            <p className="text-slate-600 mt-1">Create and manage course templates</p>
          </div>
        </div>

        <Tabs defaultValue="assignments" className="space-y-6">
          <TabsList>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="space-y-4">
            <div className="flex justify-end">
              <Link to={createPageUrl('AdminTemplatesStudioEdit?type=assignment')}>
                <Button className="bg-violet-600 hover:bg-violet-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Assignment
                </Button>
              </Link>
            </div>
            <TemplateTable templates={latestAssignments} type="assignment" />
          </TabsContent>

          <TabsContent value="projects" className="space-y-4">
            <div className="flex justify-end">
              <Link to={createPageUrl('AdminTemplatesStudioEdit?type=project')}>
                <Button className="bg-violet-600 hover:bg-violet-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Project
                </Button>
              </Link>
            </div>
            <TemplateTable templates={latestProjects} type="project" />
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-4">
            <div className="flex justify-end">
              <Link to={createPageUrl('AdminTemplatesStudioEdit?type=portfolio')}>
                <Button className="bg-violet-600 hover:bg-violet-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Portfolio Item
                </Button>
              </Link>
            </div>
            <TemplateTable templates={latestPortfolio} type="portfolio" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FolderKanban, Users, Clock, CheckCircle, BarChart3, Archive, Eye, Pencil, Trash2, Zap, GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import ProjectFormModal from '@/components/admin-projects/ProjectFormModal';

const STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-600',
  active: 'bg-green-100 text-green-700',
  archived: 'bg-amber-100 text-amber-700',
};

export default function AdminProjects() {
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('sort_order'),
  });

  const reorderMutation = useMutation({
    mutationFn: async (reordered) => {
      await Promise.all(reordered.map((p, i) => base44.entities.Project.update(p.id, { sort_order: i })));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const sortedProjects = [...projects].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const onDragEnd = (result) => {
    const { destination, source } = result;
    if (!destination || destination.index === source.index) return;
    const reordered = Array.from(sortedProjects);
    const [moved] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, moved);
    reorderMutation.mutate(reordered);
  };

  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments-all'],
    queryFn: () => base44.entities.ProjectEnrollment.list(),
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['task-submissions-all'],
    queryFn: () => base44.entities.TaskSubmission.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Project.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const getProjectStats = (projectId) => {
    const enrolled = enrollments.filter(e => e.project_id === projectId);
    const projectSubs = submissions.filter(s => s.project_id === projectId);
    const pendingReview = projectSubs.filter(s => s.status === 'in_review').length;
    const completed = enrolled.filter(e => e.status === 'completed').length;
    return { enrolled: enrolled.length, pendingReview, completed };
  };

  const totalActive = projects.filter(p => p.status === 'active').length;
  const totalPending = submissions.filter(s => s.status === 'in_review').length;
  const totalCompleted = enrollments.filter(e => e.status === 'completed').length;

  const handleEdit = (project) => {
    setEditingProject(project);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingProject(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Projects</h1>
            <p className="text-slate-500 mt-1">Manage simulation projects and student enrolments</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" /> New Project
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Active Projects', value: totalActive, icon: FolderKanban, color: 'text-green-600 bg-green-50' },
            { label: 'Pending Review', value: totalPending, icon: Clock, color: 'text-amber-600 bg-amber-50' },
            { label: 'Completions', value: totalCompleted, icon: CheckCircle, color: 'text-violet-600 bg-violet-50' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
              <div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Project List */}
        {isLoading ? (
          <div className="text-center py-16 text-slate-400">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center">
            <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No projects yet</p>
            <p className="text-slate-400 text-sm mb-4">Create your first simulation project</p>
            <Button onClick={() => setShowForm(true)} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" /> Create Project
            </Button>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="projects">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-4">
                  {sortedProjects.map((project, i) => {
                    const stats = getProjectStats(project.id);
                    return (
                      <Draggable key={project.id} draggableId={project.id} index={i}>
                        {(draggable, snapshot) => (
                          <div
                            ref={draggable.innerRef}
                            {...draggable.draggableProps}
                            className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-6 ${snapshot.isDragging ? 'shadow-xl opacity-95' : ''}`}
                          >
                            <div className="flex items-start gap-4">
                              <div {...draggable.dragHandleProps} className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing mt-1 flex-shrink-0">
                                <GripVertical className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-slate-900 mb-1">{project.title}</h3>
                                <p className="text-sm text-slate-500 line-clamp-1">{project.overview}</p>
                                <div className="flex items-center gap-5 mt-3 text-sm text-slate-500">
                                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {stats.enrolled} enrolled</span>
                                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {stats.pendingReview} pending review</span>
                                  <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> {stats.completed} completed</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {project.status === 'draft' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1 text-green-600 border-green-300 hover:bg-green-50"
                                    onClick={() => statusMutation.mutate({ id: project.id, status: 'active' })}
                                    disabled={statusMutation.isPending}
                                  >
                                    <Zap className="w-3.5 h-3.5" /> Publish
                                  </Button>
                                )}
                                {project.status === 'active' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1 text-slate-500"
                                    onClick={() => statusMutation.mutate({ id: project.id, status: 'draft' })}
                                    disabled={statusMutation.isPending}
                                  >
                                    <Archive className="w-3.5 h-3.5" /> Unpublish
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(project)} title="Edit">
                                  <Pencil className="w-4 h-4 text-slate-400" />
                                </Button>
                                <Link to={createPageUrl(`AdminProjectDetail?id=${project.id}`)}>
                                  <Button variant="outline" size="sm" className="gap-1">
                                    <Eye className="w-4 h-4" /> Manage
                                  </Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => { if (confirm('Delete this project?')) deleteMutation.mutate(project.id); }}
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4 text-red-400" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {showForm && (
        <ProjectFormModal
          project={editingProject}
          onClose={handleCloseForm}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            handleCloseForm();
          }}
        />
      )}
    </div>
  );
}
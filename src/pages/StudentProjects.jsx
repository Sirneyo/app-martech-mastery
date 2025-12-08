import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StudentProjects() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['project-templates'],
    queryFn: () => base44.entities.ProjectTemplate.list('week_number'),
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['my-project-submissions'],
    queryFn: async () => {
      if (!user?.id) return [];
      return base44.entities.Submission.filter({ user_id: user.id, submission_kind: 'project' });
    },
    enabled: !!user?.id,
  });

  const getSubmissionStatus = (projectId) => {
    const submission = submissions.find(s => s.project_template_id === projectId);
    if (!submission) return { status: 'not_started', label: 'Not Started', color: 'bg-slate-100 text-slate-600' };
    
    if (submission.status === 'draft') return { status: 'draft', label: 'Draft', color: 'bg-blue-100 text-blue-700' };
    if (submission.status === 'submitted') return { status: 'submitted', label: 'Submitted', color: 'bg-amber-100 text-amber-700' };
    if (submission.status === 'graded') return { status: 'graded', label: 'Graded', color: 'bg-green-100 text-green-700' };
    if (submission.status === 'needs_revision') return { status: 'needs_revision', label: 'Needs Revision', color: 'bg-red-100 text-red-700' };
    
    return { status: 'not_started', label: 'Not Started', color: 'bg-slate-100 text-slate-600' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">My Projects</h1>
        <p className="text-slate-500 mt-1">Complete projects to demonstrate your skills</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((project, index) => {
          const submissionStatus = getSubmissionStatus(project.id);
          
          return (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={createPageUrl(`StudentProjectDetail?id=${project.id}`)}
                className="block bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">Week {project.week_number}</Badge>
                      <Badge className={submissionStatus.color}>{submissionStatus.label}</Badge>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{project.title}</h3>
                    <p className="text-sm text-slate-600 line-clamp-2">{project.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all flex-shrink-0 ml-4" />
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 mt-4 pt-4 border-t border-slate-100">
                  <FolderOpen className="w-4 h-4" />
                  <span>{project.points} points</span>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
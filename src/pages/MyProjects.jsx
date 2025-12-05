import React from 'react';
import { 
  FolderOpen, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Upload,
  ArrowRight,
  FileText
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export default function MyProjects() {
  const projects = [
    {
      id: 1,
      title: 'Email Campaign Build',
      description: 'Design and build a complete email nurture campaign with 5+ emails, dynamic content, and A/B testing.',
      status: 'completed',
      submittedDate: '2024-11-15',
      feedback: 'Excellent work on segmentation!'
    },
    {
      id: 2,
      title: 'Lead Scoring Model',
      description: 'Create a comprehensive lead scoring model with demographic and behavioral scoring criteria.',
      status: 'in-progress',
      dueDate: '2024-12-15',
      progress: 60
    },
    {
      id: 3,
      title: 'Landing Page & Form',
      description: 'Build a high-converting landing page with progressive profiling form and thank you page.',
      status: 'not-started',
      dueDate: '2024-12-30'
    },
    {
      id: 4,
      title: 'Webinar Program',
      description: 'Set up a complete webinar program including registration, reminders, and follow-up sequences.',
      status: 'not-started',
      dueDate: '2025-01-15'
    },
    {
      id: 5,
      title: 'Analytics Dashboard',
      description: 'Create a custom analytics report showcasing campaign performance and ROI metrics.',
      status: 'not-started',
      dueDate: '2025-01-30'
    },
    {
      id: 6,
      title: 'Final Capstone Project',
      description: 'Comprehensive project demonstrating all skills learned throughout the program.',
      status: 'not-started',
      dueDate: '2025-02-15'
    }
  ];

  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const totalProjects = projects.length;

  const statusConfig = {
    'completed': { color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
    'in-progress': { color: 'bg-blue-100 text-blue-700', icon: Clock },
    'not-started': { color: 'bg-slate-100 text-slate-500', icon: Circle }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Projects</h1>
        <p className="text-slate-500 mt-1">Complete and submit projects to build your portfolio</p>
      </motion.div>

      {/* Progress Overview */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50 mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Projects Completion</h2>
            <p className="text-sm text-slate-500">{completedProjects} of {totalProjects} projects completed</p>
          </div>
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-slate-400" />
            <span className="text-2xl font-bold text-slate-900">{completedProjects}/{totalProjects}</span>
          </div>
        </div>
        <Progress value={(completedProjects / totalProjects) * 100} className="h-2" />
      </motion.div>

      {/* Projects List */}
      <div className="space-y-4">
        {projects.map((project, index) => {
          const StatusIcon = statusConfig[project.status].icon;
          
          return (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
              className="bg-white rounded-xl p-6 border border-slate-200/50 shadow-sm"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    project.status === 'completed' 
                      ? 'bg-green-100' 
                      : project.status === 'in-progress'
                        ? 'bg-blue-100'
                        : 'bg-slate-100'
                  }`}>
                    <FileText className={`w-6 h-6 ${
                      project.status === 'completed' 
                        ? 'text-green-600' 
                        : project.status === 'in-progress'
                          ? 'text-blue-600'
                          : 'text-slate-400'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">{project.title}</h3>
                      <Badge className={statusConfig[project.status].color}>
                        {project.status.replace('-', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500 mb-2">{project.description}</p>
                    
                    {project.status === 'in-progress' && project.progress && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-500">Progress</span>
                          <span className="font-semibold text-slate-700">{project.progress}%</span>
                        </div>
                        <Progress value={project.progress} className="h-1.5" />
                      </div>
                    )}

                    {project.feedback && (
                      <p className="text-xs text-green-600 mt-2 bg-green-50 px-3 py-1.5 rounded-lg inline-block">
                        Feedback: {project.feedback}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 lg:flex-col lg:items-end">
                  {project.dueDate && project.status !== 'completed' && (
                    <p className="text-xs text-slate-400">
                      Due: {new Date(project.dueDate).toLocaleDateString()}
                    </p>
                  )}
                  {project.submittedDate && (
                    <p className="text-xs text-green-600">
                      Submitted: {new Date(project.submittedDate).toLocaleDateString()}
                    </p>
                  )}
                  
                  {project.status === 'in-progress' && (
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      <Upload className="w-4 h-4 mr-2" /> Submit
                    </Button>
                  )}
                  {project.status === 'not-started' && (
                    <Button size="sm" variant="outline">
                      Start Project <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                  {project.status === 'completed' && (
                    <Button size="sm" variant="ghost" className="text-green-600">
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Completed
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
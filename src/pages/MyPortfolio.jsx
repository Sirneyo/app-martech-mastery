import React from 'react';
import { 
  Award, 
  CheckCircle2, 
  Circle, 
  Lock,
  FileText,
  Linkedin,
  GraduationCap,
  Trophy,
  FolderOpen,
  ExternalLink
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export default function MyPortfolio() {
  const currentWeek = 3; // Would come from user progress
  const isExamUnlocked = currentWeek >= 12;

  const requirements = [
    {
      id: 1,
      title: 'MarTech Mastery Exam',
      description: 'Complete the final exam covering all program content. Requires 80% to pass.',
      icon: GraduationCap,
      status: isExamUnlocked ? 'available' : 'locked',
      lockMessage: 'Unlocks at Week 12',
      action: 'Take Exam'
    },
    {
      id: 2,
      title: 'My Projects Completion',
      description: 'Complete and submit all 6 required projects with passing grades.',
      icon: FolderOpen,
      status: 'in-progress',
      progress: 17, // 1 of 6 completed
      progressText: '1 of 6 projects completed'
    },
    {
      id: 3,
      title: 'Marketo Professional Certification',
      description: 'Obtain the official Adobe Marketo Engage Professional certification.',
      icon: Award,
      status: 'not-started',
      action: 'Upload Certificate',
      externalLink: 'https://learning.adobe.com/certification.html'
    },
    {
      id: 4,
      title: 'Approved CV',
      description: 'Submit your CV highlighting your MarTech skills for review and approval.',
      icon: FileText,
      status: 'not-started',
      action: 'Upload CV'
    },
    {
      id: 5,
      title: 'Approved LinkedIn Profile',
      description: 'Update your LinkedIn profile to showcase your MarTech expertise and get approval.',
      icon: Linkedin,
      status: 'not-started',
      action: 'Submit for Review'
    }
  ];

  const completedRequirements = requirements.filter(r => r.status === 'completed').length;
  const totalRequirements = requirements.length;
  const progressPercentage = (completedRequirements / totalRequirements) * 100;

  const statusConfig = {
    'completed': { badge: 'bg-green-100 text-green-700', iconBg: 'bg-green-100', iconColor: 'text-green-600' },
    'in-progress': { badge: 'bg-blue-100 text-blue-700', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
    'available': { badge: 'bg-amber-100 text-amber-700', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
    'not-started': { badge: 'bg-slate-100 text-slate-500', iconBg: 'bg-slate-100', iconColor: 'text-slate-400' },
    'locked': { badge: 'bg-slate-100 text-slate-400', iconBg: 'bg-slate-100', iconColor: 'text-slate-300' }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Portfolio</h1>
        <p className="text-slate-500 mt-1">Complete all requirements to earn your program certification</p>
      </motion.div>

      {/* Certification Progress Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-6 shadow-lg mb-8 text-white"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <Trophy className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Program Certification</h2>
            <p className="text-violet-200 text-sm">Complete all 5 requirements below</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-violet-200">Overall Progress</span>
          <span className="font-bold">{completedRequirements} / {totalRequirements} Complete</span>
        </div>
        <div className="w-full bg-white/20 rounded-full h-3">
          <div 
            className="bg-white rounded-full h-3 transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </motion.div>

      {/* Requirements List */}
      <div className="space-y-4">
        {requirements.map((req, index) => {
          const config = statusConfig[req.status];
          const Icon = req.icon;
          
          return (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
              className={`bg-white rounded-xl p-6 border shadow-sm ${
                req.status === 'locked' ? 'opacity-60 border-slate-200/50' : 'border-slate-200/50'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.iconBg}`}>
                    {req.status === 'locked' ? (
                      <Lock className="w-6 h-6 text-slate-300" />
                    ) : (
                      <Icon className={`w-6 h-6 ${config.iconColor}`} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">{req.title}</h3>
                      <Badge className={config.badge}>
                        {req.status === 'locked' ? 'Locked' : 
                         req.status === 'in-progress' ? 'In Progress' :
                         req.status === 'available' ? 'Available' :
                         req.status === 'completed' ? 'Completed' : 'Not Started'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">{req.description}</p>
                    
                    {req.lockMessage && req.status === 'locked' && (
                      <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> {req.lockMessage}
                      </p>
                    )}

                    {req.progress !== undefined && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-500">{req.progressText}</span>
                          <span className="font-semibold text-slate-700">{req.progress}%</span>
                        </div>
                        <Progress value={req.progress} className="h-1.5" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {req.externalLink && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={req.externalLink} target="_blank" rel="noopener noreferrer">
                        Learn More <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  )}
                  
                  {req.status === 'completed' && (
                    <Button size="sm" variant="ghost" className="text-green-600">
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Completed
                    </Button>
                  )}
                  {req.status === 'available' && (
                    <Button size="sm" className="bg-amber-500 hover:bg-amber-600">
                      {req.action}
                    </Button>
                  )}
                  {(req.status === 'not-started' || req.status === 'in-progress') && req.action && (
                    <Button size="sm" variant="outline">
                      {req.action}
                    </Button>
                  )}
                  {req.status === 'locked' && (
                    <Button size="sm" variant="ghost" disabled>
                      <Lock className="w-4 h-4 mr-2" /> Locked
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
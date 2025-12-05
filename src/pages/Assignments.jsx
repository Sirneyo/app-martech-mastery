import React from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Clock, 
  FileText,
  Lock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export default function Assignments() {
  const currentWeek = 3; // This would typically come from a date calculation or user progress

  const weeks = Array.from({ length: 12 }, (_, i) => ({
    week: i + 1,
    title: `Week ${i + 1} Assignment`,
    description: getWeekDescription(i + 1),
    status: i + 1 < currentWeek ? 'completed' : i + 1 === currentWeek ? 'current' : 'locked',
    dueDate: `Week ${i + 1}`,
    tasks: getWeekTasks(i + 1)
  }));

  function getWeekDescription(week) {
    const descriptions = {
      1: 'Introduction to Marketing Automation & Marketo Setup',
      2: 'Building Your First Email Campaign',
      3: 'Forms, Landing Pages & Lead Capture',
      4: 'Smart Lists & Segmentation Fundamentals',
      5: 'Email Nurture Programs & Engagement',
      6: 'Lead Scoring & Lifecycle Management',
      7: 'Advanced Campaign Management',
      8: 'Analytics & Reporting Essentials',
      9: 'Integration & Data Management',
      10: 'Advanced Personalization & Dynamic Content',
      11: 'Revenue Attribution & ROI Analysis',
      12: 'Final Project & Certification Prep'
    };
    return descriptions[week] || 'Weekly assignment';
  }

  function getWeekTasks(week) {
    return [
      { name: 'Complete video lessons', completed: week < currentWeek },
      { name: 'Hands-on exercise in Marketo', completed: week < currentWeek },
      { name: 'Submit assignment', completed: week < currentWeek }
    ];
  }

  const completedWeeks = weeks.filter(w => w.status === 'completed').length;
  const progressPercentage = (completedWeeks / 12) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Assignments</h1>
        <p className="text-slate-500 mt-1">Weekly assignments for the 12-week program</p>
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
            <h2 className="text-lg font-semibold text-slate-900">Program Progress</h2>
            <p className="text-sm text-slate-500">{completedWeeks} of 12 weeks completed</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">{Math.round(progressPercentage)}%</p>
          </div>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </motion.div>

      {/* Weeks List */}
      <div className="space-y-4">
        {weeks.map((week, index) => (
          <motion.div
            key={week.week}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * index }}
            className={`bg-white rounded-xl p-5 border shadow-sm transition-all ${
              week.status === 'locked' 
                ? 'opacity-60 border-slate-200/50' 
                : week.status === 'current'
                  ? 'border-blue-300 shadow-blue-100'
                  : 'border-slate-200/50'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  week.status === 'completed' 
                    ? 'bg-green-100 text-green-600'
                    : week.status === 'current'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-slate-100 text-slate-400'
                }`}>
                  {week.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : week.status === 'locked' ? (
                    <Lock className="w-5 h-5" />
                  ) : (
                    <FileText className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Week {week.week}</h3>
                  {week.status === 'current' && (
                    <Badge className="bg-blue-100 text-blue-700 text-[10px]">Current</Badge>
                  )}
                  {week.status === 'completed' && (
                    <Badge className="bg-green-100 text-green-700 text-[10px]">Completed</Badge>
                  )}
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4 line-clamp-2">{week.description}</p>

            <div className="space-y-2">
              {week.tasks.map((task, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                  {task.completed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-slate-300" />
                  )}
                  <span className={task.completed ? 'line-through text-slate-400' : ''}>
                    {task.name}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
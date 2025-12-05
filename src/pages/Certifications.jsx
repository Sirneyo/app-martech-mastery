import React from 'react';
import { 
  Award, 
  CheckCircle2, 
  Lock, 
  Clock, 
  Trophy,
  Star,
  ArrowRight,
  Shield
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function Certifications() {
  const certifications = [
    {
      id: 1,
      title: 'Marketo Certified Associate',
      description: 'Demonstrate foundational knowledge of Marketo Engage and marketing automation principles.',
      level: 'Foundation',
      requirements: [
        { name: 'Marketo Fundamentals', completed: true },
        { name: 'Landing Page Optimization', completed: true },
        { name: 'Pass Foundation Exam (80%)', completed: false }
      ],
      progress: 66,
      status: 'in-progress',
      examDuration: '90 minutes',
      questions: 50,
      badge: 'https://images.unsplash.com/photo-1569098644029-e513a9086e91?w=100&h=100&fit=crop'
    },
    {
      id: 2,
      title: 'Marketo Certified Professional',
      description: 'Validate advanced skills in campaign management, lead nurturing, and analytics.',
      level: 'Professional',
      requirements: [
        { name: 'Complete Associate Certification', completed: false },
        { name: 'Advanced Email Campaigns', completed: false },
        { name: 'Lead Scoring & Nurturing', completed: false },
        { name: 'Pass Professional Exam (75%)', completed: false }
      ],
      progress: 0,
      status: 'locked',
      examDuration: '120 minutes',
      questions: 75,
      badge: 'https://images.unsplash.com/photo-1569098644029-e513a9086e91?w=100&h=100&fit=crop'
    },
    {
      id: 3,
      title: 'Marketo Certified Expert',
      description: 'Master-level certification for enterprise marketing automation architects and strategists.',
      level: 'Expert',
      requirements: [
        { name: 'Complete Professional Certification', completed: false },
        { name: 'Marketing Analytics Mastery', completed: false },
        { name: 'Complete 5 Real-World Projects', completed: false },
        { name: 'Pass Expert Exam (80%)', completed: false }
      ],
      progress: 0,
      status: 'locked',
      examDuration: '150 minutes',
      questions: 100,
      badge: 'https://images.unsplash.com/photo-1569098644029-e513a9086e91?w=100&h=100&fit=crop'
    }
  ];

  const achievements = [
    { title: 'Fast Learner', description: 'Complete 3 lessons in one day', earned: true, icon: '⚡' },
    { title: '7-Day Streak', description: 'Learn for 7 consecutive days', earned: true, icon: '🔥' },
    { title: 'First Course', description: 'Complete your first course', earned: true, icon: '🎯' },
    { title: 'Quiz Master', description: 'Score 100% on any quiz', earned: false, icon: '🧠' },
  ];

  const levelColors = {
    'Foundation': 'from-emerald-500 to-teal-500',
    'Professional': 'from-blue-500 to-indigo-500',
    'Expert': 'from-purple-500 to-pink-500'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Certifications</h1>
        <p className="text-slate-500 mt-1">Earn credentials to validate your MarTech expertise</p>
      </motion.div>

      {/* Stats Bar */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
      >
        <div className="bg-white rounded-xl p-5 border border-slate-200/50 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">0</p>
              <p className="text-sm text-slate-500">Certifications Earned</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200/50 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Star className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">4</p>
              <p className="text-sm text-slate-500">Achievements Unlocked</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200/50 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">1</p>
              <p className="text-sm text-slate-500">In Progress</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Certification Cards */}
      <div className="space-y-6 mb-12">
        {certifications.map((cert, index) => (
          <motion.div
            key={cert.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
            className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
              cert.status === 'locked' ? 'border-slate-200/50 opacity-75' : 'border-slate-200/50'
            }`}
          >
            <div className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                {/* Badge & Title */}
                <div className="flex items-start gap-4 flex-1">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${levelColors[cert.level]} flex items-center justify-center shadow-lg flex-shrink-0`}>
                    <Award className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-slate-900">{cert.title}</h3>
                      {cert.status === 'locked' && <Lock className="w-4 h-4 text-slate-400" />}
                    </div>
                    <Badge variant="secondary" className={`mb-3 bg-gradient-to-r ${levelColors[cert.level]} text-white border-0`}>
                      {cert.level}
                    </Badge>
                    <p className="text-slate-500 text-sm">{cert.description}</p>
                    
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {cert.examDuration}
                      </span>
                      <span>{cert.questions} questions</span>
                    </div>
                  </div>
                </div>

                {/* Requirements */}
                <div className="lg:w-72">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Requirements</p>
                  <div className="space-y-2">
                    {cert.requirements.map((req, i) => (
                      <div 
                        key={i}
                        className={`flex items-center gap-2 text-sm ${
                          req.completed ? 'text-slate-700' : 'text-slate-400'
                        }`}
                      >
                        {req.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
                        )}
                        <span className={req.completed ? 'line-through' : ''}>{req.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Progress & Action */}
                <div className="lg:w-48 flex flex-col items-end">
                  {cert.status === 'in-progress' ? (
                    <>
                      <div className="w-full mb-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-slate-500">Progress</span>
                          <span className="font-bold text-slate-700">{cert.progress}%</span>
                        </div>
                        <Progress value={cert.progress} className="h-2" />
                      </div>
                      <Button className="w-full bg-slate-900 hover:bg-slate-800">
                        Continue <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </>
                  ) : (
                    <Button disabled className="w-full" variant="secondary">
                      <Lock className="w-4 h-4 mr-2" /> Locked
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Achievements Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-xl font-bold text-slate-900 mb-4">Achievements</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {achievements.map((achievement, index) => (
            <div 
              key={achievement.title}
              className={`bg-white rounded-xl p-4 border shadow-sm transition-all ${
                achievement.earned 
                  ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-white' 
                  : 'border-slate-200/50 opacity-60'
              }`}
            >
              <div className="text-3xl mb-2">{achievement.icon}</div>
              <h4 className="font-semibold text-slate-900">{achievement.title}</h4>
              <p className="text-xs text-slate-500 mt-1">{achievement.description}</p>
              {achievement.earned && (
                <Badge className="mt-3 bg-amber-100 text-amber-700 border-amber-200">
                  Earned
                </Badge>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
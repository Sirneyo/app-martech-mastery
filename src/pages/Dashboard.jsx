import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Play, 
  Clock, 
  TrendingUp, 
  Award, 
  BookOpen,
  ChevronRight,
  Zap,
  Target,
  BarChart3,
  Trophy,
  User,
  Mail,
  Calendar,
  GraduationCap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export default function Dashboard() {
  const currentTutor = {
    name: 'Sarah Mitchell',
    role: 'Senior MarTech Consultant',
    email: 'sarah.mitchell@martech-mastery.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face'
  };

  // Mock data - change to track actual progress
  const currentWeek = 9; // Change this based on actual user progress
  const certificationPassed = true; // Change based on actual exam result

  const leaderboard = [
    { rank: 1, name: 'Alex Johnson', points: 2450, trend: 'up' },
    { rank: 2, name: 'Maria Garcia', points: 2380, trend: 'up' },
    { rank: 3, name: 'James Chen', points: 2290, trend: 'down' },
    { rank: 4, name: 'Emma Wilson', points: 2150, trend: 'up' },
    { rank: 5, name: 'David Kim', points: 2080, trend: 'same' },
    { rank: 6, name: 'Sophie Brown', points: 1950, trend: 'up' },
    { rank: 7, name: 'Michael Lee', points: 1890, trend: 'down' },
    { rank: 8, name: 'Olivia Taylor', points: 1820, trend: 'up' },
    { rank: 9, name: 'Daniel Martinez', points: 1750, trend: 'same' },
    { rank: 10, name: 'Isabella Anderson', points: 1680, trend: 'down' },
    { rank: 11, name: 'William Thomas', points: 1590, trend: 'up' },
    { rank: 12, name: 'Ava Jackson', points: 1520, trend: 'same' },
    { rank: 13, name: 'Ethan White', points: 1450, trend: 'down' },
    { rank: 14, name: 'Mia Harris', points: 1380, trend: 'up' },
    { rank: 15, name: 'Lucas Martin', points: 1290, trend: 'same' },
  ];



  const stats = [
    { label: 'Courses Completed', value: '3', icon: BookOpen, color: 'from-blue-500 to-cyan-500' },
    { label: 'Hours Learned', value: '24', icon: Clock, color: 'from-violet-500 to-purple-500' },
    { label: 'Certifications', value: '1', icon: Award, color: 'from-amber-500 to-orange-500' },
    { label: 'Current Streak', value: '7 days', icon: Zap, color: 'from-emerald-500 to-teal-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Welcome back! 👋
        </h1>
        <p className="text-slate-500 mt-1">Continue your MarTech journey</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        {stats.map((stat, index) => (
          <div 
            key={stat.label}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/50 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Continue Learning Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <a
          href="https://www.the-growth-academy.co/library"
          target="_blank"
          rel="noopener noreferrer"
          className="block group"
        >
          <div className="bg-gradient-to-br from-purple-600 to-violet-500 rounded-3xl p-12 text-white hover:shadow-2xl hover:shadow-purple-500/30 transition-all duration-300 relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
            </div>

            <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold mb-4">
                  <GraduationCap className="w-4 h-4" />
                  Learning Platform
                </div>
                <h2 className="text-4xl font-bold mb-3">Continue Your Learning</h2>
                <p className="text-white/90 text-lg mb-6">
                  Access all course materials, videos, and resources on the Growth Academy platform
                </p>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span className="flex items-center gap-2">
                    <Play className="w-4 h-4" /> Video lessons
                  </span>
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Course materials
                  </span>
                  <span className="flex items-center gap-2">
                    <Target className="w-4 h-4" /> Live sessions
                  </span>
                </div>
              </div>

              <div className="flex-shrink-0">
                <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                  <Play className="w-10 h-10 text-purple-600 ml-1" />
                </div>
              </div>
            </div>
          </div>
        </a>
      </motion.div>

      {/* Cohort Leaderboard & Current Tutor */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
      >
        {/* Cohort Leaderboard */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Cohort Leaderboard</h2>
                <p className="text-xs text-slate-500">Weekly points ranking</p>
              </div>
            </div>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {leaderboard.map((student, index) => (
              <div 
                key={student.rank}
                className={`flex items-center gap-4 px-5 py-3 border-b border-slate-50 last:border-0 ${
                  index < 3 ? 'bg-gradient-to-r from-amber-50/50 to-transparent' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 ? 'bg-amber-400 text-white' :
                  index === 1 ? 'bg-slate-300 text-white' :
                  index === 2 ? 'bg-amber-600 text-white' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  {student.rank}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900 text-sm">{student.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">{student.points.toLocaleString()}</span>
                  <span className="text-xs text-slate-400">pts</span>
                  {student.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                  {student.trend === 'down' && <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Current Tutor */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Current Tutor</h2>
              <p className="text-xs text-slate-500">Your assigned mentor</p>
            </div>
          </div>

          <div className="text-center">
            <img 
              src={currentTutor.avatar} 
              alt={currentTutor.name}
              className="w-20 h-20 rounded-full mx-auto mb-4 object-cover border-4 border-slate-100"
            />
            <h3 className="font-bold text-lg text-slate-900">{currentTutor.name}</h3>
            <p className="text-sm text-slate-500 mb-4">{currentTutor.role}</p>

            <a 
              href={`mailto:${currentTutor.email}`}
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Mail className="w-4 h-4" />
              Contact Tutor
            </a>
          </div>
        </div>
      </motion.div>

      {/* Achievements Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Achievements</h2>
            <p className="text-sm text-slate-500">Track your milestones and unlock rewards</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Earned Achievement 1 */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-5 shadow-sm">
            <div className="text-4xl mb-3">⚡</div>
            <h3 className="font-bold text-slate-900 mb-1">Fast Learner</h3>
            <p className="text-xs text-slate-600 mb-3">Complete 3 lessons in one day</p>
            <Badge className="bg-amber-500 text-white hover:bg-amber-600">
              <Trophy className="w-3 h-3 mr-1" /> Unlocked
            </Badge>
          </div>

          {/* Earned Achievement 2 */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-5 shadow-sm">
            <div className="text-4xl mb-3">🔥</div>
            <h3 className="font-bold text-slate-900 mb-1">7-Day Streak</h3>
            <p className="text-xs text-slate-600 mb-3">Learn for 7 consecutive days</p>
            <Badge className="bg-amber-500 text-white hover:bg-amber-600">
              <Trophy className="w-3 h-3 mr-1" /> Unlocked
            </Badge>
          </div>

          {/* Earned Achievement 3 */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-5 shadow-sm">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="font-bold text-slate-900 mb-1">First Course</h3>
            <p className="text-xs text-slate-600 mb-3">Complete your first course</p>
            <Badge className="bg-amber-500 text-white hover:bg-amber-600">
              <Trophy className="w-3 h-3 mr-1" /> Unlocked
            </Badge>
          </div>

          {/* Next Achievement to Unlock */}
          <div className="bg-white border-2 border-blue-300 rounded-xl p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
              NEXT
            </div>
            <div className="text-4xl mb-3 opacity-40">🧠</div>
            <h3 className="font-bold text-slate-900 mb-1">Quiz Master</h3>
            <p className="text-xs text-slate-600 mb-3">Score 100% on any quiz</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mt-3">
              <p className="text-[10px] text-blue-700 font-medium">
                📝 Complete Week 3 quiz with perfect score
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <a 
          href="https://experience.adobe.com/#/@oadsolutionsltd/"
          target="_blank"
          rel="noopener noreferrer"
          className="group bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl p-6 text-white hover:shadow-xl hover:shadow-red-500/25 transition-all duration-300"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Target className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">Practice in Marketo</h3>
              <p className="text-white/80 text-sm">Apply your skills in the live platform</p>
            </div>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </div>
        </a>

        <Link 
          to={createPageUrl('Certifications')}
          className="group bg-gradient-to-br from-violet-500 to-purple-500 rounded-2xl p-6 text-white hover:shadow-xl hover:shadow-violet-500/25 transition-all duration-300"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Award className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">Get Certified</h3>
              <p className="text-white/80 text-sm">Earn your MarTech certification</p>
            </div>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </motion.div>
      </div>
      );
      }
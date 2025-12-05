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
  BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';

export default function Dashboard() {
  const courses = [
    {
      id: 1,
      title: 'Marketo Fundamentals',
      description: 'Master the basics of marketing automation',
      progress: 65,
      lessons: 12,
      duration: '4h 30m',
      category: 'Foundation',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=250&fit=crop'
    },
    {
      id: 2,
      title: 'Advanced Email Campaigns',
      description: 'Create high-converting email sequences',
      progress: 30,
      lessons: 8,
      duration: '3h 15m',
      category: 'Intermediate',
      image: 'https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=400&h=250&fit=crop'
    },
    {
      id: 3,
      title: 'Lead Scoring & Nurturing',
      description: 'Build intelligent lead management systems',
      progress: 0,
      lessons: 10,
      duration: '5h 00m',
      category: 'Advanced',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop'
    }
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">Continue Learning</h2>
          <Link 
            to={createPageUrl('Courses')}
            className="text-sm text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1"
          >
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200/50 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300"
            >
              <div className="relative h-40 overflow-hidden">
                <img 
                  src={course.image} 
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-slate-700">
                  {course.category}
                </span>
                {course.progress > 0 && (
                  <button className="absolute bottom-3 right-3 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-4 h-4 text-slate-900 ml-0.5" />
                  </button>
                )}
              </div>
              <div className="p-5">
                <h3 className="font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                  {course.title}
                </h3>
                <p className="text-sm text-slate-500 mb-4 line-clamp-2">
                  {course.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" /> {course.lessons} lessons
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {course.duration}
                  </span>
                </div>
                {course.progress > 0 ? (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-slate-500">Progress</span>
                      <span className="font-semibold text-slate-700">{course.progress}%</span>
                    </div>
                    <Progress value={course.progress} className="h-1.5" />
                  </div>
                ) : (
                  <button className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-semibold text-slate-700 transition-colors">
                    Start Course
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <Link 
          to={createPageUrl('MarketoBrowser')}
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
        </Link>

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
import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Video, 
  FileText, 
  ExternalLink,
  Play,
  Calendar,
  Users,
  Home,
  FolderOpen
} from 'lucide-react';

export default function BeginLearning() {
  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const result = await base44.entities.AppSettings.list();
      return result[0] || {};
    },
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const learningResources = [
    {
      title: 'Course Library',
      description: 'Access all your courses, lessons, and learning materials',
      icon: BookOpen,
      color: 'from-purple-600 to-violet-500',
      action: 'Browse Courses',
      url: settings?.kajabi_url || 'https://www.the-growth-academy.co/library'
    },
    {
      title: 'Video Tutorials',
      description: 'Watch step-by-step video guides and tutorials',
      icon: Video,
      color: 'from-blue-600 to-cyan-500',
      action: 'Watch Videos',
      url: settings?.kajabi_url || 'https://www.the-growth-academy.co/library'
    },
    {
      title: 'Learning Resources',
      description: 'Download templates, guides, and reference materials',
      icon: FileText,
      color: 'from-orange-600 to-red-500',
      action: 'View Resources',
      url: settings?.kajabi_url || 'https://www.the-growth-academy.co/library'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-slate-100 to-slate-200 min-h-screen border-r border-slate-300 flex flex-col">
        <div className="p-4 border-b border-slate-300">
          <img 
            src="https://storage.googleapis.com/msgsndr/DVqsiywKVWkfZ4I0mXQ1/media/693348610439b8283bf88818.svg" 
            alt="MarTech Mastery" 
            className="w-[85%] h-auto"
          />
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold px-3 mb-4">
            Learning
          </p>
          <Link
            to={createPageUrl('StudentDashboard')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-slate-600 hover:text-slate-900 hover:bg-white/70 group"
          >
            <Home className="w-5 h-5 text-slate-500 group-hover:text-slate-700" />
            <span className="font-medium text-sm">Dashboard</span>
          </Link>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-orange-500/10 text-orange-600">
            <BookOpen className="w-5 h-5 text-orange-600" />
            <span className="font-medium text-sm">Begin Learning</span>
          </div>
          <Link
            to={createPageUrl('StudentAssignments')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-slate-600 hover:text-slate-900 hover:bg-white/70 group"
          >
            <FileText className="w-5 h-5 text-slate-500 group-hover:text-slate-700" />
            <span className="font-medium text-sm">Assignments</span>
          </Link>
          <Link
            to={createPageUrl('StudentProjects')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-slate-600 hover:text-slate-900 hover:bg-white/70 group"
          >
            <FolderOpen className="w-5 h-5 text-slate-500 group-hover:text-slate-700" />
            <span className="font-medium text-sm">My Projects</span>
          </Link>
        </nav>
      </aside>

      <div className="flex-1 p-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            Welcome back, {user?.full_name?.split(' ')[0] || 'Student'}!
          </h1>
          <p className="text-lg text-slate-600">
            Continue your learning journey and master MarTech
          </p>
        </motion.div>

        {/* Join Live Section - Featured */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-none shadow-xl overflow-hidden">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                    <span className="text-white/90 text-sm font-semibold uppercase tracking-wide">
                      Live Sessions Available
                    </span>
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-3">
                    Join Live Learning Sessions
                  </h2>
                  <p className="text-white/90 text-lg mb-4">
                    Connect with instructors and peers in real-time for interactive learning experiences
                  </p>
                  <div className="flex items-center gap-4 text-white/80">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">Weekly Sessions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">Interactive Q&A</span>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <a
                    href={settings?.kajabi_url || 'https://www.the-growth-academy.co/library'}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      size="lg"
                      className="bg-white text-orange-600 hover:bg-white/90 shadow-lg gap-2"
                    >
                      <Play className="w-5 h-5" />
                      Join Live Now
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Learning Resources Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Learning Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {learningResources.map((resource, index) => (
              <motion.div
                key={resource.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-all duration-300 border-slate-200">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${resource.color} flex items-center justify-center mb-4`}>
                      <resource.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                      {resource.title}
                    </h3>
                    <p className="text-slate-600 mb-4">
                      {resource.description}
                    </p>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" className="w-full gap-2">
                        {resource.action}
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick Access Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-white mb-3">
                  Ready to continue learning?
                </h3>
                <p className="text-slate-300 mb-6">
                  Access your full learning platform with all courses, modules, and resources
                </p>
                <a
                  href={settings?.kajabi_url || 'https://www.the-growth-academy.co/library'}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="lg" className="bg-orange-600 hover:bg-orange-700 gap-2">
                    <BookOpen className="w-5 h-5" />
                    Go to Learning Platform
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
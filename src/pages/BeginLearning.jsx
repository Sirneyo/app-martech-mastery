import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import BeginLearningSidebar from '@/components/BeginLearningSidebar';
import { Menu, X, Settings, User, LogOut } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ProfileModal from '@/components/ProfileModal';
import { 
  BookOpen, 
  Video, 
  FileText, 
  ExternalLink,
  Play,
  Calendar,
  Users
} from 'lucide-react';

export default function BeginLearning() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

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
    <div className="flex min-h-screen bg-slate-100">
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white rounded-lg shadow-md border border-slate-200"
      >
        <Menu className="w-6 h-6 text-slate-700" />
      </button>

      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="relative">
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden absolute top-4 right-4 z-50 p-1 text-slate-500 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
          <BeginLearningSidebar currentPageName="BeginLearning" onNavigate={() => setSidebarOpen(false)} />
        </div>
      </div>

      <main className="flex-1 h-screen overflow-y-auto lg:ml-0">
        <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3">
          <div className="flex items-center justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-all group">
                  {user?.profile_picture ? (
                    <img
                      src={user.profile_picture}
                      alt={user.full_name}
                      className="w-9 h-9 rounded-full object-cover border-2 border-slate-200"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-500 flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-medium text-slate-700">
                      {user?.full_name || 'Loading...'}
                    </p>
                    <p className="text-[10px] text-slate-500 capitalize">
                      {user?.app_role || 'student'}
                    </p>
                  </div>
                  <Settings className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setProfileModalOpen(true)}>
                  <User className="w-4 h-4 mr-2" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => base44.auth.logout()}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="p-8">
          <div className="max-w-7xl mx-auto">
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
      </main>

      <ProfileModal open={profileModalOpen} onOpenChange={setProfileModalOpen} />
    </div>
  );
}
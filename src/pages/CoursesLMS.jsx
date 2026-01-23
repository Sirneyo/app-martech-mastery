import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import BeginLearningSidebar from '@/components/BeginLearningSidebar';
import { Menu, X, Settings, User, LogOut, Search, BookOpen, Clock, ExternalLink, Play } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ProfileModal from '@/components/ProfileModal';

export default function CoursesLMS() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  const courses = [
    {
      title: 'Adobe Marketo Fundamentals',
      description: 'Master the basics of Adobe Marketo Engage including email marketing, lead management, and automation',
      duration: '8 weeks',
      modules: 12,
      level: 'Beginner',
      color: 'from-red-500 to-orange-500',
      status: 'In Progress'
    },
    {
      title: 'Marketing Automation Advanced',
      description: 'Deep dive into advanced automation strategies, scoring models, and campaign optimization',
      duration: '6 weeks',
      modules: 10,
      level: 'Advanced',
      color: 'from-blue-500 to-cyan-500',
      status: 'Not Started'
    },
    {
      title: 'Analytics & Reporting',
      description: 'Learn to create powerful reports, analyze campaign performance, and drive data-driven decisions',
      duration: '4 weeks',
      modules: 8,
      level: 'Intermediate',
      color: 'from-green-500 to-emerald-500',
      status: 'Not Started'
    },
    {
      title: 'Email Marketing Mastery',
      description: 'Craft compelling email campaigns, optimize deliverability, and increase engagement',
      duration: '5 weeks',
      modules: 9,
      level: 'Intermediate',
      color: 'from-purple-500 to-pink-500',
      status: 'Completed'
    },
    {
      title: 'Lead Management & Scoring',
      description: 'Design effective lead management processes and implement intelligent scoring models',
      duration: '4 weeks',
      modules: 7,
      level: 'Advanced',
      color: 'from-yellow-500 to-orange-500',
      status: 'Not Started'
    },
    {
      title: 'Marketing Operations',
      description: 'Streamline marketing operations, manage data quality, and optimize system performance',
      duration: '6 weeks',
      modules: 11,
      level: 'Advanced',
      color: 'from-indigo-500 to-purple-500',
      status: 'Not Started'
    }
  ];

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status) => {
    if (status === 'Completed') return 'bg-green-100 text-green-700';
    if (status === 'In Progress') return 'bg-blue-100 text-blue-700';
    return 'bg-slate-100 text-slate-700';
  };

  const getLevelColor = (level) => {
    if (level === 'Beginner') return 'bg-emerald-100 text-emerald-700';
    if (level === 'Intermediate') return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

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
          <BeginLearningSidebar currentPageName="CoursesLMS" onNavigate={() => setSidebarOpen(false)} />
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
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold text-slate-900 mb-3">All Courses</h1>
            <p className="text-lg text-slate-600 mb-6">
              Explore our comprehensive MarTech curriculum
            </p>
            
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course, index) => (
              <motion.div
                key={course.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-xl transition-all duration-300 border-slate-200 h-full flex flex-col">
                  <div className={`h-32 bg-gradient-to-br ${course.color} rounded-t-xl flex items-center justify-center`}>
                    <BookOpen className="w-12 h-12 text-white" />
                  </div>
                  <CardContent className="p-6 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-bold text-slate-900 flex-1">
                        {course.title}
                      </h3>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge className={getStatusColor(course.status)}>
                        {course.status}
                      </Badge>
                      <Badge className={getLevelColor(course.level)}>
                        {course.level}
                      </Badge>
                    </div>

                    <p className="text-slate-600 mb-4 flex-1">
                      {course.description}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {course.duration}
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        {course.modules} modules
                      </div>
                    </div>

                    <a
                      href={settings?.kajabi_url || 'https://www.the-growth-academy.co/library'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full"
                    >
                      <Button className="w-full gap-2 bg-purple-600 hover:bg-purple-700">
                        <Play className="w-4 h-4" />
                        {course.status === 'Completed' ? 'Review Course' : course.status === 'In Progress' ? 'Continue' : 'Start Course'}
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {filteredCourses.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">No courses found matching your search</p>
            </div>
          )}
        </div>
      </main>

      <ProfileModal open={profileModalOpen} onOpenChange={setProfileModalOpen} />
    </div>
  );
}
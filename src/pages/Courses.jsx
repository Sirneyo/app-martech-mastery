import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  BookOpen, 
  Clock, 
  Play,
  Star,
  Users,
  ChevronDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export default function Courses() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Foundation', 'Intermediate', 'Advanced', 'Certification'];

  const courses = [
    {
      id: 1,
      title: 'Marketo Fundamentals',
      description: 'Master the basics of marketing automation with Marketo. Learn to create programs, build forms, and set up basic campaigns.',
      progress: 65,
      lessons: 12,
      duration: '4h 30m',
      category: 'Foundation',
      rating: 4.9,
      students: 1234,
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=250&fit=crop',
      instructor: 'Sarah Chen'
    },
    {
      id: 2,
      title: 'Advanced Email Campaigns',
      description: 'Create high-converting email sequences with dynamic content, A/B testing, and advanced personalization techniques.',
      progress: 30,
      lessons: 8,
      duration: '3h 15m',
      category: 'Intermediate',
      rating: 4.8,
      students: 892,
      image: 'https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=400&h=250&fit=crop',
      instructor: 'Michael Torres'
    },
    {
      id: 3,
      title: 'Lead Scoring & Nurturing',
      description: 'Build intelligent lead management systems that automatically qualify and nurture prospects through the funnel.',
      progress: 0,
      lessons: 10,
      duration: '5h 00m',
      category: 'Advanced',
      rating: 4.7,
      students: 567,
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop',
      instructor: 'Emily Watson'
    },
    {
      id: 4,
      title: 'Marketing Analytics Mastery',
      description: 'Deep dive into Marketo analytics, reporting, and revenue attribution models for data-driven marketing.',
      progress: 0,
      lessons: 14,
      duration: '6h 45m',
      category: 'Advanced',
      rating: 4.9,
      students: 445,
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop',
      instructor: 'David Kim'
    },
    {
      id: 5,
      title: 'Landing Page Optimization',
      description: 'Design and optimize high-converting landing pages using Marketo templates and best practices.',
      progress: 100,
      lessons: 6,
      duration: '2h 30m',
      category: 'Foundation',
      rating: 4.6,
      students: 1567,
      image: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=400&h=250&fit=crop',
      instructor: 'Anna Martinez'
    },
    {
      id: 6,
      title: 'Marketo Certification Prep',
      description: 'Comprehensive preparation course for the Adobe Marketo Engage certification exam.',
      progress: 15,
      lessons: 20,
      duration: '10h 00m',
      category: 'Certification',
      rating: 4.9,
      students: 2341,
      image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=250&fit=crop',
      instructor: 'James Wilson'
    },
  ];

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || course.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Courses</h1>
        <p className="text-slate-500 mt-1">Explore our complete MarTech curriculum</p>
      </motion.div>

      {/* Search and Filters */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4 mb-8"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-white border-slate-200"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-11 px-4 bg-white">
              <Filter className="w-4 h-4 mr-2" />
              {selectedCategory}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {categories.map(category => (
              <DropdownMenuItem 
                key={category}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course, index) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * index }}
            className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200/50 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300"
          >
            <div className="relative h-44 overflow-hidden">
              <img 
                src={course.image} 
                alt={course.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <Badge className="absolute top-3 left-3 bg-white/90 text-slate-700 hover:bg-white">
                {course.category}
              </Badge>
              {course.progress === 100 && (
                <Badge className="absolute top-3 right-3 bg-green-500 text-white">
                  Completed
                </Badge>
              )}
              {course.progress > 0 && course.progress < 100 && (
                <button className="absolute bottom-3 right-3 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Play className="w-5 h-5 text-slate-900 ml-0.5" />
                </button>
              )}
            </div>
            <div className="p-5">
              <h3 className="font-bold text-lg text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
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

              <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> 
                  <span className="text-slate-600 font-medium">{course.rating}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> {course.students.toLocaleString()} students
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
                <button className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl text-sm font-semibold text-white transition-colors">
                  Start Course
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {filteredCourses.length === 0 && (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-600">No courses found</h3>
          <p className="text-slate-400">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}
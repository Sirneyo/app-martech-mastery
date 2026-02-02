import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Users, Calendar, ChevronDown, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function TutorCohorts() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['tutor-cohort-assignments'],
    queryFn: async () => {
      if (!user?.id) return [];
      return base44.entities.TutorCohortAssignment.filter({ tutor_id: user.id });
    },
    enabled: !!user?.id,
  });

  const { data: cohorts = [] } = useQuery({
    queryKey: ['assigned-cohorts', assignments],
    queryFn: async () => {
      if (assignments.length === 0) return [];
      const cohortIds = assignments.map(a => a.cohort_id);
      const allCohorts = await base44.entities.Cohort.list();
      return allCohorts.filter(c => cohortIds.includes(c.id));
    },
    enabled: assignments.length > 0,
  });

  const cohortIds = React.useMemo(() => {
    const ids = assignments.map(a => a.cohort_id);
    console.log('Tutor cohort IDs from assignments:', ids);
    return ids;
  }, [assignments]);

  const { data: memberships = [] } = useQuery({
    queryKey: ['cohort-memberships', JSON.stringify(cohortIds)],
    queryFn: async () => {
      if (cohortIds.length === 0) return [];
      const allMemberships = await base44.entities.CohortMembership.list();
      return allMemberships.filter(m => 
        cohortIds.includes(m.cohort_id) && m.status === 'active'
      );
    },
    enabled: cohortIds.length > 0,
    refetchInterval: 10000,
  });

  const studentUserIds = React.useMemo(() => {
    return [...new Set(memberships.map(m => m.user_id).filter(Boolean))];
  }, [memberships]);

  const { data: studentsData } = useQuery({
    queryKey: ['tutor-students'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getTutorStudents', {});
      return response.data;
    },
    refetchInterval: 10000,
  });

  const students = studentsData?.students || [];

  const getStudentsByCohort = (cohortId) => {
    const cohortStudentIds = memberships
      .filter(m => m.cohort_id === cohortId)
      .map(m => m.user_id)
      .filter(Boolean);
    return students.filter(s => cohortStudentIds.includes(s.id));
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">My Cohorts</h1>
          <p className="text-slate-500 mt-1">Manage your assigned cohorts and students</p>
        </motion.div>
        <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm text-center">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 mb-2">No Cohorts Assigned Yet</h2>
          <p className="text-slate-500">You don't have any cohorts assigned to you at the moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">My Cohorts</h1>
        <p className="text-slate-500 mt-1">Manage your assigned cohorts and students</p>
      </motion.div>

      <div className="space-y-4">
        {cohorts.map((cohort, index) => {
          const cohortStudents = getStudentsByCohort(cohort.id);
          
          return (
            <Collapsible key={cohort.id}>
              {({ open }) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  <CollapsibleTrigger className="w-full p-6 text-left hover:bg-slate-50 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-2xl font-bold text-slate-900">{cohort.name}</h2>
                          <div className={`transition-transform ${open ? 'rotate-90' : ''}`}>
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mb-3">
                          <Badge className="bg-blue-100 text-blue-700">{cohort.status}</Badge>
                          <span className="text-sm text-slate-500">Week {cohort.current_week}/12</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {cohort.start_date && format(new Date(cohort.start_date), 'MMM d, yyyy')}
                              {cohort.end_date && ` - ${format(new Date(cohort.end_date), 'MMM d, yyyy')}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span className="font-medium">{cohortStudents.length} students enrolled</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-6 pb-6 pt-2 border-t border-slate-100 bg-slate-50/50">
                      <h3 className="font-bold text-slate-900 mb-4 text-lg">Students in this Cohort</h3>
                      {cohortStudents.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <p className="text-sm text-slate-500">No students enrolled yet</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {cohortStudents.map((student) => (
                            <div key={student.id} className="flex items-center gap-3 p-4 bg-white rounded-xl hover:bg-slate-50 transition-colors border border-slate-200">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                                {student.full_name?.charAt(0) || 'S'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 text-sm truncate">{student.full_name}</p>
                                <p className="text-xs text-slate-500 truncate">{student.email}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </motion.div>
              )}
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
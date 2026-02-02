import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Users, Calendar, ChevronDown, ExternalLink } from 'lucide-react';
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

      <div className="space-y-6">
        {cohorts.map((cohort, index) => {
          const cohortStudents = getStudentsByCohort(cohort.id);
          
          return (
            <motion.div
              key={cohort.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{cohort.name}</h2>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge className="bg-blue-100 text-blue-700">{cohort.status}</Badge>
                    <span className="text-sm text-slate-500">Week {cohort.current_week}/12</span>
                  </div>
                </div>
                <Link to={createPageUrl('CohortDetail') + '?id=' + cohort.id}>
                  <Button size="sm" variant="outline">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    {cohort.start_date && format(new Date(cohort.start_date), 'MMM d, yyyy')}
                    {cohort.end_date && ` - ${format(new Date(cohort.end_date), 'MMM d, yyyy')}`}
                  </span>
                </div>

              </div>

              <Collapsible>
                <CollapsibleTrigger className="w-full mb-4 flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <h3 className="font-bold text-slate-900">Student Roster</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">{cohortStudents.length} students</span>
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mb-4">
                  {cohortStudents.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No students enrolled yet</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                      {cohortStudents.map((student) => (
                        <div key={student.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                            {student.full_name?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 text-sm">{student.full_name}</p>
                            <p className="text-xs text-slate-500">{student.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
                  <ChevronDown className="w-4 h-4" />
                  <span>Debug Info</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 p-4 bg-slate-50 rounded-lg text-sm space-y-1">
                  <p><strong>Cohort ID:</strong> {cohort.id}</p>
                  <p><strong>Total Memberships:</strong> {memberships.filter(m => m.cohort_id === cohort.id).length}</p>
                  <p><strong>Active Memberships:</strong> {memberships.filter(m => m.cohort_id === cohort.id && m.status === 'active').length}</p>
                  <p><strong>Student User IDs:</strong> {memberships.filter(m => m.cohort_id === cohort.id).map(m => m.user_id).join(', ')}</p>
                  <p><strong>Filtered Students:</strong> {cohortStudents.length}</p>
                </CollapsibleContent>
              </Collapsible>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar } from 'lucide-react';
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

  const cohortIds = React.useMemo(() => assignments.map(a => a.cohort_id), [assignments]);

  const { data: memberships = [] } = useQuery({
    queryKey: ['cohort-memberships', JSON.stringify(cohortIds)],
    queryFn: async () => {
      if (cohortIds.length === 0) return [];
      const allMemberships = await base44.entities.CohortMembership.list();
      return allMemberships.filter(m => cohortIds.includes(m.data.cohort_id) && m.data.status === 'active');
    },
    enabled: cohortIds.length > 0,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const getStudentsByCohort = (cohortId) => {
    const cohortMemberships = memberships.filter(m => m.data.cohort_id === cohortId);
    const studentIds = cohortMemberships.map(m => m.data.user_id);
    return allUsers.filter(u => studentIds.includes(u.id));
  };

  if (!user || assignments.length === 0 || cohorts.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
        <p className="text-slate-500">Loading cohorts...</p>
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    {cohort.start_date && format(new Date(cohort.start_date), 'MMM d, yyyy')}
                    {cohort.end_date && ` - ${format(new Date(cohort.end_date), 'MMM d, yyyy')}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">{cohortStudents.length} students</span>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 mb-3">Student Roster</h3>
                {cohortStudents.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No students enrolled yet</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
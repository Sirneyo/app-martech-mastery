import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import StudentProfileModal from '@/components/StudentProfileModal';
import { GraduationCap, Search, BookOpen, TrendingUp, User } from 'lucide-react';

export default function TutorStudents() {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCohort, setSelectedCohort] = useState('all');

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: tutorData = { students: [] }, isLoading } = useQuery({
    queryKey: ['tutor-students'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getTutorStudents', {});
      return res.data || { students: [] };
    },
    enabled: !!currentUser,
  });

  const students = tutorData.students || [];

  const { data: cohortAssignments = [] } = useQuery({
    queryKey: ['tutor-cohort-assignments', currentUser?.id],
    queryFn: () => base44.entities.TutorCohortAssignment.filter({ tutor_id: currentUser.id }),
    enabled: !!currentUser?.id,
  });

  const { data: cohorts = [] } = useQuery({
    queryKey: ['tutor-cohorts-detail'],
    queryFn: async () => {
      const cohortIds = cohortAssignments.map(a => a.cohort_id);
      const all = await base44.entities.Cohort.list();
      return all.filter(c => cohortIds.includes(c.id));
    },
    enabled: cohortAssignments.length > 0,
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['tutor-student-memberships'],
    queryFn: async () => {
      const cohortIds = cohortAssignments.map(a => a.cohort_id);
      const all = await base44.entities.CohortMembership.list();
      return all.filter(m => cohortIds.includes(m.cohort_id) && m.status === 'active');
    },
    enabled: cohortAssignments.length > 0,
  });

  const { data: allLedgerEntries = [] } = useQuery({
    queryKey: ['tutor-students-points'],
    queryFn: () => base44.entities.PointsLedger.list('-created_date', 1000),
    enabled: students.length > 0,
  });

  const getStudentCohort = (studentId) => {
    const membership = memberships.find(m => m.user_id === studentId);
    if (!membership) return null;
    return cohorts.find(c => c.id === membership.cohort_id);
  };

  const getStudentPoints = (studentId) =>
    allLedgerEntries.filter(e => e.user_id === studentId).reduce((s, e) => s + (e.points || 0), 0);

  const openJourney = (student) => {
    setSelectedStudent(student);
    setModalOpen(true);
  };

  const filteredStudents = students
    .filter(s => {
      if (!searchTerm) return true;
      return s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             s.email?.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .filter(s => {
      if (selectedCohort === 'all') return true;
      const m = memberships.find(m => m.user_id === s.id);
      return m?.cohort_id === selectedCohort;
    });



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Students</h1>
            <p className="text-slate-500 text-sm">{students.length} student{students.length !== 1 ? 's' : ''} across your cohorts</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCohort('all')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${selectedCohort === 'all' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              All Cohorts
            </button>
            {cohorts.map(cohort => (
              <button
                key={cohort.id}
                onClick={() => setSelectedCohort(cohort.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${selectedCohort === cohort.id ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                {cohort.name}
              </button>
            ))}
          </div>
        </div>

        {/* Student Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-slate-400">Loading students...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-14 text-center">
            <GraduationCap className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-600 font-semibold">No students found</p>
            <p className="text-slate-400 text-sm mt-1">No students are assigned to your cohorts yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map(student => {
              const cohort = getStudentCohort(student.id);
              const points = getStudentPoints(student.id);
              return (
                <Card key={student.id} className="border-slate-200 hover:shadow-md transition-shadow">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{student.full_name}</p>
                        <p className="text-xs text-slate-500 truncate">{student.email}</p>
                        {cohort && (
                          <Badge className="mt-1 text-xs bg-violet-100 text-violet-700 border-0">{cohort.name}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                        <span className={`text-sm font-bold ${points < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                          {points} pts
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className="bg-violet-600 hover:bg-violet-700 text-white text-xs"
                        onClick={() => openJourney(student)}
                      >
                        <BookOpen className="w-3 h-3 mr-1" /> View Journey
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <StudentProfileModal
        student={selectedStudent}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedStudent(null);
        }}
      />
    </div>
  );
}
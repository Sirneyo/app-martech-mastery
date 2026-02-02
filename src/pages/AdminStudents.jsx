import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Users, GraduationCap } from 'lucide-react';
import StudentProfileModal from '@/components/StudentProfileModal';

export default function AdminStudents() {
  const [searchTerm, setSearchTerm] = useState('');
  const [cohortFilter, setCohortFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: cohorts = [] } = useQuery({
    queryKey: ['cohorts'],
    queryFn: () => base44.entities.Cohort.list(),
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['memberships'],
    queryFn: () => base44.entities.CohortMembership.list(),
  });

  const { data: pointsLedger = [] } = useQuery({
    queryKey: ['points-ledger'],
    queryFn: () => base44.entities.PointsLedger.list(),
  });

  const students = users.filter(u => u.app_role === 'student' || !u.app_role);

  const getUserCohort = (userId) => {
    const membership = memberships.find(m => m.user_id === userId);
    if (membership) {
      const cohort = cohorts.find(c => c.id === membership.cohort_id);
      return cohort;
    }
    return null;
  };

  const getUserPoints = (userId) => {
    return pointsLedger
      .filter(entry => entry.user_id === userId)
      .reduce((sum, entry) => sum + entry.points, 0);
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = !searchTerm || 
      student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const studentCohort = getUserCohort(student.id);
    const matchesCohort = cohortFilter === 'all' || 
      (cohortFilter === 'none' && !studentCohort) ||
      (studentCohort && studentCohort.id === cohortFilter);
    
    return matchesSearch && matchesCohort;
  });

  const handleStudentClick = (student) => {
    setSelectedStudent(student);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <GraduationCap className="w-8 h-8 text-violet-600" />
              Student Profiles
            </h1>
            <p className="text-slate-500 mt-1">View detailed information about each student</p>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
            <Users className="w-5 h-5 text-slate-400" />
            <span className="font-semibold text-slate-700">{filteredStudents.length}</span>
            <span className="text-slate-500 text-sm">students</span>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={cohortFilter} onValueChange={setCohortFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by cohort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cohorts</SelectItem>
                <SelectItem value="none">No Cohort</SelectItem>
                {cohorts.map((cohort) => (
                  <SelectItem key={cohort.id} value={cohort.id}>
                    {cohort.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Students Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No students found matching your filters</p>
            </div>
          ) : (
            filteredStudents.map((student) => {
              const cohort = getUserCohort(student.id);
              const points = getUserPoints(student.id);

              return (
                <Card
                  key={student.id}
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 bg-gradient-to-br from-white to-slate-50"
                  onClick={() => handleStudentClick(student)}
                >
                  <div className="p-6 space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                        {student.full_name?.charAt(0) || 'S'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate">
                          {student.full_name || 'Unnamed Student'}
                        </h3>
                        <p className="text-sm text-slate-500 truncate">{student.email}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">Cohort</span>
                        {cohort ? (
                          <Badge variant="secondary">{cohort.name}</Badge>
                        ) : (
                          <span className="text-sm text-slate-400">Not assigned</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">Total Points</span>
                        <span className="font-bold text-violet-600">{points}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">Status</span>
                        <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                          {student.status || 'active'}
                        </Badge>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200">
                      <p className="text-xs text-center text-slate-500">
                        Click to view full profile
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Student Profile Modal */}
        <StudentProfileModal
          student={selectedStudent}
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedStudent(null);
          }}
        />
      </div>
    </div>
  );
}
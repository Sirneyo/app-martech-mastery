import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Users, GraduationCap, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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

  const queryClient = useQueryClient();

  const approvalMutation = useMutation({
    mutationFn: ({ studentId, isApproved }) => 
      base44.entities.User.update(studentId, { is_approved_graduate: isApproved }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const handleStudentClick = (student) => {
    setSelectedStudent(student);
    setModalOpen(true);
  };

  const handleToggleApproval = (e, student) => {
    e.stopPropagation();
    approvalMutation.mutate({ 
      studentId: student.id, 
      isApproved: !student.is_approved_graduate 
    });
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

        {/* Students List */}
        <div className="space-y-3">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
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
                  className="cursor-pointer hover:shadow-md transition-all duration-200 bg-white"
                  onClick={() => handleStudentClick(student)}
                >
                  <div className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {student.full_name?.charAt(0) || 'S'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">
                        {student.full_name || 'Unnamed Student'}
                      </h3>
                      <p className="text-sm text-slate-500 truncate">{student.email}</p>
                    </div>

                    <div className="hidden md:flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="text-slate-400 text-xs mb-1">Cohort</p>
                        {cohort ? (
                          <Badge variant="secondary">{cohort.name}</Badge>
                        ) : (
                          <span className="text-slate-400 text-xs">Not assigned</span>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-slate-400 text-xs mb-1">Points</p>
                        <span className="font-bold text-violet-600">{points}</span>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-400 text-xs mb-1">Status</p>
                        <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                          {student.status || 'active'}
                        </Badge>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-400 text-xs mb-1">Graduate</p>
                        <Badge variant={student.is_approved_graduate ? 'default' : 'outline'}>
                          {student.is_approved_graduate ? 'Approved' : 'Pending'}
                        </Badge>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant={student.is_approved_graduate ? 'default' : 'outline'}
                      onClick={(e) => handleToggleApproval(e, student)}
                      disabled={approvalMutation.isPending}
                      className="flex-shrink-0"
                    >
                      {student.is_approved_graduate ? (
                        <><Check className="w-4 h-4 mr-1" /> Approved</>
                      ) : (
                        <><X className="w-4 h-4 mr-1" /> Approve</>
                      )}
                    </Button>
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
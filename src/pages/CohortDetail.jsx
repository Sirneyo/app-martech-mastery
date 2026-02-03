import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Calendar, Users, GraduationCap, Edit, UserMinus, UserPlus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function CohortDetail() {
  const [searchParams] = useSearchParams();
  const cohortId = searchParams.get('id');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [assignStudentDialogOpen, setAssignStudentDialogOpen] = useState(false);
  const [assignTutorDialogOpen, setAssignTutorDialogOpen] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    current_week: 1,
    status: 'upcoming',
  });
  const [selectedUserId, setSelectedUserId] = useState('');

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: cohort } = useQuery({
    queryKey: ['cohort', cohortId],
    queryFn: async () => {
      const cohorts = await base44.entities.Cohort.list();
      return cohorts.find(c => c.id === cohortId);
    },
    enabled: !!cohortId,
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['memberships', cohortId],
    queryFn: () => base44.entities.CohortMembership.filter({ cohort_id: cohortId }),
    enabled: !!cohortId,
  });

  const { data: tutorAssignments = [] } = useQuery({
    queryKey: ['tutor-assignments', cohortId],
    queryFn: () => base44.entities.TutorCohortAssignment.filter({ cohort_id: cohortId }),
    enabled: !!cohortId,
  });

  const { data: usersData } = useQuery({
    queryKey: ['cohort-users', cohortId],
    queryFn: async () => {
      const response = await base44.functions.invoke('getUsersForCohort', { cohortId });
      return response.data;
    },
    enabled: !!cohortId,
  });

  const students = usersData?.students || [];
  const tutors = usersData?.tutors || [];
  const availableStudents = usersData?.availableStudents || [];
  const availableTutors = usersData?.availableTutors || [];

  const updateCohortMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Cohort.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cohort', cohortId] });
      setEditDialogOpen(false);
    },
  });

  const assignStudentMutation = useMutation({
    mutationFn: (data) => base44.entities.CohortMembership.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships', cohortId] });
      setAssignStudentDialogOpen(false);
      setSelectedUserId('');
    },
  });

  const removeStudentMutation = useMutation({
    mutationFn: (membershipId) => base44.entities.CohortMembership.delete(membershipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships', cohortId] });
    },
  });

  const assignTutorMutation = useMutation({
    mutationFn: (data) => base44.entities.TutorCohortAssignment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutor-assignments', cohortId] });
      setAssignTutorDialogOpen(false);
      setSelectedUserId('');
    },
  });

  const removeTutorMutation = useMutation({
    mutationFn: (assignmentId) => base44.entities.TutorCohortAssignment.delete(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutor-assignments', cohortId] });
      queryClient.invalidateQueries({ queryKey: ['cohort-users', cohortId] });
    },
  });

  const handleEditCohort = () => {
    if (!cohort) return;
    setEditData({
      name: cohort.name,
      start_date: cohort.start_date,
      end_date: cohort.end_date,
      current_week: cohort.current_week,
      status: cohort.status,
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    updateCohortMutation.mutate({ id: cohortId, data: editData });
  };

  const handleAssignStudent = () => {
    if (!selectedUserId) return;
    assignStudentMutation.mutate({
      user_id: selectedUserId,
      cohort_id: cohortId,
      enrollment_date: new Date().toISOString().split('T')[0],
      status: 'active',
    });
  };

  const handleAssignTutor = () => {
    if (!selectedUserId) return;
    assignTutorMutation.mutate({
      tutor_id: selectedUserId,
      cohort_id: cohortId,
      assigned_date: new Date().toISOString().split('T')[0],
      is_primary: tutorAssignments.length === 0,
    });
  };

  const statusColors = {
    upcoming: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    completed: 'bg-slate-100 text-slate-700',
  };

  if (!cohort) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
        <p className="text-slate-500">Loading cohort...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl(currentUser?.app_role === 'admin' ? 'AdminCohorts' : 'TutorCohorts')}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{cohort.name}</h1>
              <p className="text-slate-500 mt-1">Cohort Details & Management</p>
            </div>
          </div>
          {currentUser?.app_role === 'admin' && (
            <Button onClick={handleEditCohort} className="bg-violet-600 hover:bg-violet-700">
              <Edit className="w-4 h-4 mr-2" />
              Edit Cohort
            </Button>
          )}
        </div>

        {/* Cohort Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-slate-500 mb-1">Status</p>
                <Badge className={statusColors[cohort.status]}>{cohort.status}</Badge>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Current Week</p>
                <p className="text-lg font-semibold text-slate-900">{cohort.current_week}/12</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Start Date</p>
                <p className="text-slate-900">{cohort.start_date && format(new Date(cohort.start_date), 'MMM d, yyyy')}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">End Date</p>
                <p className="text-slate-900">{cohort.end_date && format(new Date(cohort.end_date), 'MMM d, yyyy')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Students Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Students ({students.length})
            </CardTitle>
            {currentUser?.app_role === 'admin' && (
              <Button onClick={() => setAssignStudentDialogOpen(true)} size="sm" variant="outline">
                <UserPlus className="w-4 h-4 mr-2" />
                Assign Student
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No students assigned yet</p>
            ) : (
              <div className="space-y-2">
                {students.map((student) => {
                  const membership = memberships.find(m => m.user_id === student.id);
                  return (
                    <div key={student.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white font-bold">
                          {student.full_name?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{student.full_name}</p>
                          <p className="text-sm text-slate-500">{student.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{membership?.status || 'active'}</Badge>
                        {currentUser?.app_role === 'admin' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Remove ${student.full_name} from this cohort?`)) {
                                removeStudentMutation.mutate(membership?.id);
                              }
                            }}
                          >
                            <UserMinus className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tutors Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Assigned Tutors ({tutors.length})
            </CardTitle>
            {currentUser?.app_role === 'admin' && (
              <Button onClick={() => setAssignTutorDialogOpen(true)} size="sm" variant="outline">
                <UserPlus className="w-4 h-4 mr-2" />
                Assign Tutor
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {tutors.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No tutors assigned yet</p>
            ) : (
              <div className="space-y-2">
                {tutors.map((tutor) => {
                  const assignment = tutorAssignments.find(t => t.tutor_id === tutor.id);
                  return (
                    <div key={tutor.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                          {tutor.full_name?.charAt(0) || 'T'}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{tutor.full_name}</p>
                          <p className="text-sm text-slate-500">{tutor.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {assignment?.is_primary && <Badge>Primary</Badge>}
                        {currentUser?.app_role === 'admin' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Remove ${tutor.full_name} from this cohort?`)) {
                                removeTutorMutation.mutate(assignment?.id);
                              }
                            }}
                          >
                            <UserMinus className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Cohort Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Cohort</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Cohort Name</Label>
                <Input
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={editData.start_date}
                    onChange={(e) => setEditData({ ...editData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={editData.end_date}
                    onChange={(e) => setEditData({ ...editData, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Current Week</Label>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    value={editData.current_week}
                    onChange={(e) => setEditData({ ...editData, current_week: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editData.status} onValueChange={(value) => setEditData({ ...editData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSaveEdit} className="w-full">Save Changes</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Assign Student Dialog */}
        <Dialog open={assignStudentDialogOpen} onOpenChange={setAssignStudentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Student to Cohort</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Student</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStudents.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.full_name} ({student.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAssignStudent} className="w-full" disabled={!selectedUserId}>
                Assign Student
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Assign Tutor Dialog */}
        <Dialog open={assignTutorDialogOpen} onOpenChange={setAssignTutorDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Tutor to Cohort</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Tutor</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a tutor" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTutors.map((tutor) => (
                      <SelectItem key={tutor.id} value={tutor.id}>
                        {tutor.full_name} ({tutor.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAssignTutor} className="w-full" disabled={!selectedUserId}>
                Assign Tutor
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
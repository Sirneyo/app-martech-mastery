import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, UserPlus, Users, GraduationCap, Trash2, Edit, Search, Mail, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminUsers() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({ full_name: '', email: '', app_role: 'student', cohort_id: '' });
  const [assignmentData, setAssignmentData] = useState({ cohort_id: '', tutor_id: '' });
  const [editData, setEditData] = useState({ full_name: '', email: '', app_role: '', status: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [cohortFilter, setCohortFilter] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

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

  const { data: tutorAssignments = [] } = useQuery({
    queryKey: ['tutor-assignments'],
    queryFn: () => base44.entities.TutorCohortAssignment.list(),
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ['invitations'],
    queryFn: () => base44.entities.Invitation.list('-sent_date'),
  });



  const assignCohortMutation = useMutation({
    mutationFn: (data) => base44.entities.CohortMembership.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      setAssignDialogOpen(false);
      setSelectedUser(null);
      setAssignmentData({ cohort_id: '', tutor_id: '' });
    },
  });

  const assignTutorMutation = useMutation({
    mutationFn: (data) => base44.entities.TutorCohortAssignment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutor-cohort-assignments'] });
      setAssignDialogOpen(false);
      setSelectedUser(null);
      setAssignmentData({ cohort_id: '', tutor_id: '' });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId) => base44.entities.User.delete(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }) => base44.entities.User.update(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      setEditDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error) => {
      console.error('Update error:', error);
      alert('Failed to update user: ' + (error.message || 'Unknown error'));
    },
  });

  const createInvitationMutation = useMutation({
    mutationFn: (data) => base44.entities.Invitation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });

  const deleteInvitationMutation = useMutation({
    mutationFn: (id) => base44.entities.Invitation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.full_name) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const cohort = cohorts.find(c => c.id === newUser.cohort_id);
      
      // Create invitation record
      const invitationRecord = await createInvitationMutation.mutateAsync({
        email: newUser.email,
        full_name: newUser.full_name,
        intended_app_role: newUser.app_role,
        cohort_id: newUser.cohort_id || null,
        status: 'pending',
        invited_by: currentUser?.email,
        sent_date: new Date().toISOString(),
      });

      // Send custom branded email
      await base44.functions.invoke('sendInvitationEmail', {
        email: newUser.email,
        full_name: newUser.full_name,
        app_role: newUser.app_role,
        cohortName: cohort?.name || null,
        invitationId: invitationRecord.id,
      });
      
      alert('Invitation sent successfully!');
      setNewUser({ full_name: '', email: '', app_role: 'student', cohort_id: '' });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Invitation error:', error);
      alert('Failed to send invitation: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignCohort = () => {
    if (selectedUser && assignmentData.cohort_id) {
      assignCohortMutation.mutate({
        user_id: selectedUser.id,
        cohort_id: assignmentData.cohort_id,
        enrollment_date: new Date().toISOString().split('T')[0],
      });
    }
  };

  const handleAssignTutor = () => {
    if (selectedUser && assignmentData.cohort_id) {
      assignTutorMutation.mutate({
        tutor_id: selectedUser.id,
        cohort_id: assignmentData.cohort_id,
        assigned_date: new Date().toISOString().split('T')[0],
      });
    }
  };

  const getUserCohort = (userId) => {
    // Check for student cohort assignment
    const studentMembership = memberships.find(m => m.user_id === userId);
    if (studentMembership) {
      const cohort = cohorts.find(c => c.id === studentMembership.cohort_id);
      if (cohort) return cohort.name;
    }

    // Check for tutor cohort assignment
    const tutorAssignment = tutorAssignments.find(ta => ta.tutor_id === userId);
    if (tutorAssignment) {
      const cohort = cohorts.find(c => c.id === tutorAssignment.cohort_id);
      if (cohort) return cohort.name;
    }

    return null;
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditData({
      full_name: user.full_name || '',
      app_role: user.app_role || 'student',
      status: user.status || 'active'
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedUser) return;

    // Check if trying to remove last admin's admin role
    const adminUsers = users.filter(u => u.app_role === 'admin');
    const isLastAdmin = adminUsers.length === 1 && adminUsers[0].id === selectedUser.id;
    const isRemovingAdminRole = selectedUser.app_role === 'admin' && editData.app_role !== 'admin';

    if (isLastAdmin && isRemovingAdminRole && currentUser?.id === selectedUser.id) {
      alert('Cannot remove admin role from the last admin user');
      return;
    }

    // Only send custom fields (not built-in ones like full_name, email)
    const updateData = {
      app_role: editData.app_role,
      status: editData.status
    };

    updateUserMutation.mutate({
      userId: selectedUser.id,
      data: updateData
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.app_role === roleFilter;
    
    const userCohort = getUserCohort(user.id);
    const matchesCohort = cohortFilter === 'all' || 
      (cohortFilter === 'none' && !userCohort) ||
      (userCohort && cohorts.find(c => c.name === userCohort)?.id === cohortFilter);
    
    return matchesSearch && matchesRole && matchesCohort;
  });

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
            <p className="text-slate-500 mt-1">Manage users, cohorts, and tutor assignments</p>
          </div>
          <Button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-violet-600 hover:bg-violet-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            {showCreateForm ? 'Cancel' : 'Invite New User'}
          </Button>
        </div>

        {/* Create User Form */}
        {showCreateForm && (
          <Card className="border-violet-200 bg-violet-50/50">
            <CardHeader>
              <CardTitle className="text-violet-900">Invite New User</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    value={newUser.full_name}
                    onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Address *</Label>
                  <Input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role *</Label>
                  <Select value={newUser.app_role} onValueChange={(value) => setNewUser({ ...newUser, app_role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="tutor">Tutor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assigned Cohort (Optional)</Label>
                  <Select value={newUser.cohort_id} onValueChange={(value) => setNewUser({ ...newUser, cohort_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select cohort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>None</SelectItem>
                      {cohorts.map((cohort) => (
                        <SelectItem key={cohort.id} value={cohort.id}>
                          {cohort.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleCreateUser} 
                  className="w-full bg-violet-600 hover:bg-violet-700" 
                  disabled={!newUser.email || !newUser.full_name || isSubmitting}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Sending Invitation...' : 'Send Invitation Email'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader>
              <CardTitle className="text-orange-900 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Pending Invitations ({pendingInvitations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendingInvitations.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-orange-200">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{inv.full_name}</p>
                      <p className="text-sm text-slate-600">{inv.email}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary">{inv.intended_app_role}</Badge>
                        {inv.cohort_id && (
                          <Badge variant="outline">
                            {cohorts.find(c => c.id === inv.cohort_id)?.name || 'Cohort'}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        {new Date(inv.sent_date).toLocaleDateString()}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm('Cancel this invitation?')) {
                            deleteInvitationMutation.mutate(inv.id);
                          }
                        }}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="tutor">Tutor</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
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

        {/* Results Summary */}
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-4">
          <p className="text-sm text-violet-700">
            Showing <span className="font-bold">{filteredUsers.length}</span> of <span className="font-bold">{users.length}</span> users
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-4 font-semibold text-slate-700">Name</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Email</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Role</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Cohort</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-500">
                      No users found matching your filters
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-900">{user.full_name}</td>
                    <td className="p-4 text-slate-600">{user.email}</td>
                    <td className="p-4">
                      <Badge variant={user.app_role === 'admin' ? 'default' : 'secondary'}>
                        {user.app_role || 'student'}
                      </Badge>
                    </td>
                    <td className="p-4 text-slate-600">
                      {getUserCohort(user.id) || '-'}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(user);
                            setAssignDialogOpen(true);
                          }}
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          Assign
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm('Delete this user?')) {
                              deleteUserMutation.mutate(user.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign {selectedUser?.full_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Cohort</Label>
                <Select
                  value={assignmentData.cohort_id}
                  onValueChange={(value) => setAssignmentData({ ...assignmentData, cohort_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a cohort" />
                  </SelectTrigger>
                  <SelectContent>
                    {cohorts.map((cohort) => (
                      <SelectItem key={cohort.id} value={cohort.id}>
                        {cohort.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAssignCohort} className="flex-1">
                  <Users className="w-4 h-4 mr-2" />
                  Assign as Student
                </Button>
                <Button onClick={handleAssignTutor} variant="outline" className="flex-1">
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Assign as Tutor
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-amber-700">
                  <strong>Note:</strong> Name and email cannot be changed (managed by authentication system)
                </p>
              </div>
              <div className="space-y-2">
                <Label>Full Name (Read-only)</Label>
                <Input
                  value={selectedUser?.full_name || ''}
                  disabled
                  className="bg-slate-100"
                />
              </div>
              <div className="space-y-2">
                <Label>Email (Read-only)</Label>
                <Input
                  type="email"
                  value={selectedUser?.email || ''}
                  disabled
                  className="bg-slate-100"
                />
              </div>
              <div className="space-y-2">
                <Label>App Role</Label>
                <Select value={editData.app_role} onValueChange={(value) => setEditData({ ...editData, app_role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="tutor">Tutor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editData.status} onValueChange={(value) => setEditData({ ...editData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assigned Cohort</Label>
                <Select 
                  value={getUserCohort(selectedUser?.id) ? cohorts.find(c => c.name === getUserCohort(selectedUser?.id))?.id : ''} 
                  onValueChange={(value) => {
                    // Find existing membership/assignment for this user
                    const studentMembership = memberships.find(m => m.user_id === selectedUser?.id);
                    const tutorAssignment = tutorAssignments.find(ta => ta.tutor_id === selectedUser?.id);
                    
                    if (value) {
                      if (studentMembership) {
                        base44.entities.CohortMembership.update(studentMembership.id, { cohort_id: value });
                      } else if (tutorAssignment) {
                        base44.entities.TutorCohortAssignment.update(tutorAssignment.id, { cohort_id: value });
                      } else {
                        // Create new membership based on role
                        if (selectedUser?.app_role === 'tutor') {
                          base44.entities.TutorCohortAssignment.create({
                            tutor_id: selectedUser.id,
                            cohort_id: value,
                            assigned_date: new Date().toISOString().split('T')[0],
                          });
                        } else {
                          base44.entities.CohortMembership.create({
                            user_id: selectedUser.id,
                            cohort_id: value,
                            enrollment_date: new Date().toISOString().split('T')[0],
                          });
                        }
                      }
                      queryClient.invalidateQueries({ queryKey: ['memberships'] });
                      queryClient.invalidateQueries({ queryKey: ['tutor-assignments'] });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select cohort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {cohorts.map((cohort) => (
                      <SelectItem key={cohort.id} value={cohort.id}>
                        {cohort.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSaveEdit} className="w-full" disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
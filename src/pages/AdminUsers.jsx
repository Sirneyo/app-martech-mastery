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
import { Plus, UserPlus, Users, GraduationCap, Trash2, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AdminUsers() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({ full_name: '', email: '', role: 'user' });
  const [assignmentData, setAssignmentData] = useState({ cohort_id: '', tutor_id: '' });
  const [editData, setEditData] = useState({ full_name: '', email: '', role: '', status: '' });

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

  const createUserMutation = useMutation({
    mutationFn: (userData) => base44.entities.User.create(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setCreateDialogOpen(false);
      setNewUser({ full_name: '', email: '', role: 'user' });
    },
  });

  const assignCohortMutation = useMutation({
    mutationFn: (data) => base44.entities.CohortMembership.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      setAssignDialogOpen(false);
      setSelectedUser(null);
    },
  });

  const assignTutorMutation = useMutation({
    mutationFn: (data) => base44.entities.TutorCohortAssignment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutor-assignments'] });
      setAssignDialogOpen(false);
      setSelectedUser(null);
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

  const handleCreateUser = () => {
    createUserMutation.mutate(newUser);
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
    const membership = memberships.find(m => m.user_id === userId);
    if (membership) {
      const cohort = cohorts.find(c => c.id === membership.cohort_id);
      return cohort?.name;
    }
    return null;
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditData({
      full_name: user.full_name || '',
      email: user.email || '',
      role: user.role || 'user',
      status: user.status || 'active'
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedUser) return;

    // Check if trying to remove last admin's admin role
    const adminUsers = users.filter(u => u.role === 'admin');
    const isLastAdmin = adminUsers.length === 1 && adminUsers[0].id === selectedUser.id;
    const isRemovingAdminRole = selectedUser.role === 'admin' && editData.role !== 'admin';

    if (isLastAdmin && isRemovingAdminRole && currentUser?.id === selectedUser.id) {
      alert('Cannot remove admin role from the last admin user');
      return;
    }

    updateUserMutation.mutate({
      userId: selectedUser.id,
      data: editData
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
            <p className="text-slate-500 mt-1">Manage users, cohorts, and tutor assignments</p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-violet-600 hover:bg-violet-700">
                <Plus className="w-4 h-4 mr-2" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={newUser.full_name}
                    onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Student</SelectItem>
                      <SelectItem value="admin">Admin/Tutor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateUser} className="w-full">
                  Create User
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-900">{user.full_name}</td>
                    <td className="p-4 text-slate-600">{user.email}</td>
                    <td className="p-4">
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role}
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
                ))}
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
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={editData.full_name}
                  onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editData.role} onValueChange={(value) => setEditData({ ...editData, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Student</SelectItem>
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
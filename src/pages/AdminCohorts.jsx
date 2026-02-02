import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Users, Calendar, Trash2, Edit, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function AdminCohorts() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCohort, setEditingCohort] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    current_week: 1,
    status: 'upcoming',
    tutor_ids: [],
  });

  const queryClient = useQueryClient();

  const { data: cohorts = [] } = useQuery({
    queryKey: ['cohorts'],
    queryFn: () => base44.entities.Cohort.list('-created_date'),
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['memberships'],
    queryFn: () => base44.entities.CohortMembership.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const tutors = users.filter(u => u.app_role === 'tutor');

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const { tutor_ids, ...cohortData } = data;
      const cohort = await base44.entities.Cohort.create(cohortData);
      
      // Create tutor assignments
      if (tutor_ids && tutor_ids.length > 0) {
        const assignments = tutor_ids.map(tutorId => 
          base44.entities.TutorCohortAssignment.create({
            tutor_id: tutorId,
            cohort_id: cohort.id,
            assigned_date: new Date().toISOString().split('T')[0],
            is_primary: true
          })
        );
        await Promise.all(assignments);
      }
      
      return cohort;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cohorts'] });
      queryClient.invalidateQueries({ queryKey: ['tutor-cohort-assignments'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Cohort.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cohorts'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Cohort.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cohorts'] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      start_date: '',
      end_date: '',
      current_week: 1,
      status: 'upcoming',
      tutor_ids: [],
    });
    setEditingCohort(null);
  };

  const handleSubmit = () => {
    if (editingCohort) {
      updateMutation.mutate({ id: editingCohort.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (cohort) => {
    setEditingCohort(cohort);
    setFormData({
      name: cohort.name,
      start_date: cohort.start_date,
      end_date: cohort.end_date,
      current_week: cohort.current_week,
      status: cohort.status,
      tutor_ids: [],
    });
    setDialogOpen(true);
  };

  const getMemberCount = (cohortId) => {
    return memberships.filter(m => m.cohort_id === cohortId && m.status === 'active').length;
  };

  const statusColors = {
    upcoming: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    completed: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Cohort Management</h1>
            <p className="text-slate-500 mt-1">Manage program cohorts and schedules</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-violet-600 hover:bg-violet-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Cohort
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCohort ? 'Edit Cohort' : 'Create New Cohort'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Cohort Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Cohort 2024-Q1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
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
                      value={formData.current_week}
                      onChange={(e) => setFormData({ ...formData, current_week: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
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
                {!editingCohort && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4" />
                      Assign Tutors (Optional)
                    </Label>
                    <div className="border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                      {tutors.length === 0 ? (
                        <p className="text-sm text-slate-500">No tutors available</p>
                      ) : (
                        tutors.map((tutor) => (
                          <div key={tutor.id} className="flex items-center gap-2">
                            <Checkbox
                              checked={formData.tutor_ids.includes(tutor.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFormData({ ...formData, tutor_ids: [...formData.tutor_ids, tutor.id] });
                                } else {
                                  setFormData({ ...formData, tutor_ids: formData.tutor_ids.filter(id => id !== tutor.id) });
                                }
                              }}
                            />
                            <label className="text-sm text-slate-700">{tutor.full_name}</label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
                <Button onClick={handleSubmit} className="w-full">
                  {editingCohort ? 'Update Cohort' : 'Create Cohort'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cohorts.map((cohort) => (
            <Link 
              key={cohort.id} 
              to={createPageUrl('CohortDetail') + '?id=' + cohort.id}
              className="block"
            >
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{cohort.name}</h3>
                    <Badge className={statusColors[cohort.status]}>
                      {cohort.status}
                    </Badge>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.preventDefault()}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(cohort)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm('Delete this cohort?')) {
                          deleteMutation.mutate(cohort.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {cohort.start_date && format(new Date(cohort.start_date), 'MMM d, yyyy')}
                      {cohort.end_date && ` - ${format(new Date(cohort.end_date), 'MMM d, yyyy')}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Users className="w-4 h-4" />
                    <span>{getMemberCount(cohort.id)} students</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-slate-500">Week: </span>
                    <span className="font-semibold text-slate-900">{cohort.current_week}/12</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
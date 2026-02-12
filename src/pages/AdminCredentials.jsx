import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Key, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function AdminCredentials() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    month: 1,
    year: new Date().getFullYear(),
    marketo_email: '',
    marketo_password: '',
  });

  const queryClient = useQueryClient();

  const { data: credentials = [] } = useQuery({
    queryKey: ['credentials'],
    queryFn: () => base44.entities.Credential.list('-created_date'),
  });

  const { data: cohorts = [] } = useQuery({
    queryKey: ['cohorts'],
    queryFn: () => base44.entities.Cohort.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Credential.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Credential.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Credential.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      month: 1,
      year: new Date().getFullYear(),
      marketo_email: '',
      marketo_password: '',
    });
    setEditingCredential(null);
  };

  const handleSubmit = () => {
    if (editingCredential) {
      updateMutation.mutate({ id: editingCredential.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (credential) => {
    setEditingCredential(credential);
    setFormData({
      name: credential.name,
      month: credential.month,
      year: credential.year,
      marketo_email: credential.marketo_email,
      marketo_password: credential.marketo_password,
    });
    setDialogOpen(true);
  };

  const getCohortsUsingCredential = (credentialId) => {
    return cohorts.filter(c => c.credential_id === credentialId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Credentials Management</h1>
            <p className="text-slate-500 mt-1">Manage login credentials for cohorts</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-violet-600 hover:bg-violet-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Credential
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCredential ? 'Edit Credential' : 'Create New Credential'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Credential Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., January 2026 Marketo Credentials"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Month</Label>
                    <Select value={formData.month.toString()} onValueChange={(value) => setFormData({ ...formData, month: parseInt(value) })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((month, index) => (
                          <SelectItem key={index + 1} value={(index + 1).toString()}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Marketo Email</Label>
                  <Input
                    type="email"
                    value={formData.marketo_email}
                    onChange={(e) => setFormData({ ...formData, marketo_email: e.target.value })}
                    placeholder="marketo@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Marketo Password</Label>
                  <Input
                    type="text"
                    value={formData.marketo_password}
                    onChange={(e) => setFormData({ ...formData, marketo_password: e.target.value })}
                    placeholder="Enter password"
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full">
                  {editingCredential ? 'Update Credential' : 'Create Credential'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {credentials.map((credential) => {
            const assignedCohorts = getCohortsUsingCredential(credential.id);
            return (
              <Card key={credential.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{credential.name}</CardTitle>
                      <Badge className="bg-blue-100 text-blue-700">
                        {MONTHS[credential.month - 1]} {credential.year}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(credential)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (assignedCohorts.length > 0) {
                            alert(`Cannot delete. This credential is used by ${assignedCohorts.length} cohort(s).`);
                            return;
                          }
                          if (confirm('Delete this credential?')) {
                            deleteMutation.mutate(credential.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Key className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-600">Email:</span>
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded">{credential.marketo_email}</code>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Key className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-600">Password:</span>
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded">••••••••</code>
                    </div>
                  </div>
                  {assignedCohorts.length > 0 && (
                    <div className="pt-3 border-t border-slate-200">
                      <p className="text-xs text-slate-500 mb-2">Used by {assignedCohorts.length} cohort(s):</p>
                      <div className="flex flex-wrap gap-1">
                        {assignedCohorts.slice(0, 3).map(cohort => (
                          <Badge key={cohort.id} variant="outline" className="text-xs">
                            {cohort.name}
                          </Badge>
                        ))}
                        {assignedCohorts.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{assignedCohorts.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {credentials.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No credentials yet. Create your first credential set.</p>
          </div>
        )}
      </div>
    </div>
  );
}
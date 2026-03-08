import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Coins, Trash2, CheckCircle, XCircle, Search, Plus, Minus, Users, AlertTriangle, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Points management state
  const [pointsSearchTerm, setPointsSearchTerm] = useState('');
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustMessage, setAdjustMessage] = useState('');
  const [adjustType, setAdjustType] = useState('bonus'); // bonus | deduction

  // Deletion requests state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewNote, setReviewNote] = useState('');

  // Direct delete state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Points breakdown state
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['super-admin-users'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getSuperAdminUsers', {});
      return res.data?.users || [];
    },
    staleTime: 0,
  });

  const { data: ledgerEntries = [] } = useQuery({
    queryKey: ['points-ledger'],
    queryFn: () => base44.entities.PointsLedger.list('-created_date', 500),
  });

  const { data: deletionRequests = [] } = useQuery({
    queryKey: ['deletion-requests'],
    queryFn: () => base44.entities.UserDeletionRequest.list('-created_date'),
  });

  // Aggregate points per user
  const pointsByUser = users.reduce((acc, user) => {
    const userEntries = ledgerEntries.filter(e => e.user_id === user.id);
    const total = userEntries.reduce((sum, e) => sum + (e.points || 0), 0);
    acc[user.id] = total;
    return acc;
  }, {});

  const filteredUsers = users.filter(u =>
    !pointsSearchTerm ||
    u.full_name?.toLowerCase().includes(pointsSearchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(pointsSearchTerm.toLowerCase())
  ).filter(u => u.app_role === 'student');

  const pendingDeletions = deletionRequests.filter(r => r.status === 'pending');
  const resolvedDeletions = deletionRequests.filter(r => r.status !== 'pending');

  // Mutations
  const awardPointsMutation = useMutation({
    mutationFn: (data) => base44.entities.PointsLedger.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['points-ledger'] });
      setAdjustDialogOpen(false);
      setAdjustTarget(null);
      setAdjustAmount('');
      setAdjustReason('');
      setAdjustMessage('');
    },
  });

  const reviewDeletionMutation = useMutation({
    mutationFn: async ({ id, status, note, targetUserId }) => {
      await base44.entities.UserDeletionRequest.update(id, {
        status,
        reviewed_by_id: currentUser?.id,
        reviewed_at: new Date().toISOString(),
        review_note: note,
      });
      if (status === 'approved' && targetUserId) {
        await base44.functions.invoke('deleteUserById', { userId: targetUserId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deletion-requests'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-users'] });
      setReviewDialogOpen(false);
      setReviewTarget(null);
      setReviewNote('');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId) => base44.functions.invoke('deleteUserById', { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-users'] });
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
    },
  });

  const handleAdjustPoints = () => {
    const pts = parseInt(adjustAmount);
    if (!pts || !adjustReason.trim() || !adjustTarget) return;
    awardPointsMutation.mutate({
      user_id: adjustTarget.id,
      points: adjustType === 'deduction' ? -Math.abs(pts) : Math.abs(pts),
      reason: adjustReason,
      source_type: 'bonus',
      awarded_by: currentUser?.full_name || 'Super Admin',
      notification_message: adjustMessage.trim() || null,
    });
  };

  const openAdjustDialog = (user, type) => {
    setAdjustTarget(user);
    setAdjustType(type);
    setAdjustAmount('');
    setAdjustReason('');
    setAdjustMessage('');
    setAdjustDialogOpen(true);
  };

  const openReviewDialog = (req) => {
    setReviewTarget(req);
    setReviewNote('');
    setReviewDialogOpen(true);
  };

  const openDeleteConfirm = (user) => {
    setDeleteTarget(user);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteUser = () => {
    if (deleteTarget) {
      deleteUserMutation.mutate(deleteTarget.id);
    }
  };

  const openBreakdown = (user) => {
    setSelectedUser(user);
    setBreakdownOpen(true);
  };

  if (currentUser && currentUser.app_role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-700">Access Restricted</h2>
          <p className="text-slate-500 mt-2">This area is only accessible to Super Admins.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Super Admin Dashboard</h1>
            <p className="text-slate-500 mt-0.5">Points management, deletion requests, and system governance</p>
          </div>
        </div>

        {/* Role Switch Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4" /> View as Different Role
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { sessionStorage.setItem('superAdminViewAs', 'student'); navigate(createPageUrl('StudentDashboard')); }}
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              View as Student
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { sessionStorage.setItem('superAdminViewAs', 'tutor'); navigate(createPageUrl('TutorDashboard')); }}
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              View as Tutor
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { sessionStorage.setItem('superAdminViewAs', 'admin'); navigate(createPageUrl('AdminDashboard')); }}
              className="border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              View as Admin
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-violet-200 bg-violet-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-violet-600" />
                <div>
                  <p className="text-2xl font-bold text-violet-900">{users.filter(u => u.app_role === 'student').length}</p>
                  <p className="text-sm text-violet-600">Students</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Coins className="w-8 h-8 text-amber-600" />
                <div>
                  <p className="text-2xl font-bold text-amber-900">{ledgerEntries.length}</p>
                  <p className="text-sm text-amber-600">Total Ledger Entries</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                <div>
                  <p className="text-2xl font-bold text-red-900">{pendingDeletions.length}</p>
                  <p className="text-sm text-red-600">Pending Deletion Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="points">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="points" className="flex items-center gap-2">
              <Coins className="w-4 h-4" /> Points Ledger
            </TabsTrigger>
            <TabsTrigger value="deletions" className="flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Deletion Requests
              {pendingDeletions.length > 0 && (
                <Badge className="bg-red-500 text-white text-xs ml-1">{pendingDeletions.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Points Tab */}
          <TabsContent value="points" className="space-y-4 mt-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search students..."
                  value={pointsSearchTerm}
                  onChange={(e) => setPointsSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left p-4 font-semibold text-slate-700">Student</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Email</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Total Points</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-slate-500">No students found</td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => (
                      <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-4 font-medium text-slate-900">{user.full_name}</td>
                        <td className="p-4 text-slate-600 text-sm">{user.email}</td>
                        <td 
                          className="p-4 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => openBreakdown(user)}
                        >
                          <span className={`font-bold text-lg ${(pointsByUser[user.id] || 0) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {pointsByUser[user.id] || 0}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => openAdjustDialog(user, 'bonus')}
                            >
                              <Plus className="w-3 h-3 mr-1" /> Award
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => openAdjustDialog(user, 'deduction')}
                            >
                              <Minus className="w-3 h-3 mr-1" /> Deduct
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-700 border-red-300 hover:bg-red-100"
                              onClick={() => openDeleteConfirm(user)}
                            >
                              <Trash2 className="w-3 h-3 mr-1" /> Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Deletion Requests Tab */}
          <TabsContent value="deletions" className="space-y-4 mt-4">
            {pendingDeletions.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Pending Review
                </h3>
                {pendingDeletions.map(req => (
                  <Card key={req.id} className="border-red-200 bg-red-50/30">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{req.target_user_name}</p>
                          <p className="text-sm text-slate-500">{req.target_user_email} · {req.target_user_role}</p>
                          <p className="text-sm text-slate-600 mt-2 bg-white rounded-lg p-2 border border-slate-200">
                            <span className="font-medium">Reason:</span> {req.reason}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Requested by {req.requested_by_name} · {new Date(req.created_date).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="bg-violet-600 hover:bg-violet-700 text-white shrink-0"
                          onClick={() => openReviewDialog(req)}
                        >
                          Review
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {resolvedDeletions.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-500 text-sm uppercase tracking-wide">Resolved</h3>
                {resolvedDeletions.map(req => (
                  <Card key={req.id} className="border-slate-200 opacity-70">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-slate-800">{req.target_user_name}</p>
                          <p className="text-xs text-slate-500">{req.target_user_email}</p>
                          {req.review_note && <p className="text-xs text-slate-500 mt-1">Note: {req.review_note}</p>}
                        </div>
                        <Badge
                          className={req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}
                        >
                          {req.status === 'approved' ? <><CheckCircle className="w-3 h-3 mr-1 inline" />Approved</> : <><XCircle className="w-3 h-3 mr-1 inline" />Rejected</>}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {deletionRequests.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
                <Trash2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No deletion requests yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Points Adjust Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${adjustType === 'bonus' ? 'text-emerald-700' : 'text-red-700'}`}>
              {adjustType === 'bonus' ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
              {adjustType === 'bonus' ? 'Award Points' : 'Deduct Points'} — {adjustTarget?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input
                type="number"
                min="1"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="e.g. 50"
              />
            </div>
            <div className="space-y-2">
              <Label>Reason (internal) *</Label>
              <Textarea
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Internal reason for this adjustment..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Student notification message</Label>
              <Textarea
                value={adjustMessage}
                onChange={(e) => setAdjustMessage(e.target.value)}
                placeholder={`e.g. "Excellent completion of Assignment 3"`}
                rows={2}
              />
              <p className="text-xs text-slate-400">
                The student will see: "You received {adjustAmount || 'X'} points: {adjustMessage || '…'}"
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setAdjustDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className={`flex-1 text-white ${adjustType === 'bonus' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                disabled={!adjustAmount || !adjustReason.trim() || awardPointsMutation.isPending}
                onClick={handleAdjustPoints}
              >
                {awardPointsMutation.isPending ? 'Saving...' : `Confirm ${adjustType === 'bonus' ? 'Award' : 'Deduction'}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deletion Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-slate-800 flex items-center gap-2">
              <Shield className="w-5 h-5 text-violet-600" />
              Review Deletion Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700 space-y-1">
              <p><strong>User:</strong> {reviewTarget?.target_user_name} ({reviewTarget?.target_user_email})</p>
              <p><strong>Role:</strong> {reviewTarget?.target_user_role}</p>
              <p><strong>Reason:</strong> {reviewTarget?.reason}</p>
              <p><strong>Requested by:</strong> {reviewTarget?.requested_by_name}</p>
            </div>
            <div className="space-y-2">
              <Label>Review Note (optional)</Label>
              <Textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Add a note about your decision..."
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 text-slate-600"
                onClick={() => setReviewDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700"
                disabled={reviewDeletionMutation.isPending}
                onClick={() => reviewDeletionMutation.mutate({ id: reviewTarget.id, status: 'rejected', note: reviewNote, targetUserId: reviewTarget.target_user_id })}
              >
                <XCircle className="w-4 h-4 mr-1" /> Reject
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={reviewDeletionMutation.isPending}
                onClick={() => reviewDeletionMutation.mutate({ id: reviewTarget.id, status: 'approved', note: reviewNote, targetUserId: reviewTarget.target_user_id })}
              >
                <CheckCircle className="w-4 h-4 mr-1" /> Approve
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Direct Delete Confirmation Dialog */}
       <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle className="text-red-700 flex items-center gap-2">
               <Trash2 className="w-5 h-5" />
               Delete User
             </DialogTitle>
           </DialogHeader>
           <div className="space-y-4 py-2">
             <p className="text-slate-700">Are you sure you want to permanently delete <strong>{deleteTarget?.full_name}</strong> ({deleteTarget?.email})? This action cannot be undone.</p>
             <div className="flex gap-2">
               <Button
                 variant="outline"
                 className="flex-1"
                 onClick={() => setDeleteConfirmOpen(false)}
               >
                 Cancel
               </Button>
               <Button
                 className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                 disabled={deleteUserMutation.isPending}
                 onClick={handleDeleteUser}
               >
                 <Trash2 className="w-4 h-4 mr-1" /> {deleteUserMutation.isPending ? 'Deleting...' : 'Delete'}
               </Button>
             </div>
           </div>
         </DialogContent>
       </Dialog>

       {/* Points Breakdown Modal */}
       <Dialog open={breakdownOpen} onOpenChange={setBreakdownOpen}>
         <DialogContent className="max-w-2xl">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2 text-slate-800">
               <Coins className="w-5 h-5 text-amber-600" />
               Points Breakdown — {selectedUser?.full_name}
             </DialogTitle>
           </DialogHeader>
           <div className="space-y-4 py-2 max-h-96 overflow-y-auto">
             <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between">
               <span className="text-slate-600 font-medium">Total Points:</span>
               <span className={`text-2xl font-bold ${(pointsByUser[selectedUser?.id] || 0) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                 {pointsByUser[selectedUser?.id] || 0}
               </span>
             </div>

             <div className="space-y-2">
               {ledgerEntries
                 .filter(e => e.user_id === selectedUser?.id)
                 .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
                 .map(entry => (
                   <div key={entry.id} className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition-colors">
                     <div className="flex items-start justify-between gap-3">
                       <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2 mb-1">
                           <Badge variant={entry.source_type === 'bonus' || entry.points > 0 ? 'default' : 'destructive'} className="text-xs">
                             {entry.source_type}
                           </Badge>
                           {entry.reason && (
                             <span className="text-sm font-medium text-slate-800 truncate">{entry.reason}</span>
                           )}
                         </div>
                         <p className="text-xs text-slate-500">
                           {new Date(entry.created_date).toLocaleDateString()} at {new Date(entry.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </p>
                         {entry.awarded_by && (
                           <p className="text-xs text-slate-400 mt-1">By: {entry.awarded_by}</p>
                         )}
                       </div>
                       <span className={`text-lg font-bold whitespace-nowrap ml-2 ${entry.points < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                         {entry.points > 0 ? '+' : ''}{entry.points}
                       </span>
                     </div>
                   </div>
                 ))}
               {ledgerEntries.filter(e => e.user_id === selectedUser?.id).length === 0 && (
                 <div className="text-center py-8 text-slate-400">
                   <Coins className="w-8 h-8 mx-auto mb-2 opacity-40" />
                   <p className="text-sm">No point entries yet</p>
                 </div>
               )}
             </div>
           </div>
           <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
             <Button variant="outline" onClick={() => setBreakdownOpen(false)}>
               Close
             </Button>
           </div>
         </DialogContent>
       </Dialog>
       </div>
       );
       }
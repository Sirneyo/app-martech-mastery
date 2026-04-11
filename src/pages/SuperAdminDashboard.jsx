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
import { Shield, Coins, Trash2, CheckCircle, XCircle, Search, Plus, Minus, Users, AlertTriangle, Eye, Activity, UserCheck, Wifi, BarChart2, RotateCcw, Clock, RefreshCw, GraduationCap, FolderOpen } from 'lucide-react';
import SystemCheckPanel from '@/components/SystemCheckPanel';
import SuperAdminAnalytics from '@/components/SuperAdminAnalytics';
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

  // Reset points state
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);

  // View as User state
  const [viewAsSearch, setViewAsSearch] = useState('');
  const [viewAsRoleFilter, setViewAsRoleFilter] = useState('');

  // Exam overrides state
  const [examSearchTerm, setExamSearchTerm] = useState('');

  // Exam override confirmation state
  const [overrideConfirmOpen, setOverrideConfirmOpen] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState(null);

  // Project onboarding state
  const [onboardingSearchTerm, setOnboardingSearchTerm] = useState('');
  const [onboardingResetConfirmOpen, setOnboardingResetConfirmOpen] = useState(false);
  const [onboardingResetTarget, setOnboardingResetTarget] = useState(null);

  const [activeTab, setActiveTab] = useState('points');

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

  // Online users: logged in within the last 15 minutes
  const { data: allExamAttempts = [] } = useQuery({
    queryKey: ['all-exam-attempts-admin'],
    queryFn: () => base44.entities.ExamAttempt.list('-created_date', 500),
  });

  const { data: examConfig } = useQuery({
    queryKey: ['exam-config-admin'],
    queryFn: async () => {
      const configs = await base44.entities.ExamConfig.filter({ is_active: true });
      return configs[0];
    },
  });

  const { data: recentLoginEvents = [] } = useQuery({
    queryKey: ['recent-login-events'],
    queryFn: () => base44.entities.LoginEvent.list('-login_time', 200),
    refetchInterval: 60000,
  });

  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  const onlineUserIds = [...new Set(
    recentLoginEvents
      .filter(e => new Date(e.login_time) > fifteenMinutesAgo)
      .map(e => e.user_id)
  )];
  const onlineUsers = users.filter(u => onlineUserIds.includes(u.id));

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

  const filteredViewAsUsers = users
    .filter(u => u.id !== currentUser?.id)
    .filter(u => !viewAsRoleFilter || u.app_role === viewAsRoleFilter)
    .filter(u =>
      !viewAsSearch ||
      u.full_name?.toLowerCase().includes(viewAsSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(viewAsSearch.toLowerCase())
    );

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

  const resetPointsMutation = useMutation({
    mutationFn: (userId) => base44.functions.invoke('resetPoints', { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['points-ledger'] });
      setResetConfirmOpen(false);
      setResetTarget(null);
    },
  });

  const deleteLedgerEntryMutation = useMutation({
    mutationFn: async (entryId) => {
      await base44.entities.PointsLedger.delete(entryId);
      const linked = await base44.entities.Notification.filter({ related_entity_id: entryId });
      for (const n of linked) {
        await base44.entities.Notification.delete(n.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['points-ledger'] });
    },
  });

  const examOverrideMutation = useMutation({
    mutationFn: async ({ user, attempt, type }) => {
      const examId = examConfig?.id || '';
      const examTitle = examConfig?.title || 'Certification Exam';
      if (type === 'cooldown') {
        const pastTime = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
        await base44.entities.ExamAttempt.update(attempt.id, { submitted_at: pastTime });
        await base44.entities.AdminAuditLog.create({
          action: 'cooldown_override',
          admin_id: currentUser?.id,
          admin_name: currentUser?.full_name || currentUser?.email,
          target_user_id: user.id,
          target_user_name: user.full_name || user.display_name,
          target_user_email: user.email,
          exam_id: examId,
          exam_title: examTitle,
          details: `Cooldown bypassed after attempt #${attempt.attempt_number} (attempt ID: ${attempt.id}). Student can now retake immediately.`,
          timestamp: new Date().toISOString(),
        });
      } else if (type === 'reset') {
        const userAttempts = allExamAttempts.filter(a => a.student_user_id === user.id);
        for (const a of userAttempts) {
          await base44.entities.ExamAttempt.delete(a.id);
        }
        await base44.entities.AdminAuditLog.create({
          action: 'attempt_reset',
          admin_id: currentUser?.id,
          admin_name: currentUser?.full_name || currentUser?.email,
          target_user_id: user.id,
          target_user_name: user.full_name || user.display_name,
          target_user_email: user.email,
          exam_id: examId,
          exam_title: examTitle,
          details: `Full reset: all ${userAttempts.length} attempt(s) deleted. Student can retake from attempt 1.`,
          timestamp: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-exam-attempts-admin'] });
      setOverrideConfirmOpen(false);
      setOverrideTarget(null);
    },
  });

  const onboardingResetMutation = useMutation({
    mutationFn: async (user) => {
      await base44.functions.invoke('resetProjectOnboarding', { userId: user.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-users'] });
      setOnboardingResetConfirmOpen(false);
      setOnboardingResetTarget(null);
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

  const handleImpersonate = async (targetUser) => {
    // Log to AdminAuditLog
    await base44.entities.AdminAuditLog.create({
      action: 'impersonate_start',
      admin_id: currentUser?.id,
      admin_name: currentUser?.full_name || currentUser?.email,
      target_user_id: targetUser.id,
      target_user_name: targetUser.full_name,
      target_user_email: targetUser.email,
      target_user_role: targetUser.app_role,
      timestamp: new Date().toISOString(),
    });

    // Store impersonation data in sessionStorage
    sessionStorage.setItem('impersonatingUser', JSON.stringify({
      id: targetUser.id,
      full_name: targetUser.display_name || targetUser.full_name,
      email: targetUser.email,
      app_role: targetUser.app_role,
    }));

    // Navigate to the appropriate dashboard for that role
    const rolePageMap = {
      student: 'StudentDashboard',
      tutor: 'TutorDashboard',
      admin: 'AdminDashboard',
      super_admin: 'SuperAdminDashboard',
    };
    const page = rolePageMap[targetUser.app_role] || 'StudentDashboard';
    navigate(createPageUrl(page));
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
            {[
              { role: 'student', label: 'View as Student', cls: 'border-blue-200 text-blue-700 hover:bg-blue-50' },
              { role: 'tutor', label: 'View as Tutor', cls: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' },
              { role: 'admin', label: 'View as Admin', cls: 'border-orange-200 text-orange-700 hover:bg-orange-50' },
            ].map(({ role, label, cls }) => (
              <Button
                key={role}
                variant="outline"
                size="sm"
                className={cls}
                onClick={() => {
                  setViewAsRoleFilter(role);
                  setViewAsSearch('');
                  setActiveTab('viewas');
                }}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Wifi className="w-8 h-8 text-emerald-600" />
                <div>
                  <p className="text-2xl font-bold text-emerald-900">{onlineUsers.length}</p>
                  <p className="text-sm text-emerald-600">Online Now</p>
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
                  <p className="text-sm text-red-600">Pending Deletions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Online Users Panel */}
        {onlineUsers.length > 0 && (
          <Card className="border-emerald-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-sm text-slate-800">{onlineUsers.length} user{onlineUsers.length !== 1 ? 's' : ''} online in the last 15 minutes</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {onlineUsers.map(u => (
                  <div key={u.id} className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-medium text-emerald-800">{u.display_name || u.full_name || u.email}</span>
                    <span className="text-xs text-emerald-500 capitalize">({u.app_role})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
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
            <TabsTrigger value="viewas" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" /> View as User
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="examoverrides" className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" /> Exam Overrides
            </TabsTrigger>
            <TabsTrigger value="projectonboarding" className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" /> Project Onboarding
            </TabsTrigger>
            <TabsTrigger value="systemcheck" className="flex items-center gap-2">
              <Activity className="w-4 h-4" /> System Check
            </TabsTrigger>
          </TabsList>

          {/* Exam Overrides Tab */}
          <TabsContent value="examoverrides" className="space-y-4 mt-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Exam Override Controls</p>
                <p className="text-sm text-amber-700 mt-0.5">Bypass cooldown periods or fully reset exam attempts for any student. All actions are logged with admin name, affected user, exam, and timestamp.</p>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  className="w-full border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-300"
                  placeholder="Search students..."
                  value={examSearchTerm}
                  onChange={e => setExamSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left p-4 font-semibold text-slate-700">Student</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Attempts</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Status</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const studentsWithAttempts = users
                      .filter(u => u.app_role === 'student')
                      .filter(u => !examSearchTerm || u.full_name?.toLowerCase().includes(examSearchTerm.toLowerCase()) || u.email?.toLowerCase().includes(examSearchTerm.toLowerCase()))
                      .filter(u => allExamAttempts.some(a => a.student_user_id === u.id))
                      .map(u => {
                        const userAttempts = allExamAttempts.filter(a => a.student_user_id === u.id).sort((a, b) => a.attempt_number - b.attempt_number);
                        const attemptsAllowed = examConfig?.attempts_allowed || 4;
                        const hasPassed = userAttempts.some(a => a.pass_flag);
                        const submittedAttempts = userAttempts.filter(a => a.submitted_at);
                        const latestSubmitted = submittedAttempts[submittedAttempts.length - 1];
                        const exhausted = !hasPassed && userAttempts.filter(a => a.prepared_at).length >= attemptsAllowed;

                        let inCooldown = false;
                        let cooldownAttempt = null;
                        if (!hasPassed && !exhausted && latestSubmitted) {
                          const cooldownHours = latestSubmitted.attempt_number === 2 ? (examConfig?.cooldown_after_attempt_2_hours || 24) : (examConfig?.cooldown_after_attempt_3_fail_hours || 48);
                          if ([2, 3].includes(latestSubmitted.attempt_number)) {
                            const eligibleAt = new Date(new Date(latestSubmitted.submitted_at).getTime() + cooldownHours * 3600000);
                            if (new Date() < eligibleAt) { inCooldown = true; cooldownAttempt = latestSubmitted; }
                          }
                        }

                        return { u, userAttempts, attemptsAllowed, hasPassed, exhausted, inCooldown, cooldownAttempt, latestSubmitted };
                      });

                    if (studentsWithAttempts.length === 0) {
                      return <tr><td colSpan="4" className="p-10 text-center text-slate-400 text-sm">No students with exam attempts found</td></tr>;
                    }

                    return studentsWithAttempts.map(({ u, userAttempts, attemptsAllowed, hasPassed, exhausted, inCooldown, cooldownAttempt, latestSubmitted }) => (
                      <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-4">
                          <p className="font-medium text-slate-900">{u.display_name || u.full_name}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </td>
                        <td className="p-4 text-sm text-slate-700">{userAttempts.filter(a => a.prepared_at).length} / {attemptsAllowed}</td>
                        <td className="p-4">
                          {hasPassed ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
                              ✓ Passed
                            </span>
                          ) : exhausted ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-red-100 text-red-700 px-2.5 py-1 rounded-full border border-red-200">
                              <XCircle className="w-3 h-3" /> All attempts used
                            </span>
                          ) : inCooldown ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200">
                              <Clock className="w-3 h-3" /> In cooldown (after attempt {cooldownAttempt?.attempt_number})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200">
                              In progress
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2 flex-wrap">
                            {inCooldown && (
                              <Button
                                size="sm"
                                className="bg-amber-500 hover:bg-amber-600 text-white gap-1"
                                onClick={() => { setOverrideTarget({ user: u, attempt: cooldownAttempt, type: 'cooldown' }); setOverrideConfirmOpen(true); }}
                              >
                                <Clock className="w-3 h-3" /> Bypass Cooldown
                              </Button>
                            )}
                            {!hasPassed && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-violet-300 text-violet-700 hover:bg-violet-50 gap-1"
                                onClick={() => { setOverrideTarget({ user: u, attempt: null, type: 'reset' }); setOverrideConfirmOpen(true); }}
                              >
                                <RefreshCw className="w-3 h-3" /> Reset All Attempts
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </TabsContent>

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
                        <td className="p-4 font-medium text-slate-900">{user.display_name || user.full_name}</td>
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
                              className="text-orange-600 border-orange-200 hover:bg-orange-50"
                              onClick={() => { setResetTarget(user); setResetConfirmOpen(true); }}
                            >
                              <RotateCcw className="w-3 h-3 mr-1" /> Reset
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

          {/* View as User Tab */}
          <TabsContent value="viewas" className="space-y-4 mt-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <Eye className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Impersonation Mode</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Clicking a user will switch your view to see the app exactly as they see it. A banner will be shown so you always know you're in impersonation mode. Click "Exit" in the banner to return here.
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex gap-3 items-center flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search users by name or email..."
                  value={viewAsSearch}
                  onChange={(e) => setViewAsSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {['', 'student', 'tutor', 'admin'].map(r => (
                  <button
                    key={r}
                    onClick={() => setViewAsRoleFilter(r)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${viewAsRoleFilter === r ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                  >
                    {r === '' ? 'All' : r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left p-4 font-semibold text-slate-700">Name</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Email</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Role</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredViewAsUsers.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-slate-500">No users found</td>
                    </tr>
                  ) : (
                    filteredViewAsUsers.map(user => (
                      <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-4 font-medium text-slate-900">{user.display_name || user.full_name}</td>
                        <td className="p-4 text-slate-600 text-sm">{user.email}</td>
                        <td className="p-4">
                          <Badge className={
                            user.app_role === 'super_admin' ? 'bg-violet-100 text-violet-700' :
                            user.app_role === 'admin' ? 'bg-orange-100 text-orange-700' :
                            user.app_role === 'tutor' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-blue-100 text-blue-700'
                          }>
                            {user.app_role || 'student'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Button
                            size="sm"
                            className="bg-violet-600 hover:bg-violet-700 text-white"
                            onClick={() => handleImpersonate(user)}
                          >
                            <Eye className="w-3 h-3 mr-1" /> View as User
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <SuperAdminAnalytics />
          </TabsContent>

          {/* Project Onboarding Tab */}
          <TabsContent value="projectonboarding" className="space-y-4 mt-4">
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-start gap-3">
              <FolderOpen className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-teal-800">Project Onboarding Controls</p>
                <p className="text-sm text-teal-700 mt-0.5">Reset the project onboarding agreement for any student. This will require them to re-read and re-sign the Opsbase participation agreement on their next visit. All actions are logged.</p>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  className="w-full border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-300"
                  placeholder="Search students..."
                  value={onboardingSearchTerm}
                  onChange={e => setOnboardingSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
              <table className="w-full">
                <thead>
                   <tr className="border-b border-slate-200">
                     <th className="text-left p-4 font-semibold text-slate-700">Student</th>
                     <th className="text-left p-4 font-semibold text-slate-700">Agreement</th>
                     <th className="text-left p-4 font-semibold text-slate-700">Full Onboarding</th>
                     <th className="text-left p-4 font-semibold text-slate-700">Signed At</th>
                     <th className="text-left p-4 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter(u => u.app_role === 'student')
                    .filter(u => !onboardingSearchTerm || u.full_name?.toLowerCase().includes(onboardingSearchTerm.toLowerCase()) || u.email?.toLowerCase().includes(onboardingSearchTerm.toLowerCase()))
                    .map(u => (
                      <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-4">
                          <p className="font-medium text-slate-900">{u.display_name || u.full_name}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </td>
                        <td className="p-4">
                          {u.opsbase_agreement_signed ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
                              <CheckCircle className="w-3 h-3" /> Signed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full border border-slate-200">
                              Not signed
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {u.opsbase_onboarding_complete ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-teal-100 text-teal-700 px-2.5 py-1 rounded-full border border-teal-200">
                              <CheckCircle className="w-3 h-3" /> Complete
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full border border-slate-200">
                              Incomplete
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-slate-500">
                          {u.opsbase_agreement_signed_at ? new Date(u.opsbase_agreement_signed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td className="p-4">
                          {(u.opsbase_agreement_signed || u.opsbase_onboarding_complete) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-teal-300 text-teal-700 hover:bg-teal-50 gap-1"
                              onClick={() => { setOnboardingResetTarget(u); setOnboardingResetConfirmOpen(true); }}
                            >
                              <RotateCcw className="w-3 h-3" /> Reset Onboarding
                            </Button>
                          )}
                        </td>
                        </tr>
                        ))
                        }
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* System Check Tab */}
          <TabsContent value="systemcheck" className="mt-4">
            <SystemCheckPanel />
          </TabsContent>
        </Tabs>
      </div>

      {/* Points Adjust Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${adjustType === 'bonus' ? 'text-emerald-700' : 'text-red-700'}`}>
              {adjustType === 'bonus' ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
              {adjustType === 'bonus' ? 'Award Points' : 'Deduct Points'} — {adjustTarget?.display_name || adjustTarget?.full_name}
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
             <p className="text-slate-700">Are you sure you want to permanently delete <strong>{deleteTarget?.display_name || deleteTarget?.full_name}</strong> ({deleteTarget?.email})? This action cannot be undone.</p>
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

       {/* Reset Points Confirmation Dialog */}
       <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle className="text-orange-700 flex items-center gap-2">
               <RotateCcw className="w-5 h-5" />
               Reset Points
             </DialogTitle>
           </DialogHeader>
           <div className="space-y-4 py-2">
             <p className="text-slate-700">
               Are you sure you want to reset all points for <strong>{resetTarget?.display_name || resetTarget?.full_name}</strong>? This will permanently delete all their ledger entries and their total will return to 0.
             </p>
             <div className="flex gap-2">
               <Button variant="outline" className="flex-1" onClick={() => setResetConfirmOpen(false)}>
                 Cancel
               </Button>
               <Button
                 className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                 disabled={resetPointsMutation.isPending}
                 onClick={() => resetPointsMutation.mutate(resetTarget?.id)}
               >
                 <RotateCcw className="w-4 h-4 mr-1" /> {resetPointsMutation.isPending ? 'Resetting...' : 'Reset Points'}
               </Button>
             </div>
           </div>
         </DialogContent>
       </Dialog>

       {/* Exam Override Confirmation Dialog */}
       <Dialog open={overrideConfirmOpen} onOpenChange={setOverrideConfirmOpen}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle className={`flex items-center gap-2 ${overrideTarget?.type === 'reset' ? 'text-violet-700' : 'text-amber-700'}`}>
               {overrideTarget?.type === 'reset' ? <RefreshCw className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
               {overrideTarget?.type === 'reset' ? 'Reset All Exam Attempts' : 'Bypass Cooldown Period'}
             </DialogTitle>
           </DialogHeader>
           <div className="space-y-4 py-2">
             <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700 space-y-1">
               <p><strong>Student:</strong> {overrideTarget?.user?.display_name || overrideTarget?.user?.full_name}</p>
               <p><strong>Email:</strong> {overrideTarget?.user?.email}</p>
             </div>
             {overrideTarget?.type === 'cooldown' ? (
               <p className="text-slate-700 text-sm">This will mark attempt <strong>#{overrideTarget?.attempt?.attempt_number}</strong> as submitted 72 hours ago, ending the cooldown immediately. The student can retake the exam right away.</p>
              ) : (
               <p className="text-slate-700 text-sm">This will <strong>permanently delete all exam attempts</strong> for this student. They will be able to retake the exam from attempt 1 as if they had never sat it before.</p>
              )}
              <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-700 space-y-0.5">
                <p><strong>Exam:</strong> {examConfig?.title || 'Certification Exam'}</p>
                <p><strong>Action logged under:</strong> {currentUser?.full_name || currentUser?.email}</p>
                <p><strong>Timestamp:</strong> {new Date().toLocaleString()}</p>
              </div>
             <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-2">
               This action will be logged under your name ({currentUser?.full_name || currentUser?.email}) with a timestamp.
             </p>
             <div className="flex gap-2">
               <Button variant="outline" className="flex-1" onClick={() => setOverrideConfirmOpen(false)}>Cancel</Button>
               <Button
                 className={`flex-1 text-white ${overrideTarget?.type === 'reset' ? 'bg-violet-600 hover:bg-violet-700' : 'bg-amber-500 hover:bg-amber-600'}`}
                 disabled={examOverrideMutation.isPending}
                 onClick={() => examOverrideMutation.mutate(overrideTarget)}
               >
                 {examOverrideMutation.isPending ? 'Applying...' : overrideTarget?.type === 'reset' ? 'Reset Attempts' : 'Bypass Cooldown'}
               </Button>
             </div>
           </div>
         </DialogContent>
       </Dialog>

       {/* Project Onboarding Reset Confirmation Dialog */}
       <Dialog open={onboardingResetConfirmOpen} onOpenChange={setOnboardingResetConfirmOpen}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle className="text-teal-700 flex items-center gap-2">
               <RotateCcw className="w-5 h-5" />
               Reset Project Onboarding
             </DialogTitle>
           </DialogHeader>
           <div className="space-y-4 py-2">
             <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700 space-y-1">
               <p><strong>Student:</strong> {onboardingResetTarget?.display_name || onboardingResetTarget?.full_name}</p>
               <p><strong>Email:</strong> {onboardingResetTarget?.email}</p>
             </div>
             <p className="text-slate-700 text-sm">This will clear the student's signed agreement status. They will be shown the Opsbase participation agreement screen again on their next visit and must re-sign before accessing projects.</p>
             <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-700">
               <p><strong>Action logged under:</strong> {currentUser?.full_name || currentUser?.email}</p>
             </div>
             <div className="flex gap-2">
               <Button variant="outline" className="flex-1" onClick={() => setOnboardingResetConfirmOpen(false)}>Cancel</Button>
               <Button
                 className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                 disabled={onboardingResetMutation.isPending}
                 onClick={() => onboardingResetMutation.mutate(onboardingResetTarget)}
               >
                 <RotateCcw className="w-4 h-4 mr-1" /> {onboardingResetMutation.isPending ? 'Resetting...' : 'Reset Onboarding'}
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
               Points Breakdown — {selectedUser?.display_name || selectedUser?.full_name}
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
                       <div className="flex items-center gap-3 ml-2">
                         <span className={`text-lg font-bold whitespace-nowrap ${entry.points < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                           {entry.points > 0 ? '+' : ''}{entry.points}
                         </span>
                         <Button
                           size="sm"
                           variant="outline"
                           className="text-red-600 border-red-200 hover:bg-red-50 h-7 w-7 p-0 shrink-0"
                           disabled={deleteLedgerEntryMutation.isPending}
                           onClick={() => deleteLedgerEntryMutation.mutate(entry.id)}
                           title="Delete entry & clear notification"
                         >
                           <Trash2 className="w-3 h-3" />
                         </Button>
                       </div>
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
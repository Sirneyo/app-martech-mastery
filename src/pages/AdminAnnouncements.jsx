import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Users, Send, Loader2, CheckCircle, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';

const NOTIFICATION_TYPES = [
  { value: 'achievement', label: 'Achievement / General' },
  { value: 'deadline_reminder', label: 'Deadline Reminder' },
  { value: 'welcome', label: 'Welcome / Info' },
  { value: 'points_awarded', label: 'Points Update' },
];

export default function AdminAnnouncements() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: '',
    message: '',
    type: 'achievement',
    audience: 'all', // 'all' | cohort_id
    link_url: '',
  });
  const [sent, setSent] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: cohorts = [] } = useQuery({
    queryKey: ['all-cohorts'],
    queryFn: () => base44.entities.Cohort.list(),
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['all-memberships-ann'],
    queryFn: () => base44.entities.CohortMembership.list('created_date', 2000),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list('created_date', 1000),
  });

  // Load past announcements — notifications created by admin with these types
  const { data: pastAnnouncements = [] } = useQuery({
    queryKey: ['past-announcements'],
    queryFn: () => base44.entities.Notification.list('-created_date', 200),
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      // Determine target user IDs
      let targetUserIds = [];

      if (form.audience === 'all') {
        // All students
        targetUserIds = users
          .filter(u => u.app_role === 'student' || !u.app_role)
          .map(u => u.id);
      } else {
        // Specific cohort active members
        targetUserIds = memberships
          .filter(m => m.cohort_id === form.audience && m.status === 'active')
          .map(m => m.user_id);
      }

      if (targetUserIds.length === 0) throw new Error('No students found for selected audience.');

      // Bulk-create notifications
      const records = targetUserIds.map(uid => ({
        user_id: uid,
        type: form.type,
        title: form.title,
        message: form.message,
        link_url: form.link_url || undefined,
        is_read: false,
      }));

      await base44.entities.Notification.bulkCreate(records);
      return { count: records.length };
    },
    onSuccess: (result) => {
      setSent(result.count);
      setForm({ title: '', message: '', type: 'achievement', audience: 'all', link_url: '' });
      queryClient.invalidateQueries({ queryKey: ['past-announcements'] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(null);
    sendMutation.mutate();
  };

  const audienceLabel = (aud) => {
    if (aud === 'all') return 'All Students';
    const cohort = cohorts.find(c => c.id === aud);
    return cohort?.name || aud;
  };

  // Deduplicate past announcements by (title + message + created_date minute)
  const dedupedAnnouncements = pastAnnouncements.reduce((acc, n) => {
    const key = `${n.title}|${n.message}|${n.created_date?.slice(0, 16)}`;
    if (!acc.seen.has(key)) {
      acc.seen.add(key);
      acc.items.push(n);
    }
    return acc;
  }, { seen: new Set(), items: [] }).items.slice(0, 20);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Megaphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Announcements</h1>
            <p className="text-slate-500 mt-0.5">Send broadcast notifications to students</p>
          </div>
        </div>

        {/* Compose */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">New Announcement</CardTitle>
          </CardHeader>
          <CardContent>
            {sent !== null && (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-5">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-green-800 font-medium">Announcement sent to {sent} student{sent !== 1 ? 's' : ''}!</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Audience</label>
                  <Select value={form.audience} onValueChange={v => setForm(f => ({ ...f, audience: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          All Students
                        </div>
                      </SelectItem>
                      {cohorts.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Notification Type</label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NOTIFICATION_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Title *</label>
                <Input
                  required
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Short, attention-grabbing title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Message *</label>
                <Textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Full announcement text..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Link URL <span className="text-slate-400 font-normal">(optional)</span></label>
                <Input
                  value={form.link_url}
                  onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))}
                  placeholder="e.g. /StudentAssignments"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Sending to: <span className="font-semibold text-slate-700">{audienceLabel(form.audience)}</span>
                </p>
                <Button
                  type="submit"
                  disabled={sendMutation.isPending || !form.title || !form.message}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-6"
                >
                  {sendMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" /> Send Announcement</>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* History */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Recent Announcements</CardTitle>
          </CardHeader>
          <CardContent>
            {dedupedAnnouncements.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">No announcements sent yet.</p>
            ) : (
              <div className="space-y-3">
                {dedupedAnnouncements.map(n => (
                  <div key={n.id} className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <Megaphone className="w-4 h-4 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">{n.title}</p>
                      <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <Badge variant="outline" className="text-xs capitalize mb-1">{n.type?.replace(/_/g, ' ')}</Badge>
                      <p className="text-xs text-slate-400 mt-1">{format(new Date(n.created_date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
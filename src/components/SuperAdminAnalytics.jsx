import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Users, TrendingUp, FileText, Calendar, Activity, Award, Zap } from 'lucide-react';
import { format, subDays, startOfDay, eachDayOfInterval, parseISO } from 'date-fns';

const RANGE_OPTIONS = [
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
];

const COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#db2777'];

function StatCard({ icon: Icon, label, value, sub, color = 'violet' }) {
  const colorMap = {
    violet: 'text-violet-600 bg-violet-50',
    blue: 'text-blue-600 bg-blue-50',
    emerald: 'text-emerald-600 bg-emerald-50',
    amber: 'text-amber-600 bg-amber-50',
    red: 'text-red-600 bg-red-50',
  };
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
            {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RangeSelector({ value, onChange }) {
  return (
    <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
      {RANGE_OPTIONS.map(o => (
        <button
          key={o.days}
          onClick={() => onChange(o.days)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${value === o.days ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function SuperAdminAnalytics() {
  const [range, setRange] = useState(14);

  const { data: loginEvents = [] } = useQuery({
    queryKey: ['analytics-logins'],
    queryFn: () => base44.entities.LoginEvent.list('-login_time', 1000),
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['analytics-submissions'],
    queryFn: () => base44.entities.Submission.list('-created_date', 1000),
  });

  const { data: pointsLedger = [] } = useQuery({
    queryKey: ['analytics-points'],
    queryFn: () => base44.entities.PointsLedger.list('-created_date', 1000),
  });

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['analytics-attendance'],
    queryFn: () => base44.entities.Attendance.list('-created_date', 1000),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['analytics-users'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getSuperAdminUsers', {});
      return res.data?.users || [];
    },
  });

  // Build day-by-day series
  const days = eachDayOfInterval({ start: subDays(new Date(), range - 1), end: new Date() });

  const dailySeries = days.map(day => {
    const label = format(day, 'MMM d');
    const start = startOfDay(day).getTime();
    const end = start + 86400000;

    const logins = loginEvents.filter(e => {
      const t = new Date(e.login_time).getTime();
      return t >= start && t < end;
    });
    const uniqueUsers = new Set(logins.map(e => e.user_id)).size;

    const subs = submissions.filter(e => {
      const t = new Date(e.created_date).getTime();
      return t >= start && t < end;
    }).length;

    const pts = pointsLedger
      .filter(e => {
        const t = new Date(e.created_date).getTime();
        return t >= start && t < end && e.points > 0;
      })
      .reduce((s, e) => s + (e.points || 0), 0);

    return { label, dau: uniqueUsers, sessions: logins.length, submissions: subs, points: pts };
  });

  // Totals within range
  const rangeStart = subDays(new Date(), range - 1).getTime();
  const totalSessions = loginEvents.filter(e => new Date(e.login_time).getTime() >= rangeStart).length;
  const uniqueActiveUsers = new Set(
    loginEvents.filter(e => new Date(e.login_time).getTime() >= rangeStart).map(e => e.user_id)
  ).size;
  const totalSubmissions = submissions.filter(e => new Date(e.created_date).getTime() >= rangeStart).length;
  const totalPointsAwarded = pointsLedger
    .filter(e => new Date(e.created_date).getTime() >= rangeStart && e.points > 0)
    .reduce((s, e) => s + (e.points || 0), 0);

  // Today stats
  const todayStart = startOfDay(new Date()).getTime();
  const todaySessions = loginEvents.filter(e => new Date(e.login_time).getTime() >= todayStart).length;
  const todaySubmissions = submissions.filter(e => new Date(e.created_date).getTime() >= todayStart).length;

  // Submission breakdown by kind
  const subKindData = [
    { name: 'Assignments', value: submissions.filter(s => s.submission_kind === 'assignment').length },
    { name: 'Projects', value: submissions.filter(s => s.submission_kind === 'project').length },
  ].filter(d => d.value > 0);

  // Submission status breakdown
  const subStatusCounts = submissions.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});
  const subStatusData = Object.entries(subStatusCounts).map(([name, value]) => ({ name, value }));

  // Attendance breakdown
  const attStatusCounts = attendanceRecords.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});
  const attData = Object.entries(attStatusCounts).map(([name, value]) => ({ name, value }));

  // Points by source type
  const ptsBySource = pointsLedger.reduce((acc, e) => {
    if (e.points > 0) acc[e.source_type] = (acc[e.source_type] || 0) + e.points;
    return acc;
  }, {});
  const ptsBySourceData = Object.entries(ptsBySource).map(([name, value]) => ({ name, value }));

  // Role breakdown
  const roleData = ['student', 'tutor', 'admin', 'super_admin'].map(role => ({
    name: role,
    value: users.filter(u => (u.app_role || 'student') === role).length,
  })).filter(d => d.value > 0);

  // Top 5 most active students (by login count)
  const loginsByUser = loginEvents.reduce((acc, e) => {
    acc[e.user_id] = (acc[e.user_id] || 0) + 1;
    return acc;
  }, {});
  const topUsers = Object.entries(loginsByUser)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([userId, count]) => {
      const user = users.find(u => u.id === userId);
      return { name: user?.full_name || 'Unknown', logins: count };
    });

  return (
    <div className="space-y-6 mt-4">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={users.length} sub={`${users.filter(u => u.app_role === 'student').length} students`} color="violet" />
        <StatCard icon={Activity} label={`Sessions (${range}d)`} value={totalSessions} sub={`${todaySessions} today`} color="blue" />
        <StatCard icon={FileText} label={`Submissions (${range}d)`} value={totalSubmissions} sub={`${todaySubmissions} today`} color="emerald" />
        <StatCard icon={Zap} label={`Points Awarded (${range}d)`} value={totalPointsAwarded.toLocaleString()} sub={`${uniqueActiveUsers} active users`} color="amber" />
      </div>

      {/* DAU Chart */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet-500" /> Daily Active Users
          </CardTitle>
          <RangeSelector value={range} onChange={setRange} />
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dailySeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="dau" name="Unique Users" stroke="#7c3aed" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="sessions" name="Sessions" stroke="#2563eb" strokeWidth={2} dot={false} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Submissions + Points charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-500" /> Daily Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={dailySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="submissions" name="Submissions" fill="#059669" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" /> Daily Points Awarded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={dailySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="points" name="Points" fill="#d97706" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Breakdowns row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Submission status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Submission Status</CardTitle>
          </CardHeader>
          <CardContent>
            {subStatusData.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={subStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>
                    {subStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Attendance breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Attendance Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {attData.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={attData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>
                    {attData.map((entry, i) => (
                      <Cell key={i} fill={entry.name === 'present' ? '#059669' : entry.name === 'late' ? '#d97706' : '#dc2626'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Points by source */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Points by Source</CardTitle>
          </CardHeader>
          <CardContent>
            {ptsBySourceData.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No data</p>
            ) : (
              <div className="space-y-2 pt-1">
                {ptsBySourceData.sort((a, b) => b.value - a.value).map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-slate-600 capitalize truncate">{d.name}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-800 shrink-0">{d.value.toLocaleString()} pts</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Active Users + User Roles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Award className="w-4 h-4 text-violet-500" /> Most Active Users (All Time)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topUsers.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No login data</p>
            ) : (
              <div className="space-y-2">
                {topUsers.map((u, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-700 truncate">{u.name}</span>
                        <span className="text-xs text-slate-500 shrink-0">{u.logins} logins</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-violet-500"
                          style={{ width: `${Math.round((u.logins / (topUsers[0]?.logins || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" /> Users by Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {roleData.map((r, i) => (
                <div key={r.name} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-xs text-slate-600 capitalize flex-1">{r.name.replace('_', ' ')}</span>
                  <Badge variant="secondary" className="text-xs">{r.value}</Badge>
                  <div className="w-24 bg-slate-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${Math.round((r.value / users.length) * 100)}%`, background: COLORS[i % COLORS.length] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
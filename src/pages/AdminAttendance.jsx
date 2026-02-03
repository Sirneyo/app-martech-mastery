import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, CheckCircle, XCircle, Clock, Users, Edit } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function AdminAttendance() {
  const [selectedCohortId, setSelectedCohortId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingDate, setEditingDate] = useState(null);
  const [attendanceData, setAttendanceData] = useState({});
  const queryClient = useQueryClient();

  const { data: cohorts = [] } = useQuery({
    queryKey: ['cohorts'],
    queryFn: () => base44.entities.Cohort.list(),
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['memberships'],
    queryFn: () => base44.entities.CohortMembership.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: attendanceHistory = [] } = useQuery({
    queryKey: ['attendance-history', selectedCohortId],
    queryFn: async () => {
      if (!selectedCohortId) return [];
      return base44.entities.Attendance.filter({
        cohort_id: selectedCohortId
      });
    },
    enabled: !!selectedCohortId,
  });

  const { data: dateAttendance = [] } = useQuery({
    queryKey: ['date-attendance', selectedCohortId, selectedDate],
    queryFn: async () => {
      if (!selectedCohortId || !selectedDate) return [];
      return base44.entities.Attendance.filter({
        cohort_id: selectedCohortId,
        date: selectedDate
      });
    },
    enabled: !!selectedCohortId && !!selectedDate,
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: async () => {
      const promises = [];
      for (const [studentId, status] of Object.entries(attendanceData)) {
        const existing = dateAttendance.find(a => a.student_user_id === studentId);
        if (existing) {
          promises.push(base44.entities.Attendance.update(existing.id, { status }));
        }
      }
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['attendance-history']);
      queryClient.invalidateQueries(['date-attendance']);
      setEditingDate(null);
      setAttendanceData({});
    },
  });

  const students = users.filter(u => u.app_role === 'student' || !u.app_role);

  const getStudentsByCohort = (cohortId) => {
    const cohortStudentIds = memberships
      .filter(m => m.cohort_id === cohortId && m.status === 'active')
      .map(m => m.user_id)
      .filter(Boolean);
    return students.filter(s => cohortStudentIds.includes(s.id));
  };

  const cohortStudents = selectedCohortId ? getStudentsByCohort(selectedCohortId) : [];

  const handleStatusChange = (studentId, status) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const getStudentStatus = (studentId) => {
    if (attendanceData[studentId]) return attendanceData[studentId];
    const existing = dateAttendance.find(a => a.student_user_id === studentId);
    return existing?.status || 'present';
  };

  const handleSaveEdit = () => {
    updateAttendanceMutation.mutate();
  };

  const groupedHistory = React.useMemo(() => {
    const grouped = {};
    attendanceHistory.forEach(record => {
      if (!grouped[record.date]) {
        grouped[record.date] = [];
      }
      grouped[record.date].push(record);
    });
    return Object.entries(grouped).sort((a, b) => new Date(b[0]) - new Date(a[0]));
  }, [attendanceHistory]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Attendance Management</h1>
        <p className="text-slate-500 mt-1">Review and manage attendance records for all cohorts</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cohort Selection */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Select Cohort
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cohorts.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No cohorts available</p>
            ) : (
              <div className="space-y-2">
                {cohorts.map((cohort) => (
                  <button
                    key={cohort.id}
                    onClick={() => {
                      setSelectedCohortId(cohort.id);
                      setSelectedDate(null);
                      setEditingDate(null);
                    }}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      selectedCohortId === cohort.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <p className="font-semibold text-slate-900">{cohort.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-orange-100 text-orange-700 text-xs">{cohort.status}</Badge>
                      <span className="text-xs text-slate-500">Week {cohort.current_week}/12</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Records */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Attendance Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedCohortId ? (
              <p className="text-sm text-slate-500 text-center py-12">Select a cohort to view attendance</p>
            ) : groupedHistory.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-12">No attendance records yet</p>
            ) : (
              <div className="space-y-4">
                {groupedHistory.map(([date, records]) => {
                  const presentCount = records.filter(r => r.status === 'present').length;
                  const lateCount = records.filter(r => r.status === 'late').length;
                  const absentCount = records.filter(r => r.status === 'absent').length;
                  const totalStudents = cohortStudents.length;
                  const isEditing = editingDate === date;

                  return (
                    <div key={date} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">Total Students: {totalStudents}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {presentCount} Present
                          </Badge>
                          <Badge className="bg-yellow-100 text-yellow-700">
                            <Clock className="w-3 h-3 mr-1" />
                            {lateCount} Late
                          </Badge>
                          <Badge className="bg-red-100 text-red-700">
                            <XCircle className="w-3 h-3 mr-1" />
                            {absentCount} Absent
                          </Badge>
                          {!isEditing && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedDate(date);
                                setEditingDate(date);
                                setAttendanceData({});
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {isEditing && (
                        <div className="space-y-2 mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <p className="text-sm font-medium text-orange-900 mb-3">Edit Attendance</p>
                          {cohortStudents.map((student) => {
                            const status = getStudentStatus(student.id);
                            return (
                              <div key={student.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                    {student.full_name?.charAt(0) || 'S'}
                                  </div>
                                  <div>
                                    <p className="font-medium text-slate-900">{student.full_name}</p>
                                    <p className="text-xs text-slate-500">{student.email}</p>
                                  </div>
                                </div>
                                <Select value={status} onValueChange={(value) => handleStatusChange(student.id, value)}>
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="present">
                                      <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                        Present
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="late">
                                      <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-yellow-600" />
                                        Late
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="absent">
                                      <div className="flex items-center gap-2">
                                        <XCircle className="w-4 h-4 text-red-600" />
                                        Absent
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            );
                          })}
                          <div className="flex gap-2 mt-4">
                            <Button
                              onClick={handleSaveEdit}
                              disabled={updateAttendanceMutation.isPending}
                              className="flex-1"
                            >
                              {updateAttendanceMutation.isPending ? 'Saving...' : 'Save Changes'}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setEditingDate(null);
                                setAttendanceData({});
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, CheckCircle, XCircle, Clock, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function TutorAttendance() {
  const [selectedCohortId, setSelectedCohortId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [attendanceData, setAttendanceData] = useState({});
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['tutor-cohort-assignments'],
    queryFn: async () => {
      if (!user?.id) return [];
      return base44.entities.TutorCohortAssignment.filter({ tutor_id: user.id });
    },
    enabled: !!user?.id,
  });

  const { data: cohorts = [] } = useQuery({
    queryKey: ['assigned-cohorts', assignments],
    queryFn: async () => {
      if (assignments.length === 0) return [];
      const cohortIds = assignments.map(a => a.cohort_id);
      const allCohorts = await base44.entities.Cohort.list();
      return allCohorts.filter(c => cohortIds.includes(c.id));
    },
    enabled: assignments.length > 0,
  });

  const { data: studentsData } = useQuery({
    queryKey: ['tutor-students'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getTutorStudents');
      return response.data;
    },
  });

  const students = studentsData?.students || [];

  const { data: memberships = [] } = useQuery({
    queryKey: ['cohort-memberships'],
    queryFn: async () => {
      const cohortIds = assignments.map(a => a.cohort_id);
      if (cohortIds.length === 0) return [];
      const allMemberships = await base44.entities.CohortMembership.list();
      return allMemberships.filter(m => 
        cohortIds.includes(m.cohort_id) && m.status === 'active'
      );
    },
    enabled: assignments.length > 0,
  });

  const { data: todayAttendance = [] } = useQuery({
    queryKey: ['today-attendance', selectedCohortId, selectedDate],
    queryFn: async () => {
      if (!selectedCohortId || !selectedDate) return [];
      return base44.entities.Attendance.filter({
        cohort_id: selectedCohortId,
        date: selectedDate
      });
    },
    enabled: !!selectedCohortId && !!selectedDate,
  });

  // Check if attendance is locked (more than 1 hour since submission)
  const isAttendanceLocked = React.useMemo(() => {
    if (todayAttendance.length === 0) return false;
    
    const firstRecord = todayAttendance[0];
    if (!firstRecord.created_date) return false;
    
    const submittedTime = new Date(firstRecord.created_date);
    const currentTime = new Date();
    const hoursSinceSubmission = (currentTime - submittedTime) / (1000 * 60 * 60);
    
    return hoursSinceSubmission >= 1;
  }, [todayAttendance]);

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

  const submitAttendanceMutation = useMutation({
    mutationFn: async () => {
      const promises = [];
      // Mark attendance for ALL students in the cohort
      for (const student of cohortStudents) {
        const status = getStudentStatus(student.id);
        const existing = todayAttendance.find(a => a.student_user_id === student.id);
        if (existing) {
          promises.push(base44.entities.Attendance.update(existing.id, { status }));
        } else {
          promises.push(base44.entities.Attendance.create({
            student_user_id: student.id,
            cohort_id: selectedCohortId,
            date: selectedDate,
            status,
            marked_by: user.id
          }));
        }
      }
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['today-attendance']);
      queryClient.invalidateQueries(['attendance-history']);
      setAttendanceData({});
    },
  });

  const getStudentsByCohort = (cohortId) => {
    const cohortStudentIds = memberships
      .filter(m => m.cohort_id === cohortId)
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
    const existing = todayAttendance.find(a => a.student_user_id === studentId);
    return existing?.status || 'present';
  };

  const handleSubmit = () => {
    submitAttendanceMutation.mutate();
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Mark Attendance</h1>
        <p className="text-slate-500 mt-1">Track student attendance for your cohorts</p>
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
              <p className="text-sm text-slate-500 text-center py-4">No cohorts assigned</p>
            ) : (
              <div className="space-y-2">
                {cohorts.map((cohort) => (
                  <button
                    key={cohort.id}
                    onClick={() => setSelectedCohortId(cohort.id)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      selectedCohortId === cohort.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <p className="font-semibold text-slate-900">{cohort.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-blue-100 text-blue-700 text-xs">{cohort.status}</Badge>
                      <span className="text-xs text-slate-500">Week {cohort.current_week}/12</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Marking */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Mark Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedCohortId ? (
              <p className="text-sm text-slate-500 text-center py-12">Select a cohort to mark attendance</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1"
                  />
                </div>

                <div className="space-y-2">
                  {cohortStudents.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No students enrolled</p>
                  ) : (
                    cohortStudents.map((student) => {
                      const status = getStudentStatus(student.id);
                      return (
                        <div key={student.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white font-bold">
                              {student.full_name?.charAt(0) || 'S'}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{student.full_name}</p>
                              <p className="text-xs text-slate-500">{student.email}</p>
                            </div>
                          </div>
                          <Select 
                            value={status} 
                            onValueChange={(value) => handleStatusChange(student.id, value)}
                            disabled={isAttendanceLocked}
                          >
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
                    })
                  )}
                </div>

                {isAttendanceLocked && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Attendance is locked (submitted over 1 hour ago). Contact admin to modify.
                    </div>
                  </div>
                )}
                
                {cohortStudents.length > 0 && (
                  <Button 
                    onClick={handleSubmit} 
                    disabled={submitAttendanceMutation.isPending || isAttendanceLocked}
                    className="w-full"
                  >
                    {submitAttendanceMutation.isPending ? 'Submitting...' : 'Submit Attendance'}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attendance Report */}
      {selectedCohortId && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Attendance History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {groupedHistory.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No attendance records yet</p>
              ) : (
                <div className="space-y-4">
                  {groupedHistory.map(([date, records]) => {
                    const cohortStudentsForDate = getStudentsByCohort(selectedCohortId);
                    const presentCount = records.filter(r => r.status === 'present').length;
                    const lateCount = records.filter(r => r.status === 'late').length;
                    const absentCount = records.filter(r => r.status === 'absent').length;
                    const totalStudents = cohortStudentsForDate.length;

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
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          {/* Present Students */}
                          {presentCount > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-1">
                                <CheckCircle className="w-4 h-4" />
                                Present ({presentCount})
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {records
                                  .filter(r => r.status === 'present')
                                  .map((record) => {
                                    const student = students.find(s => s.id === record.student_user_id);
                                    return (
                                      <div key={record.id} className="flex items-center gap-2 p-2 rounded bg-green-50 border border-green-200">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                          {student?.full_name?.charAt(0) || 'S'}
                                        </div>
                                        <span className="text-sm font-medium text-slate-900">{student?.full_name || 'Unknown'}</span>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}

                          {/* Late Students */}
                          {lateCount > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-yellow-700 mb-2 flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                Late ({lateCount})
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {records
                                  .filter(r => r.status === 'late')
                                  .map((record) => {
                                    const student = students.find(s => s.id === record.student_user_id);
                                    return (
                                      <div key={record.id} className="flex items-center gap-2 p-2 rounded bg-yellow-50 border border-yellow-200">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                          {student?.full_name?.charAt(0) || 'S'}
                                        </div>
                                        <span className="text-sm font-medium text-slate-900">{student?.full_name || 'Unknown'}</span>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}

                          {/* Absent Students */}
                          {absentCount > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1">
                                <XCircle className="w-4 h-4" />
                                Absent ({absentCount})
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {records
                                  .filter(r => r.status === 'absent')
                                  .map((record) => {
                                    const student = students.find(s => s.id === record.student_user_id);
                                    return (
                                      <div key={record.id} className="flex items-center gap-2 p-2 rounded bg-red-50 border border-red-200">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                          {student?.full_name?.charAt(0) || 'S'}
                                        </div>
                                        <span className="text-sm font-medium text-slate-900">{student?.full_name || 'Unknown'}</span>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
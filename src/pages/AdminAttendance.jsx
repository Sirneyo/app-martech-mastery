import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CheckCircle, XCircle, Clock, Users, Download, Filter, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import StudentProfileModal from '@/components/StudentProfileModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function AdminAttendance() {
  const [selectedCohortId, setSelectedCohortId] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');

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

  const students = users.filter(u => u.app_role === 'student' || !u.app_role);

  const getStudentsByCohort = (cohortId) => {
    const cohortStudentIds = memberships
      .filter(m => m.cohort_id === cohortId && m.status === 'active')
      .map(m => m.user_id)
      .filter(Boolean);
    return students.filter(s => cohortStudentIds.includes(s.id));
  };

  const cohortStudents = selectedCohortId ? getStudentsByCohort(selectedCohortId) : [];

  const getFilteredAttendance = () => {
    if (dateFilter === 'all') return attendanceHistory;
    
    const now = new Date();
    let startDate, endDate;
    
    if (dateFilter === 'this_week') {
      startDate = startOfWeek(now);
      endDate = endOfWeek(now);
    } else if (dateFilter === 'this_month') {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    } else if (dateFilter === 'last_month') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      startDate = startOfMonth(lastMonth);
      endDate = endOfMonth(lastMonth);
    }
    
    return attendanceHistory.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= startDate && recordDate <= endDate;
    });
  };

  const filteredAttendance = getFilteredAttendance();

  const handleExportCSV = () => {
    if (!selectedCohortId || filteredAttendance.length === 0) return;

    const selectedCohort = cohorts.find(c => c.id === selectedCohortId);
    
    // Group by date and student
    const dateMap = {};
    filteredAttendance.forEach(record => {
      if (!dateMap[record.date]) {
        dateMap[record.date] = {};
      }
      dateMap[record.date][record.student_user_id] = record.status;
    });

    const dates = Object.keys(dateMap).sort();
    const studentIds = [...new Set(filteredAttendance.map(r => r.student_user_id))];
    
    // Prepare structured CSV
    const headers = ['Student Name', 'Student Email', ...dates, 'Present', 'Late', 'Absent', 'Attendance Rate'];
    
    const rows = studentIds.map(studentId => {
      const student = students.find(s => s.id === studentId);
      const studentRecords = filteredAttendance.filter(r => r.student_user_id === studentId);
      
      const present = studentRecords.filter(r => r.status === 'present').length;
      const late = studentRecords.filter(r => r.status === 'late').length;
      const absent = studentRecords.filter(r => r.status === 'absent').length;
      const total = studentRecords.length;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;
      
      const dateStatuses = dates.map(date => dateMap[date]?.[studentId] || '-');
      
      return [
        student?.full_name || 'Unknown',
        student?.email || 'N/A',
        ...dateStatuses,
        present,
        late,
        absent,
        `${rate}%`
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filterLabel = dateFilter === 'all' ? 'all' : dateFilter.replace('_', '-');
    a.download = `attendance_${selectedCohort?.name}_${filterLabel}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const handleStudentClick = (student) => {
    setSelectedStudent(student);
    setModalOpen(true);
  };

  const groupedHistory = React.useMemo(() => {
    const grouped = {};
    filteredAttendance.forEach(record => {
      if (!grouped[record.date]) {
        grouped[record.date] = [];
      }
      grouped[record.date].push(record);
    });
    return Object.entries(grouped).sort((a, b) => new Date(b[0]) - new Date(a[0]));
  }, [filteredAttendance]);

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
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Attendance Records
              </CardTitle>
              {selectedCohortId && attendanceHistory.length > 0 && (
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Filter className="w-4 h-4" />
                        {dateFilter === 'all' ? 'All Time' : 
                         dateFilter === 'this_week' ? 'This Week' :
                         dateFilter === 'this_month' ? 'This Month' : 'Last Month'}
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setDateFilter('all')}>All Time</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDateFilter('this_week')}>This Week</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDateFilter('this_month')}>This Month</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDateFilter('last_month')}>Last Month</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button onClick={handleExportCSV} variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    Export CSV
                  </Button>
                </div>
              )}
            </div>
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

                      {/* Student List */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
                        {records.map(record => {
                          const student = students.find(s => s.id === record.student_user_id);
                          return (
                            <button
                              key={record.id}
                              onClick={() => handleStudentClick(student)}
                              className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer text-left"
                            >
                              {student?.profile_picture ? (
                                <img
                                  src={student.profile_picture}
                                  alt={student.full_name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                  {student?.full_name?.charAt(0) || 'S'}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">{student?.full_name || 'Unknown'}</p>
                              </div>
                              <Badge 
                                variant={
                                  record.status === 'present' ? 'default' :
                                  record.status === 'late' ? 'secondary' : 'destructive'
                                }
                                className="text-xs"
                              >
                                {record.status}
                              </Badge>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Student Profile Modal */}
      <StudentProfileModal
        student={selectedStudent}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedStudent(null);
        }}
      />
    </div>
  );
}
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardList, Search, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function AdminExams() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: examAttempts = [] } = useQuery({
    queryKey: ['all-exam-attempts'],
    queryFn: () => base44.entities.ExamAttempt.list('-submitted_at'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: cohorts = [] } = useQuery({
    queryKey: ['all-cohorts'],
    queryFn: () => base44.entities.Cohort.list(),
  });

  const filteredAttempts = useMemo(() => {
    return examAttempts.filter(attempt => {
      const student = users.find(u => u.id === attempt.student_user_id);
      const cohort = cohorts.find(c => c.id === attempt.cohort_id);
      
      const matchesSearch = !searchTerm || 
        student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cohort?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'passed' && attempt.pass_flag === true) ||
        (statusFilter === 'failed' && attempt.pass_flag === false && attempt.attempt_status === 'submitted') ||
        (statusFilter === 'in_progress' && attempt.attempt_status === 'in_progress') ||
        (statusFilter === 'prepared' && attempt.attempt_status === 'prepared');
      
      return matchesSearch && matchesStatus;
    });
  }, [examAttempts, users, cohorts, searchTerm, statusFilter]);

  const passedCount = examAttempts.filter(a => a.pass_flag === true).length;
  const failedCount = examAttempts.filter(a => a.pass_flag === false && a.attempt_status === 'submitted').length;
  const inProgressCount = examAttempts.filter(a => a.attempt_status === 'in_progress').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Exam Management</h1>
          <p className="text-slate-600">View and manage all student exam attempts</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Attempts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{examAttempts.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Passed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{passedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">{failedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{inProgressCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Exam Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by student name, email, or cohort..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Attempts</SelectItem>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="prepared">Prepared</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Exam Attempts List */}
        <Card>
          <CardHeader>
            <CardTitle>Exam Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredAttempts.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No exam attempts found</p>
              ) : (
                filteredAttempts.map(attempt => {
                  const student = users.find(u => u.id === attempt.student_user_id);
                  const cohort = cohorts.find(c => c.id === attempt.cohort_id);
                  
                  return (
                    <Link 
                      key={attempt.id} 
                      to={createPageUrl(`AdminExamDetail?id=${attempt.id}`)}
                      className="block border border-slate-200 rounded-lg p-4 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-slate-900">{student?.full_name || 'Unknown Student'}</p>
                          <p className="text-sm text-slate-600">{student?.email}</p>
                        </div>
                        <div className="flex gap-2">
                          {attempt.attempt_status === 'submitted' && (
                            <Badge className={attempt.pass_flag ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                              {attempt.pass_flag ? (
                                <span className="flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> Passed
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <XCircle className="w-3 h-3" /> Failed
                                </span>
                              )}
                            </Badge>
                          )}
                          {attempt.attempt_status !== 'submitted' && (
                            <Badge className="bg-blue-100 text-blue-700">
                              {attempt.attempt_status === 'in_progress' ? 'In Progress' : 'Prepared'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <ClipboardList className="w-4 h-4" />
                          {cohort?.name || 'No cohort'}
                        </span>
                        <span>Attempt #{attempt.attempt_number}</span>
                        {attempt.score_percent !== null && attempt.score_percent !== undefined && (
                          <span className="font-semibold">Score: {attempt.score_percent}%</span>
                        )}
                        {attempt.submitted_at && (
                          <span>
                            {new Date(attempt.submitted_at).toLocaleDateString()}
                          </span>
                        )}
                        {attempt.current_question_index && attempt.attempt_status === 'in_progress' && (
                          <span>Question {attempt.current_question_index}/80</span>
                        )}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
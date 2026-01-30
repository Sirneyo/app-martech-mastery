import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, FileText, Search } from 'lucide-react';

export default function AdminSubmissions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: submissions = [] } = useQuery({
    queryKey: ['all-submissions'],
    queryFn: () => base44.entities.Submission.list('-submitted_date'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: cohorts = [] } = useQuery({
    queryKey: ['all-cohorts'],
    queryFn: () => base44.entities.Cohort.list(),
  });

  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      const student = users.find(u => u.id === sub.user_id);
      const cohort = cohorts.find(c => c.id === sub.cohort_id);
      
      const matchesSearch = !searchTerm || 
        student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cohort?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
      const matchesType = typeFilter === 'all' || sub.submission_kind === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [submissions, users, cohorts, searchTerm, statusFilter, typeFilter]);

  const pendingCount = submissions.filter(s => ['submitted', 'in_review'].includes(s.status)).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Submissions Management</h1>
          <p className="text-slate-600">View and manage all student submissions</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{submissions.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Filtered Results</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{filteredSubmissions.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="graded">Graded</SelectItem>
                  <SelectItem value="needs_revision">Needs Revision</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Submissions List */}
        <Card>
          <CardHeader>
            <CardTitle>Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredSubmissions.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No submissions found</p>
              ) : (
                filteredSubmissions.map(sub => {
                  const student = users.find(u => u.id === sub.user_id);
                  const cohort = cohorts.find(c => c.id === sub.cohort_id);
                  const ageHours = sub.submitted_date 
                    ? Math.floor((new Date() - new Date(sub.submitted_date)) / (1000 * 60 * 60))
                    : null;
                  
                  return (
                    <div key={sub.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-slate-900">{student?.full_name || 'Unknown Student'}</p>
                          <p className="text-sm text-slate-600">{student?.email}</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="secondary">{sub.submission_kind}</Badge>
                          <Badge className={
                            sub.status === 'graded' ? 'bg-green-100 text-green-700' :
                            sub.status === 'needs_revision' ? 'bg-red-100 text-red-700' :
                            ['submitted', 'in_review'].includes(sub.status) ? 'bg-orange-100 text-orange-700' :
                            'bg-slate-100 text-slate-700'
                          }>
                            {sub.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {cohort?.name || 'No cohort'}
                        </span>
                        {sub.submitted_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {new Date(sub.submitted_date).toLocaleDateString()}
                            {ageHours !== null && ` (${ageHours}h ago)`}
                          </span>
                        )}
                        <span>Attempt #{sub.attempt_number || 1}</span>
                      </div>
                      {sub.content && (
                        <p className="text-sm text-slate-600 mt-2 line-clamp-2">{sub.content}</p>
                      )}
                    </div>
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
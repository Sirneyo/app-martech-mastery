import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, FolderCheck, Search } from 'lucide-react';

export default function AdminPortfolio() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: portfolioStatuses = [] } = useQuery({
    queryKey: ['all-portfolio-statuses'],
    queryFn: () => base44.entities.PortfolioItemStatus.list('-updated_date'),
  });

  const { data: portfolioTemplates = [] } = useQuery({
    queryKey: ['portfolio-templates'],
    queryFn: () => base44.entities.PortfolioItemTemplate.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: cohorts = [] } = useQuery({
    queryKey: ['all-cohorts'],
    queryFn: () => base44.entities.Cohort.list(),
  });

  const filteredPortfolio = useMemo(() => {
    return portfolioStatuses.filter(ps => {
      const student = users.find(u => u.id === ps.user_id);
      const cohort = cohorts.find(c => c.id === ps.cohort_id);
      const template = portfolioTemplates.find(pt => pt.id === ps.portfolio_item_id);
      
      const matchesSearch = !searchTerm || 
        student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cohort?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || ps.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [portfolioStatuses, users, cohorts, portfolioTemplates, searchTerm, statusFilter]);

  const pendingCount = portfolioStatuses.filter(ps => ['submitted', 'in_review'].includes(ps.status)).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Portfolio Management</h1>
          <p className="text-slate-600">View and manage all student portfolio items</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Portfolio Items</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{portfolioStatuses.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-pink-600">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Filtered Results</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{filteredPortfolio.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Portfolio Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by student, template, or cohort..."
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
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="needs_revision">Needs Revision</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Portfolio List */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredPortfolio.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No portfolio items found</p>
              ) : (
                filteredPortfolio.map(ps => {
                  const student = users.find(u => u.id === ps.user_id);
                  const cohort = cohorts.find(c => c.id === ps.cohort_id);
                  const template = portfolioTemplates.find(pt => pt.id === ps.portfolio_item_id);
                  const ageHours = ps.updated_date 
                    ? Math.floor((new Date() - new Date(ps.updated_date)) / (1000 * 60 * 60))
                    : null;
                  
                  return (
                    <div key={ps.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-slate-900">{student?.full_name || 'Unknown Student'}</p>
                          <p className="text-sm text-slate-600">{student?.email}</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="secondary">{template?.title || 'Unknown Template'}</Badge>
                          <Badge className={
                            ps.status === 'approved' ? 'bg-green-100 text-green-700' :
                            ps.status === 'needs_revision' ? 'bg-red-100 text-red-700' :
                            ['submitted', 'in_review'].includes(ps.status) ? 'bg-cyan-100 text-cyan-700' :
                            ps.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-700'
                          }>
                            {ps.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <FolderCheck className="w-4 h-4" />
                          {cohort?.name || 'No cohort'}
                        </span>
                        {ps.updated_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {new Date(ps.updated_date).toLocaleDateString()}
                            {ageHours !== null && ` (${ageHours}h ago)`}
                          </span>
                        )}
                        {ps.progress !== undefined && (
                          <span>Progress: {ps.progress}%</span>
                        )}
                      </div>
                      {ps.reviewer_note && (
                        <p className="text-sm text-slate-600 mt-2 line-clamp-2 italic">Note: {ps.reviewer_note}</p>
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
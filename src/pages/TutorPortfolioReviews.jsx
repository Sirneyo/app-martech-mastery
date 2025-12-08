import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, Award, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function TutorPortfolioReviews() {
  const [statusFilter, setStatusFilter] = useState('submitted');
  const [requiredOnly, setRequiredOnly] = useState(false);

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

  const cohortIds = assignments.map(a => a.cohort_id);

  const { data: portfolioStatuses = [] } = useQuery({
    queryKey: ['portfolio-statuses', cohortIds, statusFilter],
    queryFn: async () => {
      if (cohortIds.length === 0) return [];
      
      const allStatuses = await base44.entities.PortfolioItemStatus.list();
      let filtered = allStatuses.filter(s => cohortIds.includes(s.cohort_id));
      
      if (statusFilter !== 'all') {
        if (statusFilter === 'submitted') {
          filtered = filtered.filter(s => s.status === 'submitted' || s.status === 'in_review');
        } else {
          filtered = filtered.filter(s => s.status === statusFilter);
        }
      }
      
      return filtered.sort((a, b) => new Date(a.updated_date) - new Date(b.updated_date));
    },
    enabled: cohortIds.length > 0,
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['portfolio-templates'],
    queryFn: () => base44.entities.PortfolioItemTemplate.list(),
  });

  const getStudentName = (userId) => {
    const student = students.find(s => s.id === userId);
    return student?.full_name || 'Unknown Student';
  };

  const getTemplateName = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    return template?.title || 'Unknown Item';
  };

  const getTemplate = (templateId) => {
    return templates.find(t => t.id === templateId);
  };

  const filteredStatuses = requiredOnly 
    ? portfolioStatuses.filter(s => {
        const template = getTemplate(s.portfolio_item_id);
        return template?.required_flag;
      })
    : portfolioStatuses;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Portfolio Reviews</h1>
            <p className="text-slate-500 mt-1">Review and approve student portfolio items</p>
          </div>
          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submitted">Pending Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="needs_revision">Needs Revision</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={() => setRequiredOnly(!requiredOnly)}
              className={`px-4 py-2 rounded-lg border transition-all ${
                requiredOnly
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              Required Only
            </button>
          </div>
        </div>
      </motion.div>

      <div className="space-y-3">
        {filteredStatuses.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <p className="text-slate-500">No portfolio items to review</p>
          </div>
        ) : (
          filteredStatuses.map((status, index) => {
            const template = getTemplate(status.portfolio_item_id);
            
            return (
              <motion.div
                key={status.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={createPageUrl(`TutorPortfolioReview?id=${status.id}`)}
                  className="block bg-white rounded-xl p-5 border border-slate-200 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Award className="w-5 h-5 text-violet-600" />
                        <h3 className="font-bold text-slate-900">{getTemplateName(status.portfolio_item_id)}</h3>
                        {template?.required_flag && (
                          <Badge className="bg-red-100 text-red-700">Required</Badge>
                        )}
                        <Badge className={
                          status.status === 'submitted' || status.status === 'in_review' ? 'bg-amber-100 text-amber-700' :
                          status.status === 'approved' ? 'bg-green-100 text-green-700' :
                          status.status === 'needs_revision' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-600'
                        }>
                          {status.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{getStudentName(status.user_id)}</p>
                      {status.updated_date && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Clock className="w-3 h-3" />
                          Updated {format(new Date(status.updated_date), 'MMM d, yyyy h:mm a')}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
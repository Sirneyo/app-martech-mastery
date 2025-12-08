import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Lock, ExternalLink, ChevronRight, Award } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StudentPortfolio() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: membership } = useQuery({
    queryKey: ['my-cohort-membership'],
    queryFn: async () => {
      if (!user?.id) return null;
      const memberships = await base44.entities.CohortMembership.filter({ user_id: user.id, status: 'active' });
      return memberships[0];
    },
    enabled: !!user?.id,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['portfolio-templates'],
    queryFn: () => base44.entities.PortfolioItemTemplate.list('sort_order'),
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ['my-portfolio-statuses'],
    queryFn: async () => {
      if (!user?.id || !membership?.cohort_id) return [];
      return base44.entities.PortfolioItemStatus.filter({ 
        user_id: user.id,
        cohort_id: membership.cohort_id
      });
    },
    enabled: !!user?.id && !!membership?.cohort_id,
  });

  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const result = await base44.entities.AppSettings.list();
      return result[0] || {};
    },
  });

  const getStatus = (templateId) => {
    const status = statuses.find(s => s.portfolio_item_id === templateId);
    return status || { status: 'not_started' };
  };

  const getStatusColor = (status) => {
    if (status === 'approved') return 'bg-green-100 text-green-700';
    if (status === 'submitted' || status === 'in_review') return 'bg-amber-100 text-amber-700';
    if (status === 'needs_revision') return 'bg-red-100 text-red-700';
    if (status === 'in_progress') return 'bg-blue-100 text-blue-700';
    return 'bg-slate-100 text-slate-600';
  };

  const requiredTemplates = templates.filter(t => t.required_flag);
  const allRequiredApproved = requiredTemplates.every(template => {
    const status = getStatus(template.id);
    return status.status === 'approved';
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">My Portfolio</h1>
        <p className="text-slate-500 mt-1">Complete your portfolio to unlock exit interview</p>
      </motion.div>

      {allRequiredApproved && settings?.exit_interview_booking_url && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-8 mb-8 text-white shadow-lg"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Congratulations!</h2>
              <p className="text-white/90">All required portfolio items approved</p>
            </div>
          </div>
          <a
            href={settings.exit_interview_booking_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-green-700 px-6 py-3 rounded-lg font-semibold hover:bg-white/90 transition-all"
          >
            Book Your Exit Interview
            <ExternalLink className="w-4 h-4" />
          </a>
        </motion.div>
      )}

      {!allRequiredApproved && (
        <div className="bg-white rounded-2xl p-6 mb-8 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-slate-400" />
            <div>
              <h3 className="font-bold text-slate-900">Exit Interview Locked</h3>
              <p className="text-sm text-slate-600">Complete all required portfolio items to unlock</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Required Items</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.filter(t => t.required_flag).map((template, index) => {
              const itemStatus = getStatus(template.id);
              const isApproved = itemStatus.status === 'approved';
              
              return (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    to={createPageUrl(`StudentPortfolioItemDetail?id=${template.id}`)}
                    className="block bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-red-100 text-red-700">Required</Badge>
                          <Badge className={getStatusColor(itemStatus.status)}>{itemStatus.status}</Badge>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">{template.title}</h3>
                        {template.description && (
                          <p className="text-sm text-slate-600 line-clamp-2">{template.description}</p>
                        )}
                      </div>
                      {isApproved ? (
                        <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 ml-4" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all flex-shrink-0 ml-4" />
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>

        {templates.filter(t => !t.required_flag).length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Optional Items</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.filter(t => !t.required_flag).map((template, index) => {
                const itemStatus = getStatus(template.id);
                const isApproved = itemStatus.status === 'approved';
                
                return (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      to={createPageUrl(`StudentPortfolioItemDetail?id=${template.id}`)}
                      className="block bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">Optional</Badge>
                            <Badge className={getStatusColor(itemStatus.status)}>{itemStatus.status}</Badge>
                          </div>
                          <h3 className="text-lg font-bold text-slate-900 mb-2">{template.title}</h3>
                          {template.description && (
                            <p className="text-sm text-slate-600 line-clamp-2">{template.description}</p>
                          )}
                        </div>
                        {isApproved ? (
                          <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 ml-4" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all flex-shrink-0 ml-4" />
                        )}
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
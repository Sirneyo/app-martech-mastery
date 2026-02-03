import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Lock, ExternalLink, ChevronRight, Award, BookOpen } from 'lucide-react';
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

  const { data: certificate } = useQuery({
    queryKey: ['my-certificate', membership?.cohort_id],
    queryFn: async () => {
      if (!user?.id || !membership?.cohort_id) return null;
      const certs = await base44.entities.Certificate.filter({ 
        student_user_id: user.id, 
        cohort_id: membership.cohort_id 
      });
      return certs[0];
    },
    enabled: !!user?.id && !!membership?.cohort_id,
  });

  const { data: cohort } = useQuery({
    queryKey: ['my-cohort', membership?.cohort_id],
    queryFn: async () => {
      if (!membership?.cohort_id) return null;
      const cohorts = await base44.entities.Cohort.filter({ id: membership.cohort_id });
      return cohorts[0];
    },
    enabled: !!membership?.cohort_id,
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

  const completionPercentage = requiredTemplates.length > 0 
    ? Math.round((requiredTemplates.filter(t => getStatus(t.id).status === 'approved').length / requiredTemplates.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">My Portfolio</h1>
        <p className="text-slate-500 mt-1">Complete your certification requirements and unlock your professional certificate</p>
      </motion.div>

      {cohort && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 mb-8"
        >
          <div className="flex items-start gap-6 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{cohort.name}</h2>
              <p className="text-slate-600">Complete your journey and earn your professional certification</p>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">Certification Progress</h3>
              <span className="text-2xl font-bold text-slate-900">{completionPercentage}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-500 to-orange-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <p className="text-sm text-slate-600 mt-2">
              {requiredTemplates.filter(t => getStatus(t.id).status === 'approved').length} of {requiredTemplates.length} requirements completed
            </p>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h3 className="font-semibold text-slate-900 mb-4">Certification Requirements</h3>
            <div className="space-y-3">
              {requiredTemplates.map((template) => {
                const itemStatus = getStatus(template.id);
                const isApproved = itemStatus.status === 'approved';
                
                return (
                  <div key={template.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isApproved 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-slate-200 text-slate-400'
                    }`}>
                      {isApproved ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <span className="w-2 h-2 bg-current rounded-full" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${isApproved ? 'text-slate-900' : 'text-slate-600'}`}>
                        {template.title}
                      </p>
                      {template.short_description && (
                        <p className="text-sm text-slate-500 mt-1">{template.short_description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {certificate && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-8 shadow-sm border-2 border-amber-200 mb-8"
        >
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Your Certificate</h3>
          <div className="bg-white rounded-xl border-2 border-amber-300 p-8 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <h4 className="text-xl font-bold text-slate-900 mb-2">Certificate of Completion</h4>
            <p className="text-sm text-slate-600 mb-4">You have successfully completed the</p>
            <p className="text-lg font-bold text-slate-900 mb-6">{cohort?.name}</p>
            <p className="text-xs text-slate-500 mb-4">Certificate ID: {certificate.certificate_id_code}</p>
            {certificate.certificate_url && (
              <a 
                href={certificate.certificate_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-amber-700 hover:text-amber-900 font-medium"
              >
                View Certificate
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </motion.div>
      )}

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
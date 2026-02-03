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

  const { data: studentProfile } = useQuery({
    queryKey: ['student-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const profiles = await base44.entities.User.filter({ id: user.id });
      return profiles[0];
    },
    enabled: !!user?.id,
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
          <div className="flex items-start gap-8 mb-12">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-slate-900 mb-1">{cohort.name}</h2>
              <p className="text-slate-600">Complete your journey and earn your professional certification</p>
            </div>
          </div>

          <div className="mb-8 pb-8 border-b border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 text-base">Certification Progress</h3>
              <span className="text-3xl font-bold text-slate-900">{completionPercentage}%</span>
            </div>
            <p className="text-sm text-slate-600 mb-3">
              {requiredTemplates.filter(t => getStatus(t.id).status === 'approved').length} of {requiredTemplates.length} requirements completed
            </p>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-6 text-base flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-amber-500" />
              Certification Requirements
            </h3>
            <div className="space-y-4">
              {requiredTemplates.map((template) => {
                const itemStatus = getStatus(template.id);
                const isApproved = itemStatus.status === 'approved';
                
                return (
                  <Link
                    key={template.id}
                    to={createPageUrl(`StudentPortfolioItemDetail?id=${template.id}`)}
                    className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50 transition-all group cursor-pointer"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isApproved 
                        ? 'bg-green-100' 
                        : 'bg-slate-100'
                    }`}>
                      {isApproved ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${isApproved ? 'text-slate-900' : 'text-slate-700'}`}>
                        {template.title}
                      </p>
                      {template.short_description && (
                        <p className="text-sm text-slate-600 mt-1">{template.short_description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(itemStatus.status)}>{itemStatus.status}</Badge>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
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
          className="bg-yellow-50 rounded-2xl p-8 shadow-sm border-3 border-yellow-300 mb-8"
        >
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Your Certificate</h3>
          <div className="bg-white rounded-2xl border-3 border-yellow-300 p-12 text-center relative">
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-500 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
            </div>
            
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center mx-auto mb-8">
                <BookOpen className="w-12 h-12 text-white" />
              </div>
              
              <h4 className="text-2xl font-bold text-slate-900 mb-2">Certificate of Completion</h4>
              <p className="text-sm text-slate-600 mb-6">This certifies that</p>
              
              <p className="text-3xl font-bold text-slate-900 mb-6">{user?.display_name || user?.full_name}</p>
              <p className="text-sm text-slate-600 mb-1">has successfully completed the</p>
              <p className="text-xl font-bold text-slate-900 mb-8">{cohort?.name}</p>
              
              <div className="grid grid-cols-2 gap-6 text-sm mb-8 py-6 border-t border-b border-slate-200">
                <div>
                  <p className="text-slate-600 text-xs">Program Duration</p>
                  <p className="font-semibold text-slate-900">12 Weeks</p>
                </div>
                <div>
                  <p className="text-slate-600 text-xs">Issued Date</p>
                  <p className="font-semibold text-slate-900">{certificate.issued_at ? new Date(certificate.issued_at).toLocaleDateString() : 'Pending'}</p>
                </div>
                <div>
                  <p className="text-slate-600 text-xs">Certificate ID</p>
                  <p className="font-semibold text-slate-900 font-mono text-xs">{certificate.certificate_id_code}</p>
                </div>
                <div>
                  <p className="text-slate-600 text-xs">Status</p>
                  <p className="font-semibold text-green-600">Verified</p>
                </div>
              </div>
              
              <p className="text-xs text-slate-500">Certificate is a valid credential for professional purposes</p>
            </div>
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

      {studentProfile?.cv_url && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8"
        >
          <h3 className="font-bold text-slate-900 text-lg mb-4">Your CV</h3>
          <div className="relative group">
            <a 
              href={studentProfile.cv_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">CV Document</p>
                <p className="text-sm text-slate-600">Download your uploaded CV</p>
              </div>
              <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </a>
          </div>
          <p className="text-xs text-slate-500 mt-2">Pending admin approval</p>
        </motion.div>
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
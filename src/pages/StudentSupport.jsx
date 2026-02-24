import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ticket, Wrench, GraduationCap, ChevronRight, 
  CheckCircle, Clock, AlertCircle, Loader2, Plus,
  ArrowLeft
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const TICKET_TYPES = [
  {
    id: 'technical',
    icon: Wrench,
    title: 'Technical Support',
    description: 'Issues with the platform, login problems, bugs, or anything tech-related.',
    color: 'from-blue-500 to-cyan-500',
    lightColor: 'bg-blue-50 border-blue-200',
    textColor: 'text-blue-700',
  },
  {
    id: 'program',
    icon: GraduationCap,
    title: 'Program Support',
    description: 'Questions about assignments, projects, cohort schedule, grading, or course content.',
    color: 'from-violet-500 to-purple-600',
    lightColor: 'bg-violet-50 border-violet-200',
    textColor: 'text-violet-700',
  },
];

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-700', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700', icon: Loader2 },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  closed: { label: 'Closed', color: 'bg-slate-100 text-slate-600', icon: CheckCircle },
};

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  high: { label: 'High', color: 'bg-red-100 text-red-700' },
};

export default function StudentSupport() {
  const [view, setView] = useState('list'); // 'list' | 'select-type' | 'form'
  const [selectedType, setSelectedType] = useState(null);
  const [form, setForm] = useState({ subject: '', description: '', priority: 'medium' });
  const [submitted, setSubmitted] = useState(false);
  const queryClient = useQueryClient();

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

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['my-tickets', user?.id],
    queryFn: () => base44.entities.SupportTicket.filter({ user_id: user.id }, '-created_date'),
    enabled: !!user?.id,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const ticket = await base44.entities.SupportTicket.create({
        user_id: user.id,
        ticket_type: selectedType,
        subject: form.subject,
        description: form.description,
        priority: form.priority,
        cohort_id: membership?.cohort_id || '',
        student_email: user.email,
        student_name: user.full_name,
        status: 'open',
      });
      await base44.functions.invoke('sendTicketNotification', { ticket_id: ticket.id });
      return ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
      setSubmitted(true);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    submitMutation.mutate();
  };

  const resetForm = () => {
    setForm({ subject: '', description: '', priority: 'medium' });
    setSelectedType(null);
    setSubmitted(false);
    setView('list');
  };

  // Success screen
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl p-10 shadow-lg text-center max-w-md w-full"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Ticket Submitted!</h2>
          <p className="text-slate-500 mb-8">
            Your support request has been sent. Our team will get back to you shortly.
          </p>
          <button
            onClick={resetForm}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Back to My Tickets
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {view !== 'list' && (
                <button onClick={resetForm} className="p-2 rounded-xl hover:bg-white transition-colors text-slate-500 hover:text-slate-700">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Support Centre</h1>
                <p className="text-slate-500 text-sm mt-0.5">Get help with technical issues or program questions</p>
              </div>
            </div>
            {view === 'list' && (
              <button
                onClick={() => setView('select-type')}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                New Ticket
              </button>
            )}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">

          {/* Ticket Type Selection */}
          {view === 'select-type' && (
            <motion.div key="select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className="text-slate-600 font-medium mb-4">What do you need help with?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {TICKET_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => { setSelectedType(type.id); setView('form'); }}
                    className={`text-left p-6 rounded-2xl border-2 ${type.lightColor} hover:shadow-md transition-all group`}
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center mb-4 shadow`}>
                      <type.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className={`font-bold text-lg ${type.textColor} mb-1`}>{type.title}</h3>
                    <p className="text-slate-500 text-sm">{type.description}</p>
                    <div className={`flex items-center gap-1 mt-4 ${type.textColor} text-sm font-medium`}>
                      Open ticket <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Ticket Form */}
          {view === 'form' && selectedType && (
            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {(() => {
                const typeConfig = TICKET_TYPES.find(t => t.id === selectedType);
                return (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className={`bg-gradient-to-r ${typeConfig.color} px-6 py-4`}>
                      <div className="flex items-center gap-3">
                        <typeConfig.icon className="w-5 h-5 text-white" />
                        <h2 className="text-white font-bold">{typeConfig.title}</h2>
                      </div>
                    </div>
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject *</label>
                        <input
                          type="text"
                          required
                          value={form.subject}
                          onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                          placeholder="Brief summary of your issue"
                          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Description *</label>
                        <textarea
                          required
                          rows={5}
                          value={form.description}
                          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                          placeholder="Please describe your issue in detail..."
                          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Priority</label>
                        <div className="flex gap-3">
                          {['low', 'medium', 'high'].map(p => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setForm(f => ({ ...f, priority: p }))}
                              className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 capitalize transition-all ${
                                form.priority === p
                                  ? p === 'high' ? 'border-red-500 bg-red-50 text-red-700'
                                    : p === 'medium' ? 'border-yellow-400 bg-yellow-50 text-yellow-700'
                                    : 'border-slate-400 bg-slate-50 text-slate-700'
                                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={submitMutation.isPending}
                        className={`w-full bg-gradient-to-r ${typeConfig.color} text-white font-semibold py-3 rounded-xl transition-opacity disabled:opacity-60 flex items-center justify-center gap-2`}
                      >
                        {submitMutation.isPending ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                        ) : (
                          <><Ticket className="w-4 h-4" /> Submit Ticket</>
                        )}
                      </button>
                    </form>
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* Ticket List */}
          {view === 'list' && (
            <motion.div key="list" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Ticket className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="font-semibold text-slate-700 mb-1">No tickets yet</h3>
                  <p className="text-slate-400 text-sm mb-6">Need help? Open a support ticket and we'll get back to you.</p>
                  <button
                    onClick={() => setView('select-type')}
                    className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
                  >
                    Open Your First Ticket
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map(ticket => {
                    const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
                    const priority = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
                    const typeConfig = TICKET_TYPES.find(t => t.id === ticket.ticket_type);
                    return (
                      <div key={ticket.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${typeConfig?.color || 'from-slate-400 to-slate-500'} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                              {typeConfig && <typeConfig.icon className="w-4 h-4 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 truncate">{ticket.subject}</p>
                              <p className="text-sm text-slate-500 mt-0.5 truncate">{ticket.description}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.color}`}>{status.label}</span>
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${priority.color}`}>{priority.label}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                          <span className={`text-xs font-medium ${typeConfig?.textColor || 'text-slate-500'}`}>{typeConfig?.title}</span>
                          <span className="text-xs text-slate-400">{format(new Date(ticket.created_date), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, Wrench, CheckCircle, Clock, Loader2, Plus, ArrowLeft, Send, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

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

export default function StaffSupport() {
  const [view, setView] = useState('list'); // 'list' | 'form' | 'detail'
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [form, setForm] = useState({ subject: '', description: '', priority: 'medium' });
  const [submitted, setSubmitted] = useState(false);
  const [replyText, setReplyText] = useState('');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['my-staff-tickets', user?.id],
    queryFn: () => base44.entities.SupportTicket.filter({ user_id: user.id }, '-created_date'),
    enabled: !!user?.id,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const ticket = await base44.entities.SupportTicket.create({
        user_id: user.id,
        ticket_type: 'technical',
        subject: form.subject,
        description: form.description,
        priority: form.priority,
        student_email: user.email,
        student_name: user.full_name,
        status: 'open',
      });
      await base44.functions.invoke('sendTicketNotification', { ticket_id: ticket.id });
      return ticket;
    },
    onSuccess: (ticket) => {
      queryClient.invalidateQueries({ queryKey: ['my-staff-tickets'] });
      setSelectedTicket(ticket);
      setSubmitted(true);
    },
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      const newReply = {
        author_id: user.id,
        author_name: user.full_name,
        author_role: user.app_role || 'staff',
        message: replyText.trim(),
        sent_at: new Date().toISOString(),
      };
      const updatedReplies = [...(selectedTicket.replies || []), newReply];
      return base44.entities.SupportTicket.update(selectedTicket.id, { replies: updatedReplies });
    },
    onSuccess: (updated) => {
      setSelectedTicket(updated);
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['my-staff-tickets'] });
    },
  });

  const resetForm = () => {
    setForm({ subject: '', description: '', priority: 'medium' });
    setSubmitted(false);
    setSelectedTicket(null);
    setView('list');
  };

  const openTicket = (ticket) => {
    setSelectedTicket(ticket);
    setReplyText('');
    setView('detail');
  };

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
                <h1 className="text-2xl font-bold text-slate-900">Technical Support</h1>
                <p className="text-slate-500 text-sm mt-0.5">Report platform issues or technical problems to the Super Admin team</p>
              </div>
            </div>
            {view === 'list' && (
              <button
                onClick={() => setView('form')}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                New Ticket
              </button>
            )}
          </div>
        </motion.div>

        {/* Success screen */}
        {submitted && selectedTicket && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-10 shadow-lg text-center"
          >
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Ticket Submitted!</h2>
            <p className="text-slate-500 mb-8">Your request has been sent to the Super Admin team.</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setSubmitted(false); setView('detail'); }}
                className="w-full border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold py-3 rounded-xl transition-colors"
              >
                View Ticket
              </button>
              <button
                onClick={resetForm}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Back to My Tickets
              </button>
            </div>
          </motion.div>
        )}

        {!submitted && (
          <AnimatePresence mode="wait">

            {/* Ticket Form */}
            {view === 'form' && (
              <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-4 flex items-center gap-3">
                    <Wrench className="w-5 h-5 text-white" />
                    <h2 className="text-white font-bold">Technical Support Request</h2>
                  </div>
                  <form onSubmit={(e) => { e.preventDefault(); submitMutation.mutate(); }} className="p-6 space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject *</label>
                      <input
                        type="text"
                        required
                        value={form.subject}
                        onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                        placeholder="Brief summary of your issue"
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
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
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
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
                      className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold py-3 rounded-xl transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {submitMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                      ) : (
                        <><Ticket className="w-4 h-4" /> Submit Ticket</>
                      )}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* Ticket Detail */}
            {view === 'detail' && selectedTicket && (
              <motion.div key="detail" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {(() => {
                  const ticket = selectedTicket;
                  const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
                  const priority = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
                  return (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-4 flex items-center gap-3">
                        <Wrench className="w-5 h-5 text-white" />
                        <h2 className="text-white font-bold">Technical Support</h2>
                      </div>
                      <div className="p-6 space-y-5">
                        <div className="flex flex-wrap gap-2">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.color}`}>{status.label}</span>
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${priority.color}`}>{priority.label} Priority</span>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Subject</p>
                          <p className="font-semibold text-slate-900 text-lg">{ticket.subject}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                          <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Your Message</p>
                          <p className="text-slate-700 whitespace-pre-wrap text-sm">{ticket.description}</p>
                        </div>

                        {ticket.replies?.length > 0 && (
                          <div className="space-y-3">
                            <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Conversation</p>
                            {ticket.replies.map((reply, i) => {
                              const isSuperAdmin = reply.author_role === 'super_admin' || reply.author_role === 'admin_reply';
                              const isMe = reply.author_id === user?.id;
                              return (
                                <div key={i} className={`flex ${isSuperAdmin ? 'justify-start' : 'justify-end'}`}>
                                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${isSuperAdmin ? 'bg-blue-50 border border-blue-200 text-blue-900' : 'bg-slate-100 text-slate-800'}`}>
                                    <p className="text-xs font-semibold mb-1 text-slate-500">
                                      {isSuperAdmin ? 'Super Admin' : isMe ? 'You' : reply.author_name}
                                    </p>
                                    <p className="whitespace-pre-wrap">{reply.message}</p>
                                    <p className="text-xs mt-1 text-slate-400">
                                      {reply.sent_at ? format(new Date(reply.sent_at), 'MMM d · h:mm a') : ''}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {!ticket.replies?.length && (
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
                            Your ticket has been received. The Super Admin team will respond shortly.
                          </div>
                        )}

                        {ticket.status !== 'closed' && (
                          <div className="pt-4 border-t border-slate-200 space-y-2">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Add a reply</p>
                            <textarea
                              rows={3}
                              value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                              placeholder="Write your reply..."
                              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
                            />
                            <button
                              onClick={() => replyMutation.mutate()}
                              disabled={!replyText.trim() || replyMutation.isPending}
                              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-xl transition-colors text-sm"
                            >
                              {replyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                              {replyMutation.isPending ? 'Sending...' : 'Send Reply'}
                            </button>
                          </div>
                        )}

                        <div className="pt-3 border-t border-slate-100 text-xs text-slate-400">
                          Submitted {format(new Date(ticket.created_date), 'MMM d, yyyy • h:mm a')}
                        </div>
                      </div>
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
                      <Wrench className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="font-semibold text-slate-700 mb-1">No tickets yet</h3>
                    <p className="text-slate-400 text-sm mb-6">Experiencing a technical issue? Submit a ticket and the Super Admin team will help.</p>
                    <button
                      onClick={() => setView('form')}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
                    >
                      Open a Ticket
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tickets.map(ticket => {
                      const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
                      const priority = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
                      return (
                        <div key={ticket.id} onClick={() => openTicket(ticket)} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow cursor-pointer">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Wrench className="w-4 h-4 text-white" />
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
                            <span className="text-xs font-medium text-blue-600">Technical Support</span>
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
        )}
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Ticket, Search, Clock, CheckCircle, Loader2, MessageSquare, User, Filter, XCircle, Send, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700' },
  closed: { label: 'Closed', color: 'bg-slate-100 text-slate-600' },
};

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  high: { label: 'High', color: 'bg-red-100 text-red-700' },
};

export default function AdminSupportTickets() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['all-support-tickets'],
    queryFn: () => base44.entities.SupportTicket.list('-created_date', 200),
  });

  const updateTicketMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SupportTicket.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['all-support-tickets'] });
      setSelectedTicket(updated);
    },
  });

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedTicket) return;
    const newReply = {
      author_id: currentUser?.id,
      author_name: currentUser?.full_name,
      author_role: currentUser?.app_role,
      message: replyText.trim(),
      sent_at: new Date().toISOString(),
    };
    const updatedReplies = [...(selectedTicket.replies || []), newReply];
    updateTicketMutation.mutate({
      id: selectedTicket.id,
      data: {
        replies: updatedReplies,
        admin_reply: replyText.trim(),
        status: newStatus || (selectedTicket.status === 'open' ? 'in_progress' : selectedTicket.status),
      },
    });
    setReplyText('');
    setNewStatus('');
  };

  const handleStatusChange = (status) => {
    if (!selectedTicket) return;
    const updates = { status };
    if (status === 'closed') {
      updates.closed_by_id = currentUser?.id;
      updates.closed_at = new Date().toISOString();
    }
    updateTicketMutation.mutate({ id: selectedTicket.id, data: updates });
  };

  const filteredTickets = tickets.filter(t => {
    const matchSearch = !searchTerm ||
      t.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.student_email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchType = typeFilter === 'all' || t.ticket_type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const openCount = tickets.filter(t => t.status === 'open').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Support Tickets</h1>
            <p className="text-slate-500 mt-1">Manage and respond to student support requests</p>
          </div>
          <div className="flex gap-3">
            {openCount > 0 && (
              <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-xl text-sm font-semibold">
                {openCount} Open
              </div>
            )}
            {inProgressCount > 0 && (
              <div className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-xl text-sm font-semibold">
                {inProgressCount} In Progress
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="program">Program</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Ticket List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
            <Ticket className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No tickets found</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left p-4 font-semibold text-slate-700">Student</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Subject</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Type</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Priority</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Status</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Replies</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Submitted</th>
                  <th className="text-left p-4 font-semibold text-slate-700"></th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map(ticket => {
                  const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
                  const priority = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
                  return (
                    <tr
                      key={ticket.id}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <td className="p-4">
                        <p className="font-medium text-slate-900">{ticket.student_name}</p>
                        <p className="text-xs text-slate-500">{ticket.student_email}</p>
                      </td>
                      <td className="p-4 max-w-xs">
                        <p className="font-medium text-slate-800 truncate">{ticket.subject}</p>
                        <p className="text-xs text-slate-500 truncate">{ticket.description}</p>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="capitalize">{ticket.ticket_type}</Badge>
                      </td>
                      <td className="p-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${priority.color}`}>
                          {priority.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="p-4 text-center text-sm text-slate-600">
                        {ticket.replies?.length || 0}
                      </td>
                      <td className="p-4 text-xs text-slate-500">
                        {format(new Date(ticket.created_date), 'MMM d, yyyy')}
                      </td>
                      <td className="p-4">
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => { if (!open) setSelectedTicket(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-violet-600" />
              {selectedTicket?.subject}
            </DialogTitle>
          </DialogHeader>

          {selectedTicket && (
            <div className="flex flex-col gap-4 overflow-y-auto flex-1">
              {/* Meta */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${(STATUS_CONFIG[selectedTicket.status] || STATUS_CONFIG.open).color}`}>
                  {(STATUS_CONFIG[selectedTicket.status] || STATUS_CONFIG.open).label}
                </span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${(PRIORITY_CONFIG[selectedTicket.priority] || PRIORITY_CONFIG.medium).color}`}>
                  {(PRIORITY_CONFIG[selectedTicket.priority] || PRIORITY_CONFIG.medium).label} Priority
                </span>
                <Badge variant="outline" className="capitalize">{selectedTicket.ticket_type}</Badge>
                <span className="text-xs text-slate-500 ml-auto">
                  {selectedTicket.student_name} · {format(new Date(selectedTicket.created_date), 'MMM d, yyyy')}
                </span>
              </div>

              {/* Original message */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-2 font-semibold">Original Message</p>
                <p className="text-slate-700 whitespace-pre-wrap text-sm">{selectedTicket.description}</p>
              </div>

              {/* Thread */}
              {selectedTicket.replies?.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Conversation</p>
                  {selectedTicket.replies.map((reply, i) => {
                    const isAdmin = reply.author_role === 'admin' || reply.author_role === 'super_admin' || reply.author_role === 'tutor';
                    return (
                      <div key={i} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${isAdmin ? 'bg-violet-600 text-white' : 'bg-white border border-slate-200 text-slate-800'}`}>
                          <p className={`text-xs font-semibold mb-1 ${isAdmin ? 'text-violet-200' : 'text-slate-500'}`}>
                            {reply.author_name} · {reply.author_role}
                          </p>
                          <p className="whitespace-pre-wrap">{reply.message}</p>
                          <p className={`text-xs mt-1 ${isAdmin ? 'text-violet-300' : 'text-slate-400'}`}>
                            {reply.sent_at ? format(new Date(reply.sent_at), 'MMM d · h:mm a') : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Status change */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Select value={selectedTicket.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-slate-400 self-center">Change status directly</span>
              </div>

              {/* Reply box */}
              {selectedTicket.status !== 'closed' && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <Textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Write a reply to the student..."
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      className="bg-violet-600 hover:bg-violet-700 text-white flex-1"
                      disabled={!replyText.trim() || updateTicketMutation.isPending}
                      onClick={handleSendReply}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {updateTicketMutation.isPending ? 'Sending...' : 'Send Reply'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
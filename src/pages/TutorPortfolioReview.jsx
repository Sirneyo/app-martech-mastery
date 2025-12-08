import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, Calendar, Link as LinkIcon, Download, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function TutorPortfolioReview() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const statusId = urlParams.get('id');

  const [reviewerNote, setReviewerNote] = useState('');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: status } = useQuery({
    queryKey: ['portfolio-status', statusId],
    queryFn: async () => {
      const result = await base44.entities.PortfolioItemStatus.filter({ id: statusId });
      if (result[0]?.reviewer_note) {
        setReviewerNote(result[0].reviewer_note);
      }
      return result[0];
    },
    enabled: !!statusId,
  });

  const { data: student } = useQuery({
    queryKey: ['student', status?.user_id],
    queryFn: async () => {
      const result = await base44.entities.User.filter({ id: status.user_id });
      return result[0];
    },
    enabled: !!status?.user_id,
  });

  const { data: template } = useQuery({
    queryKey: ['portfolio-template', status?.portfolio_item_id],
    queryFn: async () => {
      const result = await base44.entities.PortfolioItemTemplate.filter({ id: status.portfolio_item_id });
      return result[0];
    },
    enabled: !!status?.portfolio_item_id,
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.PortfolioItemStatus.update(statusId, {
        status: 'approved',
        reviewed_by_user_id: user.id,
        reviewer_note: reviewerNote
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-status'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-statuses'] });
      navigate(createPageUrl('TutorPortfolioReviews'));
    },
  });

  const requestRevisionMutation = useMutation({
    mutationFn: async () => {
      if (!reviewerNote.trim()) {
        alert('Please provide feedback for the revision request');
        return;
      }
      await base44.entities.PortfolioItemStatus.update(statusId, {
        status: 'needs_revision',
        reviewed_by_user_id: user.id,
        reviewer_note: reviewerNote
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-status'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-statuses'] });
      navigate(createPageUrl('TutorPortfolioReviews'));
    },
  });

  const isReviewed = status?.status === 'approved';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(createPageUrl('TutorPortfolioReviews'))} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Portfolio Reviews
        </Button>

        {status && template && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm mb-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">{template.title}</h1>
                  <div className="flex gap-2 mt-2">
                    {template.required_flag && (
                      <Badge className="bg-red-100 text-red-700">Required</Badge>
                    )}
                    <Badge className={
                      status.status === 'submitted' || status.status === 'in_review' ? 'bg-amber-100 text-amber-700' :
                      status.status === 'approved' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }>
                      {status.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-600">
                  <User className="w-4 h-4" />
                  <span className="text-sm">{student?.full_name}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    {status.updated_date && format(new Date(status.updated_date), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
              </div>

              {template.description && (
                <div className="mb-6">
                  <h3 className="font-bold text-slate-900 mb-2">Description:</h3>
                  <p className="text-slate-600">{template.description}</p>
                </div>
              )}

              <div className="space-y-6">
                {status.evidence_links && status.evidence_links.length > 0 && (
                  <div>
                    <h3 className="font-bold text-slate-900 mb-2">Submitted Links:</h3>
                    <div className="space-y-2">
                      {status.evidence_links.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 hover:underline p-3 bg-slate-50 rounded-lg"
                        >
                          <LinkIcon className="w-4 h-4" />
                          {url}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {status.evidence_files && status.evidence_files.length > 0 && (
                  <div>
                    <h3 className="font-bold text-slate-900 mb-2">Submitted Files:</h3>
                    <div className="space-y-2">
                      {status.evidence_files.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 hover:underline p-3 bg-slate-50 rounded-lg"
                        >
                          <Download className="w-4 h-4" />
                          File {idx + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {!isReviewed && (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900 mb-6">Review Portfolio Item</h2>

                <div className="space-y-6">
                  <div>
                    <Label>Feedback / Notes</Label>
                    <Textarea
                      value={reviewerNote}
                      onChange={(e) => setReviewerNote(e.target.value)}
                      placeholder="Provide feedback for the student..."
                      rows={6}
                      className="mt-2"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => requestRevisionMutation.mutate()}
                      variant="outline"
                      className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                      disabled={requestRevisionMutation.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      {requestRevisionMutation.isPending ? 'Requesting...' : 'Request Revision'}
                    </Button>
                    <Button
                      onClick={() => approveMutation.mutate()}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={approveMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {approveMutation.isPending ? 'Approving...' : 'Approve'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {isReviewed && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <h3 className="font-bold text-green-900">Portfolio Item Approved</h3>
                    <p className="text-green-800 text-sm">This item has been reviewed and approved</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
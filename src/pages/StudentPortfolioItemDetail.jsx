import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Upload, Loader2, CheckCircle, Plus, X, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StudentPortfolioItemDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const templateId = urlParams.get('id');

  const [links, setLinks] = useState(['']);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

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

  const { data: template } = useQuery({
    queryKey: ['portfolio-template', templateId],
    queryFn: async () => {
      const result = await base44.entities.PortfolioItemTemplate.filter({ id: templateId });
      return result[0];
    },
    enabled: !!templateId,
  });

  const { data: status, refetch } = useQuery({
    queryKey: ['portfolio-status', templateId],
    queryFn: async () => {
      if (!user?.id || !templateId || !membership?.cohort_id) return null;
      const statuses = await base44.entities.PortfolioItemStatus.filter({ 
        user_id: user.id,
        portfolio_item_id: templateId,
        cohort_id: membership.cohort_id
      });
      if (statuses.length > 0) {
        const s = statuses[0];
        setLinks(s.evidence_links && s.evidence_links.length > 0 ? s.evidence_links : ['']);
        setFiles(s.evidence_files || []);
        return s;
      }
      return null;
    },
    enabled: !!user?.id && !!templateId && !!membership?.cohort_id,
  });

  const handleFileUpload = async (e) => {
    const uploadFiles = Array.from(e.target.files || []);
    if (uploadFiles.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = uploadFiles.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      const fileUrls = results.map(r => r.file_url);
      setFiles([...files, ...fileUrls]);
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setUploading(false);
    }
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const filteredLinks = links.filter(l => l.trim());
      const evidenceData = {
        user_id: user.id,
        cohort_id: membership.cohort_id,
        portfolio_item_id: templateId,
        evidence_links: filteredLinks,
        evidence_files: files,
        status: template.needs_approval ? 'submitted' : 'approved'
      };

      if (status) {
        return base44.entities.PortfolioItemStatus.update(status.id, evidenceData);
      } else {
        return base44.entities.PortfolioItemStatus.create(evidenceData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-status'] });
      queryClient.invalidateQueries({ queryKey: ['my-portfolio-statuses'] });
      refetch();
    },
  });

  const isSubmitted = status?.status === 'submitted' || status?.status === 'in_review' || status?.status === 'approved';
  const needsRevision = status?.status === 'needs_revision';
  const canSubmit = template?.evidence_type === 'link' ? links.some(l => l.trim()) :
                    template?.evidence_type === 'file' ? files.length > 0 :
                    (links.some(l => l.trim()) || files.length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(createPageUrl('StudentPortfolio'))} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Portfolio
        </Button>

        {template && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <Badge className={template.required_flag ? 'bg-red-100 text-red-700 mb-2' : 'mb-2'}>
                    {template.required_flag ? 'Required' : 'Optional'}
                  </Badge>
                  <h1 className="text-3xl font-bold text-slate-900">{template.title}</h1>
                </div>
                {status?.status && (
                  <Badge className={
                    status.status === 'approved' ? 'bg-green-100 text-green-700' :
                    status.status === 'submitted' || status.status === 'in_review' ? 'bg-amber-100 text-amber-700' :
                    status.status === 'needs_revision' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-600'
                  }>
                    {status.status}
                  </Badge>
                )}
              </div>
              {template.description && <p className="text-slate-600 mb-4">{template.description}</p>}
              
              {template.requirements && template.requirements.length > 0 && (
                <div>
                  <h3 className="font-bold text-slate-900 mb-3">Requirements:</h3>
                  <ul className="space-y-2">
                    {template.requirements.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-600">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {needsRevision && status?.reviewer_note && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-red-900 mb-2">Revision Requested</h3>
                    <p className="text-red-800">{status.reviewer_note}</p>
                  </div>
                </div>
              </div>
            )}

            {status?.status === 'approved' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <h3 className="font-bold text-green-900">Approved!</h3>
                    <p className="text-green-800 text-sm">This portfolio item has been approved by your tutor</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Submit Evidence</h2>
              
              <div className="space-y-6">
                {(template.evidence_type === 'link' || template.evidence_type === 'both') && (
                  <div>
                    <Label>Evidence Links</Label>
                    <div className="space-y-3 mt-2">
                      {links.map((link, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Input
                            type="url"
                            value={link}
                            onChange={(e) => {
                              const newLinks = [...links];
                              newLinks[idx] = e.target.value;
                              setLinks(newLinks);
                            }}
                            placeholder="https://..."
                            disabled={isSubmitted && !needsRevision}
                          />
                          {links.length > 1 && !isSubmitted && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setLinks(links.filter((_, i) => i !== idx))}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {!isSubmitted && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLinks([...links, ''])}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Another Link
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {(template.evidence_type === 'file' || template.evidence_type === 'both') && (
                  <div>
                    <Label>Evidence Files</Label>
                    <div className="mt-2">
                      {!isSubmitted && (
                        <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-violet-500 hover:bg-violet-50 transition-all cursor-pointer">
                          <Upload className="w-5 h-5 text-slate-500" />
                          <span className="text-sm text-slate-600">Upload files</span>
                          <input
                            type="file"
                            multiple
                            onChange={handleFileUpload}
                            className="hidden"
                            disabled={uploading}
                          />
                        </label>
                      )}
                      {uploading && (
                        <div className="flex items-center gap-2 text-sm text-slate-500 mt-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading...
                        </div>
                      )}
                      {files.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {files.map((url, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate flex-1">
                                File {idx + 1}
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!isSubmitted && (
                  <div className="pt-4">
                    <Button
                      onClick={() => submitMutation.mutate()}
                      className="w-full bg-violet-600 hover:bg-violet-700"
                      disabled={submitMutation.isPending || !canSubmit}
                    >
                      {submitMutation.isPending ? 'Submitting...' : 'Submit Evidence'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
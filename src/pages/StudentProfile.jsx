import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, Calendar, Award, FileText, Upload, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function StudentProfile() {
  const [activeTab, setActiveTab] = useState('personal');
  const [formData, setFormData] = useState({
    display_name: '',
    phone: '',
    professional_bio: '',
  });

  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const userData = await base44.auth.me();
      setFormData({
        display_name: userData.display_name || userData.full_name || '',
        phone: userData.phone || '',
        professional_bio: userData.professional_bio || '',
      });
      return userData;
    },
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['my-memberships'],
    queryFn: () => base44.entities.CohortMembership.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  const { data: cohorts = [] } = useQuery({
    queryKey: ['cohorts'],
    queryFn: () => base44.entities.Cohort.list(),
  });

  const { data: certificate } = useQuery({
    queryKey: ['my-certificate'],
    queryFn: () => base44.entities.Certificate.filter({ student_user_id: user?.id }),
    enabled: !!user?.id,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    },
  });

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  const handleCVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.auth.updateMe({ cv_url: file_url });
    queryClient.invalidateQueries({ queryKey: ['current-user'] });
  };

  const handlePortfolioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const currentDocs = user?.portfolio_documents || [];
    await base44.auth.updateMe({ portfolio_documents: [...currentDocs, file_url] });
    queryClient.invalidateQueries({ queryKey: ['current-user'] });
  };

  const handleRemoveCV = async () => {
    await base44.auth.updateMe({ cv_url: null });
    queryClient.invalidateQueries({ queryKey: ['current-user'] });
  };

  const handleRemovePortfolioDoc = async (docUrl) => {
    const currentDocs = user?.portfolio_documents || [];
    await base44.auth.updateMe({ 
      portfolio_documents: currentDocs.filter(d => d !== docUrl) 
    });
    queryClient.invalidateQueries({ queryKey: ['current-user'] });
  };

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.auth.updateMe({ profile_picture: file_url });
    queryClient.invalidateQueries();
  };

  const activeMembership = memberships.find(m => m.status === 'active');
  const activeCohort = cohorts.find(c => c.id === activeMembership?.cohort_id);
  const hasCertificate = certificate && certificate.length > 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-500">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Profile</h1>
          <p className="text-slate-500 mt-1">Welcome back to your learning journey</p>
        </div>

        {/* Profile Header Card */}
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4">
                {user?.profile_picture ? (
                  <img
                    src={user.profile_picture}
                    alt={user.full_name}
                    className="w-32 h-32 rounded-full object-cover border-4 border-violet-100"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white text-4xl font-bold">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                )}
                <label
                  htmlFor="profile-picture-upload"
                  className="absolute bottom-0 right-0 w-10 h-10 bg-violet-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-violet-700 transition-colors shadow-lg"
                >
                  <Upload className="w-5 h-5 text-white" />
                </label>
                <input
                  id="profile-picture-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureUpload}
                  className="hidden"
                />
              </div>
              <h2 className="text-3xl font-bold text-slate-900">{user?.display_name || user?.full_name}</h2>
              <p className="text-slate-500 mt-2">Manage your profile and learning journey</p>
            </div>
          </CardContent>
        </Card>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Overview */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6 space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-5 h-5 text-slate-700" />
                  <h3 className="text-lg font-semibold text-slate-900">Profile Overview</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-slate-500 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">Email</p>
                      <p className="text-sm text-slate-600">{user?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-slate-500 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">Phone</p>
                      <p className="text-sm text-slate-600">{user?.phone || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-slate-500 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">Enrollment Date</p>
                      <p className="text-sm text-slate-600">
                        {activeMembership?.enrollment_date 
                          ? format(new Date(activeMembership.enrollment_date), 'MMM d, yyyy')
                          : 'Not enrolled'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Award className="w-5 h-5 text-slate-500 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">Current Week</p>
                      <p className="text-sm text-slate-600">
                        Week {activeCohort?.current_week || 0} of 12
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Award className="w-5 h-5 text-slate-500 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">Certification Status</p>
                      <Badge className={hasCertificate ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>
                        {hasCertificate ? 'Certified' : 'Not Started'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Profile Settings */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Profile Settings</h3>

                {/* Tabs */}
                <div className="flex gap-6 border-b mb-6">
                  <button
                    className={`pb-2 px-1 text-sm font-medium transition-colors ${
                      activeTab === 'personal'
                        ? 'text-violet-600 border-b-2 border-violet-600'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    onClick={() => setActiveTab('personal')}
                  >
                    Personal Info
                  </button>
                  <button
                    className={`pb-2 px-1 text-sm font-medium transition-colors ${
                      activeTab === 'professional'
                        ? 'text-violet-600 border-b-2 border-violet-600'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    onClick={() => setActiveTab('professional')}
                  >
                    Professional
                  </button>
                  <button
                    className={`pb-2 px-1 text-sm font-medium transition-colors ${
                      activeTab === 'certifications'
                        ? 'text-violet-600 border-b-2 border-violet-600'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    onClick={() => setActiveTab('certifications')}
                  >
                    Certifications
                  </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'personal' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Display Name</Label>
                        <Input
                          value={formData.display_name}
                          onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                          placeholder="Enter your name"
                        />
                        <p className="text-xs text-slate-500">This name will be shown throughout the app.</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="07934001027"
                        />
                      </div>
                    </div>
                    <Button onClick={handleSave} className="bg-violet-600 hover:bg-violet-700">
                      Save Personal Info
                    </Button>
                  </div>
                )}

                {activeTab === 'professional' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Professional Bio</Label>
                      <Textarea
                        value={formData.professional_bio}
                        onChange={(e) => setFormData({ ...formData, professional_bio: e.target.value })}
                        placeholder="Tell us about yourself professionally..."
                        rows={5}
                      />
                    </div>
                    <Button onClick={handleSave} className="bg-violet-600 hover:bg-violet-700">
                      Save Professional Info
                    </Button>
                  </div>
                )}

                {activeTab === 'certifications' && (
                  <div className="space-y-4">
                    <p className="text-slate-600">
                      {hasCertificate 
                        ? 'You have earned your certification! View it in the Certifications page.'
                        : 'Complete your program to earn your certification.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CV & Portfolio Documents */}
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6 space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-slate-700" />
                  <h3 className="text-lg font-semibold text-slate-900">CV & Portfolio Documents</h3>
                </div>

                {/* Your CV */}
                <div>
                  <h4 className="font-medium text-slate-900 mb-3">Your CV</h4>
                  {user?.cv_url ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                      <a href={user.cv_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        View Uploaded CV
                      </a>
                      <div className="flex gap-2">
                        <label htmlFor="cv-replace" className="cursor-pointer">
                          <Button variant="outline" size="sm" asChild>
                            <span>Replace CV</span>
                          </Button>
                        </label>
                        <input
                          id="cv-replace"
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={handleCVUpload}
                        />
                        <Button variant="ghost" size="sm" onClick={handleRemoveCV}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <label htmlFor="cv-upload" className="cursor-pointer">
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-violet-500 transition-colors">
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm text-slate-600">Click to upload your CV</p>
                      </div>
                    </label>
                  )}
                  <input
                    id="cv-upload"
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleCVUpload}
                  />
                </div>

                {/* Portfolio Documents */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-slate-900">Portfolio Documents</h4>
                    <label htmlFor="portfolio-upload" className="cursor-pointer">
                      <Button variant="outline" size="sm" asChild>
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          Add Document
                        </span>
                      </Button>
                    </label>
                    <input
                      id="portfolio-upload"
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={handlePortfolioUpload}
                    />
                  </div>

                  {user?.portfolio_documents && user.portfolio_documents.length > 0 ? (
                    <div className="space-y-2">
                      {user.portfolio_documents.map((doc, index) => (
                        <div key={index} className="bg-slate-50 rounded-lg p-3 flex items-center justify-between">
                          <a href={doc} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Document {index + 1}
                          </a>
                          <Button variant="ghost" size="sm" onClick={() => handleRemovePortfolioDoc(doc)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-slate-500 py-6">No portfolio documents uploaded yet.</p>
                  )}
                </div>

                {/* Document Guidelines */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 mb-2">Document Guidelines</h4>
                  <ul className="text-sm text-slate-700 space-y-1">
                    <li>• Profile pictures should be JPG, PNG, or GIF format, max 5MB</li>
                    <li>• CV should be in PDF format, max 2MB</li>
                    <li>• Portfolio documents can be PDF, DOC, PPT, or image formats</li>
                    <li>• Documents will be reviewed by your tutor for feedback</li>
                    <li>• Updated versions can be uploaded anytime</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Phone, Shield, Upload } from 'lucide-react';

export default function AdminProfile() {
  const [activeTab, setActiveTab] = useState('personal');
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    professional_bio: '',
  });

  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const userData = await base44.auth.me();
      setFormData({
        full_name: userData.full_name || '',
        phone: userData.phone || '',
        professional_bio: userData.professional_bio || '',
      });
      return userData;
    },
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

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.auth.updateMe({ profile_picture: file_url });
    queryClient.invalidateQueries({ queryKey: ['current-user'] });
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };

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
          <p className="text-slate-500 mt-1">Manage your administrator profile</p>
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
                    {user?.full_name?.charAt(0) || 'A'}
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
              <h2 className="text-3xl font-bold text-slate-900">{user?.full_name}</h2>
              <p className="text-slate-500 mt-2">Administrator - Manage your profile settings</p>
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
                  <Shield className="w-5 h-5 text-slate-700" />
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
                    <Shield className="w-5 h-5 text-slate-500 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">Role</p>
                      <p className="text-sm text-slate-600">Administrator</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Profile Settings */}
          <div className="lg:col-span-2">
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
                </div>

                {/* Tab Content */}
                {activeTab === 'personal' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Display Name</Label>
                        <Input
                          value={formData.full_name}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Settings, FileCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default function AdminTemplates() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to Templates Studio for template management
    navigate(createPageUrl('AdminTemplatesStudio'));
  }, [navigate]);


  const [settingsForm, setSettingsForm] = useState({
    kajabi_url: '',
    marketo_url: '',
    whatsapp_community_url: '',
    ai_tools_url: '',
    exit_interview_booking_url: '',
  });

  const [examConfigForm, setExamConfigForm] = useState({
    title: '',
    description: '',
    unlock_week: 8,
    time_limit_minutes: 100,
    pass_correct_required: 65,
    attempts_allowed: 4,
    total_questions: 80,
    questions_per_section: 20,
    cooldown_after_attempt_2_hours: 24,
    cooldown_after_attempt_3_fail_hours: 48,
  });

  const queryClient = useQueryClient();



  const { data: appSettings = [] } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const settings = await base44.entities.AppSettings.list();
      if (settings.length > 0) {
        setSettingsForm(settings[0]);
      }
      return settings;
    },
  });

  const { data: examConfig } = useQuery({
    queryKey: ['exam-config'],
    queryFn: async () => {
      const configs = await base44.entities.ExamConfig.filter({ is_active: true });
      if (configs.length > 0) {
        setExamConfigForm(configs[0]);
        return configs[0];
      }
      return null;
    },
  });



  const saveSettingsMutation = useMutation({
    mutationFn: async (data) => {
      const existing = appSettings[0];
      if (existing) {
        return base44.entities.AppSettings.update(existing.id, data);
      } else {
        return base44.entities.AppSettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
    },
  });

  const saveExamConfigMutation = useMutation({
    mutationFn: async (data) => {
      if (examConfig) {
        return base44.entities.ExamConfig.update(examConfig.id, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-config'] });
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 mt-1">Configure application settings and exam parameters</p>
        </div>

        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              App Settings
            </TabsTrigger>
            <TabsTrigger value="examconfig">
              <FileCheck className="w-4 h-4 mr-2" />
              Exam Config
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <div className="max-w-3xl">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">App Settings</h2>
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="space-y-2">
                  <Label>Kajabi URL</Label>
                  <Input
                    value={settingsForm.kajabi_url}
                    onChange={(e) => setSettingsForm({ ...settingsForm, kajabi_url: e.target.value })}
                    placeholder="https://www.the-growth-academy.co/library"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Marketo URL</Label>
                  <Input
                    value={settingsForm.marketo_url}
                    onChange={(e) => setSettingsForm({ ...settingsForm, marketo_url: e.target.value })}
                    placeholder="https://experience.adobe.com/#/@oadsolutionsltd/"
                  />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp Community URL</Label>
                  <Input
                    value={settingsForm.whatsapp_community_url}
                    onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp_community_url: e.target.value })}
                    placeholder="https://chat.whatsapp.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>AI Tools URL</Label>
                  <Input
                    value={settingsForm.ai_tools_url}
                    onChange={(e) => setSettingsForm({ ...settingsForm, ai_tools_url: e.target.value })}
                    placeholder="https://ai.martech-mastery.com/"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Exit Interview Booking URL</Label>
                  <Input
                    value={settingsForm.exit_interview_booking_url}
                    onChange={(e) => setSettingsForm({ ...settingsForm, exit_interview_booking_url: e.target.value })}
                    placeholder="https://calendly.com/..."
                  />
                </div>
                <Button onClick={() => saveSettingsMutation.mutate(settingsForm)} className="w-full">
                  Save Settings
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="examconfig">
            <div className="max-w-3xl">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Exam Configuration</h2>
              
              {examConfigForm.pass_correct_required === 2 && (
                <Alert className="mb-6 border-amber-500 bg-amber-50">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <AlertDescription className="text-amber-900">
                    <p className="font-bold text-lg">⚠️ TESTING MODE ACTIVE</p>
                    <p className="mt-2">
                      <strong>pass_correct_required</strong> is temporarily set to <strong>2</strong> for testing purposes.
                    </p>
                    <p className="mt-1 text-sm">
                      Remember to revert to <strong>65</strong> after testing is complete!
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={examConfigForm.title}
                      onChange={(e) => setExamConfigForm({ ...examConfigForm, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unlock Week</Label>
                    <Input
                      type="number"
                      value={examConfigForm.unlock_week}
                      onChange={(e) => setExamConfigForm({ ...examConfigForm, unlock_week: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={examConfigForm.description}
                    onChange={(e) => setExamConfigForm({ ...examConfigForm, description: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Total Questions</Label>
                    <Input
                      type="number"
                      value={examConfigForm.total_questions}
                      onChange={(e) => setExamConfigForm({ ...examConfigForm, total_questions: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Questions per Section</Label>
                    <Input
                      type="number"
                      value={examConfigForm.questions_per_section}
                      onChange={(e) => setExamConfigForm({ ...examConfigForm, questions_per_section: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Time Limit (minutes)</Label>
                    <Input
                      type="number"
                      value={examConfigForm.time_limit_minutes}
                      onChange={(e) => setExamConfigForm({ ...examConfigForm, time_limit_minutes: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pass Correct Required</Label>
                    <Input
                      type="number"
                      value={examConfigForm.pass_correct_required}
                      onChange={(e) => setExamConfigForm({ ...examConfigForm, pass_correct_required: parseInt(e.target.value) })}
                      className={examConfigForm.pass_correct_required === 2 ? 'border-amber-500 bg-amber-50' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Attempts Allowed</Label>
                    <Input
                      type="number"
                      value={examConfigForm.attempts_allowed}
                      onChange={(e) => setExamConfigForm({ ...examConfigForm, attempts_allowed: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cooldown After Attempt 2 (hours)</Label>
                    <Input
                      type="number"
                      value={examConfigForm.cooldown_after_attempt_2_hours}
                      onChange={(e) => setExamConfigForm({ ...examConfigForm, cooldown_after_attempt_2_hours: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cooldown After Attempt 3 Fail (hours)</Label>
                    <Input
                      type="number"
                      value={examConfigForm.cooldown_after_attempt_3_fail_hours}
                      onChange={(e) => setExamConfigForm({ ...examConfigForm, cooldown_after_attempt_3_fail_hours: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <Button 
                  onClick={() => saveExamConfigMutation.mutate(examConfigForm)} 
                  className="w-full"
                  disabled={saveExamConfigMutation.isPending}
                >
                  {saveExamConfigMutation.isPending ? 'Saving...' : 'Save Exam Configuration'}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
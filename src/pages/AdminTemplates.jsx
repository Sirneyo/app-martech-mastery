import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, ClipboardList, FolderOpen, Award, Trash2, Edit, Settings, FileCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default function AdminTemplates() {
  const [assignmentDialog, setAssignmentDialog] = useState(false);
  const [projectDialog, setProjectDialog] = useState(false);
  const [portfolioDialog, setPortfolioDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [assignmentForm, setAssignmentForm] = useState({
    key: '',
    title: '',
    description: '',
    week_number: 1,
    tasks: '',
    points: 100,
  });

  const [projectForm, setProjectForm] = useState({
    key: '',
    title: '',
    description: '',
    week_number: 1,
    requirements: '',
    points: 200,
  });

  const [portfolioForm, setPortfolioForm] = useState({
    key: '',
    title: '',
    description: '',
    category: 'assignment',
    unlock_week: 1,
    requirements: '',
  });

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

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignment-templates'],
    queryFn: () => base44.entities.AssignmentTemplate.list('week_number'),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['project-templates'],
    queryFn: () => base44.entities.ProjectTemplate.list('week_number'),
  });

  const { data: portfolioItems = [] } = useQuery({
    queryKey: ['portfolio-templates'],
    queryFn: () => base44.entities.PortfolioItemTemplate.list(),
  });

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

  const createAssignmentMutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        tasks: data.tasks.split('\n').filter(t => t.trim()),
      };
      return editingItem
        ? base44.entities.AssignmentTemplate.update(editingItem.id, payload)
        : base44.entities.AssignmentTemplate.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-templates'] });
      setAssignmentDialog(false);
      setEditingItem(null);
      setAssignmentForm({ title: '', description: '', week_number: 1, tasks: '', points: 100 });
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        requirements: data.requirements.split('\n').filter(r => r.trim()),
      };
      return editingItem
        ? base44.entities.ProjectTemplate.update(editingItem.id, payload)
        : base44.entities.ProjectTemplate.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-templates'] });
      setProjectDialog(false);
      setEditingItem(null);
      setProjectForm({ title: '', description: '', week_number: 1, requirements: '', points: 200 });
    },
  });

  const createPortfolioMutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        requirements: data.requirements.split('\n').filter(r => r.trim()),
      };
      return editingItem
        ? base44.entities.PortfolioItemTemplate.update(editingItem.id, payload)
        : base44.entities.PortfolioItemTemplate.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-templates'] });
      setPortfolioDialog(false);
      setEditingItem(null);
      setPortfolioForm({ key: '', title: '', description: '', category: 'assignment', unlock_week: 1, requirements: '' });
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
          <h1 className="text-3xl font-bold text-slate-900">Template Management</h1>
          <p className="text-slate-500 mt-1">Manage assignments, projects, and portfolio templates</p>
        </div>

        <Tabs defaultValue="assignments" className="space-y-6">
          <TabsList>
            <TabsTrigger value="assignments">
              <ClipboardList className="w-4 h-4 mr-2" />
              Assignments
            </TabsTrigger>
            <TabsTrigger value="projects">
              <FolderOpen className="w-4 h-4 mr-2" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="portfolio">
              <Award className="w-4 h-4 mr-2" />
              Portfolio Items
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              App Settings
            </TabsTrigger>
            <TabsTrigger value="examconfig">
              <FileCheck className="w-4 h-4 mr-2" />
              Exam Config
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assignments">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-900">Assignment Templates</h2>
              <Dialog open={assignmentDialog} onOpenChange={setAssignmentDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-violet-600 hover:bg-violet-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Assignment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingItem ? 'Edit Assignment' : 'Create Assignment Template'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Key (unique identifier)</Label>
                      <Input
                        value={assignmentForm.key}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, key: e.target.value })}
                        placeholder="e.g., week1_assignment"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                          value={assignmentForm.title}
                          onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                          placeholder="Assignment title"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label>Week</Label>
                          <Input
                            type="number"
                            min="1"
                            max="12"
                            value={assignmentForm.week_number}
                            onChange={(e) => setAssignmentForm({ ...assignmentForm, week_number: parseInt(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Points</Label>
                          <Input
                            type="number"
                            value={assignmentForm.points}
                            onChange={(e) => setAssignmentForm({ ...assignmentForm, points: parseInt(e.target.value) })}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={assignmentForm.description}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                        placeholder="Assignment description"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tasks (one per line)</Label>
                      <Textarea
                        value={assignmentForm.tasks}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, tasks: e.target.value })}
                        placeholder="Task 1&#10;Task 2&#10;Task 3"
                        rows={4}
                      />
                    </div>
                    <Button onClick={() => createAssignmentMutation.mutate(assignmentForm)} className="w-full">
                      {editingItem ? 'Update Assignment' : 'Create Assignment'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900">{assignment.title}</h3>
                      <p className="text-xs text-slate-400 font-mono mt-1">{assignment.key}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">Week {assignment.week_number}</Badge>
                        <Badge className="bg-violet-100 text-violet-700">{assignment.points} pts</Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => base44.entities.AssignmentTemplate.delete(assignment.id).then(() => queryClient.invalidateQueries({ queryKey: ['assignment-templates'] }))}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                  <p className="text-sm text-slate-600">{assignment.description}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="projects">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-900">Project Templates</h2>
              <Dialog open={projectDialog} onOpenChange={setProjectDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-violet-600 hover:bg-violet-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Project
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Project Template</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Key (unique identifier)</Label>
                      <Input
                        value={projectForm.key}
                        onChange={(e) => setProjectForm({ ...projectForm, key: e.target.value })}
                        placeholder="e.g., week4_project"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                          value={projectForm.title}
                          onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                          placeholder="Project title"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label>Week</Label>
                          <Input
                            type="number"
                            min="1"
                            max="12"
                            value={projectForm.week_number}
                            onChange={(e) => setProjectForm({ ...projectForm, week_number: parseInt(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Points</Label>
                          <Input
                            type="number"
                            value={projectForm.points}
                            onChange={(e) => setProjectForm({ ...projectForm, points: parseInt(e.target.value) })}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={projectForm.description}
                        onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                        placeholder="Project description"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Requirements (one per line)</Label>
                      <Textarea
                        value={projectForm.requirements}
                        onChange={(e) => setProjectForm({ ...projectForm, requirements: e.target.value })}
                        placeholder="Requirement 1&#10;Requirement 2"
                        rows={4}
                      />
                    </div>
                    <Button onClick={() => createProjectMutation.mutate(projectForm)} className="w-full">
                      Create Project
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project) => (
                <div key={project.id} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900">{project.title}</h3>
                      <p className="text-xs text-slate-400 font-mono mt-1">{project.key}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">Week {project.week_number}</Badge>
                        <Badge className="bg-blue-100 text-blue-700">{project.points} pts</Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => base44.entities.ProjectTemplate.delete(project.id).then(() => queryClient.invalidateQueries({ queryKey: ['project-templates'] }))}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                  <p className="text-sm text-slate-600">{project.description}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="portfolio">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-900">Portfolio Item Templates</h2>
              <Dialog open={portfolioDialog} onOpenChange={setPortfolioDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-violet-600 hover:bg-violet-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Portfolio Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Portfolio Item Template</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Key (unique identifier)</Label>
                      <Input
                        value={portfolioForm.key}
                        onChange={(e) => setPortfolioForm({ ...portfolioForm, key: e.target.value })}
                        placeholder="e.g., approved_cv, marketo_cert"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={portfolioForm.title}
                        onChange={(e) => setPortfolioForm({ ...portfolioForm, title: e.target.value })}
                        placeholder="Portfolio item title"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Input
                          value={portfolioForm.category}
                          onChange={(e) => setPortfolioForm({ ...portfolioForm, category: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Unlock Week</Label>
                        <Input
                          type="number"
                          min="1"
                          max="12"
                          value={portfolioForm.unlock_week}
                          onChange={(e) => setPortfolioForm({ ...portfolioForm, unlock_week: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={portfolioForm.description}
                        onChange={(e) => setPortfolioForm({ ...portfolioForm, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Requirements (one per line)</Label>
                      <Textarea
                        value={portfolioForm.requirements}
                        onChange={(e) => setPortfolioForm({ ...portfolioForm, requirements: e.target.value })}
                        rows={4}
                      />
                    </div>
                    <Button onClick={() => createPortfolioMutation.mutate(portfolioForm)} className="w-full">
                      Create Portfolio Item
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {portfolioItems.map((item) => (
                <div key={item.id} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900">{item.title}</h3>
                      <p className="text-xs text-slate-400 font-mono mt-1">{item.key}</p>
                      <Badge variant="outline" className="mt-2">Week {item.unlock_week}</Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => base44.entities.PortfolioItemTemplate.delete(item.id).then(() => queryClient.invalidateQueries({ queryKey: ['portfolio-templates'] }))}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                  <p className="text-sm text-slate-600">{item.description}</p>
                </div>
              ))}
            </div>
          </TabsContent>

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
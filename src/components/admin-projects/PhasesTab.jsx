import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ChevronDown, ChevronRight, Pencil, Check, X, GripVertical } from 'lucide-react';

const PRIORITY_STYLES = { high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-slate-100 text-slate-600' };
const DELIVERABLE_LABELS = { file: 'File Upload', link: 'Link', text: 'Text', presentation: 'Presentation', spreadsheet: 'Spreadsheet' };

function TaskForm({ projectId, phaseId, allTasks, task, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: task?.title || '',
    brief: task?.brief || '',
    subtasks_json: task?.subtasks_json || '[]',
    deliverable_type: task?.deliverable_type || 'file',
    priority: task?.priority || 'medium',
    due_days_from_start: task?.due_days_from_start || '',
    dependency_task_id: task?.dependency_task_id || '',
    sort_order: task?.sort_order ?? 0,
    reference_files_json: task?.reference_files_json || '[]',
    project_id: projectId,
    phase_id: phaseId,
  });
  const [subtaskInput, setSubtaskInput] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const mutation = useMutation({
    mutationFn: async (data) => task?.id
      ? base44.entities.ProjectTask.update(task.id, data)
      : base44.entities.ProjectTask.create(data),
    onSuccess: onSaved,
  });

  const subtasks = (() => { try { return JSON.parse(form.subtasks_json); } catch { return []; } })();
  const addSubtask = () => {
    if (!subtaskInput.trim()) return;
    set('subtasks_json', JSON.stringify([...subtasks, subtaskInput.trim()]));
    setSubtaskInput('');
  };
  const removeSubtask = (i) => set('subtasks_json', JSON.stringify(subtasks.filter((_, idx) => idx !== i)));

  const otherTasks = allTasks.filter(t => t.id !== task?.id && t.phase_id === phaseId);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 mt-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Task Title *</Label>
          <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Audit existing CRM data" />
        </div>
        <div className="space-y-1">
          <Label>Priority</Label>
          <Select value={form.priority} onValueChange={v => set('priority', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label>Full Brief</Label>
        <Textarea value={form.brief} onChange={e => set('brief', e.target.value)} rows={4} placeholder="Write the task brief as a real work assignment..." />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label>Deliverable Type</Label>
          <Select value={form.deliverable_type} onValueChange={v => set('deliverable_type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(DELIVERABLE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Due (days from enrolment) <span className="text-slate-400 font-normal">– optional</span></Label>
          <Input type="number" value={form.due_days_from_start} onChange={e => set('due_days_from_start', e.target.value === '' ? '' : parseInt(e.target.value))} placeholder="e.g. 14" />
        </div>
        <div className="space-y-1">
          <Label>Depends on Task</Label>
          <Select value={form.dependency_task_id || 'none'} onValueChange={v => set('dependency_task_id', v === 'none' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (unlocked by default)</SelectItem>
              {otherTasks.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Subtasks</Label>
        <div className="flex gap-2">
          <Input value={subtaskInput} onChange={e => setSubtaskInput(e.target.value)} placeholder="Add a subtask..." onKeyDown={e => e.key === 'Enter' && addSubtask()} />
          <Button type="button" variant="outline" onClick={addSubtask}>Add</Button>
        </div>
        {subtasks.length > 0 && (
          <ul className="space-y-1">
            {subtasks.map((s, i) => (
              <li key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-slate-200 text-sm">
                <span className="flex-1">{s}</span>
                <button onClick={() => removeSubtask(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => mutation.mutate(form)} disabled={!form.title || mutation.isPending}>
          {mutation.isPending ? 'Saving...' : task ? 'Save Task' : 'Create Task'}
        </Button>
      </div>
    </div>
  );
}

function PhaseCard({ phase, allTasks, projectId, onDeletePhase, dragHandleProps }) {
  const [expanded, setExpanded] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editingPhase, setEditingPhase] = useState(false);
  const [phaseForm, setPhaseForm] = useState({ title: phase.title, description: phase.description || '', sort_order: phase.sort_order ?? 0 });
  const queryClient = useQueryClient();

  const updatePhaseMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectPhase.update(phase.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
      setEditingPhase(false);
    },
  });

  const tasks = allTasks.filter(t => t.phase_id === phase.id).sort((a, b) => a.sort_order - b.sort_order);

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectTask.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] }),
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
        <div {...dragHandleProps} className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing flex-shrink-0" onClick={e => e.stopPropagation()}>
          <GripVertical className="w-4 h-4" />
        </div>
        <button onClick={() => setExpanded(e => !e)} className="text-slate-400">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        {editingPhase ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              className="flex-1 text-sm font-bold border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-teal-400"
              value={phaseForm.title}
              onChange={e => setPhaseForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Phase title"
              autoFocus
            />
            <input
              className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-300 text-slate-500"
              value={phaseForm.description}
              onChange={e => setPhaseForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Description (optional)"
            />
            <Button size="icon" variant="ghost" onClick={() => updatePhaseMutation.mutate(phaseForm)} disabled={!phaseForm.title || updatePhaseMutation.isPending}>
              <Check className="w-4 h-4 text-green-600" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => { setEditingPhase(false); setPhaseForm({ title: phase.title, description: phase.description || '', sort_order: phase.sort_order ?? 0 }); }}>
              <X className="w-4 h-4 text-slate-400" />
            </Button>
          </div>
        ) : (
          <div className="flex-1">
            <h3 className="font-bold text-slate-900">{phase.title}</h3>
            {phase.description && <p className="text-xs text-slate-400 mt-0.5">{phase.description}</p>}
          </div>
        )}
        {!editingPhase && (
          <>
            <span className="text-xs text-slate-400">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
            <Button variant="ghost" size="icon" onClick={() => setEditingPhase(true)} title="Edit phase">
              <Pencil className="w-4 h-4 text-slate-400" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDeletePhase(phase.id)} title="Delete phase">
              <Trash2 className="w-4 h-4 text-red-400" />
            </Button>
          </>
        )}
      </div>

      {expanded && (
        <div className="p-4 space-y-2">
          {tasks.map(task => (
            <div key={task.id} className="border border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition-colors">
              {editingTask?.id === task.id ? (
                <TaskForm
                  projectId={projectId}
                  phaseId={phase.id}
                  allTasks={allTasks}
                  task={task}
                  onClose={() => setEditingTask(null)}
                  onSaved={() => {
                    queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
                    setEditingTask(null);
                  }}
                />
              ) : (
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-800 text-sm">{task.title}</span>
                      <Badge className={`text-xs ${PRIORITY_STYLES[task.priority]}`}>{task.priority}</Badge>
                      <Badge variant="outline" className="text-xs">{DELIVERABLE_LABELS[task.deliverable_type]}</Badge>
                      {task.dependency_task_id && (
                        <Badge className="text-xs bg-blue-50 text-blue-600">Has dependency</Badge>
                      )}
                    </div>
                    {task.brief && <p className="text-xs text-slate-500 line-clamp-2">{task.brief}</p>}
                    {(() => {
                      try {
                        const subs = JSON.parse(task.subtasks_json || '[]');
                        return subs.length > 0 && <p className="text-xs text-slate-400 mt-1">{subs.length} subtask{subs.length !== 1 ? 's' : ''}</p>;
                      } catch { return null; }
                    })()}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditingTask(task)}><Pencil className="w-3.5 h-3.5 text-slate-400" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm('Delete task?')) deleteTaskMutation.mutate(task.id); }}>
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {showTaskForm && !editingTask && (
            <TaskForm
              projectId={projectId}
              phaseId={phase.id}
              allTasks={allTasks}
              onClose={() => setShowTaskForm(false)}
              onSaved={() => {
                queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
                setShowTaskForm(false);
              }}
            />
          )}

          {!showTaskForm && (
            <Button variant="outline" size="sm" className="w-full gap-1 mt-2" onClick={() => setShowTaskForm(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Task
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function PhasesTab({ project }) {
  const [showPhaseForm, setShowPhaseForm] = useState(false);
  const [phaseForm, setPhaseForm] = useState({ title: '', description: '', sort_order: 0 });
  const queryClient = useQueryClient();


  const { data: phases = [] } = useQuery({
    queryKey: ['project-phases', project.id],
    queryFn: () => base44.entities.ProjectPhase.filter({ project_id: project.id }),
    staleTime: 0,
    gcTime: 0,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['project-tasks', project.id],
    queryFn: () => base44.entities.ProjectTask.filter({ project_id: project.id }),
    staleTime: 0,
    gcTime: 0,
  });

  const createPhaseMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectPhase.create({ ...data, project_id: project.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', project.id] });
      setPhaseForm({ title: '', description: '', sort_order: 0 });
      setShowPhaseForm(false);
    },
  });

  const deletePhaseMutation = useMutation({
    mutationFn: async (id) => {
      // Delete all tasks in this phase first
      const phaseTasks = tasks.filter(t => t.phase_id === id);
      await Promise.all(phaseTasks.map(t => base44.entities.ProjectTask.delete(t.id)));
      return base44.entities.ProjectPhase.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', project.id] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks', project.id] });
    },
  });



  const sortedPhases = [...phases].sort((a, b) => a.sort_order - b.sort_order);

  const reorderPhasesMutation = useMutation({
    mutationFn: async (reordered) => {
      await Promise.all(reordered.map((p, i) => base44.entities.ProjectPhase.update(p.id, { sort_order: i })));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-phases', project.id] }),
  });

  const onDragEnd = (result) => {
    const { destination, source } = result;
    if (!destination || destination.index === source.index) return;
    const reordered = Array.from(sortedPhases);
    const [moved] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, moved);
    reorderPhasesMutation.mutate(reordered);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{sortedPhases.length} phase{sortedPhases.length !== 1 ? 's' : ''} · {tasks.length} task{tasks.length !== 1 ? 's' : ''} total</p>
        <Button onClick={() => setShowPhaseForm(true)} variant="outline" size="sm" className="gap-1">
          <Plus className="w-3.5 h-3.5" /> Add Phase
        </Button>
      </div>

      {showPhaseForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h4 className="font-semibold text-slate-800">New Phase</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Phase Title *</Label>
              <Input value={phaseForm.title} onChange={e => setPhaseForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Phase 1: Audit & Discovery" />
            </div>
            <div className="space-y-1">
              <Label>Sort Order</Label>
              <Input type="number" value={phaseForm.sort_order} onChange={e => setPhaseForm(f => ({ ...f, sort_order: parseInt(e.target.value) }))} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Description (optional)</Label>
            <Input value={phaseForm.description} onChange={e => setPhaseForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief phase description..." />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowPhaseForm(false)}>Cancel</Button>
            <Button onClick={() => createPhaseMutation.mutate(phaseForm)} disabled={!phaseForm.title || createPhaseMutation.isPending}>
              {createPhaseMutation.isPending ? 'Creating...' : 'Create Phase'}
            </Button>
          </div>
        </div>
      )}

      {sortedPhases.length === 0 && !showPhaseForm && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <p className="text-slate-400 mb-3">No phases yet. Add your first phase to get started.</p>
          <Button variant="outline" onClick={() => setShowPhaseForm(true)} className="gap-1"><Plus className="w-4 h-4" /> Add Phase</Button>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="phases">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-4">
              {sortedPhases.map((phase, index) => (
                <Draggable key={phase.id} draggableId={phase.id} index={index}>
                  {(draggable, snapshot) => (
                    <div
                      ref={draggable.innerRef}
                      {...draggable.draggableProps}
                      className={snapshot.isDragging ? 'opacity-90 shadow-2xl' : ''}
                    >
                      <PhaseCard
                        phase={phase}
                        allTasks={tasks}
                        projectId={project.id}
                        dragHandleProps={draggable.dragHandleProps}
                        onDeletePhase={(id) => { if (confirm('Delete this phase and all its tasks?')) deletePhaseMutation.mutate(id); }}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
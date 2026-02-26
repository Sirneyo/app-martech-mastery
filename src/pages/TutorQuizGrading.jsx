import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Trophy, Medal, Award, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

const POSITION_CONFIG = [
  { key: 'first_place_user_id', label: '1st Place', icon: Trophy, color: 'from-yellow-400 to-amber-500', badgeBg: 'bg-yellow-100 text-yellow-800', border: 'border-yellow-300' },
  { key: 'second_place_user_id', label: '2nd Place', icon: Medal, color: 'from-slate-400 to-slate-500', badgeBg: 'bg-slate-100 text-slate-700', border: 'border-slate-300' },
  { key: 'third_place_user_id', label: '3rd Place', icon: Award, color: 'from-orange-400 to-amber-600', badgeBg: 'bg-orange-100 text-orange-700', border: 'border-orange-300' },
];

export default function TutorQuizGrading() {
  const [selectedCohortId, setSelectedCohortId] = useState(null);
  const [quizDate, setQuizDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [quizTitle, setQuizTitle] = useState('');
  const [weekNumber, setWeekNumber] = useState('');
  const [selections, setSelections] = useState({ first_place_user_id: '', second_place_user_id: '', third_place_user_id: '' });
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['tutor-cohort-assignments'],
    queryFn: async () => {
      if (!user?.id) return [];
      return base44.entities.TutorCohortAssignment.filter({ tutor_id: user.id });
    },
    enabled: !!user?.id,
  });

  const { data: cohorts = [] } = useQuery({
    queryKey: ['assigned-cohorts', assignments],
    queryFn: async () => {
      if (assignments.length === 0) return [];
      const cohortIds = assignments.map(a => a.cohort_id);
      const allCohorts = await base44.entities.Cohort.list();
      return allCohorts.filter(c => cohortIds.includes(c.id));
    },
    enabled: assignments.length > 0,
  });

  const { data: studentsData } = useQuery({
    queryKey: ['tutor-students'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getTutorStudents');
      return response.data;
    },
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['cohort-memberships'],
    queryFn: async () => {
      const cohortIds = assignments.map(a => a.cohort_id);
      if (cohortIds.length === 0) return [];
      const allMemberships = await base44.entities.CohortMembership.list();
      return allMemberships.filter(m => cohortIds.includes(m.cohort_id) && m.status === 'active');
    },
    enabled: assignments.length > 0,
  });

  const { data: quizHistory = [] } = useQuery({
    queryKey: ['quiz-history', selectedCohortId],
    queryFn: async () => {
      if (!selectedCohortId) return [];
      return base44.entities.QuizResult.filter({ cohort_id: selectedCohortId });
    },
    enabled: !!selectedCohortId,
  });

  const students = studentsData?.students || [];

  const getStudentsByCohort = (cohortId) => {
    const cohortStudentIds = memberships
      .filter(m => m.cohort_id === cohortId)
      .map(m => m.user_id)
      .filter(Boolean);
    return students.filter(s => cohortStudentIds.includes(s.id));
  };

  const cohortStudents = selectedCohortId ? getStudentsByCohort(selectedCohortId) : [];

  const submitMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.QuizResult.create({
        cohort_id: selectedCohortId,
        quiz_date: quizDate,
        quiz_title: quizTitle || undefined,
        week_number: weekNumber ? parseInt(weekNumber) : undefined,
        first_place_user_id: selections.first_place_user_id,
        second_place_user_id: selections.second_place_user_id || undefined,
        third_place_user_id: selections.third_place_user_id || undefined,
        marked_by: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['quiz-history', selectedCohortId]);
      setSelections({ first_place_user_id: '', second_place_user_id: '', third_place_user_id: '' });
      setQuizTitle('');
      setWeekNumber('');
    },
  });

  const getStudent = (id) => students.find(s => s.id === id);

  const selectedIds = Object.values(selections).filter(Boolean);
  const canSubmit = !!selections.first_place_user_id;

  const availableStudents = (positionKey) => {
    const otherSelections = Object.entries(selections)
      .filter(([k]) => k !== positionKey)
      .map(([, v]) => v)
      .filter(Boolean);
    return cohortStudents.filter(s => !otherSelections.includes(s.id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Quiz Grading</h1>
        <p className="text-slate-500 mt-1">Mark the top 3 positions for each quiz</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cohort Selection */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Select Cohort
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cohorts.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No cohorts assigned</p>
            ) : (
              <div className="space-y-2">
                {cohorts.map((cohort) => (
                  <button
                    key={cohort.id}
                    onClick={() => { setSelectedCohortId(cohort.id); setSelections({ first_place_user_id: '', second_place_user_id: '', third_place_user_id: '' }); }}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      selectedCohortId === cohort.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <p className="font-semibold text-slate-900">{cohort.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-blue-100 text-blue-700 text-xs">{cohort.status}</Badge>
                      <span className="text-xs text-slate-500">Week {cohort.current_week}/12</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quiz Grading Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Grade Quiz
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedCohortId ? (
              <p className="text-sm text-slate-500 text-center py-12">Select a cohort to grade a quiz</p>
            ) : (
              <div className="space-y-5">
                {/* Quiz Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Quiz Date</label>
                    <input
                      type="date"
                      value={quizDate}
                      onChange={(e) => setQuizDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Quiz Title <span className="text-slate-400">(optional)</span></label>
                    <input
                      type="text"
                      value={quizTitle}
                      onChange={(e) => setQuizTitle(e.target.value)}
                      placeholder="e.g. Email Marketing"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Week <span className="text-slate-400">(optional)</span></label>
                    <input
                      type="number"
                      value={weekNumber}
                      onChange={(e) => setWeekNumber(e.target.value)}
                      min={1} max={12}
                      placeholder="1-12"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1 text-sm"
                    />
                  </div>
                </div>

                {/* Position Selectors */}
                <div className="space-y-3">
                  {POSITION_CONFIG.map((pos) => {
                    const Icon = pos.icon;
                    const available = availableStudents(pos.key);
                    const selected = getStudent(selections[pos.key]);
                    return (
                      <div key={pos.key} className={`border-2 rounded-xl p-4 ${selections[pos.key] ? pos.border : 'border-slate-200'}`}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${pos.color} flex items-center justify-center`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <span className="font-semibold text-slate-800">{pos.label}</span>
                          {selected && (
                            <Badge className={`${pos.badgeBg} ml-auto`}>{selected.full_name}</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                          {cohortStudents.length === 0 ? (
                            <p className="text-sm text-slate-400 col-span-2 text-center py-2">No students enrolled</p>
                          ) : (
                            <>
                              <button
                                onClick={() => setSelections(prev => ({ ...prev, [pos.key]: '' }))}
                                className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all text-sm ${
                                  !selections[pos.key]
                                    ? 'border-slate-400 bg-slate-100 font-medium'
                                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-500'
                                }`}
                              >
                                <span className="text-slate-400 italic">— None —</span>
                              </button>
                              {available.map((student) => (
                                <button
                                  key={student.id}
                                  onClick={() => setSelections(prev => ({ ...prev, [pos.key]: student.id }))}
                                  className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                                    selections[pos.key] === student.id
                                      ? `border-2 ${pos.border} bg-white font-semibold`
                                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                    {student.full_name?.charAt(0) || 'S'}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm text-slate-900 truncate">{student.full_name}</p>
                                    <p className="text-xs text-slate-400 truncate">{student.email}</p>
                                  </div>
                                </button>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button
                  onClick={() => submitMutation.mutate()}
                  disabled={!canSubmit || submitMutation.isPending}
                  className="w-full"
                >
                  {submitMutation.isPending ? 'Submitting...' : 'Submit Quiz Results'}
                </Button>
                {submitMutation.isSuccess && (
                  <p className="text-center text-sm text-green-600 font-medium">Quiz results saved!</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quiz History */}
      {selectedCohortId && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Quiz History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {quizHistory.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">No quiz results recorded yet</p>
              ) : (
                <div className="space-y-3">
                  {[...quizHistory].sort((a, b) => new Date(b.quiz_date) - new Date(a.quiz_date)).map((result) => (
                    <div key={result.id} className="border border-slate-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {result.quiz_title || 'Quiz'}
                            {result.week_number && <span className="text-slate-500 font-normal"> — Week {result.week_number}</span>}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">{format(new Date(result.quiz_date), 'EEEE, MMMM d, yyyy')}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {POSITION_CONFIG.map((pos) => {
                          const studentId = result[pos.key];
                          if (!studentId) return null;
                          const student = getStudent(studentId);
                          const Icon = pos.icon;
                          return (
                            <div key={pos.key} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${pos.border} ${pos.badgeBg}`}>
                              <Icon className="w-4 h-4" />
                              <span className="text-sm font-medium">{student?.full_name || 'Unknown'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Trophy, Medal, Award, Calendar, Download, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const POSITION_CONFIG = [
  { key: 'first_place_user_id', label: '1st Place', icon: Trophy, badgeBg: 'bg-yellow-100 text-yellow-800 border-yellow-300', border: 'border-yellow-300' },
  { key: 'second_place_user_id', label: '2nd Place', icon: Medal, badgeBg: 'bg-slate-100 text-slate-700 border-slate-300', border: 'border-slate-300' },
  { key: 'third_place_user_id', label: '3rd Place', icon: Award, badgeBg: 'bg-orange-100 text-orange-700 border-orange-300', border: 'border-orange-300' },
];

export default function AdminQuizResults() {
  const [selectedCohortId, setSelectedCohortId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const { data: cohorts = [] } = useQuery({
    queryKey: ['cohorts'],
    queryFn: () => base44.entities.Cohort.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: quizResults = [] } = useQuery({
    queryKey: ['quiz-results', selectedCohortId],
    queryFn: async () => {
      if (!selectedCohortId) return [];
      return base44.entities.QuizResult.filter({ cohort_id: selectedCohortId });
    },
    enabled: !!selectedCohortId,
  });

  const getUser = (id) => users.find(u => u.id === id);

  const sortedResults = [...quizResults].sort((a, b) => new Date(b.quiz_date) - new Date(a.quiz_date));

  // Leaderboard: count wins per student
  const leaderboard = React.useMemo(() => {
    const counts = {};
    quizResults.forEach(r => {
      if (r.first_place_user_id) counts[r.first_place_user_id] = (counts[r.first_place_user_id] || { first: 0, second: 0, third: 0 });
      if (r.first_place_user_id) counts[r.first_place_user_id].first++;
      if (r.second_place_user_id) {
        counts[r.second_place_user_id] = counts[r.second_place_user_id] || { first: 0, second: 0, third: 0 };
        counts[r.second_place_user_id].second++;
      }
      if (r.third_place_user_id) {
        counts[r.third_place_user_id] = counts[r.third_place_user_id] || { first: 0, second: 0, third: 0 };
        counts[r.third_place_user_id].third++;
      }
    });
    return Object.entries(counts)
      .map(([id, wins]) => ({ id, ...wins, score: wins.first * 3 + wins.second * 2 + wins.third }))
      .sort((a, b) => b.score - a.score);
  }, [quizResults]);

  const handleExportCSV = () => {
    if (!selectedCohortId || quizResults.length === 0) return;
    const cohort = cohorts.find(c => c.id === selectedCohortId);
    const headers = ['Date', 'Quiz Title', 'Week', '1st Place', '2nd Place', '3rd Place'];
    const rows = sortedResults.map(r => [
      r.quiz_date,
      r.quiz_title || '',
      r.week_number || '',
      getUser(r.first_place_user_id)?.full_name || '',
      getUser(r.second_place_user_id)?.full_name || '',
      getUser(r.third_place_user_id)?.full_name || '',
    ]);
    const csv = [headers.join(','), ...rows.map(row => row.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz_results_${cohort?.name}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Quiz Results</h1>
        <p className="text-slate-500 mt-1">View all quiz rankings submitted by tutors</p>
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
              <p className="text-sm text-slate-500 text-center py-4">No cohorts available</p>
            ) : (
              <div className="space-y-2">
                {cohorts.map((cohort) => (
                  <button
                    key={cohort.id}
                    onClick={() => setSelectedCohortId(cohort.id)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      selectedCohortId === cohort.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <p className="font-semibold text-slate-900">{cohort.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-orange-100 text-orange-700 text-xs">{cohort.status}</Badge>
                      <span className="text-xs text-slate-500">Week {cohort.current_week}/12</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Leaderboard */}
          {selectedCohortId && leaderboard.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Overall Quiz Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {leaderboard.map((entry, index) => {
                    const student = getUser(entry.id);
                    return (
                      <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                          index === 0 ? 'bg-yellow-400 text-white' :
                          index === 1 ? 'bg-slate-400 text-white' :
                          index === 2 ? 'bg-orange-400 text-white' :
                          'bg-slate-200 text-slate-700'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 text-sm">{student?.full_name || 'Unknown'}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="flex items-center gap-1 text-yellow-700"><Trophy className="w-3 h-3" />{entry.first}</span>
                          <span className="flex items-center gap-1 text-slate-600"><Medal className="w-3 h-3" />{entry.second}</span>
                          <span className="flex items-center gap-1 text-orange-600"><Award className="w-3 h-3" />{entry.third}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Quiz History
                </CardTitle>
                {selectedCohortId && quizResults.length > 0 && (
                  <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-2">
                    <Download className="w-4 h-4" />
                    Export CSV
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedCohortId ? (
                <p className="text-sm text-slate-500 text-center py-12">Select a cohort to view results</p>
              ) : sortedResults.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-12">No quiz results yet</p>
              ) : (
                <div className="space-y-3">
                  {sortedResults.map((result) => {
                    const isExpanded = expandedId === result.id;
                    const tutor = getUser(result.marked_by);
                    return (
                      <div key={result.id} className="border border-slate-200 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : result.id)}
                          className="w-full p-4 hover:bg-slate-50 transition-colors text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {result.quiz_title || 'Quiz'}
                                {result.week_number && <span className="text-slate-500 font-normal text-sm"> — Week {result.week_number}</span>}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">{format(new Date(result.quiz_date), 'EEEE, MMMM d, yyyy')}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1">
                                {POSITION_CONFIG.map(pos => {
                                  const sid = result[pos.key];
                                  if (!sid) return null;
                                  const Icon = pos.icon;
                                  return <Icon key={pos.key} className="w-4 h-4 text-slate-400" />;
                                })}
                              </div>
                              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-slate-200 p-4 bg-slate-50 space-y-2">
                            {POSITION_CONFIG.map((pos) => {
                              const sid = result[pos.key];
                              if (!sid) return null;
                              const student = getUser(sid);
                              const Icon = pos.icon;
                              return (
                                <div key={pos.key} className={`flex items-center gap-3 p-2.5 rounded-lg border bg-white ${pos.border}`}>
                                  <div className={`w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold`}>
                                    {student?.full_name?.charAt(0) || 'S'}
                                  </div>
                                  <span className="text-sm font-medium text-slate-900">{student?.full_name || 'Unknown'}</span>
                                  <Badge className={`ml-auto text-xs ${pos.badgeBg}`}>
                                    <Icon className="w-3 h-3 mr-1" />
                                    {pos.label}
                                  </Badge>
                                </div>
                              );
                            })}
                            {tutor && (
                              <p className="text-xs text-slate-400 pt-1">Marked by: {tutor.full_name}</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle, XCircle, AlertTriangle, Activity,
  Database, Mail, Shield, Key, Bell, RefreshCw,
  Server, Zap, ChevronDown, ChevronUp, Clock, Cpu
} from 'lucide-react';

const STATUS = {
  pass: {
    badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    icon: CheckCircle,
    iconColor: 'text-emerald-500',
    row: 'border-slate-100 bg-white',
  },
  warn: {
    badge: 'bg-amber-100 text-amber-700 border border-amber-200',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    row: 'border-amber-100 bg-amber-50/40',
  },
  fail: {
    badge: 'bg-red-100 text-red-700 border border-red-200',
    icon: XCircle,
    iconColor: 'text-red-500',
    row: 'border-red-100 bg-red-50/40',
  },
};

const CATEGORIES = {
  database:         { label: 'Database',                  Icon: Database,  color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  email:            { label: 'Email Service (Resend)',     Icon: Mail,      color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
  secrets:          { label: 'Secrets & Environment',     Icon: Key,       color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  security:         { label: 'Login & IP Security',       Icon: Shield,    color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200' },
  data_consistency: { label: 'Data Consistency',          Icon: Activity,  color: 'text-teal-600',   bg: 'bg-teal-50',   border: 'border-teal-200' },
  notifications:    { label: 'Notification System',       Icon: Bell,      color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  automations:      { label: 'Automation Health',         Icon: Cpu,       color: 'text-slate-600',  bg: 'bg-slate-50',  border: 'border-slate-200' },
};

function CheckRow({ check }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS[check.status] || STATUS.pass;
  const Icon = cfg.icon;

  return (
    <div className={`rounded-lg border p-3 ${cfg.row}`}>
      <div className="flex items-start gap-2.5">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.iconColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <p className="text-sm font-medium text-slate-800">{check.name}</p>
            <Badge className={`text-xs shrink-0 ${cfg.badge}`}>{check.status.toUpperCase()}</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{check.message}</p>
          {check.details && (
            <button
              onClick={() => setOpen(!open)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 mt-1.5 transition-colors"
            >
              {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {open ? 'Hide details' : 'Show details'}
            </button>
          )}
          {open && check.details && (
            <div className="mt-2 bg-slate-900 rounded-md p-3 overflow-x-auto">
              <pre className="text-xs font-mono text-emerald-300 whitespace-pre-wrap">
                {JSON.stringify(check.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryCard({ categoryKey, checks }) {
  const cat = CATEGORIES[categoryKey];
  if (!cat || !checks?.length) return null;
  const { Icon, label, color, bg, border } = cat;

  const fails = checks.filter(c => c.status === 'fail').length;
  const warns = checks.filter(c => c.status === 'warn').length;
  const passes = checks.filter(c => c.status === 'pass').length;

  const headerStatus = fails > 0 ? 'fail' : warns > 0 ? 'warn' : 'pass';
  const HeaderIcon = STATUS[headerStatus].icon;

  return (
    <Card className={`border ${border}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
              <Icon className={`w-3.5 h-3.5 ${color}`} />
            </div>
            <span className="font-semibold text-sm text-slate-800">{label}</span>
          </div>
          <div className="flex items-center gap-3">
            {passes > 0 && <span className="text-xs text-emerald-600 font-medium">{passes} pass</span>}
            {warns > 0 && <span className="text-xs text-amber-600 font-medium">{warns} warn</span>}
            {fails > 0 && <span className="text-xs text-red-600 font-medium">{fails} fail</span>}
            <HeaderIcon className={`w-4 h-4 ${STATUS[headerStatus].iconColor}`} />
          </div>
        </div>
        <div className="space-y-2">
          {checks.map((check, i) => <CheckRow key={i} check={check} />)}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SystemCheckPanel() {
  const [results, setResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const runCheck = async () => {
    setIsRunning(true);
    setProgress(0);
    setError(null);

    const ticker = setInterval(() => {
      setProgress(prev => Math.min(prev + 6, 88));
    }, 350);

    const res = await base44.functions.invoke('systemCheck', {});
    clearInterval(ticker);
    setProgress(100);
    setTimeout(() => {
      setResults(res.data);
      setIsRunning(false);
      setProgress(0);
    }, 400);
  };

  const overallStatus = results
    ? results.summary.fail > 0 ? 'fail'
    : results.summary.warn > 0 ? 'warn'
    : 'pass'
    : null;

  const totalChecks = results
    ? (results.summary.pass || 0) + (results.summary.warn || 0) + (results.summary.fail || 0)
    : 0;

  return (
    <div className="space-y-5">
      {/* Control bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center shadow">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">System Health Check</h2>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                {results
                  ? `Last checked ${new Date(results.checked_at).toLocaleString()} · completed in ${results.duration_ms}ms`
                  : 'Not yet checked — run a check to see system status'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {overallStatus && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border ${STATUS[overallStatus].badge}`}>
                {React.createElement(STATUS[overallStatus].icon, { className: 'w-4 h-4' })}
                {overallStatus === 'pass' ? 'All Systems Operational' : overallStatus === 'warn' ? 'Warnings Detected' : 'Issues Found'}
              </div>
            )}
            <Button
              onClick={runCheck}
              disabled={isRunning}
              className="bg-slate-900 hover:bg-slate-700 text-white"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
              {isRunning ? 'Running checks...' : results ? 'Re-run Check' : 'Run System Check'}
            </Button>
          </div>
        </div>

        {isRunning && (
          <div className="mt-4 space-y-1">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-violet-500 to-purple-600 h-1.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-400">Querying entities, checking email service, analysing login events... {progress}%</p>
          </div>
        )}
      </div>

      {/* Summary row */}
      {results && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-emerald-700">{results.summary.pass || 0}</p>
            <p className="text-xs text-emerald-600 font-semibold mt-0.5">PASSED</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-amber-700">{results.summary.warn || 0}</p>
            <p className="text-xs text-amber-600 font-semibold mt-0.5">WARNINGS</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-red-700">{results.summary.fail || 0}</p>
            <p className="text-xs text-red-600 font-semibold mt-0.5">FAILED</p>
          </div>
        </div>
      )}

      {/* Category cards */}
      {results && (
        <div className="space-y-4">
          {Object.keys(CATEGORIES).map(key => (
            results.checks[key]?.length > 0 && (
              <CategoryCard key={key} categoryKey={key} checks={results.checks[key]} />
            )
          ))}
        </div>
      )}

      {/* Empty state */}
      {!results && !isRunning && (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-14 text-center">
          <Server className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-600 font-semibold text-base">No diagnostic data yet</p>
          <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
            Click "Run System Check" to analyse database health, email service, secrets, login & IP security, data consistency, notifications, and automation pipelines.
          </p>
        </div>
      )}
    </div>
  );
}
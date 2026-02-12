import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function MarketoAccess() {
  const [showPassword, setShowPassword] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: membership } = useQuery({
    queryKey: ['my-membership', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return null;
      const memberships = await base44.entities.CohortMembership.filter({ user_id: currentUser.id, status: 'active' });
      return memberships[0] || null;
    },
    enabled: !!currentUser?.id,
  });

  const { data: cohort } = useQuery({
    queryKey: ['cohort', membership?.cohort_id],
    queryFn: async () => {
      if (!membership?.cohort_id) return null;
      const cohorts = await base44.entities.Cohort.filter({ id: membership.cohort_id });
      return cohorts[0] || null;
    },
    enabled: !!membership?.cohort_id,
  });

  const { data: credential } = useQuery({
    queryKey: ['credential', cohort?.credential_id],
    queryFn: async () => {
      if (!cohort?.credential_id) return null;
      const credentials = await base44.entities.Credential.filter({ id: cohort.credential_id });
      return credentials[0] || null;
    },
    enabled: !!cohort?.credential_id,
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const result = await base44.entities.AppSettings.list();
      return result[0] || {};
    },
  });

  const displayEmail = credential?.marketo_email || settings?.marketo_shared_email;
  const displayPassword = credential?.marketo_password || settings?.marketo_shared_password;

  const handleCopy = (value, label) => {
    if (value) {
      navigator.clipboard.writeText(value);
      toast.success(`${label} copied to clipboard`);
    }
  };

  const credentialSource = credential ? 'from your cohort credentials' : 'from shared credentials';

  const handleLaunch = () => {
    window.open('https://experience.adobe.com/#/@oadsolutionsltd/marketo', '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Marketo Access</h1>
          <p className="text-slate-600">Copy the credentials below, then launch Marketo.</p>
          {credential && (
            <p className="text-sm text-blue-600 mt-1">Using credentials: {credential.name}</p>
          )}
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Login Credentials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Email</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-mono text-slate-800">
                  {displayEmail || 'Not configured'}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(displayEmail, 'Email')}
                  disabled={!displayEmail}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Password</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-mono text-slate-800">
                  {displayPassword
                    ? showPassword
                      ? displayPassword
                      : '••••••••••••'
                    : 'Not configured'}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={!displayPassword}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(displayPassword, 'Password')}
                  disabled={!displayPassword}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button
            onClick={handleLaunch}
            size="lg"
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <ExternalLink className="w-5 h-5 mr-2" />
            Launch Marketo
          </Button>
          <p className="text-sm text-slate-500 mt-3">Opens in a new tab.</p>
        </div>
      </div>
    </div>
  );
}
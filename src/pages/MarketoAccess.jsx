import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function MarketoAccess() {
  const [showPassword, setShowPassword] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const result = await base44.entities.AppSettings.list();
      return result[0] || {};
    },
  });

  const handleCopy = (value, label) => {
    if (value) {
      navigator.clipboard.writeText(value);
      toast.success(`${label} copied to clipboard`);
    }
  };

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
                  {settings?.marketo_shared_email || 'Not configured'}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(settings?.marketo_shared_email, 'Email')}
                  disabled={!settings?.marketo_shared_email}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Password</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-mono text-slate-800">
                  {settings?.marketo_shared_password
                    ? showPassword
                      ? settings.marketo_shared_password
                      : '••••••••••••'
                    : 'Not configured'}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={!settings?.marketo_shared_password}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(settings?.marketo_shared_password, 'Password')}
                  disabled={!settings?.marketo_shared_password}
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
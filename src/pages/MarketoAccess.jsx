import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle2, ExternalLink } from 'lucide-react';
import { Label } from '@/components/ui/label';

export default function MarketoAccess() {
  const [copiedField, setCopiedField] = useState(null);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: settings } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      const results = await base44.entities.AppSettings.list();
      return results[0] || { marketo_url: 'https://experience.adobe.com/#/@oadsolutionsltd/' };
    },
  });

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleLaunchMarketo = () => {
    window.open(settings?.marketo_url || 'https://experience.adobe.com/#/@oadsolutionsltd/', '_blank');
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (user?.role !== 'student') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">This page is only accessible to students.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Marketo Access</h1>
          <p className="text-gray-600">
            You now have access to Marketo through your training workspace. Use the credentials below and click the button to launch Marketo in a new tab.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Training Credentials</CardTitle>
            <CardDescription>Use these credentials to log in to Marketo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Email</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-4 py-3 text-sm font-mono text-gray-900">
                  Marketouser+janu@oadsolutions.com
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy('Marketouser+janu@oadsolutions.com', 'email')}
                  className="shrink-0"
                >
                  {copiedField === 'email' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Password</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-4 py-3 text-sm font-mono text-gray-900">
                  JaniMastery2026!
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy('JaniMastery2026!', 'password')}
                  className="shrink-0"
                >
                  {copiedField === 'password' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-sm text-gray-600 mb-6 italic">
          Use these credentials for training only.
        </p>

        <Button
          onClick={handleLaunchMarketo}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          size="lg"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Launch Marketo
        </Button>

        <p className="text-sm text-gray-500 text-center mt-8">
          If you have any issues logging in, contact support inside the platform.
        </p>
      </div>
    </div>
  );
}
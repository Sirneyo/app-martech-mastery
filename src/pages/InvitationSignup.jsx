import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function InvitationSignup() {
  const [invitationId, setInvitationId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('invitation');
    if (id) {
      setInvitationId(id);
    }
  }, []);

  const { data: invitation, isLoading: invitationLoading } = useQuery({
    queryKey: ['invitation', invitationId],
    queryFn: async () => {
      if (!invitationId) return null;
      const invitations = await base44.asServiceRole.entities.Invitation.filter({ id: invitationId });
      return invitations[0] || null;
    },
    enabled: !!invitationId,
  });

  const signupMutation = useMutation({
    mutationFn: async ({ email, password, full_name, app_role }) => {
      // Create user account
      await base44.auth.register(email, password, { full_name, app_role });
      
      // Mark invitation as accepted
      await base44.asServiceRole.entities.Invitation.update(invitationId, {
        status: 'accepted',
        accepted_date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    },
    onError: (error) => {
      setError(error.message || 'Failed to create account');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!invitation) {
      setError('Invalid invitation link');
      return;
    }

    if (invitation.status !== 'pending') {
      setError('This invitation has already been used or expired');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    signupMutation.mutate({
      email: invitation.email,
      password,
      full_name: invitation.full_name,
      app_role: invitation.intended_app_role,
    });
  };

  if (invitationLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Invalid Invitation</CardTitle>
            <CardDescription>This invitation link is not valid.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <CardTitle className="text-green-600">Account Created!</CardTitle>
            </div>
            <CardDescription>Redirecting you to the app...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="text-center mb-4">
            <img 
              src="https://storage.googleapis.com/msgsndr/DVqsiywKVWkfZ4I0mXQ1/media/693348610439b8283bf88818.svg" 
              alt="Martech Mastery" 
              className="h-12 mx-auto"
            />
          </div>
          <CardTitle>Complete Your Registration</CardTitle>
          <CardDescription>
            Welcome, {invitation.full_name}! Set your password to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={invitation.email}
                disabled
                className="bg-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                type="text"
                value={invitation.full_name}
                disabled
                className="bg-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label>Password *</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Confirm Password *</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
              disabled={signupMutation.isPending}
            >
              {signupMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
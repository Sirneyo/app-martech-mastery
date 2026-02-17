import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function AcceptInvite() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  // Extract token from path (e.g., /accept-invite/TOKEN)
  const token = window.location.pathname.split('/').pop();
  
  // Extract email from query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const emailFromUrl = urlParams.get('email');

  const { data: invitation, isLoading, error: loadError } = useQuery({
    queryKey: ['invitation', token],
    queryFn: async () => {
      const invitations = await base44.asServiceRole.entities.Invitation.filter({ id: token });
      if (!invitations || invitations.length === 0) {
        throw new Error('Invalid or expired invitation');
      }
      const inv = invitations[0];
      if (inv.status !== 'pending') {
        throw new Error('This invitation has already been used or has expired');
      }
      return inv;
    },
    enabled: !!token,
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Use the SDK to accept invitation with password
      await base44.auth.acceptInvitation(token, password);
    },
    onSuccess: () => {
      navigate(createPageUrl('RoleRedirect'));
    },
    onError: (err) => {
      setError(err.message || 'Failed to accept invitation. Please try again.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    acceptMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            <p className="text-slate-600">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadError || !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-center">Invalid Invitation</CardTitle>
            <CardDescription className="text-center">
              This invitation link is invalid or has expired. Please contact your administrator.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-slate-100 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-violet-600" />
            </div>
            <CardTitle className="text-center text-2xl">Set Up Your Account</CardTitle>
            <CardDescription className="text-center">
              Create a password to complete your registration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={emailFromUrl || invitation.email}
                  disabled
                  className="bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  minLength={8}
                />
                <p className="text-xs text-slate-500 mt-1">Minimum 8 characters</p>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  minLength={8}
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-violet-600 hover:bg-violet-700"
                disabled={acceptMutation.isPending}
              >
                {acceptMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Setting up account...
                  </>
                ) : (
                  'Complete Setup'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
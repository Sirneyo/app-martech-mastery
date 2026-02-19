import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function AcceptInvitation() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState(null);
  const [userExists, setUserExists] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkInvitation();
  }, []);

  const checkInvitation = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      
      if (!token) {
        setError('Invalid invitation link - missing token');
        setLoading(false);
        return;
      }

      // Validate invitation via backend function
      const response = await base44.functions.invoke('validateInvitation', { token });
      
      if (!response.data.success) {
        setError(response.data.error || 'Invalid invitation');
        setLoading(false);
        return;
      }

      setInvitation(response.data.invitation);
      setFullName(response.data.invitation.full_name || '');
      setUserExists(response.data.userExists);
      setLoading(false);
    } catch (err) {
      console.error('Error checking invitation:', err);
      setError(err.response?.data?.error || 'Failed to load invitation. Please try again.');
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSubmitting(true);

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      // Register user using frontend auth
      await base44.auth.register({
        email: invitation.email,
        password: password
      });

      // Log in the user
      await base44.auth.loginViaEmailPassword(invitation.email, password);

      // Get the logged-in user to retrieve user_id
      const currentUser = await base44.auth.me();

      // Complete invitation process (update role, cohort, etc)
      const response = await base44.functions.invoke('completeInvitation', {
        token,
        user_id: currentUser.id
      });

      if (!response?.data?.success) {
        throw new Error(response?.data?.error || 'Failed to complete registration');
      }

      // Redirect based on role
      const role = response.data.redirect_role || 'student';
      if (role === 'admin') {
        navigate(createPageUrl('AdminDashboard'));
      } else if (role === 'tutor') {
        navigate(createPageUrl('TutorDashboard'));
      } else {
        navigate(createPageUrl('StudentDashboard'));
      }
    } catch (err) {
      console.error('Signup error:', err);
      const errorMessage = err?.data?.error || err?.response?.data?.error || err.message || 'Failed to create account. Please try again.';
      setError(errorMessage);
      setSubmitting(false);
    }
  };

  const handleExistingUserLogin = () => {
    // Redirect to login with email pre-filled
    base44.auth.redirectToLogin(window.location.pathname + window.location.search);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-orange-500" />
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <AlertCircle className="w-6 h-6" />
              <CardTitle>Invalid Invitation</CardTitle>
            </div>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate(createPageUrl('Home'))} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (userExists) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <CheckCircle className="w-6 h-6" />
              <CardTitle>Welcome Back!</CardTitle>
            </div>
            <CardDescription>
              An account with <strong>{invitation.email}</strong> already exists. Please log in to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExistingUserLogin} className="w-full bg-orange-500 hover:bg-orange-600">
              Continue to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Your Account</CardTitle>
          <CardDescription>
            You've been invited to join MarTech Mastery Academy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={invitation?.email || ''}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="At least 8 characters"
                minLength={8}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Re-enter your password"
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
              className="w-full bg-orange-500 hover:bg-orange-600"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account & Continue'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
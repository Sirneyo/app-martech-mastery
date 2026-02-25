import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, Mail } from 'lucide-react';

export default function AcceptInvitation() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState(null);
  const [userExists, setUserExists] = useState(false);
  const [error, setError] = useState('');

  // Block access if no token in URL
  const urlParams = new URLSearchParams(window.location.search);
  if (!urlParams.get('token')) {
    base44.auth.redirectToLogin();
    return null;
  }
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [accountSetupStep, setAccountSetupStep] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 minutes in seconds
  const countdownRef = useRef(null);

  useEffect(() => {
    checkInvitation();
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
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

      // Show account setup / countdown step first
      setAccountSetupStep(true);
      setSubmitting(false);

      // Start countdown
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            // After countdown, move to verification step
            setAccountSetupStep(false);
            setVerificationStep(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Signup error:', err);
      const errorMessage = err?.data?.error || err?.response?.data?.error || err.message || 'Failed to create account. Please try again.';
      setError(errorMessage);
      setSubmitting(false);
    }
  };

  const handleVerification = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      // Verify email with OTP code
      await base44.auth.verifyOtp({
        email: invitation.email,
        otpCode: verificationCode
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
      console.error('Verification error:', err);
      const errorMessage = err?.data?.error || err?.response?.data?.error || err.message || 'Failed to verify email. Please try again.';
      setError(errorMessage);
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setError('');
      await base44.auth.resendOtp(invitation.email);
      // Show success message
      setError('Verification code resent successfully!');
    } catch (err) {
      console.error('Resend error:', err);
      setError('Failed to resend code. Please try again.');
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
            <Button onClick={() => base44.auth.redirectToLogin()} className="w-full">
              Go to Login
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

  if (accountSetupStep) {
    const minutes = Math.floor(countdown / 60);
    const seconds = countdown % 60;
    const progress = ((300 - countdown) / 300) * 100;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              </div>
            </div>
            <CardTitle className="text-xl">Setting Up Your Account</CardTitle>
            <CardDescription className="text-base mt-2">
              We're verifying your invitation and preparing your account. This takes up to 5 minutes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Countdown */}
            <div className="bg-orange-50 rounded-xl p-5">
              <p className="text-sm text-gray-500 mb-1">Estimated time remaining</p>
              <p className="text-4xl font-bold text-orange-500 tabular-nums">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Email notice */}
            <div className="flex items-start gap-3 bg-blue-50 rounded-xl p-4 text-left">
              <Mail className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-700">
                Once your account is ready, we'll send a verification code to <strong>{invitation?.email}</strong>. Please check your inbox.
              </p>
            </div>

            <p className="text-xs text-gray-400">Please do not close this page.</p>

            {/* Skip button for already verified */}
            <Button
              variant="outline"
              className="w-full text-sm"
              onClick={() => {
                clearInterval(countdownRef.current);
                setAccountSetupStep(false);
                setVerificationStep(true);
              }}
            >
              I already received the code →
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verificationStep) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Verify Your Email</CardTitle>
            <CardDescription>
              We've sent a verification code to <strong>{invitation.email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerification} className="space-y-4">
              <div>
                <Label htmlFor="verificationCode">Verification Code</Label>
                <Input
                  id="verificationCode"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  required
                  placeholder="Enter the code from your email"
                />
              </div>

              {error && (
                <Alert variant={error.includes('success') ? 'default' : 'destructive'}>
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
                    Verifying...
                  </>
                ) : (
                  'Verify & Continue'
                )}
              </Button>

              <Button 
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResendCode}
              >
                Resend Code
              </Button>
            </form>
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
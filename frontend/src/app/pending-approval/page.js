"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ClockIcon, 
  EnvelopeIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export default function PendingApproval() {
  const { user, signOut } = useAuth();
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [sessionUser, setSessionUser] = useState(null);

  useEffect(() => {
    const checkApprovalStatus = async () => {
      try {
        // Get session directly instead of relying on AuthContext user
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Session check:', !!session);
        
        if (!session || !session.user) {
          console.log('No session or user, redirecting to login');
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
          setLoading(false);
          return;
        }

        const sessionUser = session.user;
        setSessionUser(sessionUser);
        console.log('Session user:', sessionUser.email, sessionUser.id);

        // Check if user has confirmed their email
        const isEmailConfirmed = sessionUser.email_confirmed_at || 
                                sessionUser.confirmed_at || 
                                sessionUser.email_verified ||
                                (sessionUser.user_metadata && sessionUser.user_metadata.email_verified);
        
        console.log('Email confirmation check:', {
          email_confirmed_at: sessionUser.email_confirmed_at,
          confirmed_at: sessionUser.confirmed_at,
          email_verified: sessionUser.email_verified,
          isEmailConfirmed
        });
        
        if (!isEmailConfirmed) {
          console.log('User email not confirmed yet');
          setApprovalStatus({
            status: 'email_not_confirmed',
            registration_date: sessionUser.created_at,
            email: sessionUser.email
          });
          setLoading(false);
          return;
        }

        console.log('Fetching approval status for user:', sessionUser.id, sessionUser.email);
        const response = await fetch('/api/user/approval-status', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        console.log('API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Approval status data:', data);
          
          // Check both ways a user can be approved
          if (data.approved || (data.approvalStatus && data.approvalStatus.status === 'approved')) {
            // User is already approved, redirect to main app
            console.log('User already approved, redirecting to main app');
            window.location.href = '/';
            return;
          }
          // Enhance the approval status with session user email if not present
          const enhancedApprovalStatus = {
            ...data.approvalStatus,
            email: data.approvalStatus.email || sessionUser.email
          };
          setApprovalStatus(enhancedApprovalStatus);
          console.log('Set approvalStatus to:', enhancedApprovalStatus);
        } else {
          console.error('API response failed with status:', response.status);
          
          // If we get a 401, the session might be stale. Check if user is approved via AuthContext
          if (response.status === 401) {
            console.log('401 error - session might be stale. Checking if user is approved via AuthContext...');
            // Wait a moment for AuthContext to update, then check
            setTimeout(() => {
              const { data: { session } } = supabase.auth.getSession();
              if (session) {
                console.log('User has valid session, checking if approved and redirecting...');
                window.location.href = '/';
                return;
              }
            }, 2000);
          }
          
          let errorData = {};
          try {
            errorData = await response.json();
          } catch (e) {
            console.error('Could not parse error response as JSON:', e);
          }
          console.error('Error checking approval status:', errorData);
          
          // If API fails, show some basic info and allow manual refresh
          const fallbackStatus = {
            status: 'pending',
            registration_date: sessionUser.created_at || new Date().toISOString(),
            email: sessionUser.email
          };
          setApprovalStatus(fallbackStatus);
          console.log('Set fallback approvalStatus to:', fallbackStatus);
        }
      } catch (error) {
        console.error('Error in checkApprovalStatus:', error);
        
        // On error, show some basic info using session data
        const fallbackStatus = {
          status: 'pending',
          registration_date: sessionUser?.created_at || new Date().toISOString(),
          email: sessionUser?.email
        };
        setApprovalStatus(fallbackStatus);
        console.log('Set error fallback approvalStatus to:', fallbackStatus);
      } finally {
        setLoading(false);
      }
    };

    checkApprovalStatus();
  }, [user, sessionUser?.created_at, sessionUser?.email]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleResendConfirmation = async () => {
    setResendingEmail(true);
    try {
      // Get current session to get email
      const { data: { session } } = await supabase.auth.getSession();
      const email = approvalStatus?.email || session?.user?.email || user?.email;
      
      if (!email) {
        alert('Could not determine email address. Please try signing in again.');
        return;
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });
      
      if (error) {
        alert('Error resending confirmation email: ' + error.message);
      } else {
        alert('Confirmation email sent! Please check your inbox.');
      }
    } catch (error) {
      console.error('Error resending email:', error);
      alert('Failed to resend confirmation email. Please try again.');
    } finally {
      setResendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {approvalStatus?.status === 'email_not_confirmed' ? (
            <>
              <div className="mx-auto h-24 w-24 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <EnvelopeIcon className="h-12 w-12 text-blue-600" />
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Check Your Email
              </h1>
              
              <p className="text-gray-600 mb-8">
                We&apos;ve sent a confirmation link to your email address. Please click the link to confirm your account before we can process your approval.
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto h-24 w-24 bg-orange-100 rounded-full flex items-center justify-center mb-6">
                <ClockIcon className="h-12 w-12 text-orange-600" />
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Account Pending Approval
              </h1>
              
              <p className="text-gray-600 mb-8">
                Your account has been created successfully and is currently waiting for admin approval.
              </p>
            </>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center">
            <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">Email</p>
              <p className="text-sm text-gray-600">{sessionUser?.email || user?.email || 'Loading...'}</p>
            </div>
          </div>

          {approvalStatus && (
            <>
              <div className="flex items-center">
                <ClockIcon className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Registration Date</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(approvalStatus.registration_date)}
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                {approvalStatus.status === 'pending' ? (
                  <ClockIcon className="h-5 w-5 text-orange-500 mr-3" />
                ) : approvalStatus.status === 'approved' ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3" />
                ) : (
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-3" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">Status</p>
                  <p className={`text-sm font-medium ${
                    approvalStatus.status === 'pending' ? 'text-orange-600' :
                    approvalStatus.status === 'approved' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {approvalStatus.status.charAt(0).toUpperCase() + approvalStatus.status.slice(1)}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {approvalStatus?.status === 'email_not_confirmed' ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <EnvelopeIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Email Confirmation Required</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Check your email inbox (including spam/junk folder)</li>
                    <li>Click the confirmation link in the email we sent</li>
                    <li>Return to this page after confirming your email</li>
                    <li>Once confirmed, we&apos;ll process your admin approval request</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">What happens next?</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>If you haven&apos;t confirmed your email yet, please check your inbox and click the confirmation link</li>
                    <li>An administrator will review your registration request</li>
                    <li>You&apos;ll receive an email notification once your account is approved</li>
                    <li>After approval, you can log in and start using SearchWizard</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {approvalStatus?.status === 'denied' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Registration Denied</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    Unfortunately, your registration request has been denied. 
                    If you believe this is an error, please contact support.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col space-y-3">
          
          {/* Only show resend button if user is not approved yet */}
          {(!approvalStatus || approvalStatus.status === 'pending' || approvalStatus.status === 'denied' || approvalStatus.status === 'email_not_confirmed') && (
            <button
              onClick={handleResendConfirmation}
              disabled={resendingEmail}
              className="w-full flex justify-center py-2 px-4 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendingEmail ? 'Resending...' : 'Resend Confirmation Email'}
            </button>
          )}
          
          <button
            onClick={async () => {
              // Force check if user is approved and redirect
              try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                  // Get fresh user info
                  const { data: userInfo } = await supabase.rpc('get_user_status_for_auth', { 
                    user_id_param: session.user.id 
                  });
                  
                  if (userInfo && userInfo.is_approved) {
                    console.log('User is approved! Redirecting to main app...');
                    window.location.href = '/';
                    return;
                  }
                }
              } catch (error) {
                console.error('Error checking user status:', error);
              }
              
              // If not approved or error, just reload
              window.location.reload();
            }}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Check Status Again
          </button>
          
          <button
            onClick={signOut}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Sign Out
          </button>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Need help? Contact us at{' '}
            <a href="mailto:support@searchwizard.com" className="text-purple-600 hover:text-purple-500">
              support@searchwizard.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
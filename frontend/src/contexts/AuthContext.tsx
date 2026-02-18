"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { authService, onAuthStateChange } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { isFeatureEnabled } from '../config/features';
import { useEnhancedErrorHandler } from './ToastContext';

export type UserRole = 'admin' | 'user' | null;

export interface UserStatus {
  role: UserRole;
  isApproved: boolean;
  isPending: boolean;
}

interface AuthContextType {
  user: User | null;
  userRole: UserRole;
  isAdmin: boolean;
  isApproved: boolean;
  isPending: boolean;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { handleError, handleSuccess, handleWarning } = useEnhancedErrorHandler();

  // Function to check user role and approval status
  const checkUserRoleAndStatus = async (userId: string): Promise<UserStatus> => {
    // If admin approval system is not enabled, allow all users
    if (!isFeatureEnabled('adminApprovalSystem')) {
      return {
        role: 'user',
        isApproved: true,
        isPending: false,
      };
    }

    try {
      console.log('Checking user status for:', userId);
      
      // Try using the database function for user status first
      const { data: userStatus, error: statusError } = await supabase
        .rpc('get_user_status_for_auth', { user_id_param: userId });
      
      console.log('RPC result:', { userStatus, statusError });
      
      if (!statusError && userStatus) {
        const result = {
          role: userStatus.role === 'none' ? null : userStatus.role,
          isApproved: userStatus.is_approved || false,
          isPending: userStatus.is_pending || false,
        };
        console.log('Using RPC result:', result);
        return result;
      }

      // Fallback: Check user_roles table directly
      console.log('Fallback: checking user_roles table');
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role, is_approved')
        .eq('user_id', userId)
        .single();

      console.log('User roles query result:', { roleData, roleError });

      if (roleError) {
        if (roleError.code === 'PGRST116') {
          // No role found - for now, let's auto-approve new users
          console.log('No role found, auto-approving user');
          
          // Try to create a user role entry
          const { error: insertError } = await supabase
            .from('user_roles')
            .insert([
              {
                user_id: userId,
                role: 'user',
                is_approved: true
              }
            ]);

          if (insertError) {
            console.error('Failed to create user role:', insertError);
          }

          return {
            role: 'user',
            isApproved: true,
            isPending: false,
          };
        }
        throw roleError;
      }

      const result = {
        role: roleData?.role || 'user',
        isApproved: roleData?.is_approved || false,
        isPending: false,
      };
      console.log('Using user_roles result:', result);
      return result;

    } catch (error) {
      console.error('Error checking user status:', error);
      handleError(error as Error, 'check user status');
      
      // Return permissive defaults to avoid blocking users
      return {
        role: 'user',
        isApproved: true,
        isPending: false,
      };
    }
  };

  // Update user status in state
  const updateUserStatus = (status: UserStatus) => {
    setUserRole(status.role);
    setIsAdmin(status.role === 'admin');
    setIsApproved(status.isApproved);
    setIsPending(status.isPending);
  };

  // Refresh user status
  const refreshUserStatus = async () => {
    if (!user?.id) return;

    try {
      const status = await checkUserRoleAndStatus(user.id);
      updateUserStatus(status);
    } catch (error) {
      handleError(error as Error, 'refresh user status');
    }
  };

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      console.log('Starting sign in process for:', email);
      setLoading(true);
      
      const result = await authService.signIn(email, password);
      console.log('Auth service result:', result);
      
      const signedInUser = result.data?.user;
      const error = result.error;
      
      if (error) {
        console.error('Auth service error:', error);
        throw error;
      }
      if (!signedInUser) {
        console.error('No user returned from auth service');
        throw new Error('No user returned from sign in');
      }

      console.log('Signed in user:', signedInUser.id);
      setUser(signedInUser);

      const status = await checkUserRoleAndStatus(signedInUser.id);
      console.log('User status result:', status);
      updateUserStatus(status);

      if (!status.isApproved && isFeatureEnabled('adminApprovalSystem')) {
        console.log('User not approved, showing warning');
        if (status.isPending) {
          handleWarning('Account Pending', 'Your account is awaiting admin approval.');
        } else {
          handleWarning('Account Not Approved', 'Please contact an administrator for access.');
        }
      } else {
        console.log('User approved, redirecting to home page');
        handleSuccess('Successfully signed in');
        router.push('/');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      handleError(error as Error, 'sign in');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign up function
  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      const result = await authService.signUp(email, password);
      
      if (result.error) throw result.error;

      if (isFeatureEnabled('adminApprovalSystem')) {
        handleSuccess(
          'Registration Submitted',
          'Please check your email and wait for admin approval.'
        );
      } else {
        handleSuccess('Account Created', 'Please check your email to verify your account.');
      }
      
      router.push('/auth/signin');
    } catch (error) {
      handleError(error as Error, 'sign up');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      setLoading(true);
      await authService.signOut();
      
      // Reset all state
      setUser(null);
      setUserRole(null);
      setIsAdmin(false);
      setIsApproved(false);
      setIsPending(false);
      
      handleSuccess('Successfully signed out');
      router.push('/auth/signin');
    } catch (error) {
      handleError(error as Error, 'sign out');
    } finally {
      setLoading(false);
    }
  };

  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    const initId = Math.random().toString(36).substring(7);
    console.log(`🔄 AUTH-${initId} Initializing auth context`);

    const initializeAuth = async () => {
      try {
        setLoading(true);
        
        // Get initial session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log(`✅ AUTH-${initId} Session check:`, { session: !!session, sessionError });
        
        if (sessionError) {
          console.error('Session initialization error:', sessionError);
        }
        
        if (session?.user && mounted) {
          console.log('Found existing session for user:', session.user.id);
          setUser(session.user);
          const status = await checkUserRoleAndStatus(session.user.id);
          if (mounted) {
            updateUserStatus(status);
          }
        } else {
          console.log('No existing session found');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          handleError(error as Error, 'initialize authentication');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const unsubscribe = onAuthStateChange(async (_event: any, session: any) => {
      if (!mounted) return;

      try {
        if (session?.user) {
          setUser(session.user);
          const status = await checkUserRoleAndStatus(session.user.id);
          updateUserStatus(status);
        } else {
          setUser(null);
          setUserRole(null);
          setIsAdmin(false);
          setIsApproved(false);
          setIsPending(false);
        }
      } catch (error) {
        handleError(error as Error, 'handle auth state change');
      } finally {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe?.subscription?.unsubscribe?.();
    };
  }, [handleError]);

  const value: AuthContextType = {
    user,
    userRole,
    isAdmin,
    isApproved,
    isPending,
    loading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    refreshUserStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
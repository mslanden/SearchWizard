import { supabase } from './supabase';

// Authentication service for handling user registration, login, and password reset
export const authService = {
  // Register a new user
  async signUp(email, password) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {

        return { success: false, error };
      }

      return { success: true, data };
    } catch (err) {

      return { success: false, error: err };
    }
  },

  // Sign in an existing user
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {

        return { success: false, error };
      }

      return { success: true, data };
    } catch (err) {

      return { success: false, error: err };
    }
  },

  // Sign out the current user
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {

        return { success: false, error };
      }

      return { success: true };
    } catch (err) {

      return { success: false, error: err };
    }
  },

  // Send a password reset email
  async resetPassword(email) {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {

        return { success: false, error };
      }

      return { success: true, data };
    } catch (err) {

      return { success: false, error: err };
    }
  },

  // Update user's password (after reset)
  async updatePassword(newPassword) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {

        return { success: false, error };
      }

      return { success: true, data };
    } catch (err) {

      return { success: false, error: err };
    }
  },

  // Get the current logged in user
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {

        return null;
      }

      return user;
    } catch (err) {

      return null;
    }
  },

  // Get the current session
  async getSession() {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {

        return null;
      }

      return data.session;
    } catch (err) {

      return null;
    }
  }
};

// Context helper for React components
export const onAuthStateChange = (callback) => {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return data;
};

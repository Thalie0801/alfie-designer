import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useStripeConnect() {
  const [loading, setLoading] = useState(false);

  const createConnectAccount = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke('create-connect-account', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      return data;
    } catch (error: any) {
      console.error('Error creating Connect account:', error);
      toast.error('Erreur lors de la création du compte: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createOnboardingLink = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke('create-connect-onboarding-link', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Error creating onboarding link:', error);
      toast.error('Erreur lors de la création du lien: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const createDashboardLink = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke('create-connect-dashboard-link', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error('Error creating dashboard link:', error);
      toast.error('Erreur lors de l\'accès au dashboard: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const syncAccountStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke('sync-connect-account-status', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      return data;
    } catch (error: any) {
      console.error('Error syncing account status:', error);
      throw error;
    }
  };

  return {
    createConnectAccount,
    createOnboardingLink,
    createDashboardLink,
    syncAccountStatus,
    loading,
  };
}

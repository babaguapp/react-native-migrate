import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from './useAuth';

interface PhoneVerificationState {
  isVerified: boolean;
  isLoading: boolean;
  phoneNumber: string | null;
  needsVerification: boolean;
  refetch: () => Promise<void>;
}

export function usePhoneVerification(): PhoneVerificationState {
  const { user } = useAuth();
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [hasParticipated, setHasParticipated] = useState(false);

  const fetchVerificationStatus = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Check profile for phone verification
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('phone_verified, phone_number')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setIsLoading(false);
        return;
      }

      setIsVerified(profile?.phone_verified || false);
      setPhoneNumber(profile?.phone_number || null);

      // Check if user has created any meetings or joined any
      if (!profile?.phone_verified) {
        const [meetingsRes, participantsRes] = await Promise.all([
          supabase
            .from('meetings')
            .select('id')
            .eq('creator_id', user.id)
            .limit(1),
          supabase
            .from('meeting_participants')
            .select('id')
            .eq('user_id', user.id)
            .limit(1),
        ]);

        const hasMeetings = (meetingsRes.data?.length || 0) > 0;
        const hasJoined = (participantsRes.data?.length || 0) > 0;
        setHasParticipated(hasMeetings || hasJoined);
      } else {
        setHasParticipated(true);
      }
    } catch (error) {
      console.error('Error checking phone verification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVerificationStatus();
  }, [user]);

  // User needs verification if:
  // - They are NOT verified
  // - They have NOT previously participated (created or joined a meeting)
  // Meaning: if they already have meetings, they don't need to verify (existing users)
  const needsVerification = !isVerified && !hasParticipated;

  return {
    isVerified,
    isLoading,
    phoneNumber,
    needsVerification,
    refetch: fetchVerificationStatus,
  };
}

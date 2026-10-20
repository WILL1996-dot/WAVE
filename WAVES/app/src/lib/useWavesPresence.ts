import { AppState } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';

const PRESENCE_TOPIC = 'waves-online-users';

type PresenceMeta = {
  user_id?: string;
  show_online_status?: boolean;
};

type PresenceChannel = {
  state?: string;
  track: (payload: Record<string, unknown>) => Promise<unknown>;
  untrack: () => Promise<unknown>;
  presenceState: () => Record<string, PresenceMeta[]>;
  on: (...args: any[]) => PresenceChannel;
  subscribe: (callback: (status: string, error?: Error) => void) => PresenceChannel;
};

/**
 * Best-effort online presence for WAVES. A user only publishes presence when
 * profiles.show_online_status is enabled. Private-channel RLS policies are
 * required (see waves_online_presence.sql).
 */
export function useWavesPresence() {
  const [onlineUserIds, setOnlineUserIds] = useState<ReadonlySet<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [ownStatusVisible, setOwnStatusVisibleState] = useState(false);
  const [ownUserId, setOwnUserId] = useState<string | null>(null);

  const channelRef = useRef<PresenceChannel | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const visibilityRef = useRef(false);
  const subscribedRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  const publishOrWithdraw = useCallback(async () => {
    const channel = channelRef.current;
    const userId = currentUserIdRef.current;
    if (!channel || !subscribedRef.current || !userId) return;

    if (visibilityRef.current && appStateRef.current === 'active') {
      await channel.track({
        user_id: userId,
        show_online_status: true,
        online_at: new Date().toISOString(),
      });
    } else {
      await channel.untrack();
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let channel: PresenceChannel | null = null;
    let appStateSubscription: { remove: () => void } | null = null;

    const refreshPresence = () => {
      if (!channel) return;
      const state = channel.presenceState();
      const next = new Set<string>();

      for (const [presenceKey, metas] of Object.entries(state)) {
        // Count a user only when their payload explicitly opted in to presence.
        if ((metas ?? []).some(meta =>
          meta?.show_online_status === true &&
          (!meta.user_id || meta.user_id === presenceKey)
        )) {
          next.add(presenceKey);
        }
      }
      if (!cancelled) setOnlineUserIds(next);
    };

    const start = async () => {
      if (!supabase) {
        if (!cancelled) setReady(true);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const user = authData.user;
      if (!user) {
        if (!cancelled) {
          setOwnUserId(null);
          setOwnStatusVisibleState(false);
          setReady(true);
        }
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('show_online_status, profile_visibility')
        .eq('id', user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (cancelled) return;

      const shouldShow = profile?.show_online_status === true && profile?.profile_visibility === 'public';
      currentUserIdRef.current = user.id;
      visibilityRef.current = shouldShow;
      setOwnUserId(user.id);
      setOwnStatusVisibleState(shouldShow);

      channel = supabase.channel(PRESENCE_TOPIC, {
        config: {
          private: true,
          presence: { key: user.id },
        },
      }) as unknown as PresenceChannel;
      channelRef.current = channel;

      channel.on('presence', { event: 'sync' }, refreshPresence);
      channel.on('presence', { event: 'join' }, refreshPresence);
      channel.on('presence', { event: 'leave' }, refreshPresence);

      appStateSubscription = AppState.addEventListener('change', nextState => {
        appStateRef.current = nextState;
        void publishOrWithdraw().catch(() => undefined);
      });

      channel.subscribe(async status => {
        if (cancelled) return;
        if (status === 'SUBSCRIBED') {
          subscribedRef.current = true;
          setReady(true);
          try {
            await publishOrWithdraw();
            refreshPresence();
          } catch {
            // If Realtime is unavailable, discovery should still work; status is best-effort.
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          subscribedRef.current = false;
          setReady(false);
          setOnlineUserIds(new Set());
        }
      });
    };

    void start().catch(() => {
      if (!cancelled) {
        setReady(false);
        setOnlineUserIds(new Set());
      }
    });

    return () => {
      cancelled = true;
      appStateSubscription?.remove();
      subscribedRef.current = false;
      channelRef.current = null;
      currentUserIdRef.current = null;
      visibilityRef.current = false;
      if (channel && supabase) {
        void channel.untrack().catch(() => undefined);
        void supabase.removeChannel(channel as never);
      }
    };
  }, [publishOrWithdraw]);

  const setOwnStatusVisible = useCallback(async (visible: boolean) => {
    if (!supabase) {
      visibilityRef.current = visible;
      setOwnStatusVisibleState(visible);
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    const user = authData.user;
    if (!user) throw new Error('Please sign in again to change online visibility.');

    const { data: profile, error: profileReadError } = await supabase
      .from('profiles')
      .select('show_online_status, profile_visibility')
      .eq('id', user.id)
      .maybeSingle();
    if (profileReadError) throw profileReadError;
    const previousValue = profile?.show_online_status === true;
    if (visible && profile?.profile_visibility !== 'public') {
      throw new Error('Online status can only be shown while your profile visibility is Public. Your private profile remains hidden.');
    }

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({ show_online_status: visible })
      .eq('id', user.id);
    if (profileUpdateError) throw profileUpdateError;

    // Keep the private account preference aligned with the profile's public indicator.
    const { error: privateUpdateError } = await supabase
      .from('private_account_data')
      .update({ online_status_visible: visible })
      .eq('user_id', user.id);
    if (privateUpdateError) {
      await supabase.from('profiles').update({ show_online_status: previousValue }).eq('id', user.id);
      throw privateUpdateError;
    }

    visibilityRef.current = visible;
    setOwnStatusVisibleState(visible);
    await publishOrWithdraw();
  }, [publishOrWithdraw]);

  return {
    onlineUserIds,
    ready,
    ownStatusVisible,
    ownUserId,
    setOwnStatusVisible,
  };
}

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useLabStore } from '@/store/useLabStore';
import { useCollabStore } from '@/store/useCollabStore';
import { DeltaUpdate, UserPresence } from '@/types';
import { RealtimeChannel } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

export function useCollaboration(configId: string | null) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const clientIdRef = useRef<string>(uuidv4());
  const isApplyingRemoteChange = useRef(false);

  const { setConnected, setOnlineUsers, setClientId, setConfigId } =
    useCollabStore();
  const labStore = useLabStore();

  const getClientId = useCallback(() => clientIdRef.current, []);

  useEffect(() => {
    setClientId(getClientId());
  }, [setClientId, getClientId]);

  useEffect(() => {
    if (!configId) return;
    setConfigId(configId);

    const channel = supabase.channel(`collab:${configId}`, {
      config: {
        broadcast: { self: false, ack: true },
        presence: { key: getClientId() },
      },
    });

    // Handle incoming deltas
    channel.on('broadcast', { event: 'config_delta' }, ({ payload }) => {
      const delta = payload as DeltaUpdate;
      if (delta.clientId === getClientId()) return;

      console.log('Applying remote delta:', delta);
      isApplyingRemoteChange.current = true;

      // Update LabStore with changes
      useLabStore.setState((state) => ({
        ...state,
        ...delta.changes,
      }));

      isApplyingRemoteChange.current = false;
    });

    // Handle presence
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users: UserPresence[] = Object.values(state).flat() as any[];
      setOnlineUsers(users);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setConnected(true);
        // Track presence
        await channel.track({
          userId: getClientId(), // For now use clientId as userId if not logged in
          displayName: `User ${getClientId().slice(0, 4)}`,
          lastActive: Date.now(),
        });
      } else {
        setConnected(false);
      }
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      setConnected(false);
    };
  }, [configId, getClientId, setConnected, setOnlineUsers, setConfigId]);

  // Sync local changes to remote
  useEffect(() => {
    if (!configId || !channelRef.current) return;

    const unsubscribe = useLabStore.subscribe((state, prevState) => {
      if (isApplyingRemoteChange.current) return;

      // Find what changed
      const changes: Record<string, unknown> = {};
      let hasChanges = false;

      for (const key in state) {
        const k = key as keyof typeof state;
        // Skip functions and strictly equal values
        if (typeof state[k] === 'function') continue;
        if (state[k] === prevState[k]) continue;

        // Handle deep equality for objects (like grainOffset) if needed
        if (
          typeof state[k] === 'object' &&
          JSON.stringify(state[k]) === JSON.stringify(prevState[k])
        )
          continue;

        changes[key] = state[k];
        hasChanges = true;
      }

      if (hasChanges) {
        console.log('Broadcasting local changes:', changes);
        channelRef.current?.send({
          type: 'broadcast',
          event: 'config_delta',
          payload: {
            configId,
            timestamp: Date.now(),
            clientId: getClientId(),
            changes,
          },
        });
      }
    });

    return unsubscribe;
  }, [configId, getClientId]);

  const updatePresence = useCallback(
    async (updates: Partial<UserPresence>) => {
      if (channelRef.current) {
        await channelRef.current.track({
          userId: getClientId(),
          displayName: `User ${getClientId().slice(0, 4)}`,
          lastActive: Date.now(),
          ...updates,
        });
      }
    },
    [getClientId]
  );

  return { updatePresence };
}

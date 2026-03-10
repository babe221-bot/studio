import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { UserPresence, DeltaUpdate } from '@/types';
import { LabState } from './useLabStore';

interface CollabState {
  // Connection state
  isConnected: boolean;
  onlineUsers: UserPresence[];
  clientId: string | null;
  configId: string | null;

  // Actions
  setConnected: (connected: boolean) => void;
  setOnlineUsers: (users: UserPresence[]) => void;
  setClientId: (id: string) => void;
  setConfigId: (id: string) => void;

  // Real-time update application
  applyRemoteDelta: (delta: DeltaUpdate) => void;
}

export const useCollabStore = create<CollabState>()(
  subscribeWithSelector((set) => ({
    isConnected: false,
    onlineUsers: [],
    clientId: null,
    configId: null,

    setConnected: (isConnected) => set({ isConnected }),
    setOnlineUsers: (onlineUsers) => set({ onlineUsers }),
    setClientId: (clientId) => set({ clientId }),
    setConfigId: (configId) => set({ configId }),

    applyRemoteDelta: (delta) => {
      // This will be used to update the LabStore when a remote change is received
      // The logic for which store to update will be handled in the hook
      console.log('Remote delta received:', delta);
    },
  }))
);

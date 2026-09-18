import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface CollaboratorPresence {
  clientId: string;
  userId?: string;
  userName: string;
  avatarUrl?: string;
  color: string;
  joinedAt: string;
  activeStopId?: string | null;
}

const COLLABORATOR_COLORS = [
  '#f43f5e',
  '#06b6d4',
  '#10b981',
  '#a855f7',
  '#f59e0b',
  '#3b82f6',
  '#ec4899',
];

function getRandomColor(): string {
  return COLLABORATOR_COLORS[Math.floor(Math.random() * COLLABORATOR_COLORS.length)];
}

interface RealtimeRoomState {
  activeRoomId: string | null;
  collaborators: CollaboratorPresence[];
  isConnected: boolean;
  hasRemoteChanges: boolean;
  lastRemoteSavedAt: string | null;
  myClientId: string;

  joinRoom: (
    projectId: string,
    userInfo: { userId?: string; name?: string; avatarUrl?: string }
  ) => void;
  leaveRoom: () => void;
  broadcastStopFocus: (stopId: string) => void;
  broadcastTimelineScrub: (time: number) => void;
  clearRemoteChangesFlag: () => void;
}

let activeChannel: RealtimeChannel | null = null;
const clientGeneratedId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `usr_${Math.random().toString(36).substring(2, 8)}`;
const clientColor = getRandomColor();

export const useRealtimeRoomStore = create<RealtimeRoomState>((set, get) => ({
  activeRoomId: null,
  collaborators: [],
  isConnected: false,
  hasRemoteChanges: false,
  lastRemoteSavedAt: null,
  myClientId: clientGeneratedId,

  joinRoom: (projectId, userInfo) => {
    if (get().activeRoomId === projectId && activeChannel) {
      return;
    }

    if (activeChannel) {
      try {
        supabase.removeChannel(activeChannel);
      } catch {}
      activeChannel = null;
    }

    if (!projectId || !isSupabaseConfigured()) {
      set({
        activeRoomId: projectId,
        collaborators: [
          {
            clientId: clientGeneratedId,
            userId: userInfo.userId,
            userName: userInfo.name || 'Tú (Modo Local)',
            avatarUrl: userInfo.avatarUrl,
            color: clientColor,
            joinedAt: new Date().toISOString(),
          },
        ],
        isConnected: false,
      });
      return;
    }

    const channelName = `project-collab:${projectId}`;
    const myPresencePayload: CollaboratorPresence = {
      clientId: clientGeneratedId,
      userId: userInfo.userId,
      userName: userInfo.name || 'Viajero Anónimo',
      avatarUrl: userInfo.avatarUrl,
      color: clientColor,
      joinedAt: new Date().toISOString(),
    };

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: clientGeneratedId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const usersList: CollaboratorPresence[] = [];

        Object.values(state).forEach((presences: any) => {
          if (Array.isArray(presences)) {
            presences.forEach(p => {
              if (p.clientId) {
                usersList.push(p as CollaboratorPresence);
              }
            });
          }
        });

        if (!usersList.some(u => u.clientId === clientGeneratedId)) {
          usersList.unshift(myPresencePayload);
        }

        set({ collaborators: usersList, isConnected: true });
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        set(curr => {
          const joinedList = (newPresences as any[]).filter(p => p.clientId);
          const merged = [...curr.collaborators];
          joinedList.forEach(p => {
            if (!merged.some(m => m.clientId === p.clientId)) {
              merged.push(p);
            }
          });
          return { collaborators: merged };
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        set(curr => {
          const leftIds = new Set((leftPresences as any[]).map(p => p.clientId));
          return {
            collaborators: curr.collaborators.filter(c => !leftIds.has(c.clientId)),
          };
        });
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${projectId}`,
        },
        payload => {
          const updatedBy = (payload.new as any)?.user_id;
          if (updatedBy && updatedBy !== userInfo.userId) {
            set({
              hasRemoteChanges: true,
              lastRemoteSavedAt: (payload.new as any)?.updated_at || new Date().toISOString(),
            });
          }
        }
      );

    channel.subscribe(status => {
      if (status === 'SUBSCRIBED') {
        channel.track(myPresencePayload);
        set({ isConnected: true, activeRoomId: projectId });
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        set({ isConnected: false });
      }
    });

    activeChannel = channel;
    set({
      activeRoomId: projectId,
      collaborators: [myPresencePayload],
      isConnected: false,
      hasRemoteChanges: false,
    });
  },

  leaveRoom: () => {
    if (activeChannel) {
      try {
        supabase.removeChannel(activeChannel);
      } catch {}
      activeChannel = null;
    }
    set({
      activeRoomId: null,
      collaborators: [],
      isConnected: false,
      hasRemoteChanges: false,
      lastRemoteSavedAt: null,
    });
  },

  broadcastStopFocus: (stopId: string) => {
    if (!activeChannel) return;
    activeChannel.send({
      type: 'broadcast',
      event: 'collaborator_focus_stop',
      payload: { stopId, clientId: clientGeneratedId },
    }).catch(() => {});
  },

  broadcastTimelineScrub: (time: number) => {
    if (!activeChannel) return;
    activeChannel.send({
      type: 'broadcast',
      event: 'director_scrub',
      payload: { time, clientId: clientGeneratedId },
    }).catch(() => {});
  },

  clearRemoteChangesFlag: () => {
    set({ hasRemoteChanges: false });
  },
}));

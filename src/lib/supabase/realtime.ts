import { createClient } from './client';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Subscribe to table changes
 */
export function subscribeToTable<T = any>(
  table: string,
  callback: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: T;
    old: T;
  }) => void,
  filter?: string
) {
  const supabase = createClient();
  
  const channel = supabase
    .channel(`${table}-changes`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        filter,
      },
      (payload: any) => {
        callback({
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
        });
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to user's bookings
 */
export function subscribeToUserBookings(
  userId: string,
  callback: (payload: any) => void
) {
  return subscribeToTable(
    'bookings',
    callback,
    `user_id=eq.${userId}`
  );
}

/**
 * Unsubscribe from a channel
 */
export async function unsubscribe(channel: RealtimeChannel) {
  const supabase = createClient();
  await supabase.removeChannel(channel);
}

/**
 * Subscribe to presence (online users)
 */
export function subscribeToPresence(
  channelName: string,
  onJoin?: (key: string, currentPresence: any, newPresence: any) => void,
  onLeave?: (key: string, currentPresence: any, leftPresence: any) => void
) {
  const supabase = createClient();
  
  const channel = supabase.channel(channelName, {
    config: {
      presence: {
        key: '',
      },
    },
  });

  if (onJoin) {
    channel.on('presence', { event: 'join' }, ({ key, currentPresences, newPresences }) => {
      onJoin(key, currentPresences, newPresences);
    });
  }

  if (onLeave) {
    channel.on('presence', { event: 'leave' }, ({ key, currentPresences, leftPresences }) => {
      onLeave(key, currentPresences, leftPresences);
    });
  }

  channel.subscribe();

  return channel;
}

/**
 * Track user presence
 */
export async function trackPresence(
  channel: RealtimeChannel,
  state: Record<string, any>
) {
  await channel.track(state);
}

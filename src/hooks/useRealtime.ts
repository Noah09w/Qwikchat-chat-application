import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useChatStore } from '@/store/chatStore';
import type { RealtimePostgresInsertPayload, RealtimePostgresUpdatePayload } from '@supabase/supabase-js';
import type { Message } from '@/store/chatStore';

interface PresencePayload {
    key: string;
}

function playNotificationTone() {
    if (typeof window === 'undefined') return;

    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) return;

    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    gainNode.gain.setValueAtTime(0.0001, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.18);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.2);
    oscillator.onended = () => {
        void context.close();
    };
}

export function useRealtime(userId: string | undefined) {
    const { addMessage, patchMessage, setOnlineUsers, addOnlineUser, removeOnlineUser } = useChatStore();

    useEffect(() => {
        if (!userId) return;

        // 1. Subscribe to new messages
        const messageChannel = supabase
            .channel('public:messages')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                (payload: RealtimePostgresInsertPayload<Message>) => {
                    const newMsg = payload.new;

                    // Prevent notifications and duplicates for own messages
                    // (They are added optimistically in ChatArea.tsx)
                    if (newMsg.sender_id === userId) {
                        return;
                    }

                    // Handle Notifications
                    const { notifications } = useChatStore.getState();

                    const canShowNotifications = typeof window !== 'undefined' && 'Notification' in window;
                    if (notifications.desktop && canShowNotifications && Notification.permission === 'granted') {
                        new Notification('New Message', {
                            body: notifications.previews ? newMsg.content : 'You have a new message',
                            icon: '/logo.png' // Adjust if you have a specific icon path
                        });
                    }

                    if (notifications.sound) {
                        playNotificationTone();
                    }

                    addMessage(newMsg.chat_id, {
                        id: newMsg.id,
                        chat_id: newMsg.chat_id,
                        sender_id: newMsg.sender_id,
                        content: newMsg.content,
                        type: newMsg.type,
                        created_at: newMsg.created_at,
                        is_edited: newMsg.is_edited,
                        status: 'sent',
                        file_url: newMsg.file_url,
                        file_type: newMsg.file_type,
                        reply_to: newMsg.reply_to,
                        is_deleted_for_everyone: newMsg.is_deleted_for_everyone
                    });
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'messages' },
                (payload: RealtimePostgresUpdatePayload<Message>) => {
                    patchMessage(payload.new.chat_id, payload.new.id, {
                        content: payload.new.content,
                        type: payload.new.type,
                        is_edited: payload.new.is_edited,
                        status: payload.new.status || 'delivered',
                        file_url: payload.new.file_url,
                        file_type: payload.new.file_type,
                        reply_to: payload.new.reply_to,
                        is_deleted_for_everyone: payload.new.is_deleted_for_everyone
                    });
                }
            )
            .subscribe();

        // 2. Subscribe to Presence (Online/Offline status)
        const presenceChannel = supabase.channel('online-users', {
            config: {
                presence: {
                    key: userId,
                },
            },
        });

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const newState = presenceChannel.presenceState();
                const users = new Set<string>();
                for (const id in newState) {
                    users.add(id);
                }
                setOnlineUsers(users);
            })
            .on('presence', { event: 'join' }, ({ key }: PresencePayload) => {
                addOnlineUser(key);
            })
            .on('presence', { event: 'leave' }, ({ key }: PresencePayload) => {
                removeOnlineUser(key);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await presenceChannel.track({ online_at: new Date().toISOString() });
                }
            });

        return () => {
            supabase.removeChannel(messageChannel);
            supabase.removeChannel(presenceChannel);
        };
    }, [userId, addMessage, patchMessage, setOnlineUsers, addOnlineUser, removeOnlineUser]);
}

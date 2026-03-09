import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useChatStore } from '@/store/chatStore';

export function useRealtime(userId: string | undefined) {
    const { addMessage, updateMessageStatus, setOnlineUsers, addOnlineUser, removeOnlineUser } = useChatStore();

    useEffect(() => {
        if (!userId) return;

        // 1. Subscribe to new messages
        const messageChannel = supabase
            .channel('public:messages')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                (payload: any) => {
                    const newMsg = payload.new;

                    // Prevent notifications and duplicates for own messages
                    // (They are added optimistically in ChatArea.tsx)
                    if (newMsg.sender_id === userId) {
                        return;
                    }

                    // Handle Notifications
                    const { notifications } = useChatStore.getState();

                    if (notifications.desktop && Notification.permission === 'granted') {
                        new Notification('New Message', {
                            body: notifications.previews ? newMsg.content : 'You have a new message',
                            icon: '/logo.png' // Adjust if you have a specific icon path
                        });
                    }

                    if (notifications.sound) {
                        const audio = new Audio('/notification.mp3'); // Ensure this file exists or use a CDN link
                        audio.play().catch(() => { }); // Catch play errors (e.g. user interaction required)
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
                (payload: any) => {
                    // For read receipts or edits (omitted detailed implementation for brevity, extensible later)
                    updateMessageStatus(payload.new.id, payload.new.status || 'delivered');
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
            .on('presence', { event: 'join' }, ({ key }) => {
                addOnlineUser(key);
            })
            .on('presence', { event: 'leave' }, ({ key }) => {
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
    }, [userId, addMessage, updateMessageStatus, setOnlineUsers, addOnlineUser, removeOnlineUser]);
}

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface User {
    id: string;
    email: string;
    username: string;
    avatar_url?: string;
    status?: string;
    bio?: string;
    privacy_last_seen?: boolean;
    privacy_read_receipts?: boolean;
    settings?: {
        notifications?: { sound: boolean; desktop: boolean; previews: boolean };
        chatBehavior?: { enterToSend: boolean; fontSize: 'small' | 'medium' | 'large'; autoDownload: boolean };
        appearance?: { bubbleStyle: 'modern' | 'compact' | 'classic'; wallpaper: string };
    };
}

export interface Chat {
    id: string;
    type: 'DIRECT' | 'GROUP';
    name?: string;
    avatar_url?: string;
    created_at: string;
    lastMessage?: string;
    time?: string;
    unread?: number;
    is_pinned?: boolean;
    is_muted?: boolean;
    is_archived?: boolean;
    participant_user_id?: string;
}

export interface Message {
    id: string;
    chat_id: string;
    sender_id: string;
    content: string;
    type: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'SYSTEM';
    created_at: string;
    is_edited: boolean;
    status: 'sent' | 'delivered' | 'read';
    reply_to?: string;
    is_deleted_for_everyone?: boolean;
    file_url?: string;
    file_type?: string;
}

export interface ChatState {
    currentUser: User | null;
    setCurrentUser: (user: User | null) => void;
    activeChatId: string | null;
    setActiveChatId: (id: string | null) => void;

    chats: Chat[];
    setChats: (chats: Chat[]) => void;
    messages: Record<string, Message[]>;
    setMessages: (chatId: string, messages: Message[]) => void;
    addMessage: (chatId: string, message: Message) => void;
    replaceMessage: (chatId: string, tempId: string, message: Message) => void;
    patchMessage: (chatId: string, messageId: string, updates: Partial<Message>) => void;
    updateMessageStatus: (messageId: string, status: 'sent' | 'delivered' | 'read') => void;
    deleteMessage: (chatId: string, messageId: string, forEveryone: boolean) => Promise<void>;

    onlineUsers: Set<string>;
    setOnlineUsers: (users: Set<string>) => void;
    addOnlineUser: (userId: string) => void;
    removeOnlineUser: (userId: string) => void;

    typingUsers: Record<string, Set<string>>;
    setTypingUser: (chatId: string, userId: string, isTyping: boolean) => void;

    theme: 'light' | 'dark' | 'system';
    setTheme: (theme: 'light' | 'dark' | 'system') => void;

    isRightSidebarOpen: boolean;
    setRightSidebarOpen: (isOpen: boolean) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    isSearchOpen: boolean;
    setSearchOpen: (isOpen: boolean) => void;
    toggleArchive: (chatId: string) => Promise<void>;
    togglePin: (chatId: string) => Promise<void>;

    notifications: { sound: boolean; desktop: boolean; previews: boolean };
    setNotifications: (settings: Partial<{ sound: boolean; desktop: boolean; previews: boolean }>) => Promise<void>;

    chatBehavior: { enterToSend: boolean; fontSize: 'small' | 'medium' | 'large'; autoDownload: boolean };
    setChatBehavior: (settings: Partial<{ enterToSend: boolean; fontSize: 'small' | 'medium' | 'large'; autoDownload: boolean }>) => Promise<void>;

    appearanceSettings: { bubbleStyle: 'modern' | 'compact' | 'classic'; wallpaper: string };
    setAppearanceSettings: (settings: Partial<{ bubbleStyle: 'modern' | 'compact' | 'classic'; wallpaper: string }>) => Promise<void>;
    syncUserPageSettings: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
    currentUser: null,
    setCurrentUser: (user) => set({ currentUser: user }),
    activeChatId: null,
    setActiveChatId: (id) => set({ activeChatId: id }),

    isRightSidebarOpen: false,
    setRightSidebarOpen: (isOpen) => set({ isRightSidebarOpen: isOpen }),

    searchQuery: '',
    setSearchQuery: (query) => set({ searchQuery: query }),
    isSearchOpen: false,
    setSearchOpen: (isOpen) => set({ isSearchOpen: isOpen }),

    toggleArchive: async (chatId) => {
        const { currentUser, chats } = get();
        if (!currentUser) return;

        const chat = chats.find(c => c.id === chatId);
        if (!chat) return;

        const nextStatus = !chat.is_archived;

        // Optimistic update
        set((state) => ({
            chats: state.chats.map((c: Chat) =>
                c.id === chatId ? { ...c, is_archived: nextStatus } : c
            ),
        }));

        await supabase
            .from('chat_participants')
            .update({ is_archived: nextStatus })
            .eq('chat_id', chatId)
            .eq('user_id', currentUser.id);
    },

    togglePin: async (chatId) => {
        const { currentUser, chats } = get();
        if (!currentUser) return;

        const chat = chats.find(c => c.id === chatId);
        if (!chat) return;

        const nextStatus = !chat.is_pinned;

        // Optimistic update
        set((state) => ({
            chats: state.chats.map((c: Chat) =>
                c.id === chatId ? { ...c, is_pinned: nextStatus } : c
            ),
        }));

        await supabase
            .from('chat_participants')
            .update({ is_pinned: nextStatus })
            .eq('chat_id', chatId)
            .eq('user_id', currentUser.id);
    },

    syncUserPageSettings: async () => {
        const { currentUser, notifications, chatBehavior, appearanceSettings } = get();
        if (!currentUser) return;

        const settings = {
            notifications,
            chatBehavior,
            appearance: appearanceSettings
        };

        await supabase
            .from('users')
            .update({ settings })
            .eq('id', currentUser.id);
    },

    theme: (localStorage.getItem('qwikchat-theme') as 'light' | 'dark' | 'system') || 'system',
    setTheme: (theme) => {
        localStorage.setItem('qwikchat-theme', theme);
        set({ theme });
    },

    notifications: JSON.parse(localStorage.getItem('qwikchat-notifications') || '{"sound":true,"desktop":true,"previews":true}'),
    setNotifications: async (settings) => {
        const next = { ...get().notifications, ...settings };
        localStorage.setItem('qwikchat-notifications', JSON.stringify(next));
        set({ notifications: next });
        await get().syncUserPageSettings();
    },

    chatBehavior: JSON.parse(localStorage.getItem('qwikchat-chat-behavior') || '{"enterToSend":true,"fontSize":"medium","autoDownload":true}'),
    setChatBehavior: async (settings) => {
        const next = { ...get().chatBehavior, ...settings };
        localStorage.setItem('qwikchat-chat-behavior', JSON.stringify(next));
        set({ chatBehavior: next });
        await get().syncUserPageSettings();
    },

    appearanceSettings: JSON.parse(localStorage.getItem('qwikchat-appearance') || '{"bubbleStyle":"modern","wallpaper":""}'),
    setAppearanceSettings: async (settings) => {
        const next = { ...get().appearanceSettings, ...settings };
        localStorage.setItem('qwikchat-appearance', JSON.stringify(next));
        set({ appearanceSettings: next });
        await get().syncUserPageSettings();
    },

    chats: [],
    setChats: (chats) => set({ chats }),

    messages: {},
    setMessages: (chatId, messages) =>
        set((state) => ({
            ...state,
            messages: { ...state.messages, [chatId]: messages },
        })),
    addMessage: (chatId, message) =>
        set((state) => {
            const chatMessages = state.messages[chatId] || [];
            if (chatMessages.find((m) => m.id === message.id)) return state;
            return {
                ...state,
                messages: { ...state.messages, [chatId]: [...chatMessages, message] },
            };
        }),
    replaceMessage: (chatId, tempId, message) =>
        set((state) => {
            const chatMessages = state.messages[chatId] || [];
            const existingIndex = chatMessages.findIndex((m) => m.id === tempId);
            const withoutDuplicate = chatMessages.filter((m) => m.id !== message.id);

            if (existingIndex === -1) {
                return {
                    ...state,
                    messages: { ...state.messages, [chatId]: [...withoutDuplicate, message] },
                };
            }

            const updatedMessages = [...withoutDuplicate];
            updatedMessages.splice(existingIndex, 0, message);

            return {
                ...state,
                messages: { ...state.messages, [chatId]: updatedMessages },
            };
        }),
    patchMessage: (chatId, messageId, updates) =>
        set((state) => {
            const chatMessages = state.messages[chatId] || [];
            return {
                ...state,
                messages: {
                    ...state.messages,
                    [chatId]: chatMessages.map((message) =>
                        message.id === messageId ? { ...message, ...updates } : message
                    ),
                },
            };
        }),
    updateMessageStatus: (messageId, status) =>
        set((state) => {
            const newMessages = { ...state.messages };
            for (const chatId in newMessages) {
                const msgIndex = newMessages[chatId].findIndex((m) => m.id === messageId);
                if (msgIndex !== -1) {
                    const updatedMessages = [...newMessages[chatId]];
                    updatedMessages[msgIndex] = { ...updatedMessages[msgIndex], status };
                    newMessages[chatId] = updatedMessages;
                    break;
                }
            }
            return { ...state, messages: newMessages };
        }),
    deleteMessage: async (chatId, messageId, forEveryone) => {
        if (forEveryone) {
            const { error } = await supabase
                .from('messages')
                .update({ is_deleted_for_everyone: true, content: 'Message deleted' })
                .eq('id', messageId);

            if (error) {
                throw error;
            }
        } else {
            // "Delete for me" is usually a local preference or a entry in a 'deleted_messages' table.
            // For now, let's just make it a local removal.
        }

        set((state) => {
            const chatMessages = state.messages[chatId] || [];
            if (forEveryone) {
                return {
                    ...state,
                    messages: {
                        ...state.messages,
                        [chatId]: chatMessages.map((m) =>
                            m.id === messageId ? { ...m, is_deleted_for_everyone: true, content: 'Message deleted' } : m
                        ),
                    },
                };
            } else {
                return {
                    ...state,
                    messages: {
                        ...state.messages,
                        [chatId]: chatMessages.filter((m) => m.id !== messageId),
                    },
                };
            }
        });
    },

    onlineUsers: new Set(),
    setOnlineUsers: (users) => set({ onlineUsers: users }),
    addOnlineUser: (userId) =>
        set((state) => {
            const newSet = new Set(state.onlineUsers);
            newSet.add(userId);
            return { onlineUsers: newSet };
        }),
    removeOnlineUser: (userId) =>
        set((state) => {
            const newSet = new Set(state.onlineUsers);
            newSet.delete(userId);
            return { onlineUsers: newSet };
        }),

    typingUsers: {},
    setTypingUser: (chatId, userId, isTyping) =>
        set((state) => {
            const chatTyping = new Set(state.typingUsers[chatId] || []);
            if (isTyping) {
                chatTyping.add(userId);
            } else {
                chatTyping.delete(userId);
            }
            return {
                ...state,
                typingUsers: { ...state.typingUsers, [chatId]: chatTyping },
            };
        }),
}));

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Sidebar } from '@/components/chat/Sidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import { RightSidebar } from '@/components/chat/RightSidebar';
import { SearchResults } from '@/components/search/SearchResults';
import { useChatStore } from '@/store/chatStore';
import { useRealtime } from '@/hooks/useRealtime';
import { Logo } from '@/components/brand/Logo';
import { cn } from '@/lib/utils';
import type { Session } from '@supabase/supabase-js';
import type { Chat } from '@/store/chatStore';

import { Header } from '@/components/layout/Header';

interface ChatDetailsRecord {
    id: string;
    type: 'DIRECT' | 'GROUP';
    name: string | null;
    avatar_url: string | null;
    created_at: string;
}

interface ChatParticipantRecord {
    chat_id: string;
    is_archived: boolean | null;
    is_pinned: boolean | null;
    chats: ChatDetailsRecord | ChatDetailsRecord[] | null;
}

interface DirectChatParticipantRecord {
    users: {
        id: string;
        username: string | null;
        avatar_url: string | null;
    } | null;
}

export default function ChatPage() {
    const [session, setSession] = useState<Session | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const {
        setCurrentUser,
        activeChatId,
        setActiveChatId,
        setChats,
        isRightSidebarOpen,
        setRightSidebarOpen,
        isSearchOpen
    } = useChatStore();

    useRealtime(session?.user?.id);

    const fetchChats = useCallback(async (userId: string) => {
        setFetchError(null);

        const { data, error } = await supabase
            .from('chat_participants')
            .select(`
                chat_id,
                is_archived,
                is_pinned,
                chats (
                  id,
                  type,
                  name,
                  avatar_url,
                  created_at
                )
            `)
            .eq('user_id', userId);

        if (error) {
            console.error('Error fetching chats:', error);
            setFetchError('Failed to load chats. Please check your connection and try refreshing.');
            return;
        }

        const chatParticipants = (data ?? []) as ChatParticipantRecord[];
        const formattedChats = await Promise.all(
            chatParticipants.map(async (cp): Promise<Chat | null> => {
                const chat = Array.isArray(cp.chats) ? cp.chats[0] : cp.chats;
                if (!chat) {
                    return null;
                }

                let name = chat.name;
                let avatar = chat.avatar_url;
                let participantUserId: string | undefined;

                if (chat.type === 'DIRECT') {
                    const { data: otherUserCp } = await supabase
                        .from('chat_participants')
                        .select('users(id, username, avatar_url)')
                        .eq('chat_id', chat.id)
                        .neq('user_id', userId)
                        .maybeSingle();

                    const otherUser = (otherUserCp as DirectChatParticipantRecord | null)?.users;
                    if (otherUser) {
                        participantUserId = otherUser.id;
                        name = otherUser.username;
                        avatar = otherUser.avatar_url;
                    }
                }

                return {
                    id: chat.id,
                    type: chat.type,
                    name: name || 'Unknown Chat',
                    avatar_url: avatar || undefined,
                    created_at: chat.created_at,
                    lastMessage: 'Tap to view messages...',
                    time: new Date(chat.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    is_archived: cp.is_archived || false,
                    is_pinned: cp.is_pinned || false,
                    participant_user_id: participantUserId,
                };
            })
        );

        const nextChats = formattedChats.filter((chat): chat is Chat => chat !== null);
        setChats(nextChats);

        if (nextChats.length === 0) {
            setActiveChatId(null);
            return;
        }

        if (!activeChatId || !nextChats.some((chat) => chat.id === activeChatId)) {
            setActiveChatId(nextChats[0].id);
        }
    }, [activeChatId, setActiveChatId, setChats]);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                console.error('Session error:', error.message);
                supabase.auth.signOut();
            }
            setSession(session);
            if (session?.user && !error) {
                fetchChats(session.user.id);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                setSession(null);
                setCurrentUser(null);
                setChats([]);
                setActiveChatId(null);
            } else {
                setSession(session);
                if (session?.user) {
                    fetchChats(session.user.id);
                }
            }
        });

        return () => subscription.unsubscribe();
    }, [fetchChats, setActiveChatId, setChats, setCurrentUser]);

    if (!session) return null;

    const isSidebarVisible = isMobile ? (isSidebarOpen || !activeChatId) : true;

    return (
        <div className="app-theme-shell flex flex-col h-screen w-full bg-background text-foreground overflow-hidden">
            {/* -- Global Header -- */}
            <Header onMobileChatsClick={() => setIsSidebarOpen(true)} />

            <div className="flex flex-1 overflow-hidden relative">
                {/* -- Mobile Sidebar Overlay -- */}
                {isMobile && isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* -- Sidebar -- */}
                <div className={cn(
                    "fixed inset-y-0 left-0 z-50 h-full border-r border-border/50 transition-transform duration-300 ease-in-out md:relative md:inset-auto md:z-10 md:translate-x-0",
                    isSidebarVisible ? "translate-x-0" : "-translate-x-full"
                )}>
                    <Sidebar onChatSelected={() => { if (isMobile) setIsSidebarOpen(false); }} />
                </div>

                <main className="flex-1 min-w-0 bg-background flex relative overflow-hidden h-full">
                    {isSearchOpen ? (
                        <div className="flex-1">
                            <SearchResults />
                        </div>
                    ) : fetchError ? (
                        <div className="flex-1 flex h-full items-center justify-center bg-background px-6">
                            <div className="text-center space-y-4 animate-in max-w-sm">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
                                    <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-bold text-foreground">Connection Error</h3>
                                    <p className="text-sm text-muted-foreground">{fetchError}</p>
                                </div>
                                <button
                                    onClick={() => { setFetchError(null); if (session?.user) fetchChats(session.user.id); }}
                                    className="px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md hover:opacity-90 transition-all"
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    ) : activeChatId ? (
                        <>
                            <div className="flex-1 flex flex-col min-w-0">
                                <ChatArea currentUserId={session.user.id} activeChatId={activeChatId} />
                            </div>
                            {isRightSidebarOpen && <RightSidebar />}
                            {isMobile && isRightSidebarOpen && (
                                <div
                                    className="fixed inset-0 z-40 bg-black/45 md:hidden"
                                    onClick={() => setRightSidebarOpen(false)}
                                />
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex h-full items-center justify-center bg-background px-6">
                            <div className="text-center space-y-4 animate-in">
                                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-card border border-border shadow-2xl hover:scale-105 transition-all">
                                    <Logo showText={false} iconClassName="h-12 w-12" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold text-foreground">Select a conversation</h3>
                                    <p className="text-muted-foreground font-medium max-w-[280px] mx-auto">
                                        Choose a chat from the sidebar to start messaging with your team.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

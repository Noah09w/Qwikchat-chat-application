import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Sidebar } from '@/components/chat/Sidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import { RightSidebar } from '@/components/chat/RightSidebar';
import { SearchResults } from '@/components/search/SearchResults';
import { useChatStore } from '@/store/chatStore';
import { useRealtime } from '@/hooks/useRealtime';
import { Logo } from '@/components/brand/Logo';
import { cn } from '@/lib/utils';

import { Header } from '@/components/layout/Header';

export default function ChatPage() {
    const [session, setSession] = useState<any>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const {
        setCurrentUser,
        activeChatId,
        setActiveChatId,
        setChats,
        isRightSidebarOpen,
        isSearchOpen
    } = useChatStore();

    useRealtime(session?.user?.id);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                fetchChats(session.user.id);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session?.user) {
                fetchChats(session.user.id);
            } else {
                setCurrentUser(null);
                setChats([]);
                setActiveChatId(null);
            }
        });

        return () => subscription.unsubscribe();
    }, [setCurrentUser, setChats, setActiveChatId]);

    const fetchChats = async (userId: string) => {
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
            console.error("Error fetching chats:", error);
            return;
        }

        if (data) {
            const formattedChats = await Promise.all(data.map(async (cp: any) => {
                const chat = cp.chats;
                let name = chat.name;
                let avatar = chat.avatar_url;

                if (chat.type === 'DIRECT') {
                    const { data: otherUserCp } = await supabase
                        .from('chat_participants')
                        .select('users(username, avatar_url)')
                        .eq('chat_id', chat.id)
                        .neq('user_id', userId)
                        .single();

                    if (otherUserCp?.users && !Array.isArray(otherUserCp.users)) {
                        const otherUser = otherUserCp.users as any;
                        name = otherUser.username;
                        avatar = otherUser.avatar_url;
                    }
                }

                return {
                    id: chat.id,
                    type: chat.type,
                    name: name || 'Unknown Chat',
                    avatar_url: avatar,
                    created_at: chat.created_at,
                    lastMessage: 'Tap to view messages...',
                    time: new Date(chat.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    is_archived: cp.is_archived || false,
                    is_pinned: cp.is_pinned || false,
                };
            }));

            setChats(formattedChats);

            if (formattedChats.length > 0 && !activeChatId) {
                setActiveChatId(formattedChats[0].id);
            }
        }
    };

    if (!session) return null;

    return (
        <div className="flex flex-col h-screen w-full bg-background text-foreground overflow-hidden">
            {/* -- Global Header -- */}
            <Header />

            <div className="flex flex-1 overflow-hidden relative">
                {/* -- Mobile Sidebar Overlay -- */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* -- Sidebar -- */}
                <div className={cn(
                    "fixed inset-y-0 left-0 z-50 md:relative md:translate-x-0 transition-transform duration-300 ease-in-out h-full border-r border-border/50",
                    isSidebarOpen ? "translate-x-0 outline-none" : "-translate-x-full"
                )}>
                    <Sidebar />
                </div>

                <main className="flex-1 min-w-0 bg-background flex relative overflow-hidden h-full">
                    {isSearchOpen ? (
                        <div className="flex-1">
                            <SearchResults />
                        </div>
                    ) : activeChatId ? (
                        <>
                            <div className="flex-1 flex flex-col min-w-0">
                                <ChatArea currentUserId={session.user.id} activeChatId={activeChatId} />
                            </div>
                            {isRightSidebarOpen && <RightSidebar />}
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

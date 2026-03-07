import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Archive,
    Inbox,
    MessageSquare,
    Pin,
} from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export function Sidebar() {
    const [activeTab, setActiveTab] = useState<'Inbox' | 'Archived'>('Inbox');
    const { chats, activeChatId, setActiveChatId, onlineUsers, togglePin } = useChatStore();

    const filteredChats = chats.filter((chat: any) => {
        const isArchived = chat.is_archived || false;
        if (activeTab === 'Inbox') return !isArchived;
        if (activeTab === 'Archived') return isArchived;
        return true;
    });

    const pinnedChats = filteredChats.filter(chat => chat.is_pinned);
    const earlierChats = filteredChats.filter(chat => !chat.is_pinned);

    return (
        <div className="flex flex-col h-full w-[var(--sidebar-width)] bg-card border-r border-border flex-shrink-0 z-10 box-border overflow-hidden">
            {/* Tabs */}
            <div className="px-6 pt-6 pb-4">
                <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border">
                    {[
                        { id: 'Inbox', icon: Inbox },
                        { id: 'Archived', icon: Archive }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all relative z-10",
                                activeTab === tab.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <tab.icon className="h-3.5 w-3.5" />
                            {tab.id}
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-primary rounded-lg -z-10 shadow-sm"
                                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="space-y-6 py-4">
                    {/* Pinned Section */}
                    <AnimatePresence mode="popLayout">
                        {pinnedChats.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="space-y-3"
                            >
                                <div className="px-6 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <Pin className="h-3 w-3" />
                                        Pinned
                                    </span>
                                    <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/20">
                                        {pinnedChats.length}
                                    </span>
                                </div>
                                <div className="px-3 space-y-1">
                                    {pinnedChats.map((chat) => (
                                        <ChatListItem
                                            key={chat.id}
                                            chat={chat}
                                            isActive={activeChatId === chat.id}
                                            onClick={() => setActiveChatId(chat.id)}
                                            onPin={() => togglePin(chat.id)}
                                            isOnline={onlineUsers.has(chat.id)}
                                        />
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Earlier Section */}
                    <div className="space-y-3">
                        <div className="px-6">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Messages</span>
                        </div>
                        <div className="px-3 space-y-1">
                            <AnimatePresence mode="popLayout" initial={false}>
                                {earlierChats.map((chat) => (
                                    <ChatListItem
                                        key={chat.id}
                                        chat={chat}
                                        isActive={activeChatId === chat.id}
                                        onClick={() => setActiveChatId(chat.id)}
                                        onPin={() => togglePin(chat.id)}
                                        isOnline={onlineUsers.has(chat.id)}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>

                    {filteredChats.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-20 text-center px-8"
                        >
                            <div className="h-12 w-12 rounded-xl bg-muted/30 flex items-center justify-center mb-4 border border-border">
                                <MessageSquare className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <h4 className="text-sm font-semibold text-foreground">No conversations</h4>
                            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                You don't have any conversations in your {activeTab.toLowerCase()}.
                            </p>
                        </motion.div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

function ChatListItem({ chat, isActive, onClick, onPin, isOnline }: { chat: any; isActive: boolean; onClick: () => void; onPin: () => void; isOnline: boolean }) {
    return (
        <motion.button
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all relative group",
                isActive
                    ? "bg-primary/10 shadow-sm ring-1 ring-primary/20"
                    : "hover:bg-muted/50 active:scale-[0.98]"
            )}
        >
            <div className="relative flex-shrink-0">
                <Avatar className="h-10 w-10 border border-border shadow-sm">
                    <AvatarImage src={chat.avatar_url} alt={chat.name} />
                    <AvatarFallback className={cn(
                        "font-bold text-xs",
                        isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                        {chat.name?.substring(0, 2).toUpperCase() || '??'}
                    </AvatarFallback>
                </Avatar>
                {isOnline && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-green-500 shadow-sm"
                    />
                )}
            </div>

            <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={cn(
                        "truncate text-sm font-semibold tracking-tight",
                        isActive ? "text-foreground" : "text-foreground/80 group-hover:text-foreground"
                    )}>
                        {chat.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                        {chat.time}
                    </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-xs text-muted-foreground leading-none group-hover:text-muted-foreground/80 transition-colors">
                        {chat.lastMessage}
                    </span>

                    <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                        {chat.is_pinned && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onPin();
                                }}
                                className="hover:scale-110 transition-transform"
                            >
                                <Pin className={cn("h-3 w-3 fill-current", isActive ? "text-primary" : "text-primary/40")} />
                            </button>
                        )}
                        {(chat.unread || 0) > 0 && (
                            <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold bg-primary text-primary-foreground shadow-sm"
                            >
                                {chat.unread}
                            </motion.span>
                        )}
                    </div>
                </div>
            </div>

            {isActive && (
                <motion.div
                    layoutId="sidebarActiveIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"
                />
            )}
        </motion.button>
    );
}

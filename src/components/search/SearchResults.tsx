import { useState, useEffect } from 'react';
import { Search, X, MessageSquare, User, FileText, Image as ImageIcon, ChevronRight, Loader2 } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { openOrCreateDirectChat } from '@/lib/chatActions';
import { Input } from '@/components/ui/input';

type FilterType = 'All' | 'Messages' | 'People' | 'Files' | 'Media';
type SearchMetadata = { chatId: string };

interface MessageSearchRecord {
    id: string;
    content: string;
    created_at: string;
    type: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'SYSTEM';
    chat_id: string;
    sender: {
        username: string | null;
    } | null;
}

interface UserSearchRecord {
    id: string;
    username: string;
    avatar_url?: string | null;
    bio?: string | null;
}

interface SearchResult {
    id: string;
    type: 'Messages' | 'People' | 'Files' | 'Media';
    title: string;
    desc: string;
    time?: string;
    avatar?: string;
    metadata?: SearchMetadata;
}

export function SearchResults() {
    const { searchQuery, setSearchQuery, setSearchOpen, setActiveChatId, currentUser, chats, setChats } = useChatStore();
    const [activeFilter, setActiveFilter] = useState<FilterType>('All');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    const filters: Array<{ label: FilterType; icon: LucideIcon }> = [
        { label: 'All', icon: Search },
        { label: 'Messages', icon: MessageSquare },
        { label: 'People', icon: User },
        { label: 'Files', icon: FileText },
        { label: 'Media', icon: ImageIcon },
    ];

    useEffect(() => {
        const performSearch = async () => {
            if (!searchQuery.trim()) {
                setResults([]);
                return;
            }

            setLoading(true);
            const searchResults: SearchResult[] = [];

            try {
                // 1. Search People
                if (activeFilter === 'All' || activeFilter === 'People') {
                    const { data: users } = await supabase
                        .from('users')
                        .select('id, username, avatar_url, bio')
                        .or(`username.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
                        .limit(5);

                    (users as UserSearchRecord[] | null)?.forEach((u) => {
                        searchResults.push({
                            id: u.id,
                            type: 'People',
                            title: u.username,
                            desc: u.bio || 'ConnectX User',
                            avatar: u.avatar_url || undefined
                        });
                    });
                }

                // 2. Search Messages
                if (activeFilter === 'All' || activeFilter === 'Messages' || activeFilter === 'Files' || activeFilter === 'Media') {
                    let query = supabase
                        .from('messages')
                        .select(`
                            id, 
                            content, 
                            created_at, 
                            type, 
                            chat_id,
                            sender:users(username)
                        `)
                        .ilike('content', `%${searchQuery}%`)
                        .limit(10);

                    if (activeFilter === 'Files') query = query.eq('type', 'DOCUMENT');
                    if (activeFilter === 'Media') query = query.eq('type', 'IMAGE');

                    const { data: messages } = await query;

                    (messages as MessageSearchRecord[] | null)?.forEach((m) => {
                        let type: SearchResult['type'] = 'Messages';
                        if (m.type === 'DOCUMENT') type = 'Files';
                        if (m.type === 'IMAGE') type = 'Media';

                        searchResults.push({
                            id: m.id,
                            type,
                            title: m.sender?.username || 'Unknown',
                            desc: m.content,
                            time: new Date(m.created_at).toLocaleDateString(),
                            metadata: { chatId: m.chat_id }
                        });
                    });
                }

                setResults(searchResults);
            } catch (error) {
                console.error("Search error:", error);
            } finally {
                setLoading(false);
            }
        };

        const debounceTimer = setTimeout(performSearch, 300);
        return () => clearTimeout(debounceTimer);
    }, [searchQuery, activeFilter]);

    const handleResultClick = async (res: SearchResult) => {
        if (res.type === 'People') {
            if (!currentUser) return;

            try {
                setActionError(null);
                await openOrCreateDirectChat({
                    currentUserId: currentUser.id,
                    targetUser: {
                        id: res.id,
                        username: res.title,
                        avatar_url: res.avatar,
                    },
                    chats,
                    setChats,
                    setActiveChatId,
                });
                setSearchOpen(false);
            } catch (error) {
                console.error('Failed to open chat from search:', error);
                setActionError('Unable to open this conversation right now.');
            }
        } else if (res.metadata?.chatId) {
            setActiveChatId(res.metadata.chatId);
            setSearchOpen(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col h-full bg-background"
        >
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-border/50 bg-card/50 p-4 backdrop-blur-xl glass-panel md:p-6">
                <div className="mb-4 flex items-start justify-between gap-3 md:mb-6">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">Search Results</h2>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1 space-x-1">
                            <span>Matches for</span>
                            <span className="text-primary">"{searchQuery}"</span>
                        </p>
                    </div>
                    <button
                        onClick={() => setSearchOpen(false)}
                        className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all border border-border active:scale-95 shadow-sm"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="relative mb-4">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search messages, people and files..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="h-11 rounded-xl border-border/70 bg-background/80 pl-10 pr-10 text-sm shadow-inner"
                    />
                    {searchQuery ? (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    ) : null}
                </div>

                {/* Filters */}
                <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
                    {filters.map((f) => (
                        <button
                            key={f.label}
                            onClick={() => setActiveFilter(f.label)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border shrink-0",
                                activeFilter === f.label
                                    ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                                    : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                        >
                            <f.icon className="h-3.5 w-3.5" />
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
                <div className="p-4 md:p-6">
                    {actionError && (
                        <div className="mb-4 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                            {actionError}
                        </div>
                    )}
                    <AnimatePresence mode="popLayout">
                        {loading ? (
                            <motion.div
                                key="loader"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-20"
                            >
                                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-4">Searching...</p>
                            </motion.div>
                        ) : results.length > 0 ? (
                            <motion.div
                                key="results"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-3"
                            >
                                {results.map((res, idx) => (
                                    <motion.button
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        key={res.id + res.type}
                                        onClick={() => handleResultClick(res)}
                                        className="w-full rounded-3xl border border-border/50 bg-card p-4 text-left transition-all group premium-shadow hover:border-primary/20 hover:bg-primary/[0.02]"
                                    >
                                        <div className="flex items-start gap-3 sm:items-center sm:gap-4">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/30 bg-background transition-colors group-hover:bg-primary/10">
                                            {res.type === 'Messages' && <MessageSquare className="h-5 w-5 text-primary" />}
                                            {res.type === 'People' && (
                                                <Avatar className="h-full w-full rounded-2xl ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                                                    <AvatarImage src={res.avatar} />
                                                    <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
                                                        {res.title.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                            )}
                                            {res.type === 'Files' && <FileText className="h-5 w-5 text-amber-500" />}
                                            {res.type === 'Media' && <ImageIcon className="h-5 w-5 text-emerald-500" />}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="mb-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                                    <span className="truncate text-sm font-bold text-foreground transition-colors group-hover:text-primary">{res.title}</span>
                                                    {res.time ? <span className="text-[10px] font-bold text-muted-foreground tabular-nums">{res.time}</span> : null}
                                                </div>
                                                <p className="break-words text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground sm:truncate">{res.desc}</p>
                                            </div>
                                            <ChevronRight className="mt-1 hidden h-4 w-4 shrink-0 text-muted-foreground/30 transition-all group-hover:translate-x-1 group-hover:text-primary sm:block" />
                                        </div>
                                    </motion.button>
                                ))}
                            </motion.div>
                        ) : searchQuery && (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center py-20 text-center"
                            >
                                <div className="h-20 w-20 rounded-[2.5rem] bg-card border border-border/50 flex items-center justify-center mb-6 shadow-xl shadow-black/20 pulse-subtle">
                                    <Search className="h-8 w-8 text-muted-foreground/50" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground tracking-tight uppercase">No results found</h3>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-2">Try broadening your search parameters</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </ScrollArea>
        </motion.div>
    );
}

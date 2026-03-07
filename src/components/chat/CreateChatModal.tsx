import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useChatStore } from '@/store/chatStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Plus, Loader2, Image as ImageIcon, X, Check, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export function CreateChatModal({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<'DIRECT' | 'GROUP_DETAILS' | 'SELECT_MEMBERS'>('DIRECT');
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const [groupParticipants, setGroupParticipants] = useState<any[]>([]);
    const [groupName, setGroupName] = useState('');
    const [groupIcon] = useState<string | null>(null);

    const { currentUser, setActiveChatId, chats, setChats } = useChatStore();

    useEffect(() => {
        if (!open) {
            setView('DIRECT');
            setSearchQuery('');
            setResults([]);
            setGroupParticipants([]);
            setGroupName('');
        }
    }, [open]);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim() || !currentUser) return;
        setIsSearching(true);

        const { data, error } = await supabase
            .from('users')
            .select('id, email, username, avatar_url')
            .neq('id', currentUser.id)
            .or(`email.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
            .limit(10);

        if (error) {
            console.error(error);
        } else {
            setResults(data || []);
        }
        setIsSearching(false);
    };

    const handleCreateDirectChat = async (targetUserId: string, targetUsername: string, targetAvatar?: string) => {
        if (!currentUser || isCreating) return;
        setIsCreating(true);

        try {
            const { data: myChats } = await supabase.from('chat_participants').select('chat_id').eq('user_id', currentUser.id);
            const myChatIds = myChats?.map(c => c.chat_id) || [];

            if (myChatIds.length > 0) {
                const { data: existingChat } = await supabase
                    .from('chat_participants')
                    .select('chat_id, chats!inner(type)')
                    .eq('user_id', targetUserId)
                    .eq('chats.type', 'DIRECT')
                    .in('chat_id', myChatIds)
                    .maybeSingle();

                if (existingChat) {
                    setActiveChatId(existingChat.chat_id);
                    setOpen(false);
                    return;
                }
            }

            const { data: newChat, error: chatError } = await supabase
                .from('chats')
                .insert({ type: 'DIRECT', created_by: currentUser.id })
                .select()
                .single();

            if (chatError) throw chatError;

            await supabase.from('chat_participants').insert([
                { chat_id: newChat.id, user_id: currentUser.id, role: 'ADMIN' },
                { chat_id: newChat.id, user_id: targetUserId, role: 'MEMBER' }
            ]);

            const chatObj = {
                id: newChat.id,
                type: 'DIRECT' as const,
                name: targetUsername,
                avatar_url: targetAvatar,
                created_at: newChat.created_at,
                lastMessage: 'Conversation started',
                time: 'Just now'
            };

            setChats([chatObj, ...chats]);
            setActiveChatId(newChat.id);
            setOpen(false);

        } catch (e) {
            console.error("Failed to create chat", e);
        } finally {
            setIsCreating(false);
        }
    };

    const handleCreateGroup = async () => {
        if (!currentUser || !groupName || isCreating || groupParticipants.length === 0) return;
        setIsCreating(true);

        try {
            const { data: newChat, error: chatError } = await supabase
                .from('chats')
                .insert({
                    type: 'GROUP',
                    name: groupName,
                    avatar_url: groupIcon,
                    created_by: currentUser.id
                })
                .select()
                .single();

            if (chatError) throw chatError;

            const participants = [
                { chat_id: newChat.id, user_id: currentUser.id, role: 'ADMIN' },
                ...groupParticipants.map(p => ({ chat_id: newChat.id, user_id: p.id, role: 'MEMBER' }))
            ];

            await supabase.from('chat_participants').insert(participants);

            const chatObj = {
                id: newChat.id,
                type: 'GROUP' as const,
                name: groupName,
                avatar_url: groupIcon || undefined,
                created_at: newChat.created_at,
                lastMessage: 'Group created',
                time: 'Just now'
            };

            setChats([chatObj, ...chats]);
            setActiveChatId(newChat.id);
            setOpen(false);

        } catch (e) {
            console.error("Failed to create group", e);
        } finally {
            setIsCreating(false);
        }
    };

    const toggleParticipant = (user: any) => {
        if (groupParticipants.find(p => p.id === user.id)) {
            setGroupParticipants(groupParticipants.filter(p => p.id !== user.id));
        } else {
            setGroupParticipants([...groupParticipants, user]);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-card border-border shadow-2xl rounded-3xl overflow-hidden p-0">
                <AnimatePresence mode="wait">
                    {view === 'DIRECT' || view === 'SELECT_MEMBERS' ? (
                        <motion.div
                            key="selection"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                        >
                            <div className="p-6 pb-4 border-b border-border bg-card">
                                <DialogHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col text-left">
                                            <DialogTitle className="text-xl font-bold text-foreground">
                                                {view === 'DIRECT' ? 'New Message' : 'Add Members'}
                                            </DialogTitle>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {view === 'DIRECT' ? 'Search for people to start a chat' : `${groupParticipants.length} members selected`}
                                            </p>
                                        </div>
                                        {view === 'SELECT_MEMBERS' && (
                                            <Button
                                                size="sm"
                                                onClick={() => setView('GROUP_DETAILS')}
                                                className="rounded-xl px-4 bg-primary font-bold text-xs"
                                                disabled={groupParticipants.length === 0}
                                            >
                                                Next
                                            </Button>
                                        )}
                                    </div>
                                </DialogHeader>

                                <form onSubmit={handleSearch} className="flex gap-2 mt-4">
                                    <div className="relative flex-1 group">
                                        <Input
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                if (e.target.value.length > 2) handleSearch();
                                            }}
                                            placeholder="Search by name or email"
                                            className="h-10 w-full pl-10 pr-4 rounded-xl bg-background border-border text-sm text-foreground focus-visible:ring-primary/20 shadow-sm"
                                        />
                                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                                            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                        </div>
                                    </div>
                                </form>
                            </div>

                            <div className="p-4 bg-background">
                                <ScrollArea className="h-[350px]">
                                    <div className="space-y-1 pr-3">
                                        {results.length === 0 && !isSearching && searchQuery && (
                                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-4">
                                                    <Search className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                                <p className="text-sm font-semibold text-foreground">No users found</p>
                                                <p className="text-xs text-muted-foreground mt-2">Try searching with a different name</p>
                                            </div>
                                        )}

                                        {results.map((user) => {
                                            const isSelected = groupParticipants.some(p => p.id === user.id);
                                            return (
                                                <button
                                                    key={user.id}
                                                    disabled={isCreating}
                                                    onClick={() => {
                                                        if (view === 'DIRECT') {
                                                            handleCreateDirectChat(user.id, user.username, user.avatar_url);
                                                        } else {
                                                            toggleParticipant(user);
                                                        }
                                                    }}
                                                    className={cn(
                                                        "w-full flex items-center justify-between p-3 rounded-xl transition-all group mb-1 border",
                                                        isSelected
                                                            ? "bg-primary/10 border-primary/20"
                                                            : "bg-card border-transparent hover:border-border hover:bg-muted"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-10 w-10 border border-border shadow-sm">
                                                            <AvatarImage src={user.avatar_url} />
                                                            <AvatarFallback className="bg-muted text-muted-foreground font-bold text-xs">
                                                                {user.username?.substring(0, 2).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="text-left">
                                                            <p className="text-sm font-semibold text-foreground leading-none mb-1 group-hover:text-primary transition-colors">{user.username}</p>
                                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{user.email}</p>
                                                        </div>
                                                    </div>
                                                    <div className={cn(
                                                        "h-8 w-8 rounded-lg flex items-center justify-center transition-all border",
                                                        isSelected
                                                            ? "bg-primary border-primary text-primary-foreground"
                                                            : "bg-background border-border text-muted-foreground group-hover:bg-primary group-hover:border-primary group-hover:text-primary-foreground"
                                                    )}>
                                                        {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>

                                {view === 'DIRECT' && (
                                    <div className="mt-4 pt-4 border-t border-border">
                                        <button
                                            onClick={() => setView('SELECT_MEMBERS')}
                                            className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-card border border-border text-xs font-semibold text-foreground hover:bg-muted transition-all active:scale-[0.98] shadow-sm"
                                        >
                                            <Users className="h-4 w-4 text-primary" />
                                            Create a Group Chat
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="group-details"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="p-6 space-y-6"
                        >
                            <DialogHeader>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setView('SELECT_MEMBERS')}
                                        className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                    <div className="text-left">
                                        <DialogTitle className="text-xl font-bold text-foreground">
                                            Group Details
                                        </DialogTitle>
                                        <p className="text-xs text-muted-foreground mt-1">Provide a name and icon for your group</p>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="space-y-6">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="relative group cursor-pointer">
                                        <div className="h-24 w-24 rounded-2xl bg-muted border-2 border-dashed border-border flex flex-col items-center justify-center group-hover:border-primary/50 group-hover:bg-primary/5 transition-all overflow-hidden shadow-inner">
                                            {groupIcon ? (
                                                <img src={groupIcon} alt="Group Icon" className="h-full w-full object-cover" />
                                            ) : (
                                                <>
                                                    <ImageIcon className="h-6 w-6 text-muted-foreground mb-2 group-hover:text-primary transition-colors" />
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Add Icon</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-md text-primary-foreground transform group-hover:scale-110 transition-transform ring-2 ring-card">
                                            <Plus className="h-4 w-4" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Group Name</label>
                                    <Input
                                        value={groupName}
                                        onChange={(e) => setGroupName(e.target.value)}
                                        placeholder="Enter a descriptive name"
                                        className="h-11 w-full px-4 rounded-xl bg-background border-border text-sm font-semibold text-foreground focus-visible:ring-primary/20 shadow-sm"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Selected Members</span>
                                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{groupParticipants.length} people</span>
                                    </div>
                                    <div className="h-20 bg-background rounded-xl border border-border p-3 flex items-center gap-3 overflow-x-auto no-scrollbar shadow-inner">
                                        <button
                                            onClick={() => setView('SELECT_MEMBERS')}
                                            className="h-12 w-12 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-all shrink-0"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </button>
                                        <AnimatePresence>
                                            {groupParticipants.map((p) => (
                                                <motion.div
                                                    key={p.id}
                                                    initial={{ scale: 0, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    exit={{ scale: 0, opacity: 0 }}
                                                    className="relative shrink-0"
                                                >
                                                    <Avatar className="h-12 w-12 border border-border shadow-md ring-2 ring-background">
                                                        <AvatarImage src={p.avatar_url} />
                                                        <AvatarFallback className="bg-primary/20 text-primary font-bold text-[10px]">{p.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <button
                                                        onClick={() => toggleParticipant(p)}
                                                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center border-2 border-background hover:scale-110 transition-transform"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <Button
                                    onClick={handleCreateGroup}
                                    disabled={!groupName || isCreating || groupParticipants.length === 0}
                                    className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold uppercase tracking-widest shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                                >
                                    {isCreating ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                                        <>
                                            <Check className="h-4 w-4" />
                                            Create Group
                                        </>
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    );
}

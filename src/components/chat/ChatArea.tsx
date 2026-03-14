import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from './MessageBubble';
import { Send, Smile, X, Search, Info, Plus, MessageSquare, Phone, Video, Loader2 } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Message } from '@/store/chatStore';

interface ChatAreaProps {
    currentUserId: string;
    activeChatId: string;
}

interface EmojiSelection {
    emoji: string;
}

const EMPTY_MESSAGES: Message[] = [];

// Utility to format sticky dates
function formatStickyDate(dateString: string) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    }
}

export function ChatArea({ currentUserId, activeChatId }: ChatAreaProps) {
    const { messages, setMessages, addMessage, replaceMessage, deleteMessage, chats, isRightSidebarOpen, setRightSidebarOpen, typingUsers, setTypingUser, setSearchOpen, setSearchQuery } = useChatStore();
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [sendError, setSendError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    const activeChatMessages = messages[activeChatId] ?? EMPTY_MESSAGES;
    const currentChatDetails = chats.find(c => c.id === activeChatId);
    const activeTyping = Array.from(typingUsers[activeChatId] || []).filter(uid => uid !== currentUserId);

    useEffect(() => {
        async function fetchMessages() {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('chat_id', activeChatId)
                .order('created_at', { ascending: true })
                .limit(50);

            if (!error && data) {
                setMessages(activeChatId, data.map(msg => ({
                    ...msg,
                    status: 'read'
                })) as Message[]);
            }
            setIsFetching(false);
        }

        if (!messages[activeChatId]) {
            setIsFetching(true);
            fetchMessages();
        } else {
            setIsFetching(false);
        }

        const channel = supabase.channel(`chat:${activeChatId}`)
            .on('broadcast', { event: 'typing' }, ({ payload }) => {
                setTypingUser(activeChatId, payload.user_id, payload.typing);
            })
            .subscribe();

        typingChannelRef.current = channel;

        return () => {
            typingChannelRef.current = null;
            supabase.removeChannel(channel);
        };
    }, [activeChatId, messages, setMessages, setTypingUser]);

    useEffect(() => {
        if (scrollRef.current) {
            const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollElement) {
                scrollElement.scrollTop = scrollElement.scrollHeight;
            }
        }
    }, [activeChatMessages, activeTyping]);

    const handleTyping = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setNewMessage(e.target.value);
        typingChannelRef.current?.send({
            type: 'broadcast',
            event: 'typing',
            payload: { user_id: currentUserId, typing: e.target.value.length > 0 },
        });
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || isSending) return;

        setIsSending(true);
        const textToSend = newMessage.trim();
        setNewMessage('');

        typingChannelRef.current?.send({
            type: 'broadcast',
            event: 'typing',
            payload: { user_id: currentUserId, typing: false },
        });

        const tempId = `temp-${Date.now()}`;
        const timestamp = new Date().toISOString();

        addMessage(activeChatId, {
            id: tempId,
            chat_id: activeChatId,
            sender_id: currentUserId,
            content: textToSend,
            type: 'TEXT',
            created_at: timestamp,
            is_edited: false,
            status: 'sent',
        });

        const { data, error } = await supabase
            .from('messages')
            .insert({
                chat_id: activeChatId,
                sender_id: currentUserId,
                content: textToSend,
                type: 'TEXT',
                reply_to: replyingTo?.id || null
            })
            .select('*')
            .single();

        if (error) {
            console.error('Failed to send message', error);
            await deleteMessage(activeChatId, tempId, false);
            setNewMessage(textToSend);
            setSendError('Failed to send message. Please try again.');
            setTimeout(() => setSendError(null), 4000);
        } else if (data) {
            replaceMessage(activeChatId, tempId, {
                ...(data as Message),
                status: 'read'
            });
        }

        setReplyingTo(null);
        setIsSending(false);
    };

    const handleSendMessage = async () => {
        await sendMessage();
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || isUploading) return;

        setIsUploading(true);
        setSendError(null);
        let tempId: string | null = null;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${activeChatId}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('chat-attachments')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('chat-attachments')
                .getPublicUrl(fileName);

            const type = file.type.startsWith('image/') ? 'IMAGE' : 'DOCUMENT';

            tempId = `temp-file-${Date.now()}`;

            addMessage(activeChatId, {
                id: tempId,
                chat_id: activeChatId,
                sender_id: currentUserId,
                content: `Sent a ${type.toLowerCase()}`,
                type: type,
                created_at: new Date().toISOString(),
                is_edited: false,
                status: 'sent',
                file_url: publicUrl,
                file_type: file.type
            });

            const { data: insertedMessage, error: msgError } = await supabase
                .from('messages')
                .insert({
                    chat_id: activeChatId,
                    sender_id: currentUserId,
                    content: `Sent a ${type.toLowerCase()}`,
                    type: type,
                    file_url: publicUrl,
                    file_type: file.type
                })
                .select('*')
                .single();

            if (msgError) throw msgError;
            if (insertedMessage) {
                replaceMessage(activeChatId, tempId, {
                    ...(insertedMessage as Message),
                    status: 'read'
                });
            }

        } catch (error) {
            console.error('Upload failed', error);
            if (tempId) {
                await deleteMessage(activeChatId, tempId, false);
            }
            setSendError('Failed to upload file. Please try again.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const onEmojiClick = (emojiData: EmojiSelection) => {
        setNewMessage(prev => prev + emojiData.emoji);
        setShowEmojiPicker(false);
    };

    const openGifSearch = () => {
        const query = encodeURIComponent(newMessage.trim() || 'reaction gif');
        window.open(`https://tenor.com/search/${query}-gifs`, '_blank', 'noopener,noreferrer');
    };

    const startCall = (video: boolean) => {
        const room = `qwikchat-${activeChatId}`;
        const suffix = video ? '' : '#config.startWithVideoMuted=true';
        window.open(`https://meet.jit.si/${room}${suffix}`, '_blank', 'noopener,noreferrer');
    };

    const openSearch = () => {
        setSearchQuery(currentChatDetails?.name || '');
        setSearchOpen(true);
    };

    const handleDelete = async (messageId: string, forEveryone: boolean) => {
        try {
            await deleteMessage(activeChatId, messageId, forEveryone);
        } catch (error) {
            console.error('Failed to delete message', error);
            setSendError('Failed to delete message. Please try again.');
            setTimeout(() => setSendError(null), 4000);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative flex h-full min-w-0 flex-col overflow-hidden bg-background"
        >
            {currentChatDetails ? (
                <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top,_hsl(var(--secondary)/0.3),_transparent_38%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--card)))]">
                    {/* -- Chat Header -- */}
                    <div className="glass-panel z-20 flex h-16 shrink-0 items-center justify-between px-3 sm:px-4 md:h-[var(--header-height)] md:px-6">
                        <div className="flex min-w-0 items-center gap-3 md:gap-4">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="relative hidden cursor-pointer group sm:block"
                            >
                                <Avatar className="h-10 w-10 border border-border/60 bg-card shadow-lg transition-transform group-hover:scale-105">
                                    <AvatarImage src={currentChatDetails.avatar_url} />
                                    <AvatarFallback className="bg-primary/12 text-foreground font-semibold text-xs uppercase">
                                        {currentChatDetails.name?.substring(0, 2) || '??'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary border-2 border-card shadow-sm" />
                            </motion.div>
                            <div className="flex min-w-0 flex-col">
                                <h2 className="mb-1 truncate text-sm font-semibold leading-none text-foreground/90">{currentChatDetails.name}</h2>
                                <div className="hidden items-center gap-2 sm:flex">
                                    <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/80">End-to-end encrypted</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <div className="mr-1 flex items-center rounded-xl border border-border/60 bg-card/70 p-1 shadow-sm">
                                <Button variant="ghost" size="icon" className="hidden h-8 w-8 rounded-lg text-muted-foreground/70 transition-all hover:bg-accent hover:text-foreground sm:inline-flex" onClick={() => startCall(false)}>
                                    <Phone className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="hidden h-8 w-8 rounded-lg text-muted-foreground/70 transition-all hover:bg-accent hover:text-foreground sm:inline-flex" onClick={() => startCall(true)}>
                                    <Video className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-accent transition-all" onClick={openSearch}>
                                    <Search className="h-4 w-4" />
                                </Button>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-9 w-9 rounded-lg transition-all",
                                    isRightSidebarOpen ? "bg-accent text-foreground" : "text-muted-foreground/70 border border-border/60 bg-card/70 hover:bg-accent hover:text-foreground"
                                )}
                                onClick={() => setRightSidebarOpen(!isRightSidebarOpen)}
                            >
                                <Info className="h-[18px] w-[18px]" />
                            </Button>
                        </div>
                    </div>

                    {/* -- Messages -- */}
                    <ScrollArea ref={scrollRef} className="flex-1 px-3 sm:px-4 md:px-6">
                        <div className="w-full pb-6 pt-6 sm:pt-10">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-10 hidden flex-col items-center sm:flex"
                            >
                                <div className="relative mb-6">
                                    <Avatar className="h-[88px] w-[88px] border border-border/60 bg-card shadow-2xl">
                                        <AvatarImage src={currentChatDetails.avatar_url} />
                                        <AvatarFallback className="text-2xl font-semibold bg-primary/12 text-foreground/80">
                                            {currentChatDetails.name?.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute -bottom-1 -right-1 h-[26px] w-[26px] rounded-full bg-primary/90 flex items-center justify-center border-[3px] border-card shadow-lg">
                                        <MessageSquare className="h-3 w-3 text-foreground/80" />
                                    </div>
                                </div>
                                <h3 className="text-[22px] font-bold text-foreground mb-2 tracking-tight">{currentChatDetails.name}</h3>
                                <p className="text-[10px] text-muted-foreground/80 uppercase tracking-widest font-bold">Secure connection established</p>

                                <div className="mt-6 flex gap-3">
                                    <button className="px-6 py-2.5 rounded-[100px] bg-card/90 text-[10px] font-bold text-foreground/80 uppercase tracking-wider hover:bg-accent transition-all border border-border/60 shadow-sm">View Profile</button>
                                    <button className="px-6 py-2.5 rounded-[100px] bg-card/90 text-[10px] font-bold text-foreground/80 uppercase tracking-wider hover:bg-accent transition-all border border-border/60 shadow-sm">Media & Files</button>
                                </div>
                            </motion.div>

                            <div className="mt-4 space-y-1">
                                {isFetching ? (
                                    Array.from({ length: 4 }).map((_, i) => (
                                            <div key={i} className={cn("flex w-full mb-6", i % 2 === 0 ? "justify-end" : "justify-start")}>
                                                <div className="flex gap-3 items-end opacity-50 animate-pulse">
                                                {i % 2 !== 0 && <div className="h-10 w-10 rounded-full bg-card border border-border/60" />}
                                                <div className={cn("h-[60px] w-[200px] rounded-[20px] bg-card border border-border/60", i % 2 === 0 ? "rounded-br-[4px]" : "rounded-bl-[4px]")} />
                                                </div>
                                            </div>
                                    ))
                                ) : (
                                    activeChatMessages.map((msg, index: number) => {
                                        const prevMsg = activeChatMessages[index - 1];
                                        const nextMsg = activeChatMessages[index + 1];

                                        const msgDate = new Date(msg.created_at);
                                        const prevMsgDate = prevMsg ? new Date(prevMsg.created_at) : null;

                                        const showDateHeader = !prevMsg || formatStickyDate(msg.created_at) !== formatStickyDate(prevMsg.created_at);

                                        const timeDiffPrev = prevMsg ? msgDate.getTime() - prevMsgDate!.getTime() : 0;
                                        const timeDiffNext = nextMsg ? new Date(nextMsg.created_at).getTime() - msgDate.getTime() : 0;

                                        const isGroupStart = !prevMsg || prevMsg.sender_id !== msg.sender_id || timeDiffPrev > 5 * 60 * 1000 || showDateHeader;
                                        const isGroupEnd = !nextMsg || nextMsg.sender_id !== msg.sender_id || timeDiffNext > 5 * 60 * 1000 || (nextMsg && formatStickyDate(nextMsg.created_at) !== formatStickyDate(msg.created_at));

                                        return (
                                            <div key={msg.id} className="flex flex-col w-full">
                                                {showDateHeader && (
                                                    <div className="flex justify-center my-6">
                                                        <div className="bg-card/80 backdrop-blur-md border border-border/60 px-4 py-1.5 rounded-[100px] shadow-sm">
                                                            <span className="text-[10px] font-bold text-muted-foreground/90 uppercase tracking-widest">{formatStickyDate(msg.created_at)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <MessageBubble
                                                        {...msg}
                                                        isCurrentUser={msg.sender_id === currentUserId}
                                                        senderName={msg.sender_id === currentUserId ? 'Me' : currentChatDetails.name}
                                                        avatar={msg.sender_id === currentUserId ? undefined : currentChatDetails.avatar_url}
                                                        onReply={msg.is_deleted_for_everyone ? undefined : () => setReplyingTo(msg)}
                                                        onDeleteForMe={() => void handleDelete(msg.id, false)}
                                                        onDeleteForEveryone={msg.sender_id === currentUserId ? () => void handleDelete(msg.id, true) : undefined}
                                                        isGroupStart={isGroupStart}
                                                        isGroupEnd={isGroupEnd}
                                                        bubbleStyle={useChatStore.getState().appearanceSettings.bubbleStyle}
                                                        fontSize={useChatStore.getState().chatBehavior.fontSize}
                                                    />
                                                </motion.div>
                                            </div>
                                        );
                                    })
                                )}

                                <AnimatePresence>
                                    {activeTyping.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 5 }}
                                            className="flex items-center gap-2 ml-1"
                                        >
                                                <div className="flex gap-1.5 px-3 py-2 bg-card border border-border/60 rounded-full shadow-sm">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                                            </div>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">is typing...</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </ScrollArea>

                    {/* -- Input Bar -- */}
                    <div className="z-20 w-full shrink-0 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 sm:px-4 md:px-6 md:pb-5">
                        <AnimatePresence>
                            {replyingTo && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="mb-2 p-3 bg-card/90 border border-border/60 rounded-2xl flex items-center justify-between shadow-lg"
                                >
                                    <div className="flex min-w-0 flex-col">
                                        <span className="text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-widest mb-1">Replying to message</span>
                                        <span className="max-w-[calc(100vw-8rem)] truncate text-sm text-foreground/90 sm:max-w-md">"{replyingTo.content}"</span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-accent" onClick={() => setReplyingTo(null)}>
                                        <X className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex items-end gap-1.5 rounded-2xl border border-border/60 bg-card/90 p-1.5 shadow-2xl backdrop-blur-md md:gap-3">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="mb-0.5 h-10 w-10 shrink-0 rounded-xl text-muted-foreground/60 transition-all hover:bg-accent hover:text-foreground md:h-11 md:w-11"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                            >
                                {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-6 w-6" />}
                            </Button>

                            <textarea
                                value={newMessage}
                                onChange={(e) => {
                                    handleTyping(e);
                                }}
                                onKeyDown={(e) => {
                                    const chatBehavior = useChatStore.getState().chatBehavior;
                                    if (e.key === 'Enter' && !e.shiftKey && chatBehavior.enterToSend) {
                                        e.preventDefault();
                                        void sendMessage();
                                    }
                                }}
                                placeholder="Type a message..."
                                className="min-h-[48px] max-h-32 flex-1 resize-none border-none bg-transparent px-2 py-3 text-sm font-medium text-foreground/90 placeholder:text-muted-foreground/60 focus:ring-0 md:min-h-[52px] md:py-3.5 md:text-[15px]"
                                rows={1}
                                onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = '14px';
                                    target.style.height = `${target.scrollHeight}px`;
                                }}
                            />

                            <div className="mb-0.5 flex shrink-0 items-center gap-1 pr-0.5 sm:pr-1">
                                <div className="hidden md:flex items-center gap-1 mr-2 opacity-60">
                                    {/* Input Feature Previews (Voice + GIF) */}
                                    <Button type="button" variant="ghost" size="icon" className="h-11 w-11 hover:text-foreground hover:bg-accent rounded-xl transition-all" onClick={openGifSearch}>
                                        <span className="font-bold text-[12px] uppercase text-muted-foreground tracking-widest leading-none">GIF</span>
                                    </Button>
                                </div>

                                <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                                    <PopoverTrigger asChild>
                                        <Button type="button" variant="ghost" size="icon" className="h-11 w-11 text-muted-foreground/60 hover:text-foreground hover:bg-accent rounded-xl transition-all">
                                            <Smile className="h-[22px] w-[22px]" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent side="top" align="end" className="p-0 border-none bg-transparent shadow-none w-auto mb-4">
                                        <EmojiPicker
                                            onEmojiClick={onEmojiClick}
                                            previewConfig={{ showPreview: false }}
                                            width={280}
                                        />
                                    </PopoverContent>
                                </Popover>
                                <Button
                                    type="button"
                                    onClick={handleSendMessage}
                                    disabled={!newMessage.trim() || isSending}
                                    variant="ghost"
                                    className={cn(
                                        "h-11 w-11 rounded-xl transition-all px-0 flex items-center justify-center",
                                        newMessage.trim()
                                            ? "text-foreground hover:text-foreground hover:bg-primary/10"
                                            : "text-muted-foreground/40 hover:bg-transparent cursor-default"
                                    )}
                                >
                                    {isSending ? <Loader2 className="h-[20px] w-[20px] animate-spin" /> : <Send className="h-[20px] w-[20px]" />}
                                </Button>
                            </div>
                        </div>

                        {sendError && (
                            <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute bottom-full left-1/2 mb-2 w-[calc(100%-1.5rem)] max-w-sm -translate-x-1/2 rounded-[28px] border border-red-500/20 bg-card/95 px-4 py-2 text-center text-xs font-semibold text-red-500 shadow-lg backdrop-blur-sm"
                            >
                                {sendError}
                            </motion.div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-background">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="h-24 w-24 rounded-3xl bg-card border border-border flex items-center justify-center mb-6 shadow-xl"
                    >
                        <MessageSquare className="h-10 w-10 text-primary" />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Select a conversation</h2>
                    <p className="text-muted-foreground max-w-[240px] font-bold text-[10px] uppercase tracking-widest leading-relaxed">
                        Choose a chat from the sidebar to start messaging.
                    </p>
                </div>
            )}
        </motion.div>
    );
}

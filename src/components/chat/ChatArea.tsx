import { useState, useRef, useEffect } from 'react';
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

interface ChatAreaProps {
    currentUserId: string;
    activeChatId: string;
}

export function ChatArea({ currentUserId, activeChatId }: ChatAreaProps) {
    const { messages, setMessages, addMessage, chats, isRightSidebarOpen, setRightSidebarOpen, typingUsers, setTypingUser } = useChatStore();
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [replyingTo, setReplyingTo] = useState<any>(null);
    const [sendError, setSendError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeChatMessages = messages[activeChatId] || [];
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
                })) as any);
            }
        }

        if (!messages[activeChatId]) {
            fetchMessages();
        }

        const channel = supabase.channel(`chat:${activeChatId}`)
            .on('broadcast', { event: 'typing' }, ({ payload }) => {
                setTypingUser(activeChatId, payload.user_id, payload.typing);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeChatId, setMessages, setTypingUser]);

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
        supabase.channel(`chat:${activeChatId}`).send({
            type: 'broadcast',
            event: 'typing',
            payload: { user_id: currentUserId, typing: e.target.value.length > 0 },
        });
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || isSending) return;

        setIsSending(true);
        const textToSend = newMessage.trim();
        setNewMessage('');

        supabase.channel(`chat:${activeChatId}`).send({
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

        const { error } = await supabase
            .from('messages')
            .insert({
                chat_id: activeChatId,
                sender_id: currentUserId,
                content: textToSend,
                type: 'TEXT',
                reply_to: replyingTo?.id || null
            });

        if (error) {
            console.error('Failed to send message', error);
            setSendError('Failed to send message. Please try again.');
            setTimeout(() => setSendError(null), 4000);
        }

        setReplyingTo(null);
        setIsSending(false);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || isUploading) return;

        setIsUploading(true);
        setSendError(null);

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

            const { error: msgError } = await supabase
                .from('messages')
                .insert({
                    chat_id: activeChatId,
                    sender_id: currentUserId,
                    content: `Sent a ${type.toLowerCase()}`,
                    type: type,
                    file_url: publicUrl,
                    file_type: file.type
                });

            if (msgError) throw msgError;

        } catch (error: any) {
            console.error('Upload failed', error);
            setSendError('Failed to upload file. Please try again.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const onEmojiClick = (emojiData: any) => {
        setNewMessage(prev => prev + emojiData.emoji);
        setShowEmojiPicker(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-full relative overflow-hidden bg-background"
        >
            {currentChatDetails ? (
                <>
                    {/* -- Chat Header -- */}
                    <div className="h-[var(--header-height)] flex items-center justify-between px-6 glass-panel shrink-0 z-20">
                        <div className="flex items-center gap-4">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="relative group cursor-pointer"
                            >
                                <Avatar className="h-10 w-10 border border-border shadow-md transition-transform group-hover:scale-105">
                                    <AvatarImage src={currentChatDetails.avatar_url} />
                                    <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs uppercase">
                                        {currentChatDetails.name?.substring(0, 2) || '??'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background shadow-sm" />
                            </motion.div>
                            <div className="flex flex-col">
                                <h2 className="text-sm font-bold text-foreground leading-none mb-1">{currentChatDetails.name}</h2>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">End-to-end encrypted</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex items-center bg-muted/30 rounded-lg p-1 border border-border mr-1">
                                {[Phone, Video, Search].map((Icon) => (
                                    <Button key={Icon.name} variant="ghost" size="icon" className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                                        <Icon className="h-4 w-4" />
                                    </Button>
                                ))}
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-10 w-10 rounded-xl transition-all",
                                    isRightSidebarOpen ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/30 border border-border text-muted-foreground hover:text-foreground"
                                )}
                                onClick={() => setRightSidebarOpen(!isRightSidebarOpen)}
                            >
                                <Info className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* -- Messages -- */}
                    <ScrollArea ref={scrollRef} className="flex-1 px-6">
                        <div className="max-w-3xl mx-auto py-10">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col items-center mb-12"
                            >
                                <div className="relative mb-4">
                                    <Avatar className="h-20 w-20 border-2 border-border shadow-lg">
                                        <AvatarImage src={currentChatDetails.avatar_url} />
                                        <AvatarFallback className="text-xl font-bold bg-muted text-muted-foreground">
                                            {currentChatDetails.name?.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-lg bg-primary flex items-center justify-center border-2 border-background text-primary-foreground shadow-md">
                                        <MessageSquare className="h-3.5 w-3.5" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-foreground mb-1 tracking-tight">{currentChatDetails.name}</h3>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Secure connection established</p>

                                <div className="mt-6 flex gap-2">
                                    <button className="px-5 py-2 rounded-xl bg-muted/40 text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:bg-muted/60 hover:text-foreground transition-all border border-border/50">View Profile</button>
                                    <button className="px-5 py-2 rounded-xl bg-muted/40 text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:bg-muted/60 hover:text-foreground transition-all border border-border/50">Media & Files</button>
                                </div>
                            </motion.div>

                            <div className="space-y-6">
                                {activeChatMessages.map((msg: any) => (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <MessageBubble
                                            {...msg}
                                            isCurrentUser={msg.sender_id === currentUserId}
                                            senderName={msg.sender_id === currentUserId ? 'Me' : currentChatDetails.name}
                                            avatar={msg.sender_id === currentUserId ? undefined : currentChatDetails.avatar_url}
                                            onReply={() => setReplyingTo(msg)}
                                            bubbleStyle={useChatStore.getState().appearanceSettings.bubbleStyle}
                                            fontSize={useChatStore.getState().chatBehavior.fontSize}
                                        />
                                    </motion.div>
                                ))}

                                <AnimatePresence>
                                    {activeTyping.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 5 }}
                                            className="flex items-center gap-2 ml-1"
                                        >
                                            <div className="flex gap-1.5 px-3 py-2 bg-muted rounded-full">
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
                    <div className="px-6 pb-6 pt-2 shrink-0 max-w-3xl mx-auto w-full z-20">
                        <AnimatePresence>
                            {replyingTo && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="mb-3 p-3 bg-muted rounded-2xl border border-primary/20 flex items-center justify-between shadow-sm"
                                >
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-primary uppercase tracking-widest mb-1">Replying to message</span>
                                        <span className="text-xs text-muted-foreground truncate max-w-sm">"{replyingTo.content}"</span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-background/50" onClick={() => setReplyingTo(null)}>
                                        <X className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex items-end gap-2 bg-card border border-border rounded-2xl p-2 premium-shadow ring-1 ring-border/50">
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
                                className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all mb-0.5"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                            >
                                {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
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
                                        handleSendMessage(e as any);
                                    }
                                }}
                                placeholder="Type a message..."
                                className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-foreground placeholder:text-muted-foreground px-2 py-2.5 resize-none min-h-[44px] max-h-32"
                                rows={1}
                                onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    target.style.height = `${target.scrollHeight}px`;
                                }}
                            />

                            <div className="flex items-center gap-1 mb-0.5">
                                <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                                    <PopoverTrigger asChild>
                                        <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground rounded-xl transition-all">
                                            <Smile className="h-5 w-5" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent side="top" className="p-0 border-none bg-transparent shadow-none w-auto mb-4">
                                        <EmojiPicker
                                            onEmojiClick={onEmojiClick}
                                            theme={useChatStore.getState().theme === 'dark' ? 'dark' as any : 'light' as any}
                                        />
                                    </PopoverContent>
                                </Popover>
                                <Button
                                    onClick={handleSendMessage}
                                    disabled={!newMessage.trim() || isSending}
                                    className={cn(
                                        "h-10 w-10 rounded-xl transition-all",
                                        newMessage.trim()
                                            ? "bg-primary text-primary-foreground shadow-md"
                                            : "bg-muted text-muted-foreground"
                                    )}
                                >
                                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>

                        {sendError && (
                            <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-2 text-xs text-red-500 font-semibold text-center bg-red-500/10 rounded-xl py-2 border border-red-500/20"
                            >
                                {sendError}
                            </motion.div>
                        )}
                    </div>
                </>
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

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

            const tempId = `temp-file-${Date.now()}`;

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
                <div className="flex flex-col h-full bg-[#1e1f22]">
                    {/* -- Chat Header -- */}
                    <div className="h-[var(--header-height)] flex items-center justify-between px-6 shrink-0 z-20">
                        <div className="flex items-center gap-4">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="relative group cursor-pointer"
                            >
                                <Avatar className="h-10 w-10 bg-[#2b2d31] transition-transform group-hover:scale-105">
                                    <AvatarImage src={currentChatDetails.avatar_url} />
                                    <AvatarFallback className="bg-[#2b2d31] text-foreground font-semibold text-xs uppercase">
                                        {currentChatDetails.name?.substring(0, 2) || '??'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-[#1e1f22] shadow-sm" />
                            </motion.div>
                            <div className="flex flex-col">
                                <h2 className="text-sm font-semibold text-foreground/90 leading-none mb-1">{currentChatDetails.name}</h2>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] text-muted-foreground/80 uppercase tracking-wider font-semibold">End-to-end encrypted</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <div className="flex items-center rounded-lg p-1 mr-1">
                                {[Phone, Video, Search].map((Icon) => (
                                    <Button key={Icon.name} variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-[#2b2d31] transition-all">
                                        <Icon className="h-4 w-4" />
                                    </Button>
                                ))}
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-9 w-9 rounded-lg transition-all",
                                    isRightSidebarOpen ? "bg-[#2b2d31] text-foreground" : "text-muted-foreground/70 border border-[#2b2d31]/50 hover:bg-[#2b2d31] hover:text-foreground"
                                )}
                                onClick={() => setRightSidebarOpen(!isRightSidebarOpen)}
                            >
                                <Info className="h-[18px] w-[18px]" />
                            </Button>
                        </div>
                    </div>

                    {/* -- Messages -- */}
                    <ScrollArea ref={scrollRef} className="flex-1 px-6">
                        <div className="max-w-4xl mx-auto pt-24 pb-10">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col items-center mb-16"
                            >
                                <div className="relative mb-6">
                                    <Avatar className="h-[88px] w-[88px] bg-[#2b2d31]">
                                        <AvatarImage src={currentChatDetails.avatar_url} />
                                        <AvatarFallback className="text-2xl font-semibold bg-[#2b2d31] text-foreground/80">
                                            {currentChatDetails.name?.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute -bottom-1 -right-1 h-[26px] w-[26px] rounded-full bg-[#3f4148] flex items-center justify-center border-[3px] border-[#1e1f22]">
                                        <MessageSquare className="h-3 w-3 text-foreground/80" />
                                    </div>
                                </div>
                                <h3 className="text-[22px] font-bold text-white mb-2 tracking-tight">{currentChatDetails.name}</h3>
                                <p className="text-[10px] text-muted-foreground/80 uppercase tracking-widest font-bold">Secure connection established</p>

                                <div className="mt-8 flex gap-3">
                                    <button className="px-6 py-2.5 rounded-[100px] bg-[#2b2d31] text-[10px] font-bold text-foreground/80 uppercase tracking-wider hover:bg-[#3f4148] transition-all border border-transparent shadow-sm">View Profile</button>
                                    <button className="px-6 py-2.5 rounded-[100px] bg-[#2b2d31] text-[10px] font-bold text-foreground/80 uppercase tracking-wider hover:bg-[#3f4148] transition-all border border-transparent shadow-sm">Media & Files</button>
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
                    <div className="px-6 pb-8 pt-2 shrink-0 max-w-4xl mx-auto w-full z-20">
                        <AnimatePresence>
                            {replyingTo && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="mb-2 p-3 bg-[#2b2d31] rounded-2xl flex items-center justify-between"
                                >
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-widest mb-1">Replying to message</span>
                                        <span className="text-sm text-foreground/90 truncate max-w-md">"{replyingTo.content}"</span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-[#3f4148]" onClick={() => setReplyingTo(null)}>
                                        <X className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex items-end gap-3 bg-[#2b2d31] rounded-2xl p-1.5 shadow-md">
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
                                className="h-11 w-11 shrink-0 text-muted-foreground/60 hover:text-foreground hover:bg-[#3f4148] rounded-xl transition-all mb-0.5"
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
                                        handleSendMessage(e as any);
                                    }
                                }}
                                placeholder="Type a message..."
                                className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] font-medium text-foreground/90 placeholder:text-muted-foreground/60 px-2 py-3.5 resize-none min-h-[52px] max-h-32"
                                rows={1}
                                onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = '14px';
                                    target.style.height = `${target.scrollHeight}px`;
                                }}
                            />

                            <div className="flex items-center gap-1 mb-0.5 shrink-0 pr-1">
                                <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                                    <PopoverTrigger asChild>
                                        <Button type="button" variant="ghost" size="icon" className="h-11 w-11 text-muted-foreground/60 hover:text-foreground hover:bg-[#3f4148] rounded-xl transition-all">
                                            <Smile className="h-[22px] w-[22px]" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent side="top" align="end" className="p-0 border-none bg-transparent shadow-none w-auto mb-4">
                                        <EmojiPicker
                                            onEmojiClick={onEmojiClick}
                                            theme={'dark' as any}
                                            previewConfig={{ showPreview: false }}
                                        />
                                    </PopoverContent>
                                </Popover>
                                <Button
                                    onClick={handleSendMessage}
                                    disabled={!newMessage.trim() || isSending}
                                    variant="ghost"
                                    className={cn(
                                        "h-11 w-11 rounded-xl transition-all px-0 flex items-center justify-center",
                                        newMessage.trim()
                                            ? "text-foreground hover:text-foreground hover:bg-[#3f4148]"
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
                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max text-xs text-red-400 font-semibold bg-[#2b2d31]/90 backdrop-blur-sm px-4 py-2 rounded-[100px] border border-red-500/20 shadow-lg"
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

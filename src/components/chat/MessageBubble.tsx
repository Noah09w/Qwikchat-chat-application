import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
    Reply,
    MoreHorizontal,
    Check,
    CheckCheck,
    FileText,
    Download
} from 'lucide-react';
import { motion } from 'framer-motion';

interface MessageBubbleProps {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    status: 'sent' | 'delivered' | 'read';
    isCurrentUser: boolean;
    senderName?: string;
    avatar?: string;
    type?: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'SYSTEM' | 'FILE';
    file_url?: string;
    file_type?: string;
    onReply?: () => void;
    bubbleStyle?: 'modern' | 'compact' | 'classic';
    fontSize?: 'small' | 'medium' | 'large';
}

export function MessageBubble({
    content,
    created_at,
    status,
    isCurrentUser,
    senderName,
    avatar,
    type,
    file_url,
    file_type,
    onReply,
    bubbleStyle = 'modern',
    fontSize = 'medium'
}: MessageBubbleProps) {
    const time = new Date(created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const bubbleClasses = cn(
        "relative px-4 py-2.5 transition-all duration-200 premium-shadow",
        // Bubble Style Logic
        bubbleStyle === 'modern' && (isCurrentUser ? "rounded-2xl rounded-tr-none" : "rounded-2xl rounded-tl-none"),
        bubbleStyle === 'compact' && "rounded-lg",
        bubbleStyle === 'classic' && (isCurrentUser ? "rounded-2xl rounded-br-none" : "rounded-2xl rounded-bl-none"),

        // Colors
        isCurrentUser
            ? "bg-primary text-primary-foreground"
            : "bg-card text-foreground border border-border"
    );

    const fontClasses = cn(
        fontSize === 'small' && "text-[11px]",
        fontSize === 'medium' && "text-[13px]",
        fontSize === 'large' && "text-[15px]"
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={cn(
                "flex w-full mb-1 group",
                isCurrentUser ? "justify-end" : "justify-start"
            )}
        >
            <div className={cn(
                "flex max-w-[85%] md:max-w-[75%] gap-2",
                isCurrentUser ? "flex-row-reverse" : "flex-row"
            )}>
                {!isCurrentUser && (
                    <Avatar className="h-8 w-8 mt-auto border border-border shadow-sm shrink-0">
                        <AvatarImage src={avatar} />
                        <AvatarFallback className="bg-muted text-muted-foreground font-bold text-[10px]">
                            {senderName?.substring(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                    </Avatar>
                )}

                <div className="flex flex-col gap-1">
                    <div className={bubbleClasses}>
                        {/* Quick Actions */}
                        <div className={cn(
                            "absolute top-0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-1.5",
                            isCurrentUser ? "-left-20" : "-right-20"
                        )}>
                            <button
                                onClick={onReply}
                                className="h-8 w-8 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary transition-all shadow-sm"
                            >
                                <Reply className="h-4 w-4" />
                            </button>
                            <button className="h-8 w-8 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all shadow-sm">
                                <MoreHorizontal className="h-4 w-4" />
                            </button>
                        </div>

                        {type === 'IMAGE' && file_url ? (
                            <div className="mb-2">
                                <a href={file_url} target="_blank" rel="noopener noreferrer">
                                    <img src={file_url} alt="Shared image" className="max-w-[200px] md:max-w-xs rounded-xl cursor-pointer hover:opacity-90 transition-opacity object-cover" />
                                </a>
                            </div>
                        ) : (type === 'DOCUMENT' || type === 'FILE') && file_url ? (
                            <div className="mb-2 flex items-center gap-3 p-3 bg-background/20 rounded-xl border border-border/50 max-w-sm">
                                <FileText className="h-8 w-8 text-primary/80 shrink-0" />
                                <div className="flex flex-col flex-1 min-w-0">
                                    <span className="text-sm font-semibold truncate hover:underline cursor-pointer">
                                        <a href={file_url} target="_blank" rel="noopener noreferrer">Attachment</a>
                                    </span>
                                    <span className="text-xs text-muted-foreground uppercase">{file_type?.split('/').pop() || 'File'}</span>
                                </div>
                                <a href={file_url} download target="_blank" rel="noopener noreferrer" className="p-2 bg-background/40 hover:bg-background/80 rounded-lg transition-colors shrink-0">
                                    <Download className="h-4 w-4" />
                                </a>
                            </div>
                        ) : null}

                        <p className={cn("font-medium leading-relaxed whitespace-pre-wrap break-words", fontClasses)}>{content}</p>

                        <div className={cn(
                            "flex items-center gap-1.5 mt-1.5",
                            isCurrentUser ? "justify-end" : "justify-start"
                        )}>
                            <span className={cn(
                                "text-[9px] font-bold uppercase tracking-widest tabular-nums",
                                isCurrentUser ? "text-primary-foreground/60" : "text-muted-foreground/80"
                            )}>
                                {time}
                            </span>
                            {isCurrentUser && (
                                <div className="flex items-center ml-0.5">
                                    {status === 'sent' && <Check className="h-3 w-3 text-primary-foreground/40" />}
                                    {status === 'delivered' && <CheckCheck className="h-3 w-3 text-primary-foreground/40" />}
                                    {status === 'read' && <CheckCheck className="h-3 w-3 text-primary-foreground/90" />}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

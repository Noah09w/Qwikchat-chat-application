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
        "relative transition-all duration-200 shadow-sm overflow-hidden",
        // Bubble Style Logic
        bubbleStyle === 'modern' && (isCurrentUser ? "rounded-[20px] rounded-br-[4px]" : "rounded-[20px] rounded-tl-[4px]"),
        bubbleStyle === 'compact' && "rounded-lg",
        bubbleStyle === 'classic' && (isCurrentUser ? "rounded-xl rounded-br-none" : "rounded-xl rounded-bl-none"),

        // Colors
        isCurrentUser
            ? "bg-[#47525d] text-[#f2f3f5]"
            : "bg-[#2b2d31] text-[#f2f3f5]"
    );

    const fontClasses = cn(
        fontSize === 'small' && "text-[13px]",
        fontSize === 'medium' && "text-[15px]",
        fontSize === 'large' && "text-[17px]"
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
                            <div className="relative group/image">
                                <a href={file_url} target="_blank" rel="noopener noreferrer">
                                    <img src={file_url} alt="Shared image" className="max-w-[280px] md:max-w-sm w-full cursor-pointer hover:opacity-95 transition-opacity object-cover block" />
                                </a>
                                {content && content !== `Sent a image` && (
                                    <p className={cn("px-4 py-2.5 font-medium leading-relaxed whitespace-pre-wrap break-words", fontClasses)}>{content}</p>
                                )}
                                <div className={cn(
                                    "flex items-center gap-1.5 px-3 pb-2 pt-1",
                                    (!content || content === `Sent a image`) && "absolute bottom-0 right-0 bg-gradient-to-t from-black/60 to-transparent w-full justify-end pt-4",
                                    content && content !== `Sent a image` && isCurrentUser ? "justify-end" : "justify-start"
                                )}>
                                    <span className={cn(
                                        "text-[10px] font-semibold tracking-wide",
                                        (!content || content === `Sent a image`) ? "text-white/90 drop-shadow-md" : "text-white/60"
                                    )}>
                                        {time}
                                    </span>
                                    {isCurrentUser && (
                                        <div className="flex items-center ml-0.5">
                                            {status === 'sent' && <Check className={cn("h-3.5 w-3.5", (!content || content === `Sent a image`) ? "text-white/80 drop-shadow-md" : "text-white/60")} />}
                                            {status === 'delivered' && <CheckCheck className={cn("h-3.5 w-3.5", (!content || content === `Sent a image`) ? "text-white/80 drop-shadow-md" : "text-white/60")} />}
                                            {status === 'read' && <CheckCheck className={cn("h-3.5 w-3.5", (!content || content === `Sent a image`) ? "text-white" : "text-white/90")} />}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="px-4 py-2.5">
                                {(type === 'DOCUMENT' || type === 'FILE') && file_url && (
                                    <div className="mb-2 flex items-center gap-3 p-3 bg-[#1e1f22]/50 rounded-xl max-w-sm">
                                        <FileText className="h-8 w-8 text-[#f2f3f5]/80 shrink-0" />
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <span className="text-sm font-semibold truncate hover:underline cursor-pointer text-[#f2f3f5]">
                                                <a href={file_url} target="_blank" rel="noopener noreferrer">Attachment</a>
                                            </span>
                                            <span className="text-xs text-muted-foreground uppercase">{file_type?.split('/').pop() || 'File'}</span>
                                        </div>
                                        <a href={file_url} download target="_blank" rel="noopener noreferrer" className="p-2 bg-[#2b2d31] hover:bg-[#3f4148] rounded-lg transition-colors shrink-0 text-[#f2f3f5]">
                                            <Download className="h-4 w-4" />
                                        </a>
                                    </div>
                                )}

                                <p className={cn("font-medium leading-relaxed whitespace-pre-wrap break-words", fontClasses)}>{content}</p>

                                <div className={cn(
                                    "flex items-center gap-1.5 mt-1.5",
                                    isCurrentUser ? "justify-end" : "justify-start"
                                )}>
                                    <span className="text-[10px] font-semibold text-white/50 tracking-wide">
                                        {time}
                                    </span>
                                    {isCurrentUser && (
                                        <div className="flex items-center ml-0.5">
                                            {status === 'sent' && <Check className="h-3.5 w-3.5 text-white/40" />}
                                            {status === 'delivered' && <CheckCheck className="h-3.5 w-3.5 text-white/40" />}
                                            {status === 'read' && <CheckCheck className="h-3.5 w-3.5 text-white/80" />}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

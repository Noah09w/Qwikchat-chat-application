import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
    Reply,
    MoreHorizontal,
    Check,
    CheckCheck,
    FileText,
    Download,
    Trash2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

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
    isGroupStart?: boolean;
    isGroupEnd?: boolean;
    onReply?: () => void;
    onDeleteForMe?: () => void;
    onDeleteForEveryone?: () => void;
    bubbleStyle?: 'modern' | 'compact' | 'classic';
    fontSize?: 'small' | 'medium' | 'large';
    is_deleted_for_everyone?: boolean;
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
    isGroupStart = true,
    isGroupEnd = true,
    onReply,
    onDeleteForMe,
    onDeleteForEveryone,
    bubbleStyle = 'modern',
    fontSize = 'medium',
    is_deleted_for_everyone = false
}: MessageBubbleProps) {
    const time = new Date(created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isDeleted = is_deleted_for_everyone;
    const handleCopy = async () => {
        const textToCopy = file_url ? `${content}\n${file_url}` : content;
        if (!textToCopy) return;

        try {
            await navigator.clipboard.writeText(textToCopy);
        } catch (error) {
            console.error('Failed to copy message contents', error);
        }
    };

    // Grouping Radius Logic
    let radiusClass = "rounded-[20px]";
    if (bubbleStyle === 'modern') {
        if (isCurrentUser) {
            radiusClass = "rounded-[20px] rounded-tr-[4px] rounded-br-[4px]";
            if (isGroupStart && !isGroupEnd) radiusClass = "rounded-[20px] rounded-tr-[20px] rounded-br-[4px]";
            if (!isGroupStart && isGroupEnd) radiusClass = "rounded-[20px] rounded-tr-[4px] rounded-br-[20px]";
            if (isGroupStart && isGroupEnd) radiusClass = "rounded-[20px] rounded-br-[4px]";
        } else {
            radiusClass = "rounded-[20px] rounded-tl-[4px] rounded-bl-[4px]";
            if (isGroupStart && !isGroupEnd) radiusClass = "rounded-[20px] rounded-tl-[20px] rounded-bl-[4px]";
            if (!isGroupStart && isGroupEnd) radiusClass = "rounded-[20px] rounded-tl-[4px] rounded-bl-[20px]";
            if (isGroupStart && isGroupEnd) radiusClass = "rounded-[20px] rounded-tl-[4px]";
        }
    } else if (bubbleStyle === 'compact') {
        radiusClass = "rounded-lg";
    }

    const bubbleClasses = cn(
        "relative transition-all duration-200 overflow-hidden group/bubble",
        radiusClass,
        // Colors and Hover background hint
        isDeleted
            ? "border border-dashed border-border/80 bg-card/60 text-muted-foreground shadow-sm"
            : isCurrentUser
                ? "bg-primary text-primary-foreground hover:bg-primary/92 shadow-lg shadow-primary/10"
                : "border border-border/60 bg-card text-foreground hover:bg-accent/60 shadow-sm"
    );

    const fontClasses = cn(
        fontSize === 'small' && "text-[14px]",
        fontSize === 'medium' && "text-[15px]",
        fontSize === 'large' && "text-[16px]"
    );

    const actionButtonClass = "h-8 w-8 rounded-full bg-background/95 border border-border/60 flex items-center justify-center text-muted-foreground/80 hover:text-foreground hover:bg-accent transition-all shadow-md";

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={cn(
                "flex w-full group/message transition-colors",
                isCurrentUser ? "justify-end" : "justify-start",
                isGroupEnd ? "mb-[16px]" : "mb-[4px]"
            )}
        >
            <div className={cn(
                "flex max-w-[85%] md:max-w-[75%] gap-3 items-end",
                isCurrentUser ? "flex-row-reverse" : "flex-row"
            )}>
                {!isCurrentUser && (
                    <div className="w-10 shrink-0 flex justify-center">
                        {isGroupEnd ? (
                            <Avatar className="h-10 w-10 border border-border/60 bg-card shadow-sm">
                                <AvatarImage src={avatar} />
                                <AvatarFallback className="bg-accent text-foreground font-semibold text-xs">
                                    {senderName?.substring(0, 2).toUpperCase() || 'U'}
                                </AvatarFallback>
                            </Avatar>
                        ) : (
                            <div className="h-10 w-10" />
                        )}
                    </div>
                )}

                <div className="flex flex-col gap-1 relative max-w-full">
                    <div className="flex items-center gap-2 relative">
                        {/* Hover Quick Actions */}
                        <div className={cn(
                            "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/message:opacity-100 transition-all duration-200 flex items-center gap-1 z-10",
                            isCurrentUser ? "-left-24" : "-right-24"
                        )}>
                            {onReply && !isDeleted && (
                                <button
                                    type="button"
                                    onClick={onReply}
                                    className={actionButtonClass}
                                >
                                    <Reply className="h-4 w-4" />
                                </button>
                            )}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        title="Message actions"
                                        className={actionButtonClass}
                                    >
                                        <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent
                                    side={isCurrentUser ? 'left' : 'right'}
                                    align="center"
                                    className="w-44 rounded-2xl border border-border/70 bg-popover/95 p-2 shadow-2xl backdrop-blur-md"
                                >
                                    <div className="flex flex-col gap-1">
                                        <Button type="button" variant="ghost" className="justify-start rounded-xl" onClick={handleCopy}>
                                            Copy
                                        </Button>
                                        {onDeleteForMe && (
                                            <Button type="button" variant="ghost" className="justify-start rounded-xl text-destructive hover:text-destructive" onClick={onDeleteForMe}>
                                                <Trash2 className="h-4 w-4" />
                                                Delete for me
                                            </Button>
                                        )}
                                        {onDeleteForEveryone && (
                                            <Button type="button" variant="ghost" className="justify-start rounded-xl text-destructive hover:text-destructive" onClick={onDeleteForEveryone}>
                                                <Trash2 className="h-4 w-4" />
                                                Delete for everyone
                                            </Button>
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className={bubbleClasses}>
                            {isDeleted ? (
                                <div className="px-4 py-3">
                                    <p className={cn("italic leading-relaxed", fontClasses)}>This message was deleted.</p>
                                </div>
                            ) : type === 'IMAGE' && file_url ? (
                                <div className="relative group/image">
                                    <a href={file_url} target="_blank" rel="noopener noreferrer">
                                        <img src={file_url} alt="Shared image" className="max-w-[280px] md:max-w-sm w-full cursor-pointer hover:opacity-95 transition-opacity object-cover block" />
                                    </a>
                                    {content && content !== `Sent a image` && (
                                        <p className={cn("px-4 py-2.5 font-medium leading-relaxed whitespace-pre-wrap break-words", fontClasses)}>{content}</p>
                                    )}
                                </div>
                            ) : (
                                <div className="px-4 py-3">
                                    {(type === 'DOCUMENT' || type === 'FILE') && file_url && (
                                        <div className="mb-2 flex items-center gap-3 p-3 bg-background/60 rounded-xl max-w-sm border border-border/50">
                                            <FileText className="h-8 w-8 text-foreground/80 shrink-0" />
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <span className="text-sm font-semibold truncate hover:underline cursor-pointer text-inherit">
                                                    <a href={file_url} target="_blank" rel="noopener noreferrer">Attachment</a>
                                                </span>
                                                <span className="text-xs text-muted-foreground uppercase">{file_type?.split('/').pop() || 'File'}</span>
                                            </div>
                                            <a href={file_url} download target="_blank" rel="noopener noreferrer" className="p-2 bg-background/80 hover:bg-accent rounded-lg transition-colors shrink-0 text-inherit">
                                                <Download className="h-4 w-4" />
                                            </a>
                                        </div>
                                    )}

                                    <p className={cn("leading-relaxed whitespace-pre-wrap break-words font-medium", fontClasses)}>{content}</p>
                                </div>
                            )}
                        </div>

                        {/* External Hover/End Timestamp */}
                        <div className={cn(
                            "absolute top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 group-hover/message:opacity-100 transition-opacity duration-200",
                            isCurrentUser ? "-left-14" : "-right-14"
                        )}>
                            <span className="text-[10px] font-semibold text-muted-foreground/50 tracking-wide whitespace-nowrap">
                                {time}
                            </span>
                        </div>
                    </div>

                    {isCurrentUser && (isGroupEnd || type === 'IMAGE') && (
                        <div className="flex items-center justify-end mr-0.5 mt-0.5 h-[14px]">
                            {status === 'sent' && <Check className="h-3.5 w-3.5 text-muted-foreground/40" />}
                            {status === 'delivered' && <CheckCheck className="h-3.5 w-3.5 text-muted-foreground/40" />}
                            {status === 'read' && <CheckCheck className="h-3.5 w-3.5 text-primary" />}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

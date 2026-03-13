import { X, ChevronRight, Bell, Shield, Users, Ban, Flag, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useChatStore } from '@/store/chatStore';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export function RightSidebar() {
    const { activeChatId, chats, messages, setRightSidebarOpen, toggleArchive, notifications, setNotifications } = useChatStore();
    const navigate = useNavigate();
    const chat = chats.find(c => c.id === activeChatId);

    if (!chat) return null;

    const chatMessages = activeChatId ? messages[activeChatId] || [] : [];
    const mediaMessages = chatMessages.filter(m => m.type === 'IMAGE' && m.file_url);

    const openReportEmail = () => {
        const subject = encodeURIComponent(`Report conversation: ${chat.name}`);
        const body = encodeURIComponent(`Please review conversation "${chat.name}" (chat id: ${chat.id}).`);
        window.location.href = `mailto:support@qwikchat.app?subject=${subject}&body=${body}`;
    };

    return (
        <div className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[380px] animate-in slide-in-from-right duration-300 flex-col border-l border-border bg-card md:relative md:inset-auto md:right-auto md:z-30 md:w-[320px]">
            {/* Header */}
            <div className="glass-panel flex h-16 shrink-0 items-center justify-between px-4 md:h-[var(--header-height)] md:px-6">
                <h2 className="text-sm font-bold text-foreground tracking-tight">Contact Info</h2>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
                    onClick={() => setRightSidebarOpen(false)}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-6 space-y-8">
                    {/* Profile Section */}
                    <div className="flex flex-col items-center text-center">
                        <Avatar className="h-20 w-20 mb-4 border border-border premium-shadow">
                            <AvatarImage src={chat.avatar_url} />
                            <AvatarFallback className="text-xl font-bold bg-muted text-muted-foreground">
                                {chat.name?.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <h3 className="text-lg font-bold text-foreground mb-1 tracking-tight">{chat.name}</h3>
                        <p className="text-[10px] text-primary/80 font-bold uppercase tracking-[0.2em] leading-none">Active</p>
                    </div>

                    {/* Media, Files & Links */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Media & Files</h4>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                        </div>
                        <div className="grid grid-cols-3 gap-2 px-1">
                            {mediaMessages.length > 0 ? mediaMessages.slice(-6).reverse().map((msg, i) => (
                                <div key={i} className="aspect-square rounded-xl bg-muted border border-border flex items-center justify-center group overflow-hidden cursor-pointer hover:border-primary/50 transition-all">
                                    <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="w-full h-full">
                                        <img src={msg.file_url} alt="Shared media" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                                    </a>
                                </div>
                            )) : (
                                <div className="col-span-3 text-center py-6 bg-muted/30 rounded-xl border border-border border-dashed text-xs text-muted-foreground font-semibold">
                                    No media shared yet
                                </div>
                            )}
                        </div>
                    </div>

                    <Separator className="bg-border" />

                    {/* Options List */}
                    <div className="space-y-1">
                        {[
                            {
                                icon: Bell,
                                label: notifications.sound ? 'Mute Notification Sound' : 'Unmute Notification Sound',
                                color: 'text-muted-foreground',
                                action: () => setNotifications({ sound: !notifications.sound })
                            },
                            {
                                icon: Archive,
                                label: chat.is_archived ? 'Unarchive Chat' : 'Archive Chat',
                                color: 'text-muted-foreground',
                                action: () => activeChatId && toggleArchive(activeChatId)
                            },
                            {
                                icon: Shield,
                                label: 'Account Settings',
                                color: 'text-muted-foreground',
                                action: () => navigate('/settings?tab=account')
                            },
                            {
                                icon: Users,
                                label: 'Chat Preferences',
                                color: 'text-muted-foreground',
                                action: () => navigate('/settings?tab=chat')
                            },
                        ].map((item, i) => (
                            <button
                                key={i}
                                onClick={item.action}
                                className="flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-muted/50 transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm">
                                        <item.icon className={cn("h-4 w-4", item.color)} />
                                    </div>
                                    <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">{item.label}</span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
                            </button>
                        ))}
                    </div>

                    <Separator className="bg-border" />

                    {/* Danger Zone */}
                    <div className="space-y-1 pb-6">
                        {[
                            {
                                icon: Ban,
                                label: 'Open Account Settings',
                                color: 'text-destructive',
                                action: () => navigate('/settings?tab=account')
                            },
                            {
                                icon: Flag,
                                label: 'Report Conversation',
                                color: 'text-destructive',
                                action: openReportEmail
                            },
                        ].map((item, i) => (
                            <button key={i} onClick={item.action} className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-destructive/10 transition-colors group">
                                <div className="h-8 w-8 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-center">
                                    <item.icon className="h-4 w-4 text-destructive" />
                                </div>
                                <span className="text-sm font-semibold text-destructive">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}

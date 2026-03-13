import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    Bell,
    Check,
    ChevronRight,
    KeyRound,
    Loader2,
    LogOut,
    MessageCircle,
    Moon,
    Trash2,
    User,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useChatStore } from '@/store/chatStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Logo } from '@/components/brand/Logo';
import { AvatarSelector } from '@/components/chat/AvatarSelector';
import type { ChatState } from '@/store/chatStore';
import type { LucideIcon } from 'lucide-react';

type SettingsTab = 'profile' | 'account' | 'appearance' | 'notifications' | 'chat';
type ThemeOption = ChatState['theme'];
type BubbleStyle = ChatState['appearanceSettings']['bubbleStyle'];

interface SettingsNavItem {
    key: SettingsTab;
    icon: LucideIcon;
    title: string;
    description: string;
}

function getRequestedTab(tab: string | null): SettingsTab | null {
    if (tab && ['profile', 'account', 'appearance', 'notifications', 'chat'].includes(tab)) {
        return tab as SettingsTab;
    }
    return null;
}

function SectionShell({
    eyebrow,
    title,
    description,
    children,
    aside,
}: {
    eyebrow: string;
    title: string;
    description: string;
    children: React.ReactNode;
    aside?: React.ReactNode;
}) {
    return (
        <section className="rounded-[28px] border border-border/70 bg-card/80 p-6 md:p-8 shadow-[0_24px_80px_-42px_rgba(30,32,34,0.45)] backdrop-blur-xl">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-muted-foreground">{eyebrow}</p>
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">{title}</h2>
                        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
                    </div>
                </div>
                {aside}
            </div>
            <div className="space-y-5">{children}</div>
        </section>
    );
}

function SurfaceCard({ className, children }: { className?: string; children: React.ReactNode }) {
    return (
        <div className={cn('rounded-3xl border border-border/70 bg-background/70 p-5 shadow-sm', className)}>
            {children}
        </div>
    );
}

function ToggleRow({
    title,
    description,
    enabled,
    onToggle,
}: {
    title: string;
    description: string;
    enabled: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className="flex w-full items-center justify-between gap-4 rounded-2xl border border-border/60 bg-background/75 px-4 py-4 text-left transition-all hover:border-primary/30 hover:bg-background"
        >
            <div className="space-y-1">
                <p className="text-sm font-semibold tracking-tight text-foreground">{title}</p>
                <p className="text-sm leading-5 text-muted-foreground">{description}</p>
            </div>
            <div className={cn('relative h-7 w-12 rounded-full border p-1 transition-all', enabled ? 'border-primary bg-primary' : 'border-border bg-secondary')}>
                <motion.div
                    animate={{ x: enabled ? 20 : 0 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                    className="h-5 w-5 rounded-full bg-white shadow-sm"
                />
            </div>
        </button>
    );
}

export function SettingsPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const {
        currentUser,
        setCurrentUser,
        theme,
        setTheme,
        notifications,
        setNotifications,
        chatBehavior,
        setChatBehavior,
        appearanceSettings,
        setAppearanceSettings,
    } = useChatStore();

    const [selectedTab, setSelectedTab] = useState<SettingsTab>('profile');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const activeTab = getRequestedTab(searchParams.get('tab')) ?? selectedTab;

    const [profileDrafts, setProfileDrafts] = useState<Record<string, { avatarUrl: string; username: string; bio: string }>>({});
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMsg, setPasswordMsg] = useState('');
    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const activeDraft = currentUser ? profileDrafts[currentUser.id] : undefined;
    const avatarUrl = activeDraft?.avatarUrl ?? currentUser?.avatar_url ?? '';
    const username = activeDraft?.username ?? currentUser?.username ?? '';
    const bio = activeDraft?.bio ?? currentUser?.bio ?? '';

    const updateProfileDraft = (updates: Partial<{ avatarUrl: string; username: string; bio: string }>) => {
        if (!currentUser) return;
        setProfileDrafts((prev) => {
            const existing = prev[currentUser.id] ?? {
                avatarUrl: currentUser.avatar_url || '',
                username: currentUser.username || '',
                bio: currentUser.bio || '',
            };
            return {
                ...prev,
                [currentUser.id]: { ...existing, ...updates },
            };
        });
    };

    const navItems: SettingsNavItem[] = useMemo(() => [
        { key: 'profile', icon: User, title: 'Profile', description: 'Identity, avatar, public bio' },
        { key: 'account', icon: KeyRound, title: 'Account', description: 'Password and session controls' },
        { key: 'notifications', icon: Bell, title: 'Notifications', description: 'Desktop, sound and previews' },
        { key: 'chat', icon: MessageCircle, title: 'Chat Behavior', description: 'Input, text size and downloads' },
        { key: 'appearance', icon: Moon, title: 'Appearance', description: 'Theme, bubbles and interface tone' },
    ], []);

    const saveProfile = async () => {
        if (!currentUser) return;
        setSaving(true);
        setSaveMsg('');
        const { error } = await supabase.from('users').update({ avatar_url: avatarUrl, username, bio }).eq('id', currentUser.id);
        if (error) {
            setSaveMsg(`Update failed: ${error.message}`);
        } else {
            setCurrentUser({ ...currentUser, avatar_url: avatarUrl, username, bio });
            setProfileDrafts((prev) => {
                const next = { ...prev };
                delete next[currentUser.id];
                return next;
            });
            setSaveMsg('Profile updated successfully');
        }
        setSaving(false);
        window.setTimeout(() => setSaveMsg(''), 3000);
    };

    const changePassword = async () => {
        setPasswordMsg('');
        if (newPassword.length < 6) {
            setPasswordMsg('Password must be at least 6 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordMsg('Passwords do not match.');
            return;
        }
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        setPasswordMsg(error ? error.message : 'Password updated successfully.');
        if (!error) {
            setNewPassword('');
            setConfirmPassword('');
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
        await supabase.from('users').delete().eq('id', currentUser?.id);
        await supabase.auth.signOut();
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    const themeCards: Array<{ id: ThemeOption; title: string; caption: string }> = [
        { id: 'light', title: 'Light', caption: 'Bright workspace surfaces' },
        { id: 'dark', title: 'Dark', caption: 'Low-glare professional contrast' },
        { id: 'system', title: 'System', caption: 'Follow device appearance' },
    ];

    const bubbleCards: Array<{ id: BubbleStyle; title: string; preview: string }> = [
        { id: 'modern', title: 'Modern', preview: 'Rounded, elevated bubbles' },
        { id: 'compact', title: 'Compact', preview: 'Tighter, dense message layout' },
        { id: 'classic', title: 'Classic', preview: 'Traditional conversation feel' },
    ];

    return (
        <div className="app-theme-shell flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
            <header className="glass-panel flex h-16 items-center px-4 md:h-[var(--header-height)] md:px-6">
                <Button variant="ghost" size="icon" onClick={() => navigate('/chat')} className="mr-3 h-10 w-10 rounded-2xl border border-border/70 bg-card/70 text-muted-foreground hover:bg-accent hover:text-foreground">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex min-w-0 items-center gap-4">
                    <Logo showText={!isMobile} />
                    <div className="hidden h-7 w-px bg-border lg:block" />
                    <div className="hidden lg:block">
                        <p className="text-sm font-bold tracking-tight text-foreground">Settings</p>
                        <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Workspace preferences and account controls</p>
                    </div>
                </div>
            </header>

            <div className="flex min-h-0 flex-1 overflow-hidden">
                <aside className="hidden w-[340px] shrink-0 border-r border-border/70 bg-card/70 px-5 py-6 backdrop-blur-xl lg:flex lg:flex-col">
                    <div className="mb-6 rounded-[28px] border border-border/70 bg-background/70 p-5 shadow-sm">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-14 w-14 border border-border/70 shadow-sm">
                                <AvatarImage src={currentUser?.avatar_url} />
                                <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                                    {currentUser?.username?.substring(0, 2).toUpperCase() || 'QC'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <p className="truncate text-base font-bold tracking-tight text-foreground">{currentUser?.username || 'Anonymous'}</p>
                                <p className="truncate text-sm text-muted-foreground">{currentUser?.email}</p>
                            </div>
                        </div>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="space-y-2 pr-3">
                            {navItems.map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => setSelectedTab(item.key)}
                                    className={cn(
                                        'flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-all',
                                        activeTab === item.key ? 'border-primary/30 bg-primary/10 shadow-sm' : 'border-transparent hover:border-border/70 hover:bg-background/70'
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl border', activeTab === item.key ? 'border-primary bg-primary text-primary-foreground' : 'border-border/70 bg-card text-muted-foreground')}>
                                            <item.icon className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold tracking-tight text-foreground">{item.title}</p>
                                            <p className="text-xs text-muted-foreground">{item.description}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </button>
                            ))}
                        </div>
                    </ScrollArea>

                    <Button variant="ghost" onClick={handleLogout} className="mt-5 h-12 justify-start rounded-2xl border border-destructive/20 bg-destructive/5 px-4 text-sm font-semibold text-destructive hover:bg-destructive/10">
                        <LogOut className="h-4 w-4" />
                        Logout
                    </Button>
                </aside>

                <main className="min-w-0 flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="mx-auto w-full max-w-6xl px-4 py-5 md:px-6 md:py-8">
                            <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1 lg:hidden">
                                {navItems.map((item) => (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => setSelectedTab(item.key)}
                                        className={cn('shrink-0 rounded-2xl border px-4 py-2.5 text-sm font-semibold', activeTab === item.key ? 'border-primary bg-primary text-primary-foreground' : 'border-border/70 bg-card/80 text-foreground')}
                                    >
                                        {item.title}
                                    </button>
                                ))}
                            </div>

                            {(saveMsg || passwordMsg) && (
                                <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-medium text-foreground">
                                    {saveMsg || passwordMsg}
                                </div>
                            )}

                            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
                                {activeTab === 'profile' && (
                                    <SectionShell
                                        eyebrow="Profile"
                                        title="Profile and identity"
                                        description="Manage how you appear across conversations, participant lists and profile surfaces."
                                        aside={<Button onClick={saveProfile} disabled={saving} className="h-11 rounded-2xl px-5 font-semibold">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save profile'}</Button>}
                                    >
                                        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
                                            <SurfaceCard className="flex flex-col items-center justify-center gap-5">
                                                <AvatarSelector currentAvatar={avatarUrl} onSelect={(value) => updateProfileDraft({ avatarUrl: value })} username={username} />
                                                <div className="text-center">
                                                    <p className="text-sm font-semibold text-foreground">Profile image</p>
                                                    <p className="mt-1 text-sm text-muted-foreground">Pick an avatar that is easy to recognize in chat.</p>
                                                </div>
                                            </SurfaceCard>
                                            <SurfaceCard className="space-y-5">
                                                <div className="space-y-2">
                                                    <Label className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Display name</Label>
                                                    <Input value={username} onChange={(event) => updateProfileDraft({ username: event.target.value })} placeholder="preferred_name" className="h-12 rounded-2xl border-border/70 bg-card px-4 text-sm font-semibold" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Email</Label>
                                                    <Input value={currentUser?.email || ''} readOnly className="h-12 rounded-2xl border-border/70 bg-muted/40 px-4 text-sm text-muted-foreground" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Bio</Label>
                                                    <textarea value={bio} onChange={(event) => updateProfileDraft({ bio: event.target.value })} placeholder="Add a short bio for your team and contacts." className="min-h-[140px] w-full rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm leading-6 text-foreground outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/15" />
                                                </div>
                                            </SurfaceCard>
                                        </div>
                                    </SectionShell>
                                )}
                                {activeTab === 'account' && (
                                    <SectionShell eyebrow="Account" title="Account security" description="Keep access to your workspace secure with a stronger password and clear recovery expectations.">
                                        <SurfaceCard className="space-y-5">
                                            <div className="space-y-2">
                                                <Label className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">New password</Label>
                                                <Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="h-12 rounded-2xl border-border/70 bg-card px-4" placeholder="Minimum 6 characters" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Confirm password</Label>
                                                <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-12 rounded-2xl border-border/70 bg-card px-4" placeholder="Repeat password" />
                                            </div>
                                            <Button onClick={changePassword} className="h-11 rounded-2xl px-5 font-semibold">
                                                Update password
                                            </Button>
                                        </SurfaceCard>

                                        <SurfaceCard className="border-destructive/20 bg-destructive/5">
                                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                                <div className="space-y-1">
                                                    <p className="text-base font-bold tracking-tight text-destructive">Delete account</p>
                                                    <p className="text-sm leading-6 text-destructive/80">Permanently remove your account and sign out from this workspace.</p>
                                                </div>
                                                <Button variant="destructive" onClick={handleDeleteAccount} className="h-11 rounded-2xl px-5 font-semibold">
                                                    <Trash2 className="h-4 w-4" />
                                                    Delete account
                                                </Button>
                                            </div>
                                        </SurfaceCard>
                                    </SectionShell>
                                )}

                                {activeTab === 'notifications' && (
                                    <SectionShell eyebrow="Notifications" title="Notification preferences" description="Tune how QwikChat surfaces incoming activity across sound, desktop and preview channels.">
                                        <div className="grid gap-4">
                                            <ToggleRow title="Sound alerts" description="Play a notification sound when new activity arrives." enabled={notifications.sound} onToggle={() => setNotifications({ sound: !notifications.sound })} />
                                            <ToggleRow title="Desktop notifications" description="Allow browser-level alerts when QwikChat is open in the background." enabled={notifications.desktop} onToggle={() => setNotifications({ desktop: !notifications.desktop })} />
                                            <ToggleRow title="Message previews" description="Include the actual message content in desktop notifications." enabled={notifications.previews} onToggle={() => setNotifications({ previews: !notifications.previews })} />
                                        </div>
                                    </SectionShell>
                                )}

                                {activeTab === 'chat' && (
                                    <SectionShell eyebrow="Chat" title="Chat behavior" description="Set how the composer behaves and how readable conversations feel across the app.">
                                        <div className="grid gap-4">
                                            <ToggleRow title="Enter to send" description="Press Enter to send a message. Use Shift+Enter for a new line." enabled={chatBehavior.enterToSend} onToggle={() => setChatBehavior({ enterToSend: !chatBehavior.enterToSend })} />
                                        </div>
                                        <div className="grid gap-4 lg:grid-cols-3">
                                            {(['small', 'medium', 'large'] as const).map((size) => (
                                                <button
                                                    key={size}
                                                    type="button"
                                                    onClick={() => setChatBehavior({ fontSize: size })}
                                                    className={cn('rounded-3xl border p-5 text-left transition-all', chatBehavior.fontSize === size ? 'border-primary bg-primary/10' : 'border-border/70 bg-background/70 hover:border-primary/30')}
                                                >
                                                    <p className="text-sm font-bold capitalize tracking-tight text-foreground">{size}</p>
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        {size === 'small' && 'Dense conversation view with minimal visual height.'}
                                                        {size === 'medium' && 'Balanced readability for everyday messaging.'}
                                                        {size === 'large' && 'Larger text for comfortable scanning and long sessions.'}
                                                    </p>
                                                </button>
                                            ))}
                                        </div>
                                    </SectionShell>
                                )}

                                {activeTab === 'appearance' && (
                                    <SectionShell eyebrow="Appearance" title="Visual style" description="Choose the overall look of the application and the message presentation style used in chat.">
                                        <div className="grid gap-4 lg:grid-cols-3">
                                            {themeCards.map((card) => (
                                                <button
                                                    key={card.id}
                                                    type="button"
                                                    onClick={() => setTheme(card.id)}
                                                    className={cn('rounded-[28px] border p-5 text-left transition-all', theme === card.id ? 'border-primary bg-primary/10' : 'border-border/70 bg-background/70 hover:border-primary/30')}
                                                >
                                                    <div className="mb-4 flex h-28 items-end rounded-2xl border border-border/70 bg-gradient-to-br from-background via-secondary to-card p-4">
                                                        <div className="space-y-2">
                                                            <div className="h-2.5 w-20 rounded-full bg-primary/70" />
                                                            <div className="h-2.5 w-28 rounded-full bg-primary/30" />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="text-sm font-bold tracking-tight text-foreground">{card.title}</p>
                                                            <p className="mt-1 text-sm text-muted-foreground">{card.caption}</p>
                                                        </div>
                                                        {theme === card.id && (
                                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                                                <Check className="h-4 w-4" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>

                                        <div className="grid gap-4 lg:grid-cols-3">
                                            {bubbleCards.map((card) => (
                                                <button
                                                    key={card.id}
                                                    type="button"
                                                    onClick={() => setAppearanceSettings({ bubbleStyle: card.id })}
                                                    className={cn('rounded-[28px] border p-5 text-left transition-all', appearanceSettings.bubbleStyle === card.id ? 'border-primary bg-primary/10' : 'border-border/70 bg-background/70 hover:border-primary/30')}
                                                >
                                                    <div className="mb-4 space-y-2 rounded-2xl border border-border/70 bg-card p-4">
                                                        <div className="ml-auto h-7 w-24 rounded-2xl bg-primary/70" />
                                                        <div className="h-7 w-28 rounded-2xl bg-secondary" />
                                                        <div className="ml-auto h-7 w-20 rounded-2xl bg-primary/40" />
                                                    </div>
                                                    <p className="text-sm font-bold tracking-tight text-foreground">{card.title}</p>
                                                    <p className="mt-1 text-sm text-muted-foreground">{card.preview}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </SectionShell>
                                )}

                            </motion.div>
                        </div>
                    </ScrollArea>
                </main>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, User, Shield, Moon, LogOut, KeyRound, Bell, MessageCircle, Languages, ChevronRight, Check, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '@/store/chatStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/brand/Logo';
import { AvatarSelector } from '@/components/chat/AvatarSelector';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';

export function SettingsPage() {
    const navigate = useNavigate();
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
        setAppearanceSettings
    } = useChatStore();
    const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'privacy' | 'appearance' | 'notifications' | 'chat' | 'language' | null>('profile');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    // Profile state
    const [avatarUrl, setAvatarUrl] = useState('');
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');

    // Account state
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMsg, setPasswordMsg] = useState('');

    // Privacy state
    const [readReceipts, setReadReceipts] = useState(true);
    const [lastSeen, setLastSeen] = useState(true);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (currentUser) {
            setAvatarUrl(currentUser.avatar_url || '');
            setUsername(currentUser.username || '');
            setBio(currentUser.bio || '');
            setReadReceipts(currentUser.privacy_read_receipts !== false);
            setLastSeen(currentUser.privacy_last_seen !== false);
        }
    }, [currentUser]);

    const handleSaveProfile = async () => {
        if (!currentUser) return;
        setSaving(true);
        setSaveMsg('');
        const { error } = await supabase
            .from('users')
            .update({ avatar_url: avatarUrl, username, bio })
            .eq('id', currentUser.id);

        if (!error) {
            setCurrentUser({
                ...currentUser,
                avatar_url: avatarUrl,
                username,
                bio
            });
            setSaveMsg('Profile updated successfully');
        } else {
            setSaveMsg('Update failed: ' + error.message);
        }
        setSaving(false);
        setTimeout(() => setSaveMsg(''), 3000);
    };

    const handleChangePassword = async () => {
        setPasswordMsg('');
        if (newPassword.length < 6) {
            setPasswordMsg('Password too short (min 6 chars)');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordMsg('Passwords do not match');
            return;
        }
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        setPasswordMsg(error ? error.message : 'Password updated successfully');
        setNewPassword('');
        setConfirmPassword('');
    };

    const handleDeleteAccount = async () => {
        if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
        await supabase.from('users').delete().eq('id', currentUser?.id);
        await supabase.auth.signOut();
    };

    const handleSavePrivacy = async () => {
        if (!currentUser) return;
        const { error } = await supabase
            .from('users')
            .update({ privacy_read_receipts: readReceipts, privacy_last_seen: lastSeen })
            .eq('id', currentUser.id);

        if (!error) {
            setCurrentUser({
                ...currentUser,
                privacy_read_receipts: readReceipts,
                privacy_last_seen: lastSeen
            });
            setSaveMsg('Privacy settings updated');
        } else {
            setSaveMsg('Failed to update privacy settings');
        }
        setTimeout(() => setSaveMsg(''), 3000);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    const menuCategories = [
        {
            title: 'Identity',
            items: [
                { key: 'profile', icon: User, label: 'Active Account', desc: 'Avatar, Name & Bio' },
            ]
        },
        {
            title: 'Privacy & Security',
            items: [
                { key: 'account', icon: KeyRound, label: 'Security', desc: 'Password & Authentication' },
                { key: 'privacy', icon: Shield, label: 'Privacy & Permissions', desc: 'Control your visibility' },
            ]
        },
        {
            title: 'Experience',
            items: [
                { key: 'notifications', icon: Bell, label: 'Notifications', desc: 'Manage your alerts' },
                { key: 'chat', icon: MessageCircle, label: 'Chat Behavior', desc: 'App-wide preferences' },
                { key: 'appearance', icon: Moon, label: 'Appearance', desc: 'Theme & Customization' },
                { key: 'language', icon: Languages, label: 'Interface Language', desc: 'Choose your language' },
            ]
        }
    ];

    return (
        <div className="flex h-screen w-full bg-background flex-col text-foreground overflow-hidden">
            {/* Header */}
            <header className="flex h-16 md:h-[var(--header-height)] items-center px-6 glass-panel z-20 shrink-0">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                        if (isMobile && activeTab) {
                            setActiveTab(null);
                        } else {
                            navigate('/chat');
                        }
                    }}
                    className="mr-4 h-10 w-10 rounded-xl hover:bg-muted transition-all border border-border text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-4">
                    {(!isMobile || !activeTab) && <Logo showText={true} />}
                    {isMobile && activeTab && (
                        <motion.h1
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-xs font-bold text-foreground tracking-tight uppercase"
                        >
                            {activeTab}
                        </motion.h1>
                    )}
                    {!isMobile && (
                        <>
                            <div className="h-6 w-px bg-border" />
                            <div className="flex flex-col">
                                <h1 className="text-sm font-bold text-foreground tracking-tight leading-none mb-1">Account Settings</h1>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Professional Messenger Configuration</p>
                            </div>
                        </>
                    )}
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Settings Sidebar */}
                <aside className={cn(
                    "w-full md:w-80 bg-card border-r border-border p-6 shrink-0 flex flex-col transition-all duration-300 z-10",
                    isMobile && activeTab ? "-translate-x-full opacity-0" : "translate-x-0 opacity-100"
                )}>
                    <div className="mb-8">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-background/40 rounded-2xl p-4 flex items-center gap-4 border border-border/50 premium-shadow"
                        >
                            <div className="relative">
                                <Avatar className="h-12 w-12 border border-border shadow-sm">
                                    <AvatarImage src={currentUser?.avatar_url} />
                                    <AvatarFallback className="bg-primary text-primary-foreground font-bold">{currentUser?.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background shadow-sm" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="font-bold text-sm truncate text-foreground tracking-tight leading-none mb-1">{currentUser?.username}</span>
                                <span className="text-[10px] font-medium text-muted-foreground truncate opacity-70">{currentUser?.email}</span>
                            </div>
                        </motion.div>
                    </div>

                    <ScrollArea className="flex-1 -mx-2 px-2">
                        <div className="space-y-6 pb-8">
                            {menuCategories.map((category, catIdx) => (
                                <div key={category.title} className="space-y-2">
                                    <h3 className="px-4 text-[9px] font-bold text-muted-foreground uppercase tracking-[0.25em] opacity-60">
                                        {category.title}
                                    </h3>
                                    <div className="space-y-1">
                                        {category.items.map((item, idx) => (
                                            <motion.button
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: (catIdx * 2 + idx) * 0.03 }}
                                                key={item.key}
                                                className={cn(
                                                    "w-full flex items-center justify-between p-3 rounded-xl transition-all text-left group border border-transparent",
                                                    activeTab === item.key
                                                        ? "bg-primary/10 border-primary/10 premium-shadow"
                                                        : "hover:bg-muted/50"
                                                )}
                                                onClick={() => setActiveTab(item.key as any)}
                                            >
                                                <div className="flex items-center gap-3.5 z-10">
                                                    <div className={cn(
                                                        "h-10 w-10 rounded-xl flex items-center justify-center transition-all shrink-0 premium-shadow",
                                                        activeTab === item.key ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground group-hover:bg-muted group-hover:text-foreground border border-border/50"
                                                    )}>
                                                        <item.icon className="h-4.5 w-4.5" />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className={cn(
                                                            "text-[13px] font-bold transition-colors tracking-tight",
                                                            activeTab === item.key ? "text-foreground" : "text-foreground/80 group-hover:text-foreground"
                                                        )}>{item.label}</span>
                                                        <span className="text-[9px] font-medium text-muted-foreground/60 uppercase tracking-wider">{item.desc}</span>
                                                    </div>
                                                </div>
                                                <ChevronRight className={cn(
                                                    "h-3.5 w-3.5 text-muted-foreground transition-all z-10 opacity-0 group-hover:opacity-100",
                                                    activeTab === item.key ? "translate-x-1 opacity-100 text-primary" : ""
                                                )} />
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>

                    <div className="pt-6 mt-auto border-t border-border">
                        <Button
                            variant="ghost"
                            className="w-full justify-start h-12 rounded-xl font-semibold text-xs gap-4 text-destructive hover:bg-destructive/10"
                            onClick={handleLogout}
                        >
                            <LogOut className="h-4 w-4" />
                            Logout
                        </Button>
                    </div>
                </aside>

                {/* Settings Content */}
                <main className={cn(
                    "flex-1 p-6 md:p-12 overflow-y-auto w-full relative transition-all duration-300 bg-background",
                    isMobile && !activeTab ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"
                )}>
                    <AnimatePresence mode="wait">
                        {activeTab ? (
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="max-w-xl mx-auto space-y-8"
                            >
                                {/* PROFILE */}
                                {activeTab === 'profile' && (
                                    <div className="space-y-8">
                                        <div className="flex flex-col gap-1.5 mb-2">
                                            <h2 className="text-2xl font-bold text-foreground tracking-tight">Active Account</h2>
                                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Identity & Personalization</p>
                                        </div>

                                        <div className="flex flex-col items-center justify-center p-10 bg-card rounded-2xl border border-border/50 premium-shadow relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                            <AvatarSelector
                                                currentAvatar={avatarUrl}
                                                onSelect={setAvatarUrl}
                                                username={username}
                                            />
                                        </div>

                                        <div className="space-y-6">
                                            <div className="bg-card rounded-2xl border border-border/50 p-8 space-y-6 premium-shadow">
                                                <div className="space-y-2.5">
                                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1 opacity-70">Display Name</Label>
                                                    <div className="relative group">
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 font-bold">@</span>
                                                        <Input
                                                            value={username}
                                                            onChange={e => setUsername(e.target.value)}
                                                            className="h-12 pl-10 rounded-xl bg-background/50 border-border focus-visible:ring-primary/20 text-foreground font-bold text-sm transition-all shadow-inner"
                                                            placeholder="preferred_name"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2.5">
                                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1 opacity-70">Professional Bio</Label>
                                                    <textarea
                                                        value={bio}
                                                        onChange={e => setBio(e.target.value)}
                                                        className="flex w-full rounded-xl border border-border bg-background/50 px-4 py-3 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[120px] resize-none transition-all placeholder:text-muted-foreground/40 shadow-inner"
                                                        placeholder="Briefly describe your role or expertise..."
                                                    />
                                                </div>

                                                <div className="flex items-center gap-4 pt-2">
                                                    <Button
                                                        onClick={handleSaveProfile}
                                                        disabled={saving}
                                                        className="h-11 rounded-xl px-10 bg-primary text-primary-foreground font-bold transition-all premium-shadow border border-primary/20 hover:scale-[1.02] active:scale-[0.98]"
                                                    >
                                                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
                                                    </Button>
                                                    {saveMsg && (
                                                        <motion.div
                                                            initial={{ opacity: 0, x: -5 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            className="flex items-center gap-2 text-green-500/80"
                                                        >
                                                            <Check className="h-4 w-4" />
                                                            <span className="text-[11px] font-bold uppercase tracking-wider">{saveMsg}</span>
                                                        </motion.div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ACCOUNT / SECURITY */}
                                {activeTab === 'account' && (
                                    <div className="space-y-8">
                                        <div className="flex flex-col gap-1.5 mb-2">
                                            <h2 className="text-2xl font-bold text-foreground tracking-tight">Security & Passwords</h2>
                                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Authentication settings</p>
                                        </div>
                                        <div className="bg-card rounded-2xl border border-border/50 p-8 space-y-6 premium-shadow">
                                            <div className="space-y-2.5">
                                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1 opacity-70">New Password</Label>
                                                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="h-11 rounded-xl bg-background/50 border-border text-foreground text-sm font-bold focus-visible:ring-primary/20 shadow-inner" placeholder="••••••••" />
                                            </div>
                                            <div className="space-y-2.5">
                                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1 opacity-70">Confirm New Password</Label>
                                                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="h-11 rounded-xl bg-background/50 border-border text-foreground text-sm font-bold focus-visible:ring-primary/20 shadow-inner" placeholder="••••••••" />
                                            </div>
                                            <div className="flex items-center gap-4 pt-2">
                                                <Button onClick={handleChangePassword} className="h-11 rounded-xl px-10 bg-primary text-primary-foreground font-bold transition-all premium-shadow border border-primary/20 hover:scale-[1.02] active:scale-[0.98]">Update Password</Button>
                                                {passwordMsg && <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider animate-in">{passwordMsg}</span>}
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-destructive/10 bg-destructive/[0.02] p-8 space-y-4 premium-shadow">
                                            <div className="space-y-1.5">
                                                <h4 className="text-[10px] font-bold text-destructive uppercase tracking-widest opacity-80">Danger Zone</h4>
                                                <p className="text-[12px] font-semibold text-foreground/70">Permanently remove your account and all associated data. This action is irreversible.</p>
                                            </div>
                                            <Button variant="outline" onClick={handleDeleteAccount} className="h-10 rounded-xl border-destructive/20 text-destructive hover:bg-destructive hover:text-white font-bold px-8 transition-all hover:scale-[1.02] active:scale-[0.98]">
                                                Delete Account
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* PRIVACY */}
                                {activeTab === 'privacy' && (
                                    <div className="space-y-8">
                                        <div className="flex flex-col gap-1.5 mb-2">
                                            <h2 className="text-2xl font-bold text-foreground tracking-tight">Privacy & Permissions</h2>
                                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Visibility & interaction controls</p>
                                        </div>
                                        <div className="bg-card rounded-2xl border border-border/50 p-2 space-y-1 overflow-hidden premium-shadow">
                                            {[
                                                { label: 'Read Receipts', desc: 'Let others know when you\'ve read their messages.', state: readReceipts, set: setReadReceipts, icon: MessageCircle },
                                                { label: 'Activity Status', desc: 'Allow others to see when you were last active.', state: lastSeen, set: setLastSeen, icon: Sparkles },
                                            ].map((item, idx) => (
                                                <motion.button
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    key={item.label}
                                                    onClick={() => item.set(!item.state)}
                                                    className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-muted/30 transition-all group"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn(
                                                            "h-11 w-11 rounded-xl flex items-center justify-center transition-all premium-shadow",
                                                            item.state ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground border border-border/50"
                                                        )}>
                                                            <item.icon className="h-5 w-5" />
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="font-bold text-foreground text-sm tracking-tight">{item.label}</p>
                                                            <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider">{item.desc}</p>
                                                        </div>
                                                    </div>
                                                    <div className={cn(
                                                        "h-6 w-11 rounded-full relative transition-all duration-300 p-1 ring-1 ring-border/50",
                                                        item.state ? 'bg-primary shadow-inner shadow-black/10' : 'bg-muted/50'
                                                    )}>
                                                        <motion.div
                                                            animate={{ x: item.state ? 20 : 0 }}
                                                            className="h-4 w-4 bg-white rounded-full shadow-md"
                                                        />
                                                    </div>
                                                </motion.button>
                                            ))}
                                        </div>
                                        <Button onClick={handleSavePrivacy} className="h-11 w-full rounded-xl bg-primary text-primary-foreground font-bold premium-shadow border border-primary/20 hover:scale-[1.01] transition-all">
                                            Save Privacy Settings
                                        </Button>
                                    </div>
                                )}
                                {/* APPEARANCE */}
                                {activeTab === 'appearance' && (
                                    <div className="space-y-8">
                                        <div className="flex flex-col gap-1.5 mb-2">
                                            <h2 className="text-2xl font-bold text-foreground tracking-tight">Appearance</h2>
                                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Visual interface customization</p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            {[
                                                { id: 'light', label: 'Cool Light', desc: 'Clean & minimal', bg: 'bg-[#F0F5F9]', secondary: 'bg-[#C9D6DF]' },
                                                { id: 'dark', label: 'Premium Slate', desc: 'Professional dark', bg: 'bg-[#1E2022]', secondary: 'bg-[#52616B]' },
                                                { id: 'system', label: 'System Sync', desc: 'Default behavior', bg: 'bg-slate-400', secondary: 'bg-slate-500' },
                                            ].map((t) => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => setTheme(t.id as any)}
                                                    className={cn(
                                                        "group relative flex flex-col p-5 rounded-2xl border-2 transition-all text-left bg-card premium-shadow",
                                                        theme === t.id ? "border-primary ring-4 ring-primary/10" : "border-border/50 hover:border-primary/30"
                                                    )}
                                                >
                                                    <div className={cn("h-32 w-full rounded-xl mb-4 p-4 border border-border/50 relative overflow-hidden shadow-inner", t.bg)}>
                                                        <div className="space-y-2">
                                                            <div className={cn("h-2 w-1/2 rounded-full", t.secondary)} />
                                                            <div className={cn("h-2 w-3/4 rounded-full opacity-20", t.secondary)} />
                                                            <div className="h-8 w-8 rounded-lg mt-6 bg-primary/30 premium-shadow" />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="font-bold text-foreground text-sm tracking-tight">{t.label}</p>
                                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t.desc}</p>
                                                        </div>
                                                        {theme === t.id && (
                                                            <motion.div
                                                                layoutId="themeSelected"
                                                                className="h-6 w-6 rounded-full bg-primary flex items-center justify-center premium-shadow"
                                                            >
                                                                <Check className="h-3 w-3 text-primary-foreground" />
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>

                                        <div className="space-y-6 pt-4">
                                            <div className="flex flex-col gap-1.5 mb-2">
                                                <h2 className="text-xl font-bold text-foreground tracking-tight">Bubble Styles</h2>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Message appearance</p>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4">
                                                {['modern', 'compact', 'classic'].map((style) => (
                                                    <button
                                                        key={style}
                                                        onClick={() => setAppearanceSettings({ bubbleStyle: style as any })}
                                                        className={cn(
                                                            "p-4 rounded-xl border-2 transition-all text-center bg-card premium-shadow",
                                                            appearanceSettings.bubbleStyle === style ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/20"
                                                        )}
                                                    >
                                                        <span className="text-xs font-bold capitalize">{style}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* NOTIFICATIONS */}
                                {activeTab === 'notifications' && (
                                    <div className="space-y-8">
                                        <div className="flex flex-col gap-1.5 mb-2">
                                            <h2 className="text-2xl font-bold text-foreground tracking-tight">Notifications</h2>
                                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Manage your alerts & sounds</p>
                                        </div>
                                        <div className="bg-card rounded-2xl border border-border/50 p-2 space-y-1 overflow-hidden premium-shadow">
                                            {[
                                                { key: 'sound', label: 'Sound Alerts', desc: 'Play a sound for incoming messages', icon: Bell },
                                                { key: 'desktop', label: 'Desktop Notifications', desc: 'Show alerts on your desktop', icon: Sparkles },
                                                { key: 'previews', label: 'Message Previews', desc: 'Show content in notifications', icon: MessageCircle },
                                            ].map((item) => (
                                                <motion.button
                                                    key={item.key}
                                                    onClick={() => setNotifications({ [item.key]: !notifications[item.key as keyof typeof notifications] })}
                                                    className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-muted/30 transition-all group"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn(
                                                            "h-11 w-11 rounded-xl flex items-center justify-center transition-all premium-shadow",
                                                            notifications[item.key as keyof typeof notifications] ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground border border-border/50"
                                                        )}>
                                                            <item.icon className="h-5 w-5" />
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="font-bold text-foreground text-sm tracking-tight">{item.label}</p>
                                                            <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider">{item.desc}</p>
                                                        </div>
                                                    </div>
                                                    <div className={cn(
                                                        "h-6 w-11 rounded-full relative transition-all duration-300 p-1 ring-1 ring-border/50",
                                                        notifications[item.key as keyof typeof notifications] ? 'bg-primary shadow-inner shadow-black/10' : 'bg-muted/50'
                                                    )}>
                                                        <motion.div
                                                            animate={{ x: notifications[item.key as keyof typeof notifications] ? 20 : 0 }}
                                                            className="h-4 w-4 bg-white rounded-full shadow-md"
                                                        />
                                                    </div>
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* CHAT BEHAVIOR */}
                                {activeTab === 'chat' && (
                                    <div className="space-y-8">
                                        <div className="flex flex-col gap-1.5 mb-2">
                                            <h2 className="text-2xl font-bold text-foreground tracking-tight">Chat Behavior</h2>
                                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Application preferences</p>
                                        </div>
                                        <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-8 premium-shadow">
                                            <div className="flex items-center justify-between">
                                                <div className="text-left">
                                                    <p className="font-bold text-foreground text-sm tracking-tight">Enter Key to Send</p>
                                                    <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider">Press Enter to send, Shift+Enter for new line</p>
                                                </div>
                                                <button
                                                    onClick={() => setChatBehavior({ enterToSend: !chatBehavior.enterToSend })}
                                                    className={cn(
                                                        "h-6 w-11 rounded-full relative transition-all duration-300 p-1 ring-1 ring-border/50",
                                                        chatBehavior.enterToSend ? 'bg-primary shadow-inner shadow-black/10' : 'bg-muted/50'
                                                    )}
                                                >
                                                    <motion.div
                                                        animate={{ x: chatBehavior.enterToSend ? 20 : 0 }}
                                                        className="h-4 w-4 bg-white rounded-full shadow-md"
                                                    />
                                                </button>
                                            </div>

                                            <div className="space-y-4">
                                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-70">Font Size</Label>
                                                <div className="flex gap-2">
                                                    {(['small', 'medium', 'large'] as const).map((size) => (
                                                        <Button
                                                            key={size}
                                                            variant={chatBehavior.fontSize === size ? "default" : "outline"}
                                                            onClick={() => setChatBehavior({ fontSize: size })}
                                                            className="flex-1 h-10 rounded-xl text-xs font-bold capitalize"
                                                        >
                                                            {size}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="text-left">
                                                    <p className="font-bold text-foreground text-sm tracking-tight">Auto-download Media</p>
                                                    <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider">Automatically save incoming images & videos</p>
                                                </div>
                                                <button
                                                    onClick={() => setChatBehavior({ autoDownload: !chatBehavior.autoDownload })}
                                                    className={cn(
                                                        "h-6 w-11 rounded-full relative transition-all duration-300 p-1 ring-1 ring-border/50",
                                                        chatBehavior.autoDownload ? 'bg-primary shadow-inner shadow-black/10' : 'bg-muted/50'
                                                    )}
                                                >
                                                    <motion.div
                                                        animate={{ x: chatBehavior.autoDownload ? 20 : 0 }}
                                                        className="h-4 w-4 bg-white rounded-full shadow-md"
                                                    />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* LANGUAGE */}
                                {activeTab === 'language' && (
                                    <div className="space-y-8">
                                        <div className="flex flex-col gap-1.5 mb-2">
                                            <h2 className="text-2xl font-bold text-foreground tracking-tight">Interface Language</h2>
                                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Choose your preferred language</p>
                                        </div>
                                        <div className="bg-card rounded-2xl border border-border/50 p-2 space-y-1 premium-shadow">
                                            {['English', 'Spanish', 'French', 'German', 'Hindi'].map((lang, idx) => (
                                                <button
                                                    key={lang}
                                                    className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-muted/30 transition-all font-bold text-sm"
                                                >
                                                    {lang}
                                                    {idx === 0 && <Check className="h-4 w-4 text-primary" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="h-full flex flex-col items-center justify-center text-center py-20"
                            >
                                <div className="relative mb-8">
                                    <div className="h-32 w-32 rounded-3xl bg-card border border-border flex items-center justify-center shadow-sm">
                                        <Logo showText={false} iconClassName="h-16 w-16" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-foreground tracking-tight mb-2">Select a Category</h3>
                                <p className="text-muted-foreground max-w-[280px] text-xs leading-relaxed">
                                    Choose a setting from the sidebar to manage your account preferences and customize your experience.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>
        </div >
    );
}

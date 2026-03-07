import { Search, Bell, Settings, Plus, X, Command } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Logo } from '@/components/brand/Logo';
import { useChatStore } from '@/store/chatStore';
import { useNavigate } from 'react-router-dom';
import { CreateChatModal } from '@/components/chat/CreateChatModal';
import { motion } from 'framer-motion';

export function Header() {
    const {
        currentUser,
        searchQuery,
        setSearchQuery,
        setSearchOpen
    } = useChatStore();
    const navigate = useNavigate();

    return (
        <header className="h-16 md:h-[var(--header-height)] w-full glass-panel flex items-center justify-between px-6 z-30 shrink-0">
            {/* Logo */}
            <div className="flex items-center gap-4">
                <Logo />
            </div>

            {/* Global Search */}
            <div className="hidden md:flex flex-1 max-w-xl mx-12">
                <div className="relative w-full group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        type="text"
                        placeholder="Search messages..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            if (e.target.value.length > 0) setSearchOpen(true);
                            else setSearchOpen(false);
                        }}
                        onFocus={() => {
                            if (searchQuery.length > 0) setSearchOpen(true);
                        }}
                        className="w-full bg-background/50 border-border focus-visible:ring-primary/20 h-11 pl-12 pr-12 rounded-xl text-sm text-foreground placeholder:text-muted-foreground transition-all shadow-inner"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {searchQuery ? (
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setSearchOpen(false);
                                }}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        ) : (
                            <div className="hidden lg:flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-border bg-muted text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                                <Command className="h-2.5 w-2.5" />
                                <span>K</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-5">
                <div className="hidden sm:flex items-center gap-4 pr-6 border-r border-border">
                    <CreateChatModal>
                        <motion.button
                            whileHover={{ scale: 1.02, y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            className="bg-primary text-primary-foreground font-bold text-xs h-10 px-6 rounded-xl premium-shadow hover:bg-primary/90 transition-all flex items-center gap-2 group border border-primary/20"
                        >
                            <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
                            New Chat
                        </motion.button>
                    </CreateChatModal>

                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-muted relative text-muted-foreground hover:text-foreground transition-all">
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-primary border-2 border-card shadow-sm" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                        onClick={() => navigate('/settings')}
                    >
                        <Settings className="h-5 w-5" />
                    </Button>
                </div>

                {/* Profile */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    className="p-1 h-auto rounded-xl hover:bg-muted flex items-center gap-3 group transition-all"
                    onClick={() => navigate('/settings')}
                >
                    <div className="relative">
                        <Avatar className="h-10 w-10 border border-border shadow-md ring-2 ring-transparent group-hover:ring-primary/30 transition-all">
                            <AvatarImage src={currentUser?.avatar_url} />
                            <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
                                {currentUser?.username?.substring(0, 2).toUpperCase() || '??'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background shadow-sm" />
                    </div>
                </motion.button>
            </div>
        </header>
    );
}

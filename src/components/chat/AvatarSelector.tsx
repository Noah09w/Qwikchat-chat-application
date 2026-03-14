import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Check, Camera, Link as LinkIcon } from 'lucide-react';

interface AvatarSelectorProps {
    currentAvatar: string;
    onSelect: (url: string) => void;
    username: string;
}

const PRESET_AVATARS = [
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&h=128&fit=crop',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop',
    'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=128&h=128&fit=crop',
    'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=128&h=128&fit=crop',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=128&h=128&fit=crop',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=128&h=128&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop',
    'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=128&h=128&fit=crop',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128&h=128&fit=crop',
];

export function AvatarSelector({ currentAvatar, onSelect, username }: AvatarSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [customUrl, setCustomUrl] = useState('');

    const handleSelect = (url: string) => {
        onSelect(url);
        setIsOpen(false);
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative group">
                <Avatar className="h-24 w-24 border-4 border-background premium-shadow ring-1 ring-border/50">
                    <AvatarImage src={currentAvatar} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-black">
                        {username?.substring(0, 2).toUpperCase() || '??'}
                    </AvatarFallback>
                </Avatar>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button
                            size="icon"
                            className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground border-2 border-background premium-shadow hover:scale-110 transition-transform"
                        >
                            <Camera className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-2xl border border-border/50 bg-card p-4 premium-shadow sm:max-w-md sm:p-6">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold tracking-tight text-center">Change Avatar</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6 mt-4">
                            <div className="grid grid-cols-3 gap-3 sm:gap-4">
                                {PRESET_AVATARS.map((url) => (
                                    <button
                                        key={url}
                                        onClick={() => handleSelect(url)}
                                        className="relative aspect-square overflow-hidden rounded-2xl transition-all group hover:scale-105"
                                    >
                                        <img src={url} alt="Avatar option" className="h-full w-full object-cover" />
                                        {currentAvatar === url && (
                                            <div className="absolute inset-0 bg-primary/60 flex items-center justify-center">
                                                <Check className="text-white h-6 w-6 stroke-[4]" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-3 pt-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Avatar Image URL</label>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <div className="relative flex-1">
                                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                                        <Input
                                            value={customUrl}
                                            onChange={(e) => setCustomUrl(e.target.value)}
                                            placeholder="https://images.unsplash.com/..."
                                            className="h-10 pl-9 rounded-xl bg-background/50 border-border text-foreground focus-visible:ring-primary/20 shadow-inner"
                                        />
                                    </div>
                                    <Button
                                        onClick={() => handleSelect(customUrl)}
                                        disabled={!customUrl.startsWith('http')}
                                        className="h-10 rounded-xl bg-primary px-6 text-xs font-bold text-primary-foreground premium-shadow sm:w-auto"
                                    >
                                        Apply
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
            <div className="text-center">
                <h3 className="text-lg font-bold text-foreground tracking-tight">{username || 'Anonymous'}</h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-0.5">Active Account</p>
            </div>
        </div>
    );
}

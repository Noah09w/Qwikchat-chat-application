import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface LogoProps {
    className?: string;
    iconClassName?: string;
    showText?: boolean;
}

export function Logo({ className, iconClassName, showText = true }: LogoProps) {
    return (
        <div className={cn("flex items-center gap-3 select-none group cursor-default", className)}>
            <motion.div
                whileHover={{ scale: 1.05 }}
                className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg border border-border relative overflow-hidden",
                    iconClassName
                )}
            >
                <div className="absolute inset-0 bg-primary/10 group-hover:bg-primary/20 transition-colors" />
                <Zap className="h-5 w-5 fill-current z-10" />
            </motion.div>
            {showText && (
                <div className="flex flex-col">
                    <span className="text-lg font-bold text-foreground tracking-tighter leading-none mb-0.5">
                        Qwik<span className="text-primary">Chat</span>
                    </span>
                    <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-[0.4em] leading-none">Professional Messenger</span>
                </div>
            )}
        </div>
    );
}

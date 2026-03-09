import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Lock, ArrowRight, Github, Chrome } from 'lucide-react';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Logo } from '@/components/brand/Logo';
import { motion, AnimatePresence } from 'framer-motion';

type AuthMode = 'login' | 'signup' | 'forgot';

export default function AuthPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<AuthMode>('login');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            if (mode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else if (mode === 'signup') {
                if (password.length < 6) {
                    throw new Error('Password must be at least 6 characters');
                }
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: email.split('@')[0],
                        }
                    }
                });
                if (error) throw error;
                setSuccess('Check your email to confirm your account');
            } else if (mode === 'forgot') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/`,
                });
                if (error) throw error;
                setSuccess('Recovery link sent to your email');
            }
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/chat`,
                },
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message || 'Login error');
        }
    };

    const switchMode = (newMode: AuthMode) => {
        setMode(newMode);
        setError(null);
        setSuccess(null);
    };

    return (
        <div className="flex min-h-screen w-full bg-[#0b0c0d] overflow-hidden relative">
            {/* Ambient Background Glow for the whole page */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] pointer-events-none" />

            {/* Left Side: Form */}
            <div className="flex flex-1 flex-col items-center justify-center p-6 lg:p-12 relative z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-[420px] bg-[#1e1f22]/80 backdrop-blur-2xl border border-white/5 rounded-[32px] p-8 md:p-10 shadow-2xl relative overflow-hidden"
                >
                    {/* Subtle inner highlight for the glass card */}
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                    {/* Brand */}
                    <div className="flex justify-center mb-10">
                        <Logo />
                    </div>

                    {/* Header */}
                    <div className="space-y-2 text-center mb-8">
                        <AnimatePresence mode="wait">
                            <motion.h1
                                key={mode}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="text-3xl font-extrabold tracking-tight text-[#f2f3f5]"
                            >
                                {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
                            </motion.h1>
                        </AnimatePresence>
                        <p className="text-[#949ba4] text-sm font-medium">
                            {mode === 'login'
                                ? 'Enter your credentials to access your account'
                                : mode === 'signup'
                                    ? 'Join our premium professional messaging community'
                                    : 'We will send you a secure recovery link'}
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleAuth} className="space-y-5">
                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-xs text-destructive font-medium"
                                >
                                    {error}
                                </motion.div>
                            )}
                            {success && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3 text-xs text-green-500 font-medium"
                                >
                                    {success}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-xs font-bold text-[#b5bac1] uppercase tracking-wider ml-1">
                                    Email Address
                                </Label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#80848e] transition-colors group-focus-within:text-[#f2f3f5]" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="h-12 pl-12 rounded-xl bg-[#0b0c0d]/50 border-white/5 text-[#f2f3f5] placeholder:text-[#80848e] focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500 shadow-inner transition-all"
                                    />
                                </div>
                            </div>

                            {mode !== 'forgot' && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between px-1">
                                        <Label htmlFor="password" title="Password" className="text-xs font-bold text-[#b5bac1] uppercase tracking-wider">
                                            Password
                                        </Label>
                                        {mode === 'login' && (
                                            <button
                                                type="button"
                                                onClick={() => switchMode('forgot')}
                                                className="text-xs font-bold text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                                            >
                                                Forgot?
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#80848e] transition-colors group-focus-within:text-[#f2f3f5]" />
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="••••••••"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="h-12 pl-12 rounded-xl bg-[#0b0c0d]/50 border-white/5 text-[#f2f3f5] placeholder:text-[#80848e] focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500 shadow-inner transition-all"
                                        />
                                    </div>
                                </div>
                            )}

                            <Button
                                className="w-full h-12 mt-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[15px] shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] disabled:opacity-50"
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <span className="flex items-center gap-2">
                                        {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
                                        <ArrowRight className="h-4 w-4" />
                                    </span>
                                )}
                            </Button>
                        </div>
                    </form>

                    {/* Divider */}
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-[#1e1f22] px-4 text-[#80848e] font-bold tracking-wider">Or continue with</span>
                        </div>
                    </div>

                    {/* Social Logins */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-12 rounded-xl border-white/10 bg-[#2b2d31] text-[#f2f3f5] hover:bg-[#3f4148] transition-all flex items-center justify-center gap-2 shadow-sm hover:border-white/20"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                        >
                            <Chrome className="h-4 w-4 text-white" />
                            <span className="text-sm font-bold">Google</span>
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="h-12 rounded-xl border-white/10 bg-[#2b2d31] text-[#f2f3f5] hover:bg-[#3f4148] transition-all flex items-center justify-center gap-2 shadow-sm hover:border-white/20 opacity-50 cursor-not-allowed"
                            disabled={true}
                        >
                            <Github className="h-4 w-4 text-white" />
                            <span className="text-sm font-bold">GitHub</span>
                        </Button>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-sm text-[#949ba4] font-medium pt-2">
                        {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
                        <button
                            onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                            className="font-bold text-blue-400 hover:text-blue-300 hover:underline transition-colors ml-1"
                        >
                            {mode === 'login' ? 'Sign Up' : 'Sign In'}
                        </button>
                    </p>
                </motion.div>
            </div>

            {/* Right Side: Identity/Branding */}
            <div className="hidden lg:flex flex-1 relative bg-[#0b0c0d] items-center justify-center p-6 overflow-hidden border-l border-white/5">
                {/* Visual Image Background Wrapper */}
                <div className="absolute inset-8 rounded-[40px] overflow-hidden bg-[#1e1f22] border border-white/5 shadow-2xl">
                    <img
                        src="/auth-illos.png"
                        alt="Abstract QwikChat Illustration"
                        className="w-full h-full object-cover opacity-90 transition-transform duration-1000 hover:scale-105"
                    />

                    {/* Modern Gradient Overlay for Text Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c0d]/90 via-[#0b0c0d]/40 to-transparent" />

                    {/* Text Content anchored to bottom */}
                    <div className="absolute bottom-16 left-12 right-12 z-10 w-full max-w-[500px] space-y-6">
                        <div className="space-y-4">
                            <motion.h2
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-5xl font-extrabold tracking-tight text-white leading-[1.1]"
                            >
                                Secure. Fast. <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Intelligent.</span>
                            </motion.h2>
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-lg text-white/80 leading-relaxed font-medium"
                            >
                                Experience the next evolution of team communication. Real-time, end-to-end encrypted messaging designed for modern innovators.
                            </motion.p>
                        </div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="flex items-center gap-2 pt-2"
                        >
                            <div className="flex -space-x-3 drop-shadow-lg">
                                <Avatar className="h-10 w-10 border-2 border-[#1e1f22]">
                                    <AvatarImage src="https://i.pravatar.cc/150?u=1" />
                                </Avatar>
                                <Avatar className="h-10 w-10 border-2 border-[#1e1f22]">
                                    <AvatarImage src="https://i.pravatar.cc/150?u=2" />
                                </Avatar>
                                <Avatar className="h-10 w-10 border-2 border-[#1e1f22]">
                                    <AvatarImage src="https://i.pravatar.cc/150?u=3" />
                                </Avatar>
                            </div>
                            <span className="text-sm font-bold text-white/90 ml-2">Join 10k+ teams</span>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}

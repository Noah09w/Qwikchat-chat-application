import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Lock, ArrowRight, Github, Chrome } from 'lucide-react';
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
        <div className="flex min-h-screen w-full bg-background overflow-hidden">
            {/* Left Side: Form */}
            <div className="flex flex-1 flex-col items-center justify-center p-8 lg:p-12 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-[400px] space-y-8"
                >
                    {/* Brand */}
                    <div className="flex justify-center lg:justify-start">
                        <Logo />
                    </div>

                    {/* Header */}
                    <div className="space-y-2 text-center lg:text-left">
                        <AnimatePresence mode="wait">
                            <motion.h1
                                key={mode}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="text-3xl font-bold tracking-tight text-foreground"
                            >
                                {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create an account' : 'Reset password'}
                            </motion.h1>
                        </AnimatePresence>
                        <p className="text-muted-foreground text-sm">
                            {mode === 'login'
                                ? 'Enter your credentials to access your account'
                                : mode === 'signup'
                                    ? 'Join our professional messaging community'
                                    : 'We will send you a recovery link to your email'}
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleAuth} className="space-y-4">
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

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground ml-1">
                                    Email Address
                                </Label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="h-11 pl-12 rounded-xl bg-card border-border text-foreground focus-visible:ring-primary shadow-sm"
                                    />
                                </div>
                            </div>

                            {mode !== 'forgot' && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between px-1">
                                        <Label htmlFor="password" university-title="Password" className="text-xs font-semibold text-muted-foreground">
                                            Password
                                        </Label>
                                        {mode === 'login' && (
                                            <button
                                                type="button"
                                                onClick={() => switchMode('forgot')}
                                                className="text-xs font-semibold text-primary hover:underline"
                                            >
                                                Forgot?
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="••••••••"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="h-11 pl-12 rounded-xl bg-card border-border text-foreground focus-visible:ring-primary shadow-sm"
                                        />
                                    </div>
                                </div>
                            )}

                            <Button
                                className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
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
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-4 text-muted-foreground font-semibold tracking-wider">Or continue with</span>
                        </div>
                    </div>

                    {/* Social Logins */}
                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-11 rounded-xl border-border bg-card text-foreground hover:bg-muted transition-all flex items-center justify-center gap-2"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                        >
                            <Chrome className="h-4 w-4" />
                            <span className="text-xs font-semibold">Google</span>
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="h-11 rounded-xl border-border bg-card text-foreground hover:bg-muted transition-all flex items-center justify-center gap-2"
                            disabled={true}
                        >
                            <Github className="h-4 w-4" />
                            <span className="text-xs font-semibold">GitHub</span>
                        </Button>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-sm text-muted-foreground">
                        {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
                        <button
                            onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                            className="font-bold text-primary hover:underline"
                        >
                            {mode === 'login' ? 'Sign Up' : 'Sign In'}
                        </button>
                    </p>
                </motion.div>
            </div>

            {/* Right Side: Identity/Branding */}
            <div className="hidden lg:flex flex-1 relative bg-card items-center justify-center p-12 overflow-hidden border-l border-border">
                {/* Visual Elements */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[100px]" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[100px]" />
                </div>

                <div className="relative z-10 w-full max-w-[440px] space-y-8 text-center">
                    <div className="space-y-4">
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-5xl font-bold tracking-tight text-foreground leading-tight"
                        >
                            Connect with <br /> <span className="text-primary">Confidence.</span>
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-base text-muted-foreground leading-relaxed"
                        >
                            Experience professional secure messaging with a clean, distraction-free interface designed for modern teams.
                        </motion.p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="flex justify-center gap-2"
                    >
                        <div className="h-1.5 w-12 rounded-full bg-primary shadow-sm" />
                        <div className="h-1.5 w-3 rounded-full bg-border" />
                        <div className="h-1.5 w-3 rounded-full bg-border" />
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

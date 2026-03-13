import { useMemo, useState } from 'react';
import {
    BellRing,
    Chrome,
    Github,
    Linkedin,
    Lock,
    Mail,
    MessageCircleMore,
    ShieldCheck,
    Twitter,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import './AuthPage.css';

type AuthMode = 'login' | 'signup' | 'forgot';

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

const modeCopy: Record<AuthMode, { title: string; submitLabel: string; socialLabel: string }> = {
    login: {
        title: 'Sign In',
        submitLabel: 'Sign In',
        socialLabel: 'Sign in with',
    },
    signup: {
        title: 'Sign Up',
        submitLabel: 'Sign Up',
        socialLabel: 'Sign up with',
    },
    forgot: {
        title: 'Reset Password',
        submitLabel: 'Send Link',
        socialLabel: 'Sign in with',
    },
};

const heroFeatures = [
    { icon: MessageCircleMore, label: 'Instant chats' },
    { icon: BellRing, label: 'Smart alerts' },
    { icon: ShieldCheck, label: 'Safe by design' },
];

export default function AuthPage() {
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const copy = useMemo(() => modeCopy[mode], [mode]);

    const switchMode = (nextMode: AuthMode) => {
        setMode(nextMode);
        setError(null);
        setSuccess(null);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            if (mode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;

                if (rememberMe) {
                    localStorage.setItem('qwikchat-auth-remember', 'true');
                } else {
                    localStorage.removeItem('qwikchat-auth-remember');
                }
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
                        },
                    },
                });
                if (error) throw error;
                setSuccess('Check your email to confirm your account.');
            } else {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/`,
                });
                if (error) throw error;
                setSuccess('Recovery link sent to your email.');
            }
        } catch (error) {
            setError(getErrorMessage(error, 'Authentication failed'));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/chat`,
                },
            });
            if (error) throw error;
        } catch (error) {
            setError(getErrorMessage(error, 'Google login failed'));
        }
    };

    const handleGithub = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: `${window.location.origin}/chat`,
                },
            });
            if (error) throw error;
        } catch (error) {
            setError(getErrorMessage(error, 'GitHub login failed'));
        }
    };

    return (
        <div className="auth-single-shell">
            <div className="auth-single-bg" />

            <div className="auth-single-layout">
                <div className="auth-single-grid">
                    <section className="auth-single-hero">
                        <div className="auth-single-logo">
                            <img src="/logo.png" alt="QwikChat logo" />
                            <span>QwikChat</span>
                        </div>

                        <img
                            src="/auth-hero-illustration.svg"
                            alt="QwikChat collaboration illustration"
                            className="auth-single-hero-image"
                        />

                        <h2>Glad to see you!</h2>
                        <p>
                            Real-time messaging built for focused teams. Keep conversations moving with speed, clarity,
                            and better collaboration.
                        </p>

                        <div className="auth-single-feature-row">
                            {heroFeatures.map((item) => (
                                <div key={item.label}>
                                    <item.icon size={15} />
                                    <span>{item.label}</span>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            className="auth-single-switch-cta"
                            onClick={() => switchMode(mode === 'signup' ? 'login' : 'signup')}
                        >
                            {mode === 'signup' ? 'Go to Sign In' : 'Go to Sign Up'}
                        </button>
                    </section>

                    <section className="auth-single-form-pane">
                        <h1>{copy.title}</h1>
                        <div className="auth-single-title-line" />

                        <div className="auth-single-toggle" role="tablist" aria-label="Authentication mode">
                            {[
                                { key: 'login', label: 'Login' },
                                { key: 'signup', label: 'Sign Up' },
                                { key: 'forgot', label: 'Reset' },
                            ].map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={mode === item.key}
                                    className={mode === item.key ? 'active' : ''}
                                    onClick={() => switchMode(item.key as AuthMode)}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        <form className="auth-single-form" onSubmit={handleSubmit}>
                            {error && <div className="auth-single-msg auth-single-error">{error}</div>}
                            {success && <div className="auth-single-msg auth-single-success">{success}</div>}

                            <label className="auth-single-field">
                                <Mail size={16} />
                                <input
                                    type="email"
                                    placeholder="Email address"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    required
                                />
                            </label>

                            {mode !== 'forgot' && (
                                <label className="auth-single-field">
                                    <Lock size={16} />
                                    <input
                                        type="password"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        required
                                    />
                                </label>
                            )}

                            {mode === 'login' && (
                                <div className="auth-single-row">
                                    <label className="auth-single-check">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(event) => setRememberMe(event.target.checked)}
                                        />
                                        Remember me
                                    </label>
                                    <button type="button" onClick={() => switchMode('forgot')} className="auth-single-link">
                                        Forgot password?
                                    </button>
                                </div>
                            )}

                            <button type="submit" className="auth-single-submit" disabled={loading}>
                                {loading ? 'Please wait...' : copy.submitLabel}
                            </button>
                        </form>

                        <p className="auth-single-social-label">{copy.socialLabel}</p>
                        <div className="auth-single-socials">
                            <button type="button" aria-label="Twitter">
                                <Twitter size={14} />
                            </button>
                            <button type="button" aria-label="LinkedIn">
                                <Linkedin size={14} />
                            </button>
                            <button type="button" aria-label="Google" onClick={handleGoogle} disabled={loading}>
                                <Chrome size={14} />
                            </button>
                            <button type="button" aria-label="GitHub" onClick={handleGithub} disabled={loading}>
                                <Github size={14} />
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

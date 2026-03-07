import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import AuthPage from '@/pages/AuthPage';
import ChatPage from '@/pages/ChatPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { Loader2 } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const { theme } = useChatStore();

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.toggle('dark', systemTheme === 'dark');
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  useEffect(() => {
    const fetchProfile = async (userId: string, email: string) => {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile) {
        useChatStore.getState().setCurrentUser({
          id: profile.id,
          email: email,
          username: profile.username || 'Anonymous',
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          privacy_last_seen: profile.privacy_last_seen,
          privacy_read_receipts: profile.privacy_read_receipts,
          settings: profile.settings
        });

        // Initialize settings from DB if present
        if (profile.settings) {
          if (profile.settings.notifications) {
            useChatStore.getState().setNotifications(profile.settings.notifications);
          }
          if (profile.settings.chatBehavior) {
            useChatStore.getState().setChatBehavior(profile.settings.chatBehavior);
          }
          if (profile.settings.appearance) {
            useChatStore.getState().setAppearanceSettings(profile.settings.appearance);
          }
        }
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id, session.user.email!);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id, session.user.email!);
      else useChatStore.getState().setCurrentUser(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-in">
          <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={session ? <Navigate to="/chat" replace /> : <AuthPage />} />
        <Route path="/chat" element={session ? <ChatPage /> : <Navigate to="/" replace />} />
        <Route path="/settings" element={session ? <SettingsPage /> : <Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

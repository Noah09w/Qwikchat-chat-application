import { supabase } from '@/lib/supabase';
import type { Chat, User } from '@/store/chatStore';

type UserPreview = Pick<User, 'id' | 'username' | 'avatar_url'>;

interface DirectChatLookup {
    chat_id: string;
    chats: {
        created_at: string;
    } | {
        created_at: string;
    }[] | null;
}

function getChatCreatedAt(chats: DirectChatLookup['chats']) {
    if (Array.isArray(chats)) {
        return chats[0]?.created_at ?? new Date().toISOString();
    }

    return chats?.created_at ?? new Date().toISOString();
}

export async function openOrCreateDirectChat(params: {
    currentUserId: string;
    targetUser: UserPreview;
    chats: Chat[];
    setChats: (chats: Chat[]) => void;
    setActiveChatId: (chatId: string) => void;
}) {
    const { currentUserId, targetUser, chats, setChats, setActiveChatId } = params;

    const existingLocalChat = chats.find(
        (chat) => chat.type === 'DIRECT' && chat.participant_user_id === targetUser.id
    );

    if (existingLocalChat) {
        setActiveChatId(existingLocalChat.id);
        return existingLocalChat.id;
    }

    const { data: myChats } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', currentUserId);

    const myChatIds = myChats?.map((chat) => chat.chat_id) ?? [];

    if (myChatIds.length > 0) {
        const { data: existingChat } = await supabase
            .from('chat_participants')
            .select('chat_id, chats!inner(created_at, type)')
            .eq('user_id', targetUser.id)
            .eq('chats.type', 'DIRECT')
            .in('chat_id', myChatIds)
            .maybeSingle();

        const directChat = existingChat as DirectChatLookup | null;
        if (directChat) {
            const existingChatObject: Chat = {
                id: directChat.chat_id,
                type: 'DIRECT',
                name: targetUser.username || 'Unknown User',
                avatar_url: targetUser.avatar_url || undefined,
                created_at: getChatCreatedAt(directChat.chats),
                lastMessage: 'Tap to view messages...',
                time: 'Active',
                participant_user_id: targetUser.id,
            };

            if (!chats.some((chat) => chat.id === existingChatObject.id)) {
                setChats([existingChatObject, ...chats]);
            }

            setActiveChatId(existingChatObject.id);
            return existingChatObject.id;
        }
    }

    const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({ type: 'DIRECT', created_by: currentUserId })
        .select()
        .single();

    if (chatError) {
        throw chatError;
    }

    const { error: participantError } = await supabase.from('chat_participants').insert([
        { chat_id: newChat.id, user_id: currentUserId, role: 'ADMIN' },
        { chat_id: newChat.id, user_id: targetUser.id, role: 'MEMBER' }
    ]);

    if (participantError) {
        throw participantError;
    }

    const chatObject: Chat = {
        id: newChat.id,
        type: 'DIRECT',
        name: targetUser.username || 'Unknown User',
        avatar_url: targetUser.avatar_url || undefined,
        created_at: newChat.created_at,
        lastMessage: 'Conversation started',
        time: 'Just now',
        participant_user_id: targetUser.id,
    };

    setChats([chatObject, ...chats]);
    setActiveChatId(newChat.id);
    return newChat.id;
}

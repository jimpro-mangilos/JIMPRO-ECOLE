import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const BROADCAST_CONVERSATION_ID = '00000000-0000-0000-0000-000000000001';

export interface ChatProfile {
  id: string;
  nom: string;
  prenom: string;
  role?: { nom: string };
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: ChatProfile;
}

export interface Conversation {
  id: string;
  type: 'broadcast' | 'private';
  otherUser?: ChatProfile;
  lastMessage?: ChatMessage;
  unreadCount: number;
}

export function useChat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<ChatProfile[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load all users for new conversation creation
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('id, nom, prenom, role:roles(nom)')
      .neq('id', user.id)
      .order('nom')
      .then(({ data }) => {
        if (data) setAllUsers(data as unknown as ChatProfile[]);
      });
  }, [user]);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    if (!user) return;

    // Load private conversations where current user is participant
    const { data: participantRows } = await supabase
      .from('chat_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    const privateConvIds = (participantRows ?? []).map((r) => r.conversation_id);

    // Fetch all messages to compute last message and unread count
    const allConvIds = [BROADCAST_CONVERSATION_ID, ...privateConvIds];

    // Get last messages per conversation
    const { data: lastMsgs } = await supabase
      .from('chat_messages')
      .select('id, conversation_id, sender_id, content, created_at, sender:profiles(id, nom, prenom)')
      .in('conversation_id', allConvIds)
      .order('created_at', { ascending: false });

    // Get read message ids for current user
    const { data: readRows } = await supabase
      .from('chat_message_reads')
      .select('message_id')
      .eq('user_id', user.id);

    const readIds = new Set((readRows ?? []).map((r) => r.message_id));

    // Build conversations
    const convList: Conversation[] = [];

    // Broadcast conversation
    const broadcastMessages = (lastMsgs ?? []).filter(
      (m) => m.conversation_id === BROADCAST_CONVERSATION_ID
    );
    const broadcastUnread = broadcastMessages.filter(
      (m) => m.sender_id !== user.id && !readIds.has(m.id)
    ).length;
    convList.push({
      id: BROADCAST_CONVERSATION_ID,
      type: 'broadcast',
      lastMessage: broadcastMessages[0] as unknown as ChatMessage,
      unreadCount: broadcastUnread,
    });

    // Private conversations
    for (const convId of privateConvIds) {
      // Get the other participant
      const { data: parts } = await supabase
        .from('chat_participants')
        .select('user_id, user:profiles(id, nom, prenom, role:roles(nom))')
        .eq('conversation_id', convId)
        .neq('user_id', user.id)
        .maybeSingle();

      const convMessages = (lastMsgs ?? []).filter((m) => m.conversation_id === convId);
      const unread = convMessages.filter(
        (m) => m.sender_id !== user.id && !readIds.has(m.id)
      ).length;

      convList.push({
        id: convId,
        type: 'private',
        otherUser: parts ? (parts.user as unknown as ChatProfile) : undefined,
        lastMessage: convMessages[0] as unknown as ChatMessage,
        unreadCount: unread,
      });
    }

    // Sort: broadcast first, then by last message date desc
    convList.sort((a, b) => {
      if (a.id === BROADCAST_CONVERSATION_ID) return -1;
      if (b.id === BROADCAST_CONVERSATION_ID) return 1;
      const aTime = a.lastMessage?.created_at ?? '';
      const bTime = b.lastMessage?.created_at ?? '';
      return bTime.localeCompare(aTime);
    });

    setConversations(convList);
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages for active conversation
  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (!user) return;
      setLoadingMessages(true);
      const { data } = await supabase
        .from('chat_messages')
        .select('id, conversation_id, sender_id, content, created_at, sender:profiles(id, nom, prenom)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(200);

      setMessages((data as unknown as ChatMessage[]) ?? []);
      setLoadingMessages(false);

      // Mark all as read
      if (data && data.length > 0) {
        const unread = data.filter((m) => m.sender_id !== user.id);
        if (unread.length > 0) {
          await supabase
            .from('chat_message_reads')
            .upsert(
              unread.map((m) => ({ message_id: m.id, user_id: user.id })),
              { onConflict: 'message_id,user_id', ignoreDuplicates: true }
            );
        }
      }
    },
    [user]
  );

  // Subscribe to new messages for active conversation
  useEffect(() => {
    if (!activeConversationId || !user) return;

    loadMessages(activeConversationId);

    // Unsubscribe previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`chat:${activeConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          // Fetch sender info
          const { data: senderData } = await supabase
            .from('profiles')
            .select('id, nom, prenom')
            .eq('id', newMsg.sender_id)
            .maybeSingle();

          const enriched: ChatMessage = { ...newMsg, sender: senderData ?? undefined };
          setMessages((prev) => [...prev, enriched]);

          // Mark as read immediately if not own message
          if (newMsg.sender_id !== user.id) {
            await supabase
              .from('chat_message_reads')
              .upsert(
                [{ message_id: newMsg.id, user_id: user.id }],
                { onConflict: 'message_id,user_id', ignoreDuplicates: true }
              );
          }

          // Refresh sidebar counts
          loadConversations();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId, user, loadMessages, loadConversations]);

  // Also listen globally for new messages (to update unread badges in sidebar)
  useEffect(() => {
    if (!user) return;

    const globalChannel = supabase
      .channel('chat:global')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalChannel);
    };
  }, [user, loadConversations]);

  const sendMessage = useCallback(
    async (conversationId: string, content: string) => {
      if (!user || !content.trim()) return;
      await supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
      });
    },
    [user]
  );

  const openOrCreatePrivateConversation = useCallback(
    async (otherUserId: string): Promise<string> => {
      if (!user) throw new Error('Not authenticated');

      // Check if a private conversation already exists between these two users
      const { data: myParticipations } = await supabase
        .from('chat_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      const myConvIds = (myParticipations ?? []).map((p) => p.conversation_id);

      if (myConvIds.length > 0) {
        const { data: sharedConvs } = await supabase
          .from('chat_participants')
          .select('conversation_id')
          .eq('user_id', otherUserId)
          .in('conversation_id', myConvIds);

        if (sharedConvs && sharedConvs.length > 0) {
          return sharedConvs[0].conversation_id;
        }
      }

      // Create new private conversation
      const { data: newConv, error: convError } = await supabase
        .from('chat_conversations')
        .insert({ type: 'private' })
        .select()
        .single();

      if (convError || !newConv) throw new Error('Failed to create conversation');

      // Insert self first so RLS allows inserting the other participant next
      const { error: selfError } = await supabase
        .from('chat_participants')
        .insert({ conversation_id: newConv.id, user_id: user.id });

      if (selfError) throw new Error('Failed to join conversation');

      const { error: otherError } = await supabase
        .from('chat_participants')
        .insert({ conversation_id: newConv.id, user_id: otherUserId });

      if (otherError) throw new Error('Failed to add other participant');

      await loadConversations();
      return newConv.id;
    },
    [user, loadConversations]
  );

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return {
    conversations,
    messages,
    activeConversationId,
    setActiveConversationId,
    allUsers,
    loadingMessages,
    sendMessage,
    openOrCreatePrivateConversation,
    totalUnread,
    refreshConversations: loadConversations,
  };
}

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../../contexts/AuthContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db: any = supabase;

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
  const { user, isItManager, currentSchoolId } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<ChatProfile[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // Track latest requested conversation to prevent stale updates
  const latestConvRef = useRef<string | null>(null);
  const PAGE_SIZE = 50;

  const clearError = useCallback(() => setError(null), []);

  // Load all users for new conversation creation
  useEffect(() => {
    if (!user) return;
    db
      .from('profiles')
      .select('id, nom, prenom, role:roles(nom)')
      .neq('id', user.id)
      .order('nom')
      .then(({ data }: { data: ChatProfile[] | null }) => {
        if (data) setAllUsers(data);
      });
  }, [user]);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    if (!user) return;

    try {
      // Load private conversations — IT managers see all, others see only their own
      let privateConvIds: string[];
      if (isItManager()) {
        const { data: allParts, error: allErr } = await db
          .from('chat_participants')
          .select('conversation_id');
        if (allErr) throw allErr;
        privateConvIds = [...new Set((allParts ?? []).map((r: { conversation_id: string }) => r.conversation_id))] as string[];
      } else {
        const { data: participantRows, error: partErr } = await db
          .from('chat_participants')
          .select('conversation_id')
          .eq('user_id', user.id);
        if (partErr) throw partErr;
        privateConvIds = (participantRows ?? []).map((r: { conversation_id: string }) => r.conversation_id);
      }
      const allConvIds = [BROADCAST_CONVERSATION_ID, ...privateConvIds];

      // Get last messages per conversation
      const { data: lastMsgs, error: msgErr } = await db
        .from('chat_messages')
        .select('id, conversation_id, sender_id, content, created_at, sender:profiles(id, nom, prenom)')
        .in('conversation_id', allConvIds)
        .order('created_at', { ascending: false });

      if (msgErr) throw msgErr;

      // Get read message ids for current user
      const { data: readRows, error: readErr } = await db
        .from('chat_message_reads')
        .select('message_id')
        .eq('user_id', user.id);

      if (readErr) throw readErr;

      const readIds = new Set((readRows ?? []).map((r: { message_id: string }) => r.message_id));

      // Build conversations
      const convList: Conversation[] = [];

      // Broadcast conversation
      const broadcastMessages = (lastMsgs ?? []).filter(
        (m: ChatMessage) => m.conversation_id === BROADCAST_CONVERSATION_ID
      );
      const broadcastUnread = broadcastMessages.filter(
        (m: ChatMessage) => m.sender_id !== user.id && !readIds.has(m.id)
      ).length;
      convList.push({
        id: BROADCAST_CONVERSATION_ID,
        type: 'broadcast',
        lastMessage: broadcastMessages[0] as ChatMessage,
        unreadCount: broadcastUnread,
      });

      // Private conversations — batch-fetch participants
      if (privateConvIds.length > 0) {
        const { data: allParts, error: partsErr } = await db
          .from('chat_participants')
          .select('conversation_id, user_id, user:profiles(id, nom, prenom, role:roles(nom))')
          .in('conversation_id', privateConvIds)
          .neq('user_id', user.id);

        if (partsErr) throw partsErr;

        const otherUserByConv: Record<string, ChatProfile> = {};
        for (const p of (allParts ?? [])) {
          if (!otherUserByConv[p.conversation_id]) {
            otherUserByConv[p.conversation_id] = p.user as ChatProfile;
          }
        }

        for (const convId of privateConvIds) {
          const convMessages = (lastMsgs ?? []).filter((m: ChatMessage) => m.conversation_id === convId);
          const unread = convMessages.filter(
            (m: ChatMessage) => m.sender_id !== user.id && !readIds.has(m.id)
          ).length;

          convList.push({
            id: convId,
            type: 'private',
            otherUser: otherUserByConv[convId],
            lastMessage: convMessages[0] as ChatMessage,
            unreadCount: unread,
          });
        }
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
    } catch (err: unknown) {
      console.error('Error loading conversations:', err);
      setError('Erreur lors du chargement des conversations');
    }
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages for active conversation
  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (!user) return;
      setLoadingMessages(true);
      setError(null);
      // Track the requested conversation to prevent stale updates
      latestConvRef.current = conversationId;

      try {
        const { data, error: msgErr } = await db
          .from('chat_messages')
          .select('id, conversation_id, sender_id, content, created_at, sender:profiles(id, nom, prenom)')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })  // newest first, then reverse
          .limit(PAGE_SIZE);

        // Only apply if this is still the latest requested conversation
        if (latestConvRef.current !== conversationId) return;

        if (msgErr) throw msgErr;

        const msgs = (data as ChatMessage[]) ?? [];
        setHasMore(msgs.length === PAGE_SIZE);
        setMessages(msgs.reverse());  // put in ascending order

        // Mark all as read
        if (data && data.length > 0) {
          const unread = (data as ChatMessage[]).filter((m) => m.sender_id !== user.id);
          if (unread.length > 0) {
            await db
              .from('chat_message_reads')
              .upsert(
                unread.map((m) => ({ message_id: m.id, user_id: user.id })),
                { onConflict: 'message_id,user_id', ignoreDuplicates: true }
              );
          }
        }
      } catch (err: unknown) {
        console.error('Error loading messages:', err);
        if (latestConvRef.current === conversationId) {
          setError('Erreur lors du chargement des messages');
        }
      } finally {
        if (latestConvRef.current === conversationId) {
          setLoadingMessages(false);
        }
      }
    },
    [user]
  );

  // Load older messages (pagination)
  const loadMore = useCallback(async () => {
    if (!user || !activeConversationId || messages.length === 0) return;
    const oldestMsg = messages[0];
    const { data } = await db
      .from('chat_messages')
      .select('id, conversation_id, sender_id, content, created_at, sender:profiles(id, nom, prenom)')
      .eq('conversation_id', activeConversationId)
      .lt('created_at', oldestMsg.created_at)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);
    if (!data || data.length === 0) { setHasMore(false); return; }
    const olderMsgs = (data as ChatMessage[]).reverse();
    setHasMore(olderMsgs.length === PAGE_SIZE);
    setMessages(prev => [...olderMsgs, ...prev]);
  }, [user, activeConversationId, messages, PAGE_SIZE]);

  // Reset messages when changing active conversation
  useEffect(() => {
    if (activeConversationId) {
      setMessages([]);
      setError(null);
    }
  }, [activeConversationId]);

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
        async (payload: { new: ChatMessage }) => {
          const newMsg = payload.new;

          const { data: senderData } = await db
            .from('profiles')
            .select('id, nom, prenom')
            .eq('id', newMsg.sender_id)
            .maybeSingle();

          const enriched: ChatMessage = { ...newMsg, sender: senderData ?? undefined };

          setMessages((prev) => {
            // Deduplicate: skip if this message (by server id) is already in the list
            if (prev.some((m) => m.id === enriched.id)) return prev;
            return [...prev, enriched];
          });

          // Mark as read immediately if not own message
          if (newMsg.sender_id !== user.id) {
            await db
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
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_message_reads' },
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

      setSending(true);
      setError(null);
      const trimmed = content.trim();

      // Optimistic: create a temporary message
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimisticMsg: ChatMessage = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: user.id,
        content: trimmed,
        created_at: new Date().toISOString(),
      };

      // Add to messages list immediately
      setMessages((prev) => [...prev, optimisticMsg]);

      try {
        const { error: sendErr } = await db.from('chat_messages').insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: trimmed,
          ecole_id: currentSchoolId,
        });

        if (sendErr) throw sendErr;
      } catch (err: unknown) {
        console.error('Error sending message:', err);
        // Remove the optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setError("Erreur lors de l'envoi du message. Veuillez réessayer.");
      } finally {
        setSending(false);
      }
    },
    [user]
  );

  const openOrCreatePrivateConversation = useCallback(
    async (otherUserId: string): Promise<string> => {
      if (!user) throw new Error('Not authenticated');

      setError(null);

      try {
        // Check if a private conversation already exists between these two users
        const { data: myParticipations, error: myErr } = await db
          .from('chat_participants')
          .select('conversation_id')
          .eq('user_id', user.id);

        if (myErr) throw myErr;

        const myConvIds = (myParticipations ?? []).map((p: { conversation_id: string }) => p.conversation_id);

        if (myConvIds.length > 0) {
          const { data: sharedConvs, error: sharedErr } = await db
            .from('chat_participants')
            .select('conversation_id')
            .eq('user_id', otherUserId)
            .in('conversation_id', myConvIds);

          if (sharedErr) throw sharedErr;

          if (sharedConvs && sharedConvs.length > 0) {
            return sharedConvs[0].conversation_id;
          }
        }

        // Create new private conversation — generate ID client-side (avoids RLS SELECT issue)
        const convId = crypto.randomUUID();
        const { error: convError } = await db
          .from('chat_conversations')
          .insert({ id: convId, type: 'private', ecole_id: currentSchoolId });

        if (convError) throw new Error('Erreur création conversation: ' + convError.message);

        // Insert self as participant
        const { error: selfError } = await db
          .from('chat_participants')
          .insert({ conversation_id: convId, user_id: user.id });

        if (selfError) throw new Error("Erreur ajout self: " + selfError.message);

        // Insert other participant
        const { error: otherError } = await db
          .from('chat_participants')
          .insert({ conversation_id: convId, user_id: otherUserId });

        if (otherError) throw new Error("Erreur ajout destinataire: " + otherError.message);

        await loadConversations();
        return convId;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erreur lors de la création de la conversation';
        console.error('Error creating conversation:', err);
        setError(message);
        throw err;
      }
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
    sending,
    error,
    clearError,
    sendMessage,
    openOrCreatePrivateConversation,
    totalUnread,
    hasMore,
    loadMore,
    refreshConversations: loadConversations,
  };
}

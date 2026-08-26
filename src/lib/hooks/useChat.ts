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
  attachment_url?: string | null;
  attachment_nom?: string | null;
  attachment_type?: string | null;
  audio_url?: string | null;
  is_pinned?: boolean;
  pinned_by?: string | null;
  pinned_at?: string | null;
  reply_to_id?: string | null;
  reply?: ChatMessage | null;
  edited_at?: string | null;
  deleted_at?: string | null;
  reactions?: { emoji: string; user_id: string }[];
}

export interface ChatReaction {
  emoji: string;
  user_id: string;
}

export interface Conversation {
  id: string;
  type: 'broadcast' | 'private' | 'group';
  nom?: string | null;
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
  const [typingUsers, setTypingUsers] = useState<Record<string, { nom: string; prenom: string }>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // Track latest requested conversation to prevent stale updates
  const latestConvRef = useRef<string | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);
  useEffect(() => { activeConversationIdRef.current = activeConversationId; }, [activeConversationId]);
  const PAGE_SIZE = 50;
  const MSG_SELECT = 'id, conversation_id, sender_id, content, created_at, attachment_url, attachment_nom, attachment_type, audio_url, is_pinned, pinned_by, pinned_at, reply_to_id, edited_at, deleted_at, reply:chat_messages!reply_to_id(id, content, sender_id, attachment_nom, attachment_type), sender:profiles(id, nom, prenom), reactions:chat_message_reactions(emoji, user_id)';

  const clearError = useCallback(() => setError(null), []);

  // Notifications PWA : demander la permission et mettre à jour le titre
  useEffect(() => {
    if (!user) return;
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    return () => {};
  }, [user]);

  useEffect(() => {
    const total = conversations.reduce((acc, c) => acc + c.unreadCount, 0);
    if (typeof document !== 'undefined') {
      document.title = total > 0 ? `(${total}) JIMPRO` : 'JIMPRO';
    }
  }, [conversations]);

  // Load all users for new conversation creation
  useEffect(() => {
    if (!user) return;
    db
      .from('profiles')
      .select('id, nom, prenom, role:roles(nom)')
      .eq('ecole_id', currentSchoolId)
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
        .select(MSG_SELECT)
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
          .select(MSG_SELECT)
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
          const { data: full } = await db.from('chat_messages').select(MSG_SELECT).eq('id', newMsg.id).maybeSingle();
          const enriched: ChatMessage = full ?? newMsg;

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
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${activeConversationId}` },
        async (payload: { new: ChatMessage }) => {
          const { data: full } = await db.from('chat_messages').select(MSG_SELECT).eq('id', payload.new.id).maybeSingle();
          if (full) setMessages(prev => prev.map(m => m.id === full.id ? (full as ChatMessage) : m));
          loadConversations();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_typing', filter: `conversation_id=eq.${activeConversationId}` },
        async (payload: any) => {
          if (!payload.new) return;
          const uid = payload.new.user_id;
          if (uid === user.id) return;
          if (payload.eventType === 'DELETE') {
            setTypingUsers(prev => { const c = { ...prev }; delete c[uid]; return c; });
            return;
          }
          const { data: prof } = await db.from('profiles').select('id, nom, prenom').eq('id', uid).maybeSingle();
          if (prof) setTypingUsers(prev => ({ ...prev, [uid]: prof }));
          // nettoyage après 3s
          setTimeout(() => setTypingUsers(prev => { const c = { ...prev }; delete c[uid]; return c; }), 3000);
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
        async (payload: any) => {
          loadConversations();
          const newMsg = payload.new as ChatMessage;
          if (!newMsg || newMsg.sender_id === user.id) return;
          const isActive = newMsg.conversation_id === activeConversationIdRef.current && !document.hidden;
          if (isActive) return;
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            const { data: prof } = await db.from('profiles').select('nom, prenom').eq('id', newMsg.sender_id).maybeSingle();
            const name = prof ? `${prof.prenom} ${prof.nom}` : 'Nouveau message';
            new Notification('JIMPRO — Nouveau message', {
              body: name + ': ' + (newMsg.content || (newMsg.attachment_nom ? '📎 ' + newMsg.attachment_nom : 'Pièce jointe')),
              icon: '/icon.svg',
            });
          }
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

  const uploadChatFile = useCallback(async (file: File, prefix: string): Promise<string> => {
    const ext = file.name.split('.').pop() || 'bin';
    const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await db.storage.from('chat-files').upload(path, file, { upsert: true });
    if (error) throw new Error(error.message);
    return db.storage.from('chat-files').getPublicUrl(path).data.publicUrl;
  }, []);

  const sendMessage = useCallback(
    async (conversationId: string, content: string, opts?: { attachment?: File | null; audio?: Blob | null; replyToId?: string | null }) => {
      if (!user) return;
      const trimmed = (content || '').trim();
      if (!trimmed && !opts?.attachment && !opts?.audio) return;

      setSending(true);
      setError(null);

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimisticMsg: ChatMessage = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: user.id,
        content: trimmed,
        created_at: new Date().toISOString(),
        reply_to_id: opts?.replyToId || null,
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      try {
        let attachmentUrl: string | null = null;
        let attachmentNom: string | null = null;
        let attachmentType: string | null = null;
        let audioUrl: string | null = null;
        if (opts?.attachment) {
          attachmentUrl = await uploadChatFile(opts.attachment, 'attachments');
          attachmentNom = opts.attachment.name;
          attachmentType = opts.attachment.type;
        }
        if (opts?.audio) {
          const audioFile = new File([opts.audio], 'memo-voix.webm', { type: 'audio/webm' });
          audioUrl = await uploadChatFile(audioFile, 'audio');
        }

        const { error: sendErr } = await db.from('chat_messages').insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: trimmed,
          ecole_id: currentSchoolId,
          attachment_url: attachmentUrl,
          attachment_nom: attachmentNom,
          attachment_type: attachmentType,
          audio_url: audioUrl,
          reply_to_id: opts?.replyToId || null,
        });
        if (sendErr) throw sendErr;
      } catch (err: unknown) {
        console.error('Error sending message:', err);
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setError("Erreur lors de l'envoi du message. Veuillez réessayer.");
      } finally {
        setSending(false);
      }
    },
    [user, uploadChatFile]
  );

  // ─── Réactions ───────────────────────────────────────────────────────────
  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return;
    const { data: existing } = await db
      .from('chat_message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .maybeSingle();
    if (existing) {
      await db.from('chat_message_reactions').delete().eq('id', existing.id);
    } else {
      await db.from('chat_message_reactions').insert({ message_id: messageId, user_id: user.id, emoji });
    }
  }, [user]);

  // ─── Épingler / désépingler ──────────────────────────────────────────────
  const togglePin = useCallback(async (messageId: string, pinned: boolean) => {
    if (!user) return;
    await db.from('chat_messages').update({
      is_pinned: pinned,
      pinned_by: pinned ? user.id : null,
      pinned_at: pinned ? new Date().toISOString() : null,
    }).eq('id', messageId);
  }, [user]);

  // ─── Édition ─────────────────────────────────────────────────────────────
  const editMessage = useCallback(async (messageId: string, content: string) => {
    if (!content.trim()) return;
    await db.from('chat_messages').update({ content: content.trim(), edited_at: new Date().toISOString() }).eq('id', messageId);
  }, []);

  // ─── Suppression (soft) ──────────────────────────────────────────────────
  const deleteMessage = useCallback(async (messageId: string) => {
    await db.from('chat_messages').update({ deleted_at: new Date().toISOString() }).eq('id', messageId);
  }, []);

  // ─── « En train d'écrire » ──────────────────────────────────────────────
  const setTyping = useCallback(async (conversationId: string, typing: boolean) => {
    if (!user) return;
    try {
      if (typing) {
        await db.from('chat_typing').upsert({ conversation_id: conversationId, user_id: user.id, updated_at: new Date().toISOString() }, { onConflict: 'conversation_id,user_id' });
      } else {
        await db.from('chat_typing').delete().eq('conversation_id', conversationId).eq('user_id', user.id);
      }
    } catch { /* ignore */ }
  }, [user]);

  // ─── Groupes ─────────────────────────────────────────────────────────────
  const createGroup = useCallback(async (nom: string, userIds: string[]): Promise<string | null> => {
    if (!user || !nom.trim() || userIds.length === 0) return null;
    const convId = crypto.randomUUID();
    const { error: convError } = await db.from('chat_conversations').insert({
      id: convId, type: 'group', nom: nom.trim(), created_by: user.id, ecole_id: currentSchoolId,
    });
    if (convError) throw new Error(convError.message);
    const participants = [{ conversation_id: convId, user_id: user.id }, ...userIds.map(uid => ({ conversation_id: convId, user_id: uid }))];
    const { error: partError } = await db.from('chat_participants').insert(participants);
    if (partError) throw new Error(partError.message);
    return convId;
  }, [user, currentSchoolId]);

  // ─── Export (JSON/PDF) ───────────────────────────────────────────────────
  const getConversationExport = useCallback(async (conversationId: string): Promise<ChatMessage[]> => {
    const { data } = await db
      .from('chat_messages')
      .select(MSG_SELECT)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    return (data as ChatMessage[]) || [];
  }, []);

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
    typingUsers,
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
    refreshConversations: loadConversations,    toggleReaction,
    togglePin,
    editMessage,
    deleteMessage,
    setTyping,
    createGroup,
    getConversationExport,
  };
}
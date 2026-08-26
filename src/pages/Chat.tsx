import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  MessageCircle,
  Search,
  Send,
  Users,
  User,
  ChevronLeft,
  Plus,
  X,
  AlertCircle,
  Loader2,
  Paperclip,
  Mic,
  Square,
  Pin,
  FileDown,
  Reply,
  Pencil,
  Trash2,
  Smile,
  Users2,
  Megaphone,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { jsPDF } from 'jspdf';
import { useChat, BROADCAST_CONVERSATION_ID, ChatMessage, ChatProfile, Conversation } from '../lib/hooks/useChat';

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-pink-500',
];

function avatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function Avatar({ user, size = 'md' }: { user: { id: string; nom: string; prenom: string }; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-10 h-10 text-base' : 'w-9 h-9 text-sm';
  return (
    <div className={`${sizeClass} ${avatarColor(user.id)} rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold`}>
      {user.nom.charAt(0)}{user.prenom.charAt(0)}
    </div>
  );
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } else if (isYesterday) {
    return 'Hier';
  } else {
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }
}

function formatDay(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return "Aujourd'hui";
  if (isYesterday) return 'Hier';
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' });
}

interface MessageGroupDay {
  day: string;
  messages: ChatMessage[];
}

function groupMessagesByDay(messages: ChatMessage[]): MessageGroupDay[] {
  const groups: Record<string, ChatMessage[]> = {};
  for (const msg of messages) {
    const day = new Date(msg.created_at).toDateString();
    if (!groups[day]) groups[day] = [];
    groups[day].push(msg);
  }
  return Object.entries(groups).map(([, msgs]) => ({
    day: formatDay(msgs[0].created_at),
    messages: msgs,
  }));
}

function isOptimistic(msg: ChatMessage): boolean {
  return msg.id.startsWith('temp-');
}

function ConversationItem({
  conv,
  active,
  currentUserId,
  onClick,
}: {
  conv: Conversation;
  active: boolean;
  currentUserId: string;
  onClick: () => void;
}) {
  const isBroadcast = conv.type === 'broadcast';
  const displayName = isBroadcast ? 'Tout le monde' : conv.otherUser ? `${conv.otherUser.nom} ${conv.otherUser.prenom}` : 'Conversation';
  const lastMsg = conv.lastMessage;
  const isOwnLast = lastMsg?.sender_id === currentUserId;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-3 rounded-lg transition-all flex items-center gap-3 group ${
        active ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'
      }`}
    >
      {isBroadcast ? (
        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
          <Users className="w-4 h-4 text-white" />
        </div>
      ) : conv.otherUser ? (
        <Avatar user={conv.otherUser} />
      ) : (
        <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-gray-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold truncate ${active ? 'text-blue-700' : 'text-gray-800'}`}>
            {displayName}
          </span>
          {lastMsg && (
            <span className="text-xs text-gray-400 flex-shrink-0 ml-1">{formatTime(lastMsg.created_at)}</span>
          )}
        </div>
        {lastMsg && (
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {isOwnLast ? 'Vous: ' : ''}{lastMsg.content}
          </p>
        )}
      </div>
      {conv.type === 'group' && conv.nom && (
        <div className="flex items-center gap-1.5 px-3 mt-1">
          <Users2 className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-500 truncate">{conv.nom}</span>
        </div>
      )}
      {conv.unreadCount > 0 && (
        <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-xs text-white font-bold">{conv.unreadCount > 9 ? '9+' : conv.unreadCount}</span>
        </div>
      )}
    </button>
  );
}

function NewConversationModal({
  users,
  onSelect,
  onClose,
}: {
  users: ChatProfile[];
  onSelect: (userId: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = users.filter(
    (u) =>
      u.nom.toLowerCase().includes(search.toLowerCase()) ||
      u.prenom.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-800">Nouvelle conversation</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              autoFocus
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <ul className="mt-2 space-y-1 max-h-64 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="text-center text-sm text-gray-400 py-4">Aucun utilisateur trouvé</li>
            )}
            {filtered.map((u) => (
              <li key={u.id}>
                <button
                  onClick={() => onSelect(u.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors text-left"
                >
                  <Avatar user={u} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{u.nom} {u.prenom}</p>
                    {u.role && <p className="text-xs text-gray-400 capitalize">{u.role.nom.replace('_', ' ')}</p>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function Chat() {
  const { user, profile } = useAuth();
  const {
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
    hasMore,
    loadMore,
    typingUsers,
    toggleReaction,
    togglePin,
    editMessage,
    deleteMessage,
    setTyping,
    createGroup,
    getConversationExport,
  } = useChat();

  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [showNewConv, setShowNewConv] = useState(false);
  const [mobileShowMessages, setMobileShowMessages] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
  const [msgSearch, setMsgSearch] = useState('');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showDiffusionModal, setShowDiffusionModal] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-open broadcast on first load
  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(BROADCAST_CONVERSATION_ID);
    }
  }, [conversations, activeConversationId, setActiveConversationId]);

  // Scroll to bottom on new messages or when conversation changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clear error on conversation switch
  useEffect(() => {
    clearError();
  }, [activeConversationId, clearError]);

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, []);

  useEffect(() => {
    autoResize();
  }, [input, autoResize]);

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    const s = search.toLowerCase();
    return conversations.filter((c) => {
      if (c.type === 'broadcast') return 'tout le monde'.includes(s);
      return (
        c.otherUser?.nom.toLowerCase().includes(s) ||
        c.otherUser?.prenom.toLowerCase().includes(s)
      );
    });
  }, [conversations, search]);

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const filteredMessages = useMemo(() => {
    if (!msgSearch.trim()) return messages;
    const q = msgSearch.toLowerCase();
    return messages.filter(m => (m.content || '').toLowerCase().includes(q) || (m.attachment_nom || '').toLowerCase().includes(q));
  }, [messages, msgSearch]);
  const messageGroups = useMemo(() => groupMessagesByDay(filteredMessages), [filteredMessages]);

  function getConvTitle(conv: Conversation | undefined): string {
    if (!conv) return '';
    if (conv.type === 'broadcast') return 'Tout le monde';
    if (conv.type === 'group') return conv.nom || 'Groupe';
    return conv.otherUser ? `${conv.otherUser.nom} ${conv.otherUser.prenom}` : 'Conversation';
  }

  async function handleSend() {
    if (activeConversationId === null || sending) return;
    if (!input.trim() && !attachment && !recording) return;
    const text = input.trim();
    setInput('');
    setAttachment(null);
    setAttachmentPreview(null);
    setReplyTo(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await sendMessage(activeConversationId, text, { attachment, replyToId: replyTo ? replyTo.id : null });
  }

  function handleAttachmentFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files ? e.target.files[0] : null;
    e.target.value = '';
    if (!file) return;
    setAttachment(file);
    if (file.type.startsWith('image/')) setAttachmentPreview(URL.createObjectURL(file));
    else setAttachmentPreview(null);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordingChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) recordingChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(recordingChunksRef.current, { type: 'audio/webm' });
        if (activeConversationId && blob.size > 0) sendMessage(activeConversationId, '', { audio: blob });
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch { alert('Micro inaccessible.'); }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }

  async function handleReact(msg: ChatMessage, emoji: string) {
    await toggleReaction(msg.id, emoji);
  }

  async function handlePin(msg: ChatMessage) {
    await togglePin(msg.id, !msg.is_pinned);
  }

  function handleReplyTo(msg: ChatMessage) {
    setEditingMsg(null);
    setReplyTo(msg);
    if (textareaRef.current) textareaRef.current.focus();
  }

  function handleEditMsg(msg: ChatMessage) {
    setReplyTo(null);
    setEditingMsg(msg);
    setInput(msg.content);
    if (textareaRef.current) textareaRef.current.focus();
  }

  async function handleDeleteMsg(msg: ChatMessage) {
    if (!confirm('Supprimer ce message ?')) return;
    await deleteMessage(msg.id);
  }

  async function handleSaveEdit() {
    if (!editingMsg || !input.trim()) return;
    await editMessage(editingMsg.id, input.trim());
    setEditingMsg(null);
    setInput('');
  }

  async function handleExport() {
    if (!activeConversationId) return;
    const msgs = await getConversationExport(activeConversationId);
    const title = getConvTitle(activeConv);
    const jsonBlob = new Blob([JSON.stringify(msgs, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(jsonBlob);
    a.download = 'conversation-' + activeConversationId.slice(0, 8) + '.json';
    a.click();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setFontSize(14);
    doc.text('Conversation : ' + title, 14, 16);
    doc.setFontSize(9);
    let y = 24;
    for (const m of msgs) {
      const who = m.sender ? m.sender.prenom + ' ' + m.sender.nom : '?';
      const txt = '[' + new Date(m.created_at).toLocaleString('fr-FR') + '] ' + who + ' : ' + (m.content || '(pièce jointe)');
      const lines = doc.splitTextToSize(txt, 180);
      if (y + lines.length * 4 > 290) { doc.addPage(); y = 16; }
      doc.text(lines, 14, y);
      y += lines.length * 4 + 2;
    }
    doc.save('conversation-' + activeConversationId.slice(0, 8) + '.pdf');
  }

  async function handleCreateGroup(nom: string, userIds: string[]) {
    const convId = await createGroup(nom, userIds);
    if (convId) { setActiveConversationId(convId); setMobileShowMessages(true); }
  }

  async function handleDiffusion(roleNom: string, message: string) {
    const members = allUsers.filter(u => u.role && u.role.nom === roleNom).map(u => u.id);
    if (members.length === 0) { alert('Aucun membre pour ce rôle.'); return; }
    const convId = await createGroup('Diffusion - ' + roleNom, members);
    if (convId) {
      setActiveConversationId(convId);
      setMobileShowMessages(true);
      if (message.trim()) await sendMessage(convId, message);
    }
  }

  const rolesList = useMemo(() => {
    const set = new Set<string>();
    for (const u of allUsers) if (u.role && u.role.nom) set.add(u.role.nom);
    return [...set].sort();
  }, [allUsers]);

  const EMOJIS = ['👍', '❤️', '😂', '😮', '🎉', '🙏'];



  async function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editingMsg) await handleSaveEdit();
      else await handleSend();
    }
  }

  async function handleNewConvSelect(userId: string) {
    setShowNewConv(false);
    try {
      const convId = await openOrCreatePrivateConversation(userId);
      setActiveConversationId(convId);
      setMobileShowMessages(true);
    } catch {
      // Error is handled by the hook and displayed via error state
    }
  }

  function handleConvClick(convId: string) {
    setActiveConversationId(convId);
    setMobileShowMessages(true);
  }

  if (!user || !profile) return null;

  return (
    <div className="h-[calc(100vh-8rem)] flex rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">
      {/* Sidebar - conversations list */}
      <aside
        className={`w-80 flex-shrink-0 border-r border-gray-100 flex flex-col bg-white ${
          mobileShowMessages ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Sidebar header */}
        <div className="px-4 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-gray-900">Messages</h2>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setShowGroupModal(true)} className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors" title="Créer un groupe"><Users2 className="w-4 h-4" /></button>
              <button onClick={() => setShowDiffusionModal(true)} className="p-2 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors" title="Diffusion ciblée"><Megaphone className="w-4 h-4" /></button>
              <button
                onClick={() => setShowNewConv(true)}
                className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                title="Nouvelle conversation"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {filteredConversations.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-sm">
              {search.trim() ? 'Aucune conversation trouvée' : 'Aucune conversation'}
            </div>
          )}
          {filteredConversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conv={conv}
              active={conv.id === activeConversationId}
              currentUserId={user.id}
              onClick={() => handleConvClick(conv.id)}
            />
          ))}
        </div>
      </aside>

      {/* Messages pane */}
      <main
        className={`flex-1 flex flex-col min-w-0 ${
          mobileShowMessages ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {!activeConversationId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageCircle className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">Sélectionnez une conversation</p>
          </div>
        ) : (
          <>
            {/* Conversation header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 bg-white">
              <button
                onClick={() => setMobileShowMessages(false)}
                className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors mr-1"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              {activeConv?.type === 'broadcast' ? (
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
              ) : activeConv?.otherUser ? (
                <Avatar user={activeConv.otherUser} size="md" />
              ) : null}
              <div>
                <p className="font-semibold text-gray-900">{getConvTitle(activeConv)}</p>
                {activeConv?.type === 'broadcast' && (
                  <p className="text-xs text-gray-500">Canal général — tous les membres</p>
                )}
                {activeConv?.type === 'private' && activeConv.otherUser?.role && (
                  <p className="text-xs text-gray-500 capitalize">
                    {activeConv.otherUser.role.nom.replace('_', ' ')}
                  </p>
                )}
                {activeConv?.type === 'group' && (
                  <p className="text-xs text-gray-500 flex items-center gap-1"><Users2 className="w-3 h-3" /> Groupe de discussion</p>
                )}
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <button onClick={handleExport} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors" title="Exporter la conversation (JSON + PDF)"><FileDown className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mx-4 mt-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{error}</span>
                <button onClick={clearError} className="p-0.5 rounded hover:bg-red-100 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Recherche dans les messages */}
            <div className="px-4 pt-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher dans les messages..."
                  value={msgSearch}
                  onChange={(e) => setMsgSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Annonces épinglées */}
            {(() => { const pinned = messages.filter(m => m.is_pinned && !m.deleted_at).slice(0, 3); if (pinned.length === 0) return null; return (
              <div className="mx-4 mt-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-[11px] font-bold text-amber-700 flex items-center gap-1 mb-1"><Pin className="w-3 h-3" /> Annonces épinglées</p>
                {pinned.map(m => (
                  <p key={m.id} className="text-xs text-gray-700 truncate">
                    <span className="font-semibold">{m.sender ? m.sender.prenom + ' ' + m.sender.nom : ''}:</span> {m.content || '(pièce jointe)'}
                  </p>
                ))}
              </div>
            ); })()}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-gray-50">
              {loadingMessages && (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                </div>
              )}
              {!loadingMessages && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <MessageCircle className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">Aucun message pour l'instant.</p>
                  <p className="text-xs mt-1">Soyez le premier à écrire!</p>
                </div>
              )}
              {hasMore && !loadingMessages && messages.length > 0 && (
                <div className="flex justify-center">
                  <button onClick={loadMore} className="text-xs text-blue-600 hover:text-blue-800 font-medium py-1 px-3 rounded-full hover:bg-blue-50 transition-colors">
                    Messages plus anciens...
                  </button>
                </div>
              )}
              {messageGroups.map((group) => (
                <div key={group.day}>
                  {/* Day separator */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2">{group.day}</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <div className="space-y-3">
                    {group.messages.map((msg, idx) => {
                      const isOwn = msg.sender_id === user.id;
                      const isOptimisticMsg = isOptimistic(msg);
                      const prev = group.messages[idx - 1];
                      const showAvatar = !isOwn && (!prev || prev.sender_id !== msg.sender_id);
                      const showName = showAvatar;

                      return (
                        <div
                          key={msg.id}
                          className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${
                            isOptimisticMsg ? 'opacity-70' : ''
                          }`}
                        >
                          {/* Avatar placeholder for alignment */}
                          {!isOwn && (
                            <div className="w-7 flex-shrink-0">
                              {showAvatar && msg.sender ? (
                                <Avatar user={msg.sender} size="sm" />
                              ) : null}
                            </div>
                          )}

                          <div className={`max-w-[70%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                            {showName && msg.sender && (
                              <span className="text-xs text-gray-500 mb-1 ml-1">
                                {msg.sender.nom} {msg.sender.prenom}
                              </span>
                            )}
                            <div
                              className={`group relative px-4 py-2 rounded-xl text-sm leading-relaxed ${
                                isOwn
                                  ? 'bg-blue-600 text-white rounded-br-sm'
                                  : 'bg-white text-gray-800 border border-gray-200 shadow-sm rounded-bl-sm'
                              }`}
                            >
                              {/* Réponse citée */}
                              {msg.reply && !msg.reply.deleted_at && (
                                <div className={`mb-1.5 px-2 py-1 rounded text-xs border-l-2 ${
                                  isOwn ? 'bg-blue-500/40 border-blue-200 text-blue-50' : 'bg-gray-50 border-blue-300 text-gray-500'
                                }`}>
                                  <span className="font-semibold">{msg.reply.sender ? msg.reply.sender.prenom + ' ' + msg.reply.sender.nom : 'Réponse à'}</span>
                                  <span className="block truncate">{msg.reply.content || (msg.reply.attachment_nom ? '📎 ' + msg.reply.attachment_nom : '(pièce jointe)')}</span>
                                </div>
                              )}
                              {/* Pièce jointe image */}
                              {msg.attachment_url && msg.attachment_type && msg.attachment_type.startsWith('image/') && (
                                <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="block mb-1.5">
                                  <img src={msg.attachment_url} alt={msg.attachment_nom || 'image'} className="max-w-[220px] max-h-40 rounded-lg border border-black/10" />
                                </a>
                              )}
                              {/* Pièce jointe fichier */}
                              {msg.attachment_url && !(msg.attachment_type && msg.attachment_type.startsWith('image/')) && (
                                <a href={msg.attachment_url} target="_blank" rel="noreferrer" className={`flex items-center gap-1.5 mb-1 text-xs font-semibold underline ${
                                  isOwn ? 'text-blue-100' : 'text-blue-600'
                                }`}>
                                  <Paperclip className="w-3 h-3" /> {msg.attachment_nom || 'Pièce jointe'}
                                </a>
                              )}
                              {/* Mémo vocal */}
                              {msg.audio_url && (
                                <audio controls src={msg.audio_url} className="max-w-[220px] h-9 mb-1" preload="none" />
                              )}
                              {/* Contenu */}
                              {msg.deleted_at ? (
                                <span className="italic opacity-60">Message supprimé</span>
                              ) : msg.content}
                              {msg.edited_at && !msg.deleted_at && (
                                <span className={`text-[10px] ml-1 opacity-60`}>(modifié)</span>
                              )}

                              {/* Actions au survol */}
                              {!msg.deleted_at && msg.id.startsWith('temp') === false && (
                                <div className={`absolute -top-3 right-1 hidden group-hover:flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg shadow-md px-1 py-0.5 z-10 ${
                                  isOwn ? '' : ''
                                }`}>
                                  <button onClick={() => handleReplyTo(msg)} title="Répondre" className="p-1 rounded hover:bg-gray-100 text-gray-500"><Reply className="w-3.5 h-3.5" /></button>
                                  <div className="relative">
                                    <button title="Réagir" className="p-1 rounded hover:bg-gray-100 text-gray-500"><Smile className="w-3.5 h-3.5" /></button>
                                    <div className="absolute bottom-full left-0 mb-1 hidden group/emoji flex bg-white border border-gray-200 rounded-full shadow-lg px-1.5 py-1 gap-0.5 z-20" onMouseEnter={e => (e.currentTarget.parentElement as HTMLElement).classList.add('group/emoji-hover')}>
                                      {EMOJIS.map(e => (
                                        <button key={e} onClick={() => handleReact(msg, e)} className="text-base hover:scale-125 transition-transform">{e}</button>
                                      ))}
                                    </div>
                                  </div>
                                  <button onClick={() => handlePin(msg)} title={msg.is_pinned ? 'Désépingler' : 'Épingler'} className={`p-1 rounded hover:bg-gray-100 ${
                                    msg.is_pinned ? 'text-amber-500' : 'text-gray-500'
                                  }`}><Pin className="w-3.5 h-3.5" /></button>
                                  {isOwn && <button onClick={() => handleEditMsg(msg)} title="Modifier" className="p-1 rounded hover:bg-gray-100 text-gray-500"><Pencil className="w-3.5 h-3.5" /></button>}
                                  {(isOwn) && <button onClick={() => handleDeleteMsg(msg)} title="Supprimer" className="p-1 rounded hover:bg-red-50 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>}
                                </div>
                              )}

                              {/* Réactions affichées */}
                              {msg.reactions && msg.reactions.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {Array.from(new Map(msg.reactions.map(r => [r.emoji, r.emoji])).values()).map(emoji => {
                                    const count = msg.reactions!.filter(r => r.emoji === emoji).length;
                                    return (
                                      <button key={emoji} onClick={() => handleReact(msg, emoji)} className={`px-1.5 py-0.5 rounded-full text-xs border ${
                                        msg.reactions!.some(r => r.emoji === emoji && r.user_id === user.id)
                                          ? 'bg-blue-100 border-blue-300'
                                          : 'bg-gray-50 border-gray-200'
                                      }`}>
                                        {emoji} {count}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-gray-400 mt-1 mx-1 flex items-center gap-1">
                              {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {isOptimisticMsg && (
                                <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {Object.keys(typingUsers).length > 0 && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {Object.values(typingUsers).map(t => t.prenom + ' ' + t.nom).join(', ')} {Object.keys(typingUsers).length > 1 ? 'écrivent' : 'écrit'}...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 bg-white border-t border-gray-100">
              {/* Barre réponse / édition */}
              {(replyTo || editingMsg) && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                  <Reply className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="flex-1 truncate">
                    {editingMsg ? 'Modification du message' : (replyTo && replyTo.sender ? 'Réponse à ' + replyTo.sender.prenom + ' ' + replyTo.sender.nom : 'Réponse')} : {editingMsg ? editingMsg.content : (replyTo ? (replyTo.content || '(pièce jointe)') : '')}
                  </span>
                  <button onClick={() => { setReplyTo(null); setEditingMsg(null); if (editingMsg) setInput(''); }} className="p-0.5 rounded hover:bg-blue-100"><X className="w-3.5 h-3.5" /></button>
                </div>
              )}
              {/* Aperçu pièce jointe */}
              {attachment && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                  {attachmentPreview ? (
                    <img src={attachmentPreview} alt="aperçu" className="w-14 h-14 object-cover rounded border" />
                  ) : (
                    <Paperclip className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="flex-1 text-xs text-gray-600 truncate">{attachment.name}</span>
                  <button onClick={() => { setAttachment(null); setAttachmentPreview(null); }} className="p-0.5 rounded hover:bg-gray-200"><X className="w-4 h-4" /></button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <input ref={useRef<HTMLInputElement>(null)} type="file" className="hidden" id="chat-attach-input" onChange={handleAttachmentFile} />
                <button onClick={() => document.getElementById('chat-attach-input')?.click()} className="p-2.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors flex-shrink-0" title="Joindre un fichier"><Paperclip className="w-4 h-4" /></button>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    if (activeConversationId && e.target.value.trim()) setTyping(activeConversationId, true);
                  }}
                  onBlur={() => { if (activeConversationId) setTyping(activeConversationId, false); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Écrivez un message... (Entrée pour envoyer)"
                  rows={1}
                  disabled={sending}
                  className="flex-1 resize-none px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors disabled:opacity-50 overflow-hidden"
                  style={{ minHeight: '46px', maxHeight: '160px' }}
                />
                <button
                  onClick={recording ? stopRecording : startRecording}
                  className={`p-2.5 rounded-lg transition-colors flex-shrink-0 ${
                    recording ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-gray-100 text-gray-500'
                  }`}
                  title={recording ? 'Arrêter l\'enregistrement' : 'Mémo vocal'}
                >
                  {recording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button
                  onClick={editingMsg ? handleSaveEdit : handleSend}
                  disabled={(sending || (!input.trim() && !attachment)) && !editingMsg}
                  className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 shadow-sm"
                  title="Envoyer"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* New conversation modal */}
      {showNewConv && (
        <NewConversationModal
          users={allUsers}
          onSelect={handleNewConvSelect}
          onClose={() => setShowNewConv(false)}
        />
      )}

      {/* Groupe modal */}
      {showGroupModal && (
        <GroupModal
          users={allUsers}
          onCreate={handleCreateGroup}
          onClose={() => setShowGroupModal(false)}
        />
      )}

      {/* Diffusion ciblée modal */}
      {showDiffusionModal && (
        <DiffusionModal
          roles={rolesList}
          onSend={handleDiffusion}
          onClose={() => setShowDiffusionModal(false)}
        />
      )}
    </div>
  );
}

// ─── Modale création de groupe ─────────────────────────────────────────────
function GroupModal({ users, onCreate, onClose }: { users: ChatProfile[]; onCreate: (nom: string, ids: string[]) => void; onClose: () => void }) {
  const [nom, setNom] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || (u.nom + ' ' + u.prenom + ' ' + (u.role?.nom || '')).toLowerCase().includes(q);
  });
  function toggle(id: string) {
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-bold">Créer un groupe</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom du groupe (ex. Enseignants)" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un membre..." className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="max-h-60 overflow-y-auto border rounded-lg divide-y divide-gray-50">
            {filtered.map(u => (
              <label key={u.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} className="rounded" />
                <Avatar user={u} size="sm" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{u.nom} {u.prenom}</p>
                  {u.role && <p className="text-xs text-gray-400 capitalize">{u.role.nom.replace('_', ' ')}</p>}
                </div>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t">
          <button onClick={() => onCreate(nom, [...selected])} disabled={!nom.trim() || selected.size === 0} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-40">Créer ({selected.size})</button>
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 font-medium">Annuler</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modale diffusion ciblée ───────────────────────────────────────────────
function DiffusionModal({ roles, onSend, onClose }: { roles: string[]; onSend: (role: string, message: string) => void; onClose: () => void }) {
  const [role, setRole] = useState(roles[0] || '');
  const [message, setMessage] = useState('');
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-bold flex items-center gap-2"><Megaphone className="w-4 h-4 text-amber-600" /> Diffusion ciblée</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Cible (rôle)</label>
            <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
              {roles.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </select>
          </div>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="Votre annonce..." className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          <p className="text-xs text-gray-400">Un groupe « Diffusion — {role.replace('_', ' ')} » sera créé avec les membres de ce rôle, puis votre annonce y sera envoyée.</p>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t">
          <button onClick={() => onSend(role, message)} disabled={!role} className="flex-1 bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 font-medium disabled:opacity-40">Envoyer</button>
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 font-medium">Annuler</button>
        </div>
      </div>
    </div>
  );
}
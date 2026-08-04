import { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageCircle,
  Search,
  Send,
  Users,
  User,
  ChevronLeft,
  Plus,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
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
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-sm';
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
  return Object.entries(groups).map(([day, msgs]) => ({
    day: formatDay(msgs[0].created_at),
    messages: msgs,
  }));
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
      className={`w-full text-left px-3 py-3 rounded-xl transition-all flex items-center gap-3 group ${
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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
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
          <ul className="mt-3 space-y-1 max-h-64 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="text-center text-sm text-gray-400 py-4">Aucun utilisateur trouvé</li>
            )}
            {filtered.map((u) => (
              <li key={u.id}>
                <button
                  onClick={() => onSelect(u.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50 transition-colors text-left"
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
    sendMessage,
    openOrCreatePrivateConversation,
  } = useChat();

  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [showNewConv, setShowNewConv] = useState(false);
  const [mobileShowMessages, setMobileShowMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-open broadcast on first load
  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(BROADCAST_CONVERSATION_ID);
    }
  }, [conversations, activeConversationId, setActiveConversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
  const messageGroups = useMemo(() => groupMessagesByDay(messages), [messages]);

  function getConvTitle(conv: Conversation | undefined): string {
    if (!conv) return '';
    if (conv.type === 'broadcast') return 'Tout le monde';
    return conv.otherUser ? `${conv.otherUser.nom} ${conv.otherUser.prenom}` : 'Conversation';
  }

  async function handleSend() {
    if (!input.trim() || !activeConversationId) return;
    const text = input.trim();
    setInput('');
    await sendMessage(activeConversationId, text);
    inputRef.current?.focus();
  }

  async function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      await handleSend();
    }
  }

  async function handleNewConvSelect(userId: string) {
    setShowNewConv(false);
    const convId = await openOrCreatePrivateConversation(userId);
    setActiveConversationId(convId);
    setMobileShowMessages(true);
  }

  function handleConvClick(convId: string) {
    setActiveConversationId(convId);
    setMobileShowMessages(true);
  }

  if (!user || !profile) return null;

  return (
    <div className="h-[calc(100vh-8rem)] flex rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white">
      {/* Sidebar - conversations list */}
      <aside
        className={`w-80 flex-shrink-0 border-r border-gray-100 flex flex-col bg-white ${
          mobileShowMessages ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Sidebar header */}
        <div className="px-4 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Messages</h2>
            <button
              onClick={() => setShowNewConv(true)}
              className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
              title="Nouvelle conversation"
            >
              <Plus className="w-4 h-4" />
            </button>
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
            <div className="text-center py-10 text-gray-400 text-sm">Aucune conversation</div>
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
            <MessageCircle className="w-12 h-12 mb-3 opacity-30" />
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
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 bg-gray-50">
              {loadingMessages && (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!loadingMessages && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <MessageCircle className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">Aucun message pour l'instant.</p>
                  <p className="text-xs mt-1">Soyez le premier à écrire!</p>
                </div>
              )}
              {messageGroups.map((group) => (
                <div key={group.day}>
                  {/* Day separator */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2">{group.day}</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <div className="space-y-3">
                    {group.messages.map((msg, idx) => {
                      const isOwn = msg.sender_id === user.id;
                      const prev = group.messages[idx - 1];
                      const showAvatar = !isOwn && (!prev || prev.sender_id !== msg.sender_id);
                      const showName = showAvatar;

                      return (
                        <div
                          key={msg.id}
                          className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
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
                              className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                isOwn
                                  ? 'bg-blue-600 text-white rounded-br-sm'
                                  : 'bg-white text-gray-800 border border-gray-200 shadow-sm rounded-bl-sm'
                              }`}
                            >
                              {msg.content}
                            </div>
                            <span className="text-xs text-gray-400 mt-1 mx-1">
                              {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 bg-white border-t border-gray-100">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Écrivez un message... (Entrée pour envoyer)"
                  rows={1}
                  className="flex-1 resize-none px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors max-h-32 overflow-y-auto"
                  style={{ minHeight: '46px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 shadow-sm"
                >
                  <Send className="w-4 h-4" />
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
    </div>
  );
}

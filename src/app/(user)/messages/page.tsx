'use client';

import { MainLayout } from '@/components/layout';
import { Avatar } from '@/components/common';
import {
  Search, Send, MessageSquare, Loader2, ArrowLeft,
  Settings, Users, X, UserMinus, ChevronRight,
} from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useAuth, useChat } from '@/providers';
import { useRouter, useSearchParams } from 'next/navigation';
import { emitMessagesUpdated } from '@/lib/useMessageUnreadCount';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OtherUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
}

interface Conversation {
  id: string;
  type: 'direct' | 'group';
  // DM
  other_user_id: string;
  other_username: string;
  other_display_name: string;
  other_avatar_url: string;
  last_message_at: string;
  unread_count: number;
  // Group
  group_id?: string;
  group_name?: string;
  group_avatar_url?: string;
  member_count?: number;
}

interface Sender {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: Sender;
  // extra flat columns from local DB
  sender_username?: string;
  sender_display_name?: string;
  sender_avatar_url?: string;
}

interface GroupMember {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  role: 'admin' | 'member';
  is_online?: boolean;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function getSender(msg: Message): Sender | null {
  if (msg.sender) return msg.sender;
  if (msg.sender_username) {
    return {
      id: msg.sender_id,
      username: msg.sender_username,
      display_name: msg.sender_display_name || msg.sender_username,
      avatar_url: msg.sender_avatar_url || '',
    };
  }
  return null;
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MessagesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUsername = searchParams.get('to');
  const {
    messages: realtimeMessages,
    sendMessage,
    subscribeToConversation,
    unsubscribeFromConversation,
    markAsRead,
    isUserOnline,
  } = useChat();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [messageSettings, setMessageSettings] = useState<'everyone' | 'following'>('everyone');
  const [activeTab, setActiveTab] = useState<'direct' | 'groups'>('direct');
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);

  // Create group modal
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [userPool, setUserPool] = useState<OtherUser[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    if (!user) return [];
    try {
      const res = await fetch(`/api/conversations?user_id=${user.id}`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.conversations || []).map((c: any) => ({ ...c, type: c.type || 'direct' })) as Conversation[];
    } catch { return []; }
  }, [user]);

  const fetchGroups = useCallback(async () => {
    if (!user) return [];
    try {
      const res = await fetch(`/api/groups?user_id=${user.id}`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.groups || []).map((g: any): Conversation => ({
        id: g.conversation_id || g.id,
        type: 'group',
        other_user_id: '',
        other_username: '',
        other_display_name: g.name,
        other_avatar_url: g.avatar_url || '',
        last_message_at: g.last_message_at || g.created_at,
        unread_count: 0,
        group_id: g.id,
        group_name: g.name,
        group_avatar_url: g.avatar_url,
        member_count: g.member_count,
      }));
    } catch { return []; }
  }, [user]);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    const [dms, groups] = await Promise.all([fetchConversations(), fetchGroups()]);
    setConversations([...dms, ...groups]);
    setIsLoading(false);
    return dms;
  }, [fetchConversations, fetchGroups]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Auto-open conversation from ?to= param ─────────────────────────────────
  useEffect(() => {
    if (!targetUsername || !user) return;
    const init = async () => {
      const dms = await fetchConversations();
      const existing = dms.find(c => c.other_username.toLowerCase() === targetUsername.toLowerCase());
      if (existing) { setSelected(existing); return; }

      try {
        const token = localStorage.getItem('dynamic_authentication_token');
        const r = await fetch(`/api/users/profile?username=${targetUsername}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) return;
        const { user: targetUser } = await r.json();
        const cr = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ user_id: user.id, other_user_id: targetUser.id }),
        });
        if (!cr.ok) return;
        const { conversation } = await cr.json();
        const newConv: Conversation = {
          id: conversation.id, type: 'direct',
          other_user_id: targetUser.id, other_username: targetUser.username || '',
          other_display_name: targetUser.display_name || targetUser.username || '',
          other_avatar_url: targetUser.avatar_url || '',
          last_message_at: new Date().toISOString(), unread_count: 0,
        };
        setConversations(prev => [newConv, ...prev]);
        setSelected(newConv);
        router.replace('/messages', { scroll: false });
      } catch { /* ignore */ }
    };
    init();
  }, [targetUsername, user]);

  // ── Message settings ───────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('dynamic_authentication_token');
        const r = await fetch('/api/users/message-settings', { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) { const d = await r.json(); setMessageSettings(d.message_permission || 'everyone'); }
      } catch { /* ignore */ }
    };
    if (user) load();
  }, [user]);

  const updateMessageSettings = async (val: 'everyone' | 'following') => {
    try {
      const token = localStorage.getItem('dynamic_authentication_token');
      const r = await fetch('/api/users/message-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message_permission: val }),
      });
      if (r.ok) setMessageSettings(val);
    } catch { /* ignore */ }
  };

  // ── Select conversation ────────────────────────────────────────────────────
  useEffect(() => {
    if (!selected) return;
    setMessages([]);
    setShowGroupInfo(false);

    fetch(`/api/messages?conversation_id=${selected.id}`)
      .then(r => r.json())
      .then(d => setMessages(d.messages || []))
      .catch(() => {});

    subscribeToConversation(selected.id);
    markAsRead(selected.id);
    emitMessagesUpdated(); // Clear sidebar badge immediately

    if (selected.type === 'group' && selected.group_id) {
      fetch(`/api/groups/${selected.group_id}`)
        .then(r => r.json())
        .then(d => setGroupMembers(d.members || []))
        .catch(() => {});
    }

    return () => { unsubscribeFromConversation(); };
  }, [selected?.id]);

  // ── Realtime messages ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!realtimeMessages.length) return;
    setMessages(prev => {
      const ids = new Set(prev.map(m => m.id));
      const fresh = realtimeMessages.filter(m => !ids.has(m.id));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
  }, [realtimeMessages]);

  // ── Scroll to bottom ───────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Auto-resize textarea ───────────────────────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [newMessage]);

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!newMessage.trim() || !selected || !user || isSending) return;
    const content = newMessage.trim();
    setNewMessage('');

    // Optimistic message
    const optimistic: Message = {
      id: `temp-${Date.now()}`, conversation_id: selected.id,
      sender_id: user.id, content, created_at: new Date().toISOString(),
      sender: {
        id: user.id,
        username: (user as any).username || '',
        display_name: (user as any).display_name || (user as any).username || '',
        avatar_url: (user as any).avatar_url || '',
      },
    };
    setMessages(prev => [...prev, optimistic]);
    setIsSending(true);
    try {
      const receiverId = selected.type === 'group' ? null : selected.other_user_id;
      await sendMessage(selected.id, receiverId, content);
    } catch (e) {
      console.error('send error', e);
      // Roll back optimistic on failure
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    } finally {
      setIsSending(false);
    }
  };

  // ── Leave group ────────────────────────────────────────────────────────────
  const handleLeaveGroup = async (groupId: string) => {
    if (!user) return;
    const r = await fetch(`/api/groups/${groupId}/members?user_id=${user.id}&member_id=${user.id}`, { method: 'DELETE' });
    if (r.ok) {
      setConversations(prev => prev.filter(c => c.group_id !== groupId));
      setSelected(null);
    } else {
      const d = await r.json();
      alert(d.error || 'Cannot leave group');
    }
  };

  // ── Create group ───────────────────────────────────────────────────────────
  const openCreateGroup = async () => {
    setShowCreateGroup(true);
    if (!user) return;
    try {
      const r = await fetch(`/api/users/following?user_id=${user.id}`);
      const d = await r.json();
      const users = d.users || [];
      if (users.length > 0) { setUserPool(users); return; }
      // Fallback: discover
      const dr = await fetch('/api/users/discover?limit=50');
      const dd = await dr.json();
      setUserPool((dd.users || []).filter((u: any) => u.id !== user.id));
    } catch { /* ignore */ }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0 || !user) return;
    try {
      const r = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName.trim(), created_by: user.id, member_ids: selectedMembers }),
      });
      if (!r.ok) { const d = await r.json(); alert(d.error || 'Failed to create group'); return; }
      const data = await r.json();
      const newConv: Conversation = {
        id: data.conversation?.id || data.group.id, type: 'group',
        other_user_id: '', other_username: '', other_display_name: data.group.name,
        other_avatar_url: data.group.avatar_url || '',
        last_message_at: data.group.created_at, unread_count: 0,
        group_id: data.group.id, group_name: data.group.name, group_avatar_url: data.group.avatar_url,
        member_count: data.members?.length || 0,
      };
      setConversations(prev => [newConv, ...prev]);
      setSelected(newConv);
      setActiveTab('groups');
      setShowCreateGroup(false);
      setGroupName('');
      setSelectedMembers([]);
      setMemberSearch('');
    } catch (e) { console.error(e); }
  };

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filteredConversations = conversations.filter(c => {
    const matchTab = activeTab === 'direct' ? (!c.type || c.type === 'direct') : c.type === 'group';
    const name = c.type === 'group'
      ? (c.group_name || '').toLowerCase()
      : `${c.other_display_name} ${c.other_username}`.toLowerCase();
    return matchTab && name.includes(searchQuery.toLowerCase());
  });

  const filteredUserPool = userPool.filter(u =>
    `${u.display_name} ${u.username}`.toLowerCase().includes(memberSearch.toLowerCase())
  );

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <MainLayout showRightPanel={false}>
      <div className="h-[calc(100vh-80px)] flex overflow-hidden">

        {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
        <aside className="w-80 flex-shrink-0 border-r border-gray-100 flex flex-col bg-white">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => router.back()} className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <ArrowLeft size={18} className="text-gray-500" />
                </button>
                <h2 className="text-lg font-bold text-dark">Messages</h2>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={openCreateGroup} className="p-1.5 hover:bg-gray-100 rounded-lg" title="New Group">
                  <Users size={18} className="text-gray-500" />
                </button>
                <button onClick={() => setShowSettings(s => !s)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <Settings size={18} className="text-gray-500" />
                </button>
              </div>
            </div>

            {showSettings && (
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ai được nhắn tin?</p>
                {(['everyone', 'following'] as const).map(opt => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer py-1">
                    <input type="radio" name="msgPerm" value={opt}
                      checked={messageSettings === opt}
                      onChange={() => updateMessageSettings(opt)}
                      className="accent-primary-500" />
                    <span className="text-sm text-gray-700">
                      {opt === 'everyone' ? 'Tất cả mọi người' : 'Chỉ người mình follow'}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {(['direct', 'groups'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={cn('flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors',
                    activeTab === tab ? 'bg-white text-dark shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  )}>
                  {tab === 'direct' ? 'Direct' : 'Groups'}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search…"
                className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="animate-spin text-primary-400" size={24} />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <MessageSquare size={40} className="text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">
                  {activeTab === 'groups' ? 'Chưa có nhóm nào' : 'Chưa có tin nhắn nào'}
                </p>
              </div>
            ) : filteredConversations.map(conv => (
              <button key={conv.id} onClick={() => setSelected(conv)}
                className={cn('w-full flex items-center gap-3 px-4 py-3 transition-colors text-left',
                  selected?.id === conv.id ? 'bg-primary-50 border-r-2 border-primary-400' : 'hover:bg-gray-50'
                )}>
                <div className="relative flex-shrink-0">
                  {conv.type === 'group' ? (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-300 to-primary-500 flex items-center justify-center">
                      <Users size={18} className="text-white" />
                    </div>
                  ) : (
                    <>
                      <Avatar src={conv.other_avatar_url} alt={conv.other_display_name} size="md" />
                      <span className={cn('absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white',
                        isUserOnline(conv.other_user_id) ? 'bg-green-500' : 'bg-gray-300'
                      )} />
                    </>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-dark truncate">
                    {conv.type === 'group' ? conv.group_name : conv.other_display_name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {conv.type === 'group' ? `${conv.member_count || 0} thành viên` : `@${conv.other_username}`}
                  </p>
                </div>
                {conv.unread_count > 0 && (
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-primary-400 text-white text-[10px] font-bold flex-shrink-0">
                    {conv.unread_count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* ── RIGHT: CHAT AREA ─────────────────────────────────────────────── */}
        {selected ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Chat header */}
            <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {selected.type === 'group' ? (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-300 to-primary-500 flex items-center justify-center">
                      <Users size={18} className="text-white" />
                    </div>
                  ) : (
                    <>
                      <Avatar src={selected.other_avatar_url} alt={selected.other_display_name} size="md" />
                      <span className={cn('absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white',
                        isUserOnline(selected.other_user_id) ? 'bg-green-500' : 'bg-gray-300'
                      )} />
                    </>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-dark">
                    {selected.type === 'group' ? selected.group_name : selected.other_display_name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {selected.type === 'group'
                      ? `${groupMembers.length || selected.member_count || 0} thành viên`
                      : isUserOnline(selected.other_user_id) ? '🟢 Online' : 'Offline'}
                  </p>
                </div>
              </div>
              {selected.type === 'group' && (
                <button onClick={() => setShowGroupInfo(s => !s)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Users size={18} className="text-gray-500" />
                </button>
              )}
            </div>

            {/* Messages + optional group panel */}
            <div className="flex flex-1 overflow-hidden">
              {/* Messages column */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1 bg-gray-50">
                  {messages.map((msg, idx) => {
                    const isMe = msg.sender_id === user?.id;
                    const sender = getSender(msg);
                    const isGroup = selected.type === 'group';

                    // Show sender header only for group messages from others,
                    // and only if previous message wasn't from the same sender
                    const prevMsg = idx > 0 ? messages[idx - 1] : null;
                    const showSenderHeader = isGroup && !isMe && (
                      !prevMsg || prevMsg.sender_id !== msg.sender_id
                    );

                    // Group consecutive messages from same sender
                    const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;
                    const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id;

                    return (
                      <div key={msg.id} className={cn('flex flex-col', isMe ? 'items-end' : 'items-start')}>

                        {/* Avatar + bubble row — items-end aligns avatar with bubble bottom */}
                        <div className={cn('flex items-end gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}>
                          {/* Avatar col: only for group, only for others */}
                          {!isMe && isGroup && (
                            <div className="w-8 flex-shrink-0">
                              {isLastInGroup && sender ? (
                                <Avatar src={sender.avatar_url} alt={sender.display_name} size="sm" />
                              ) : (
                                <div className="w-8" />
                              )}
                            </div>
                          )}

                          {/* Bubble column: name + bubble */}
                          <div className={cn('flex flex-col max-w-[420px]', isMe ? 'items-end' : 'items-start')}>
                            {/* Sender name — inside column, aligns with bubble */}
                            {showSenderHeader && sender && (
                              <span className="text-xs text-gray-500 font-medium mb-0.5 px-1">
                                {sender.display_name || sender.username}
                              </span>
                            )}

                            {/* Bubble */}
                            <div className={cn(
                              'px-4 py-2.5 text-sm break-words',
                              isMe
                                ? 'bg-primary-500 text-white rounded-2xl rounded-br-sm'
                                : 'bg-white text-dark shadow-sm rounded-2xl rounded-bl-sm'
                            )}>
                              {msg.content}
                            </div>
                          </div>
                        </div>

                        {/* Timestamp: below the entire row, offset by avatar width for group others */}
                        {isLastInGroup && (
                          <span className={cn(
                            'text-[10px] text-gray-400 mt-0.5',
                            isGroup && !isMe ? 'ml-10' : 'mr-1'
                          )}>
                            {formatTime(msg.created_at)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="px-4 py-3 bg-white border-t border-gray-100">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 flex items-end gap-2 px-4 py-2.5 bg-gray-50 rounded-2xl border border-gray-100">
                      <textarea
                        ref={textareaRef}
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder={selected.type === 'group' ? `Nhắn tới ${selected.group_name}…` : 'Nhập tin nhắn…'}
                        rows={1}
                        className="flex-1 bg-transparent text-sm text-dark placeholder-gray-400 resize-none focus:outline-none max-h-28"
                      />
                    </div>
                    <button
                      onClick={handleSend}
                      disabled={!newMessage.trim() || isSending}
                      className="p-2.5 bg-primary-500 text-white rounded-2xl hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
                    >
                      {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Group info panel */}
              {showGroupInfo && selected.type === 'group' && (
                <div className="w-60 flex-shrink-0 border-l border-gray-100 bg-white flex flex-col">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="font-semibold text-sm text-dark">Thành viên</span>
                    <button onClick={() => setShowGroupInfo(false)} className="p-1 hover:bg-gray-100 rounded">
                      <X size={14} className="text-gray-400" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto py-2">
                    {groupMembers.map(m => (
                      <div key={m.user_id} className="flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50">
                        <div className="relative flex-shrink-0">
                          <Avatar src={m.avatar_url} alt={m.display_name} size="sm" />
                          <span className={cn('absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white',
                            m.is_online || isUserOnline(m.user_id) ? 'bg-green-500' : 'bg-gray-300'
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-dark truncate">{m.display_name}</p>
                          <p className="text-xs text-gray-400">{m.role === 'admin' ? '👑 Admin' : 'Member'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-3 border-t border-gray-100">
                    <button
                      onClick={() => selected.group_id && handleLeaveGroup(selected.group_id)}
                      className="w-full py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      <UserMinus size={14} />
                      Rời nhóm
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Empty state
          <div className="flex-1 flex flex-col items-center justify-center text-center bg-gray-50">
            <MessageSquare size={56} className="text-gray-200 mb-4" />
            <p className="text-gray-400 font-medium">Chọn cuộc trò chuyện</p>
            <p className="text-gray-300 text-sm mt-1">để bắt đầu nhắn tin</p>
          </div>
        )}
      </div>

      {/* ── CREATE GROUP MODAL ─────────────────────────────────────────────── */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-dark">Tạo nhóm mới</h3>
              <button onClick={() => { setShowCreateGroup(false); setGroupName(''); setSelectedMembers([]); setMemberSearch(''); }}
                className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Group name */}
              <div>
                <label className="text-sm font-medium text-dark block mb-1.5">Tên nhóm</label>
                <input value={groupName} onChange={e => setGroupName(e.target.value)}
                  placeholder="Nhập tên nhóm…"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
              </div>

              {/* Member search */}
              <div>
                <label className="text-sm font-medium text-dark block mb-1.5">
                  Thêm thành viên
                  {selectedMembers.length > 0 && (
                    <span className="ml-1.5 text-primary-500">({selectedMembers.length} đã chọn)</span>
                  )}
                </label>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
                    placeholder="Tìm người dùng…"
                    className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
                </div>
                <div className="max-h-52 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
                  {filteredUserPool.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">Không tìm thấy người dùng.</p>
                  ) : filteredUserPool.map(u => {
                    const checked = selectedMembers.includes(u.id);
                    return (
                      <button key={u.id} onClick={() => setSelectedMembers(prev => checked ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                        className={cn('w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left',
                          checked && 'bg-primary-50'
                        )}>
                        <Avatar src={u.avatar_url} alt={u.display_name || u.username} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-dark truncate">{u.display_name || u.username}</p>
                          <p className="text-xs text-gray-400">@{u.username}</p>
                        </div>
                        <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                          checked ? 'bg-primary-500 border-primary-500' : 'border-gray-300'
                        )}>
                          {checked && <span className="text-white text-[10px] font-bold">✓</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100">
              <button onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedMembers.length === 0}
                className="w-full py-2.5 bg-primary-500 text-white rounded-xl font-semibold text-sm hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Tạo nhóm {selectedMembers.length > 0 ? `(${selectedMembers.length + 1} người)` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

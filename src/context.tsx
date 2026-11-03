import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type {
  UserProfile,
  Message,
  StatusItem,
  CallRecord,
  Chat,
  SocialPost,
  NewsItem,
  UserReport,
  ActiveCallState,
} from './types.ts';
import {
  playSentSound,
  playReceivedSound,
  startRingtone,
  stopRingtone,
  speakTextLive,
  stopSpeakingLive,
} from './audio.ts';

// Master Admin & AI bot defaults
export const MASTER_ADMIN_PHONE = '0760264995';
export const MASTER_ADMIN_NAME = 'mr suranga mods';

export const MASTER_ADMIN_USER: UserProfile = {
  id: 'user_master_admin',
  name: 'mr suranga mods',
  phone: '+94 76 026 4995',
  avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
  about: '👑 Zavi Chats Master Verified Owner | Zanta Mods',
  isOnline: true,
  lastSeen: Date.now(),
  isVerified: true,
  role: 'admin',
  authenticatorSecret: 'JBSWY3DPEHPK3PXP',
};

export const ZAVI_AI_BOT_USER: UserProfile = {
  id: 'user_zavi_ai',
  name: 'Zavi AI',
  phone: '+94 00 000 0000',
  avatar: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=200&auto=format&fit=crop&q=80',
  about: '🤖 Zavi AI • Created by Zanta Mods (Live AI)',
  isOnline: true,
  lastSeen: Date.now(),
  isVerified: true,
};

export function isUserVerified(phone: string, name: string): boolean {
  if (!phone && !name) return false;
  const cleanedPhone = phone.replace(/[\s-]/g, '').slice(-9);
  const cleanAdminPhone = MASTER_ADMIN_PHONE.replace(/[\s-]/g, '').slice(-9);
  const trimmedName = name.trim().toLowerCase();
  return cleanedPhone === cleanAdminPhone || trimmedName === MASTER_ADMIN_NAME.toLowerCase();
}

// ==========================================
// AUTH CONTEXT
// ==========================================
interface AuthContextType {
  currentUser: UserProfile | null;
  isLoading: boolean;
  loginUser: (user: UserProfile) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  logout: () => void;
  toggleBlockUser: (targetUserId: string) => Promise<void>;
  isAdmin: boolean;
}

const CURRENT_USER_STORAGE_KEY = 'zavi_vip_current_user_profile';
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
    if (stored) {
      try {
        const parsed: UserProfile = JSON.parse(stored);
        parsed.isOnline = true;
        parsed.lastSeen = Date.now();
        parsed.isVerified = isUserVerified(parsed.phone, parsed.name);
        setCurrentUser(parsed);
        // Sync with server
        fetch('/api/users/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed),
        }).catch(() => {});
      } catch (e) {
        console.error('Failed to parse current user:', e);
      }
    }
    setIsLoading(false);

    const handleUnload = () => {
      if (currentUser) {
        const offline = { ...currentUser, isOnline: false, lastSeen: Date.now() };
        navigator.sendBeacon('/api/users/profile', JSON.stringify(offline));
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  const loginUser = async (user: UserProfile) => {
    const verified = isUserVerified(user.phone, user.name);
    const updated: UserProfile = {
      ...user,
      isOnline: true,
      lastSeen: Date.now(),
      isVerified: verified,
      role: user.phone.includes('760264995') || user.name.toLowerCase() === 'mr suranga mods' ? 'admin' : 'user',
    };
    setCurrentUser(updated);
    localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(updated));

    try {
      await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (e) {
      console.warn('Profile sync warning:', e);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated: UserProfile = {
      ...currentUser,
      ...updates,
      lastSeen: Date.now(),
      isVerified: isUserVerified(updates.phone || currentUser.phone, updates.name || currentUser.name),
    };
    setCurrentUser(updated);
    localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(updated));

    try {
      await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (e) {
      console.warn('Profile sync warning:', e);
    }
  };

  const logout = () => {
    if (currentUser) {
      fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...currentUser, isOnline: false, lastSeen: Date.now() }),
      }).catch(() => {});
    }
    setCurrentUser(null);
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
  };

  const toggleBlockUser = async (targetUserId: string) => {
    if (!currentUser) return;
    const blocked = currentUser.blockedUsers || [];
    const isAlreadyBlocked = blocked.includes(targetUserId);
    const updatedBlocked = isAlreadyBlocked
      ? blocked.filter((id) => id !== targetUserId)
      : [...blocked, targetUserId];

    await updateProfile({ blockedUsers: updatedBlocked });
  };

  const isAdmin = currentUser
    ? currentUser.phone.includes('760264995') ||
      currentUser.name.toLowerCase() === 'mr suranga mods' ||
      currentUser.role === 'admin'
    : false;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        loginUser,
        updateProfile,
        logout,
        toggleBlockUser,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// ==========================================
// CHAT & REALTIME CONTEXT
// ==========================================
interface ChatContextType {
  users: UserProfile[];
  messages: Message[];
  statuses: StatusItem[];
  posts: SocialPost[];
  news: NewsItem[];
  isLoadingNews: boolean;
  callRecords: CallRecord[];
  activeChatId: string | null;
  activeChat: Chat | null;
  activeChatUser: UserProfile | null;
  typingUserIds: string[];
  activeCall: ActiveCallState | null;
  incomingCall: CallRecord | null;
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
  isAiTalking: boolean;
  setActiveChatId: (id: string | null) => void;
  sendTextMessage: (text: string) => Promise<void>;
  sendImageMessage: (imageUrl: string) => Promise<void>;
  sendVoiceMessage: (audioUrl: string, duration: number) => Promise<void>;
  pinMessage: (msgId: string, pinned: boolean) => Promise<void>;
  deleteMessage: (msgId: string) => Promise<void>;
  reactToMessage: (msgId: string, emoji: string) => Promise<void>;
  forwardMessage: (msg: Message, targetId: string) => Promise<void>;
  postStatus: (type: 'text' | 'image', content: string, caption?: string, bgColor?: string, textColor?: string) => Promise<void>;
  reactToStatus: (statusId: string, emoji: string) => Promise<void>;
  createSocialPost: (text: string, mediaUrl?: string, mediaType?: 'image' | 'video') => Promise<void>;
  reactToSocialPost: (postId: string, emoji: string) => Promise<void>;
  addCommentToPost: (postId: string, text: string) => Promise<void>;
  reportUser: (reportedUserId: string, reason: string, details?: string) => Promise<void>;
  initiateCall: (targetUser: UserProfile, type: 'voice' | 'video') => Promise<void>;
  answerIncomingCall: () => Promise<void>;
  rejectIncomingCall: () => Promise<void>;
  endCall: (status?: 'completed' | 'missed' | 'rejected') => void;
  toggleMuteCall: () => void;
  toggleVideoCall: () => void;
  createGroup: (name: string, avatar: string, participantIds: string[]) => string;
  groups: Chat[];
  clearChatHistory: (targetId: string) => void;
  refreshNews: () => Promise<void>;
  askZaviAiLive: (text: string) => Promise<string>;
  speakAiText: (text: string) => void;
}

const LOCAL_GROUPS_KEY = 'zavi_vip_groups';
const LOCAL_CALLS_KEY = 'zavi_real_calls_list';
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// WebRTC Configuration
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([MASTER_ADMIN_USER, ZAVI_AI_BOT_USER]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [groups, setGroups] = useState<Chat[]>([]);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);

  // Call & WebRTC states
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallRecord | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isAiTalking, setIsAiTalking] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const currentCallIdRef = useRef<string | null>(null);

  // 1. Initial Sync from Server
  const fetchInitialData = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/sync');
      if (res.ok) {
        const data = await res.json();
        if (data.users) {
          // Merge unique users
          setUsers((prev) => {
            const map = new Map<string, UserProfile>();
            [MASTER_ADMIN_USER, ZAVI_AI_BOT_USER, ...prev, ...data.users].forEach((u) => {
              map.set(u.id, { ...u, isVerified: isUserVerified(u.phone, u.name) || u.id === ZAVI_AI_BOT_USER.id });
            });
            return Array.from(map.values());
          });
        }
        if (data.messages) setMessages(data.messages);
        if (data.statuses) setStatuses(data.statuses);
        if (data.posts) setPosts(data.posts);
      }
    } catch (e) {
      console.warn('Initial chat sync error:', e);
    }
  }, []);

  // 2. Real-time Live SSE Listener
  useEffect(() => {
    fetchInitialData();
    refreshNews();

    // Load calls from storage
    const storedCalls = localStorage.getItem(LOCAL_CALLS_KEY);
    if (storedCalls) {
      try {
        setCallRecords(JSON.parse(storedCalls));
      } catch {}
    }

    // Load groups
    const savedGroups = localStorage.getItem(LOCAL_GROUPS_KEY);
    if (savedGroups) {
      try {
        setGroups(JSON.parse(savedGroups));
      } catch {}
    }
  }, [fetchInitialData]);

  // Connect to SSE stream
  useEffect(() => {
    const userId = currentUser?.id || 'guest_' + Math.random().toString(36).substring(2, 6);
    const eventSource = new EventSource(`/api/realtime/stream?userId=${encodeURIComponent(userId)}`);

    eventSource.onmessage = async (e) => {
      try {
        const data = JSON.parse(e.data);
        const { type, payload } = data;

        if (type === 'NEW_MESSAGE') {
          const newMsg: Message = payload;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // Sound effect if message is for me
          if (currentUser && newMsg.receiverId === currentUser.id && newMsg.senderId !== currentUser.id) {
            playReceivedSound();
          }
        } else if (type === 'UPDATE_MESSAGE') {
          const updatedMsg: Message = payload;
          setMessages((prev) => prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)));
        } else if (type === 'DELETE_MESSAGE') {
          const { id } = payload;
          setMessages((prev) => prev.filter((m) => m.id !== id));
        } else if (type === 'USER_PRESENCE') {
          const userItem: UserProfile = payload;
          setUsers((prev) => {
            const idx = prev.findIndex((u) => u.id === userItem.id);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = { ...copy[idx], ...userItem, isVerified: isUserVerified(userItem.phone, userItem.name) };
              return copy;
            }
            return [...prev, { ...userItem, isVerified: isUserVerified(userItem.phone, userItem.name) }];
          });
        } else if (type === 'NEW_STATUS') {
          const newStatus: StatusItem = payload;
          setStatuses((prev) => {
            if (prev.some((s) => s.id === newStatus.id)) return prev;
            return [newStatus, ...prev];
          });
        } else if (type === 'UPDATE_STATUS') {
          const updated: StatusItem = payload;
          setStatuses((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        } else if (type === 'NEW_POST') {
          const newPost: SocialPost = payload;
          setPosts((prev) => {
            if (prev.some((p) => p.id === newPost.id)) return prev;
            return [newPost, ...prev];
          });
        } else if (type === 'UPDATE_POST') {
          const updated: SocialPost = payload;
          setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        } else if (type === 'CALL_INCOMING') {
          const session = payload;
          // Incoming call on receiver's phone!
          if (currentUser && session.receiverId === currentUser.id) {
            currentCallIdRef.current = session.id;
            setIncomingCall({
              id: session.id,
              callerId: session.callerId,
              callerName: session.callerName,
              callerAvatar: session.callerAvatar,
              receiverId: session.receiverId,
              receiverName: session.receiverName,
              receiverAvatar: session.receiverAvatar,
              type: session.type,
              direction: 'incoming',
              status: 'calling',
              timestamp: session.startedAt,
            });
            startRingtone();
          }
        } else if (type === 'CALL_ANSWERED') {
          const { sdp } = payload;
          stopRingtone();
          if (pcRef.current && sdp) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
          }
          setActiveCall((prev) => (prev ? { ...prev, isRinging: false, isConnected: true } : null));
        } else if (type === 'CALL_REJECTED') {
          stopRingtone();
          if (activeCall) {
            endCall('rejected');
          }
        } else if (type === 'CALL_ENDED') {
          stopRingtone();
          cleanupCallMedia();
          setActiveCall(null);
          setIncomingCall(null);
        } else if (type === 'CALL_SIGNAL_SDP') {
          const { sdp } = payload;
          if (pcRef.current && sdp) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
          }
        } else if (type === 'CALL_SIGNAL_ICE') {
          const { candidate } = payload;
          if (pcRef.current && candidate) {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.warn('ICE Candidate add error:', err);
            }
          }
        }
      } catch (err) {
        console.warn('SSE message parse error:', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [currentUser]);

  // Call duration counter
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (activeCall?.isConnected) {
      interval = setInterval(() => {
        setActiveCall((prev) => (prev ? { ...prev, duration: prev.duration + 1 } : null));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeCall?.isConnected]);

  // Refresh live news
  const refreshNews = async () => {
    setIsLoadingNews(true);
    try {
      const res = await fetch('/api/news/live');
      if (res.ok) {
        const data = await res.json();
        if (data.news && Array.isArray(data.news)) {
          setNews(data.news);
        }
      }
    } catch (e) {
      console.warn('Live news fetch failed:', e);
    } finally {
      setIsLoadingNews(false);
    }
  };

  const cleanupCallMedia = () => {
    stopRingtone();
    stopSpeakingLive();
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
      setRemoteStream(null);
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    currentCallIdRef.current = null;
  };

  // Active chat metadata
  const activeChatGroup = groups.find((g) => g.id === activeChatId);
  const activeChatUser = users.find((u) => u.id === activeChatId) || null;

  const activeChat: Chat | null = activeChatGroup
    ? activeChatGroup
    : activeChatUser
    ? {
        id: activeChatUser.id,
        isGroup: false,
        name: activeChatUser.name,
        avatar: activeChatUser.avatar,
        isVerified: activeChatUser.isVerified,
        isAiBot: activeChatUser.id === ZAVI_AI_BOT_USER.id,
        participantIds: [activeChatUser.id, currentUser?.id || ''],
      }
    : null;

  // Ask Zavi AI live (Gemini)
  const askZaviAiLive = async (question: string): Promise<string> => {
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error('AI request failed');
      const data = await res.json();
      return data.reply || 'ආයුබෝවන්! මම Zavi AI. මාව හැදුවේ Zanta Mods. ඔබට කෙසේද මම උදව් කළ යුත්තේ? 🌸';
    } catch (e) {
      return 'ආයුබෝවන්! මම Zavi AI. මාව හැදුවේ Zanta Mods. ඔබට කෙසේද මම උදව් කළ යුත්තේ? 🌸';
    }
  };

  // Speak text live (TTS)
  const speakAiText = (text: string) => {
    setIsAiTalking(true);
    speakTextLive(text, () => {
      setIsAiTalking(false);
    });
  };

  // Send Text Message
  const sendTextMessage = async (text: string) => {
    if (!currentUser || !activeChatId || !text.trim()) return;

    const newMsg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      receiverId: activeChatId,
      text: text.trim(),
      type: 'text',
      timestamp: Date.now(),
      status: 'sent',
    };

    playSentSound();
    setMessages((prev) => [...prev, newMsg]);

    // Send to server
    try {
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMsg),
      });
    } catch (e) {
      console.warn('Failed to send message to server:', e);
    }

    // If chatting with ZAVI AI BOT -> Fetch answer from Gemini API!
    if (activeChatId === ZAVI_AI_BOT_USER.id) {
      setTypingUserIds((prev) => [...prev, ZAVI_AI_BOT_USER.id]);

      try {
        const aiAnswer = await askZaviAiLive(text.trim());
        setTypingUserIds((prev) => prev.filter((id) => id !== ZAVI_AI_BOT_USER.id));

        const botReplyMsg: Message = {
          id: `msg_ai_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          senderId: ZAVI_AI_BOT_USER.id,
          senderName: 'Zavi AI',
          receiverId: currentUser.id,
          text: aiAnswer,
          type: 'text',
          timestamp: Date.now(),
          status: 'sent',
        };

        playReceivedSound();
        setMessages((prev) => [...prev, botReplyMsg]);

        await fetch('/api/chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(botReplyMsg),
        });
      } catch (err) {
        setTypingUserIds((prev) => prev.filter((id) => id !== ZAVI_AI_BOT_USER.id));
      }
    }
  };

  // Send Image Message
  const sendImageMessage = async (imageUrl: string) => {
    if (!currentUser || !activeChatId) return;

    const newMsg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      receiverId: activeChatId,
      type: 'image',
      mediaUrl: imageUrl,
      timestamp: Date.now(),
      status: 'sent',
    };

    playSentSound();
    setMessages((prev) => [...prev, newMsg]);

    await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMsg),
    });
  };

  // Send Voice Message
  const sendVoiceMessage = async (audioUrl: string, duration: number) => {
    if (!currentUser || !activeChatId) return;

    const newMsg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      receiverId: activeChatId,
      type: 'voice',
      mediaUrl: audioUrl,
      duration,
      timestamp: Date.now(),
      status: 'sent',
    };

    playSentSound();
    setMessages((prev) => [...prev, newMsg]);

    await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMsg),
    });
  };

  // Pin message
  const pinMessage = async (msgId: string, pinned: boolean) => {
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, pinned } : m)));
    await fetch(`/api/chat/messages/${msgId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned }),
    });
  };

  // Delete message
  const deleteMessage = async (msgId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    await fetch(`/api/chat/messages/${msgId}`, {
      method: 'DELETE',
    });
  };

  // React to message
  const reactToMessage = async (msgId: string, emoji: string) => {
    if (!currentUser) return;
    await fetch(`/api/chat/messages/${msgId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji, userId: currentUser.id }),
    });
  };

  // Forward message
  const forwardMessage = async (msg: Message, targetId: string) => {
    if (!currentUser) return;

    const forwardMsg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      receiverId: targetId,
      text: msg.text,
      type: msg.type,
      mediaUrl: msg.mediaUrl,
      duration: msg.duration,
      isForwarded: true,
      timestamp: Date.now(),
      status: 'sent',
    };

    playSentSound();
    setMessages((prev) => [...prev, forwardMsg]);

    await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(forwardMsg),
    });
  };

  // Post Status
  const postStatus = async (
    type: 'text' | 'image',
    content: string,
    caption?: string,
    bgColor = '#09090b',
    textColor = '#ffffff'
  ) => {
    if (!currentUser) return;

    const newStatus: StatusItem = {
      id: `status_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      isVerified: currentUser.isVerified,
      type,
      content,
      caption: caption || '',
      backgroundColor: bgColor,
      textColor: textColor,
      timestamp: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      viewedBy: [],
      reactions: {},
    };

    setStatuses((prev) => [newStatus, ...prev]);

    await fetch('/api/statuses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newStatus),
    });
  };

  // React to Status
  const reactToStatus = async (statusId: string, emoji: string) => {
    if (!currentUser) return;
    await fetch(`/api/statuses/${statusId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji, userId: currentUser.id }),
    });
  };

  // Create Social Post
  const createSocialPost = async (text: string, mediaUrl?: string, mediaType?: 'image' | 'video') => {
    if (!currentUser) return;

    const newPost: SocialPost = {
      id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      isVerified: currentUser.isVerified,
      text: text.trim(),
      mediaUrl,
      mediaType,
      timestamp: Date.now(),
      likes: [],
      reactions: {},
      comments: [],
    };

    setPosts((prev) => [newPost, ...prev]);

    await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPost),
    });
  };

  // React to post
  const reactToSocialPost = async (postId: string, emoji: string) => {
    if (!currentUser) return;
    await fetch(`/api/posts/${postId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji, userId: currentUser.id }),
    });
  };

  // Add Comment to Post
  const addCommentToPost = async (postId: string, text: string) => {
    if (!currentUser || !text.trim()) return;

    const comment = {
      id: `comm_${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      isVerified: currentUser.isVerified,
      text: text.trim(),
      timestamp: Date.now(),
    };

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return { ...p, comments: [...(p.comments || []), comment] };
        }
        return p;
      })
    );

    await fetch(`/api/posts/${postId}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comment),
    });
  };

  // Report User
  const reportUser = async (reportedUserId: string, reason: string, details?: string) => {
    if (!currentUser) return;
    const target = users.find((u) => u.id === reportedUserId);
    if (!target) return;

    // Send direct report alert message to mr suranga mods
    const alertMsg: Message = {
      id: `msg_report_${Date.now()}`,
      senderId: currentUser.id,
      senderName: `${currentUser.name} (Report System)`,
      receiverId: MASTER_ADMIN_USER.id,
      text: `🚨 [පරිශීලක REPORT ALERT]\n\nවාර්තා කළ පුද්ගලයා: ${currentUser.name} (${currentUser.phone})\nවාර්තා කරන ලද ගිණුම: ${target.name} (${target.phone})\nහේතුව: ${reason}\nවිස්තර: ${details || 'විශේෂ විස්තරයක් නොමැත.'}\nවේලාව: ${new Date().toLocaleString('si-LK')}`,
      type: 'text',
      timestamp: Date.now(),
      status: 'sent',
    };

    await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alertMsg),
    });
  };

  // ==========================================
  // REAL CALLING & WEBRTC IMPLEMENTATION
  // ==========================================
  const initiateCall = async (targetUser: UserProfile, type: 'voice' | 'video') => {
    if (!currentUser) return;

    const isAi = targetUser.id === ZAVI_AI_BOT_USER.id;

    // Check media access
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });
      setLocalStream(stream);
    } catch (e) {
      console.warn('Microphone/Camera permission notice:', e);
    }

    const callRecord: CallRecord = {
      id: `call_${Date.now()}`,
      callerId: currentUser.id,
      callerName: currentUser.name,
      callerAvatar: currentUser.avatar,
      receiverId: targetUser.id,
      receiverName: targetUser.name,
      receiverAvatar: targetUser.avatar,
      type,
      direction: 'outgoing',
      status: 'calling',
      timestamp: Date.now(),
      duration: 0,
    };

    if (isAi) {
      // Live Zavi AI Voice Call
      setActiveCall({
        callId: callRecord.id,
        record: callRecord,
        isRinging: false,
        isConnected: true,
        duration: 0,
        isMuted: false,
        isVideoOff: false,
        isAiCall: true,
      });

      // Zavi AI speaks live welcome greeting
      const greeting = 'ආයුබෝවන්! මම Zavi AI. ඔබ දැන් මා සමඟ සජීවීව කතා කරමින් සිටී. ඔබගේ ප්‍රශ්නය විමසන්න!';
      speakAiText(greeting);
      return;
    }

    // Real User-to-User WebRTC Call
    startRingtone();

    // 1. Initiate on server signaling
    let callSessionId = callRecord.id;
    try {
      const res = await fetch('/api/calls/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caller: currentUser,
          receiver: targetUser,
          type,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.session?.id) callSessionId = data.session.id;
      }
    } catch (e) {
      console.warn('Call initiate error:', e);
    }

    currentCallIdRef.current = callSessionId;

    // 2. Create WebRTC PeerConnection
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream!));
    }

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        fetch(`/api/calls/${callSessionId}/signal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: currentUser.id,
            targetId: targetUser.id,
            candidate: event.candidate,
          }),
        }).catch(() => {});
      }
    };

    // 3. Create Offer
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await fetch(`/api/calls/${callSessionId}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUser.id,
          targetId: targetUser.id,
          sdp: offer,
        }),
      });
    } catch (err) {
      console.warn('WebRTC offer error:', err);
    }

    setActiveCall({
      callId: callSessionId,
      record: callRecord,
      isRinging: true,
      isConnected: false,
      duration: 0,
      isMuted: false,
      isVideoOff: false,
      isAiCall: false,
      peerConnection: pc,
      localStream: stream,
    });
  };

  // Answer Incoming Call
  const answerIncomingCall = async () => {
    if (!incomingCall || !currentUser) return;
    stopRingtone();

    const callSessionId = currentCallIdRef.current || incomingCall.id;

    // Get user media
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: incomingCall.type === 'video',
      });
      setLocalStream(stream);
    } catch (e) {
      console.warn('Answer call media error:', e);
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream!));
    }

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        fetch(`/api/calls/${callSessionId}/signal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: currentUser.id,
            targetId: incomingCall.callerId,
            candidate: event.candidate,
          }),
        }).catch(() => {});
      }
    };

    try {
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await fetch(`/api/calls/${callSessionId}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUser.id,
          targetId: incomingCall.callerId,
          sdp: answer,
          action: 'answer_call',
        }),
      });
    } catch (err) {
      console.warn('WebRTC Answer error:', err);
    }

    setActiveCall({
      callId: callSessionId,
      record: {
        ...incomingCall,
        status: 'completed',
      },
      isRinging: false,
      isConnected: true,
      duration: 0,
      isMuted: false,
      isVideoOff: false,
      isAiCall: false,
      peerConnection: pc,
      localStream: stream,
    });

    setIncomingCall(null);
  };

  // Reject Incoming Call
  const rejectIncomingCall = async () => {
    if (!incomingCall) return;
    stopRingtone();
    const callSessionId = currentCallIdRef.current || incomingCall.id;

    try {
      await fetch(`/api/calls/${callSessionId}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject_call',
        }),
      });
    } catch {}

    setIncomingCall(null);
  };

  // End Call
  const endCall = (status: 'completed' | 'missed' | 'rejected' = 'completed') => {
    const callSessionId = activeCall?.callId || currentCallIdRef.current;
    if (callSessionId) {
      fetch(`/api/calls/${callSessionId}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'end_call',
        }),
      }).catch(() => {});
    }

    if (activeCall && currentUser) {
      const duration = activeCall.duration;
      const logRecord: CallRecord = {
        ...activeCall.record,
        status,
        duration,
        timestamp: Date.now(),
      };

      setCallRecords((prev) => {
        const updated = [logRecord, ...prev];
        localStorage.setItem(LOCAL_CALLS_KEY, JSON.stringify(updated));
        return updated;
      });

      // Post automatic Call Log message to chat
      const logMsg: Message = {
        id: `msg_call_${Date.now()}`,
        senderId: currentUser.id,
        senderName: currentUser.name,
        receiverId: activeCall.record.receiverId === currentUser.id ? activeCall.record.callerId : activeCall.record.receiverId,
        text:
          status === 'missed'
            ? 'Missed Call'
            : `${activeCall.record.type === 'video' ? 'Video ඇමතුම' : 'Voice ඇමතුම'} (${duration}s)`,
        type: 'call_log',
        timestamp: Date.now(),
        status: 'sent',
        callInfo: {
          type: activeCall.record.type,
          duration,
          status,
        },
      };

      fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logMsg),
      }).catch(() => {});
    }

    cleanupCallMedia();
    setActiveCall(null);
    setIncomingCall(null);
  };

  const toggleMuteCall = () => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setActiveCall((prev) => (prev ? { ...prev, isMuted: !audioTrack.enabled } : null));
    }
  };

  const toggleVideoCall = () => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setActiveCall((prev) => (prev ? { ...prev, isVideoOff: !videoTrack.enabled } : null));
    }
  };

  const createGroup = (name: string, avatar: string, participantIds: string[]) => {
    const newGroup: Chat = {
      id: `group_${Date.now()}`,
      isGroup: true,
      name,
      avatar: avatar || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80',
      participantIds: [...participantIds, currentUser?.id || ''],
    };

    setGroups((prev) => {
      const updated = [...prev, newGroup];
      localStorage.setItem(LOCAL_GROUPS_KEY, JSON.stringify(updated));
      return updated;
    });

    return newGroup.id;
  };

  const clearChatHistory = (targetId: string) => {
    setMessages((prev) => prev.filter((m) => m.receiverId !== targetId && m.senderId !== targetId));
  };

  return (
    <ChatContext.Provider
      value={{
        users,
        messages,
        statuses,
        posts,
        news,
        isLoadingNews,
        callRecords,
        activeChatId,
        activeChat,
        activeChatUser,
        typingUserIds,
        activeCall,
        incomingCall,
        remoteStream,
        localStream,
        isAiTalking,
        setActiveChatId,
        sendTextMessage,
        sendImageMessage,
        sendVoiceMessage,
        pinMessage,
        deleteMessage,
        reactToMessage,
        forwardMessage,
        postStatus,
        reactToStatus,
        createSocialPost,
        reactToSocialPost,
        addCommentToPost,
        reportUser,
        initiateCall,
        answerIncomingCall,
        rejectIncomingCall,
        endCall,
        toggleMuteCall,
        toggleVideoCall,
        createGroup,
        groups,
        clearChatHistory,
        refreshNews,
        askZaviAiLive,
        speakAiText,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};

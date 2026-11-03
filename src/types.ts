export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  about: string;
  isOnline: boolean;
  lastSeen: number;
  blockedUsers?: string[];
  authenticatorSecret?: string;
  isVerified?: boolean;
  role?: 'admin' | 'user';
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[]; // userIds
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  text?: string;
  type: 'text' | 'image' | 'voice' | 'call_log';
  mediaUrl?: string;
  duration?: number;
  timestamp: number;
  status: 'sent' | 'delivered' | 'seen';
  pinned?: boolean;
  isForwarded?: boolean;
  reactions?: Record<string, string[]>; // emoji -> array of userIds
  callInfo?: {
    type: 'voice' | 'video';
    duration?: number;
    status: 'completed' | 'missed' | 'rejected';
  };
}

export interface Chat {
  id: string;
  isGroup: boolean;
  name: string;
  avatar: string;
  participantIds: string[];
  unreadCount?: number;
  isVerified?: boolean;
  isAiBot?: boolean;
  lastMessage?: {
    text: string;
    timestamp: number;
    senderId: string;
    type: 'text' | 'image' | 'voice' | 'call_log';
  };
}

export interface StatusItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  isVerified?: boolean;
  type: 'text' | 'image';
  content: string;
  caption?: string;
  backgroundColor?: string;
  textColor?: string;
  timestamp: number;
  expiresAt: number;
  viewedBy?: string[];
  reactions?: Record<string, string[]>; // emoji -> userIds
}

export interface CallRecord {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  type: 'voice' | 'video';
  direction: 'incoming' | 'outgoing' | 'missed';
  status: 'completed' | 'missed' | 'rejected' | 'busy' | 'calling';
  timestamp: number;
  duration?: number;
}

export interface SocialPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  isVerified?: boolean;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  timestamp: number;
  likes: string[]; // userIds
  reactions?: Record<string, string[]>; // emoji -> userIds
  comments: {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    isVerified?: boolean;
    text: string;
    timestamp: number;
  }[];
}

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  publishedAt?: string;
  link?: string;
  category?: string;
}

export interface UserReport {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterPhone: string;
  reportedUserId: string;
  reportedUserName: string;
  reportedUserPhone: string;
  reason: string;
  details?: string;
  timestamp: number;
  status: 'pending' | 'resolved';
}

export interface ActiveCallState {
  callId: string;
  record: CallRecord;
  isRinging: boolean;
  isConnected: boolean;
  duration: number;
  isMuted: boolean;
  isVideoOff: boolean;
  isAiCall: boolean;
  peerConnection?: RTCPeerConnection | null;
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
}

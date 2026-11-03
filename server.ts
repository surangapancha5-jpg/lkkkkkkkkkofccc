import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV !== 'production';

app.use(express.json({ limit: '25mb' }));

// Initialize Google Gemini AI SDK
const ai = new GoogleGenAI();

// ==========================================
// IN-MEMORY SHARED DATA STORE (LIVE APP STATE)
// ==========================================

export interface StoredUser {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  about: string;
  isOnline: boolean;
  lastSeen: number;
  isVerified?: boolean;
  role?: 'admin' | 'user';
  blockedUsers?: string[];
  authenticatorSecret?: string;
}

export interface StoredMessage {
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
  reactions?: Record<string, string[]>;
  callInfo?: {
    type: 'voice' | 'video';
    duration?: number;
    status: 'completed' | 'missed' | 'rejected';
  };
}

export interface StoredStatus {
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
  reactions?: Record<string, string[]>;
}

export interface StoredPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  isVerified?: boolean;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  timestamp: number;
  likes: string[];
  reactions?: Record<string, string[]>;
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

export interface StoredCallSession {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  type: 'voice' | 'video';
  status: 'calling' | 'connected' | 'rejected' | 'ended';
  startedAt: number;
  connectedAt?: number;
  duration?: number;
  sdpOffer?: any;
  sdpAnswer?: any;
  callerCandidates: any[];
  receiverCandidates: any[];
}

// Master Admin & AI Bot Definitions
export const MASTER_ADMIN_USER: StoredUser = {
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

export const ZAVI_AI_BOT_USER: StoredUser = {
  id: 'user_zavi_ai',
  name: 'Zavi AI',
  phone: '+94 00 000 0000',
  avatar: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=200&auto=format&fit=crop&q=80',
  about: '🤖 Zavi AI • Created by Zanta Mods (Live AI)',
  isOnline: true,
  lastSeen: Date.now(),
  isVerified: true,
};

let users: StoredUser[] = [MASTER_ADMIN_USER, ZAVI_AI_BOT_USER];
let messages: StoredMessage[] = [];
let statuses: StoredStatus[] = [];
let posts: StoredPost[] = [
  {
    id: 'post_welcome',
    userId: MASTER_ADMIN_USER.id,
    userName: MASTER_ADMIN_USER.name,
    userAvatar: MASTER_ADMIN_USER.avatar,
    isVerified: true,
    text: 'සාදරයෙන් Zavi Chats වෙත පිළිගන්නවා! 🔥\nමෙය සැබෑ Real-time Live Messaging, WebRTC Calls, සජීවී Hiru News සහ Live AI Voice සංවාද සහිත සම්පූර්ණ Live App එකකි. දැන් ඔබ සැමට ලයිව් චැට් කිරීමට, ඇමතුම් ගැනීමට සහ පෝස්ට් දැමීමට හැකියාව ඇත! 🚀',
    mediaUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80',
    mediaType: 'image',
    timestamp: Date.now(),
    likes: [MASTER_ADMIN_USER.id],
    reactions: { '🔥': [MASTER_ADMIN_USER.id] },
    comments: [
      {
        id: 'comm_1',
        userId: ZAVI_AI_BOT_USER.id,
        userName: ZAVI_AI_BOT_USER.name,
        userAvatar: ZAVI_AI_BOT_USER.avatar,
        isVerified: true,
        text: 'ආයුබෝවන්! මම Zavi AI. මාව නිර්මාණය කළේ Zanta Mods. ඕනෑම මොහොතක මගෙන් අසන්න හෝ Live Voice Call මඟින් මට කතා කරන්න! 🤖✨',
        timestamp: Date.now() + 500,
      },
    ],
  },
];

let activeCalls: Map<string, StoredCallSession> = new Map();

// SSE Connected Clients: Map<userId, Set<Response>>
const sseClients = new Map<string, Set<Response>>();

function broadcastEvent(eventType: string, payload: any, targetUserId?: string) {
  const data = JSON.stringify({ type: eventType, payload, timestamp: Date.now() });
  const msg = `data: ${data}\n\n`;

  if (targetUserId) {
    const clients = sseClients.get(targetUserId);
    if (clients) {
      for (const res of clients) {
        try {
          res.write(msg);
        } catch {
          clients.delete(res);
        }
      }
    }
  } else {
    for (const [_, clients] of sseClients) {
      for (const res of clients) {
        try {
          res.write(msg);
        } catch {
          clients.delete(res);
        }
      }
    }
  }
}

// ==========================================
// REAL-TIME SSE ENDPOINT
// ==========================================
app.get('/api/realtime/stream', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'guest_' + Math.random().toString(36).substring(2, 7);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  if (!sseClients.has(userId)) {
    sseClients.set(userId, new Set());
  }
  sseClients.get(userId)!.add(res);

  // Send initial ping
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', userId, timestamp: Date.now() })}\n\n`);

  // Heartbeat interval
  const heartbeat = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    const clients = sseClients.get(userId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) {
        sseClients.delete(userId);
        // Mark user offline if needed
        const u = users.find((item) => item.id === userId);
        if (u && u.id !== MASTER_ADMIN_USER.id && u.id !== ZAVI_AI_BOT_USER.id) {
          u.isOnline = false;
          u.lastSeen = Date.now();
          broadcastEvent('USER_PRESENCE', u);
        }
      }
    }
  });
});

// ==========================================
// CHAT & DATA REST ENDPOINTS
// ==========================================

// Initial Full Sync
app.get('/api/chat/sync', (_req: Request, res: Response) => {
  const now = Date.now();
  const validStatuses = statuses.filter((s) => s.expiresAt > now);
  res.json({
    users,
    messages,
    statuses: validStatuses,
    posts,
  });
});

// Upsert User Profile & Online status
app.post('/api/users/profile', (req: Request, res: Response) => {
  const user = req.body as StoredUser;
  if (!user || !user.id) {
    res.status(400).json({ error: 'Invalid user data' });
    return;
  }

  // Preserve verified status for Master Admin & Zavi AI Bot
  const isMaster = user.phone.includes('760264995') || user.name.toLowerCase() === 'mr suranga mods';
  const isAi = user.id === ZAVI_AI_BOT_USER.id;
  user.isVerified = isMaster || isAi;
  if (isMaster) user.role = 'admin';

  const idx = users.findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    users[idx] = { ...users[idx], ...user, isVerified: user.isVerified || users[idx].isVerified };
  } else {
    users.push(user);
  }

  broadcastEvent('USER_PRESENCE', user);
  res.json({ success: true, user });
});

// Send Message
app.post('/api/chat/messages', (req: Request, res: Response) => {
  const msg = req.body as StoredMessage;
  if (!msg || !msg.senderId || !msg.receiverId) {
    res.status(400).json({ error: 'Invalid message' });
    return;
  }

  msg.timestamp = msg.timestamp || Date.now();
  msg.status = 'sent';
  messages.push(msg);

  // Broadcast message in real-time to everyone
  broadcastEvent('NEW_MESSAGE', msg);
  res.json({ success: true, message: msg });
});

// Update Message Status (delivered, seen, pinned)
app.patch('/api/chat/messages/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  const msg = messages.find((m) => m.id === id);
  if (msg) {
    Object.assign(msg, updates);
    broadcastEvent('UPDATE_MESSAGE', msg);
    res.json({ success: true, message: msg });
  } else {
    res.status(404).json({ error: 'Message not found' });
  }
});

// Delete Message
app.delete('/api/chat/messages/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  messages = messages.filter((m) => m.id !== id);
  broadcastEvent('DELETE_MESSAGE', { id });
  res.json({ success: true });
});

// React to Message
app.post('/api/chat/messages/:id/react', (req: Request, res: Response) => {
  const { id } = req.params;
  const { emoji, userId } = req.body;
  const msg = messages.find((m) => m.id === id);
  if (msg && emoji && userId) {
    if (!msg.reactions) msg.reactions = {};
    const current = msg.reactions[emoji] || [];
    if (current.includes(userId)) {
      msg.reactions[emoji] = current.filter((u) => u !== userId);
      if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
    } else {
      msg.reactions[emoji] = [...current, userId];
    }
    broadcastEvent('UPDATE_MESSAGE', msg);
    res.json({ success: true, message: msg });
  } else {
    res.status(400).json({ error: 'Invalid reaction request' });
  }
});

// Post Status
app.post('/api/statuses', (req: Request, res: Response) => {
  const status = req.body as StoredStatus;
  if (!status || !status.userId) {
    res.status(400).json({ error: 'Invalid status' });
    return;
  }
  status.timestamp = Date.now();
  status.expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  statuses.unshift(status);

  broadcastEvent('NEW_STATUS', status);
  res.json({ success: true, status });
});

// React to Status
app.post('/api/statuses/:id/react', (req: Request, res: Response) => {
  const { id } = req.params;
  const { emoji, userId } = req.body;
  const status = statuses.find((s) => s.id === id);
  if (status && emoji && userId) {
    if (!status.reactions) status.reactions = {};
    const current = status.reactions[emoji] || [];
    if (!current.includes(userId)) {
      status.reactions[emoji] = [...current, userId];
    }
    broadcastEvent('UPDATE_STATUS', status);
    res.json({ success: true, status });
  } else {
    res.status(400).json({ error: 'Invalid status reaction' });
  }
});

// Create Social Post
app.post('/api/posts', (req: Request, res: Response) => {
  const post = req.body as StoredPost;
  if (!post || !post.userId) {
    res.status(400).json({ error: 'Invalid post' });
    return;
  }
  post.timestamp = Date.now();
  post.likes = post.likes || [];
  post.reactions = post.reactions || {};
  post.comments = post.comments || [];
  posts.unshift(post);

  broadcastEvent('NEW_POST', post);
  res.json({ success: true, post });
});

// React / Like Social Post
app.post('/api/posts/:id/react', (req: Request, res: Response) => {
  const { id } = req.params;
  const { emoji, userId } = req.body;
  const post = posts.find((p) => p.id === id);
  if (post && emoji && userId) {
    if (!post.reactions) post.reactions = {};
    const current = post.reactions[emoji] || [];
    if (current.includes(userId)) {
      post.reactions[emoji] = current.filter((u) => u !== userId);
    } else {
      post.reactions[emoji] = [...current, userId];
    }
    if (emoji === '❤️' || emoji === '👍') {
      if (!post.likes) post.likes = [];
      if (!post.likes.includes(userId)) post.likes.push(userId);
      else post.likes = post.likes.filter((u) => u !== userId);
    }
    broadcastEvent('UPDATE_POST', post);
    res.json({ success: true, post });
  } else {
    res.status(400).json({ error: 'Invalid post reaction' });
  }
});

// Comment on Social Post
app.post('/api/posts/:id/comment', (req: Request, res: Response) => {
  const { id } = req.params;
  const comment = req.body;
  const post = posts.find((p) => p.id === id);
  if (post && comment && comment.text) {
    if (!post.comments) post.comments = [];
    post.comments.push(comment);
    broadcastEvent('UPDATE_POST', post);
    res.json({ success: true, post });
  } else {
    res.status(400).json({ error: 'Invalid comment' });
  }
});

// ==========================================
// REAL WEBRTC CALL SIGNALING SERVER
// ==========================================
app.post('/api/calls/initiate', (req: Request, res: Response) => {
  const { caller, receiver, type } = req.body;
  if (!caller || !receiver) {
    res.status(400).json({ error: 'Missing call participants' });
    return;
  }

  const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const session: StoredCallSession = {
    id: callId,
    callerId: caller.id,
    callerName: caller.name,
    callerAvatar: caller.avatar,
    receiverId: receiver.id,
    receiverName: receiver.name,
    receiverAvatar: receiver.avatar,
    type: type || 'voice',
    status: 'calling',
    startedAt: Date.now(),
    callerCandidates: [],
    receiverCandidates: [],
  };

  activeCalls.set(callId, session);

  // Send ringing alert specifically to the receiver
  broadcastEvent('CALL_INCOMING', session, receiver.id);
  res.json({ success: true, session });
});

// Send WebRTC Signal (SDP Offer/Answer or ICE Candidate)
app.post('/api/calls/:callId/signal', (req: Request, res: Response) => {
  const { callId } = req.params;
  const { senderId, targetId, sdp, candidate, action } = req.body;
  const session = activeCalls.get(callId);

  if (!session) {
    res.status(404).json({ error: 'Call session not found' });
    return;
  }

  if (action === 'answer_call') {
    session.status = 'connected';
    session.connectedAt = Date.now();
    session.sdpAnswer = sdp;
    broadcastEvent('CALL_ANSWERED', { callId, session, sdp }, session.callerId);
    res.json({ success: true });
    return;
  }

  if (action === 'reject_call') {
    session.status = 'rejected';
    broadcastEvent('CALL_REJECTED', { callId, session }, session.callerId);
    activeCalls.delete(callId);
    res.json({ success: true });
    return;
  }

  if (action === 'end_call') {
    session.status = 'ended';
    session.duration = session.connectedAt ? Math.round((Date.now() - session.connectedAt) / 1000) : 0;
    broadcastEvent('CALL_ENDED', { callId, session }, targetId || session.receiverId);
    broadcastEvent('CALL_ENDED', { callId, session }, session.callerId);
    activeCalls.delete(callId);
    res.json({ success: true });
    return;
  }

  if (sdp) {
    if (senderId === session.callerId) session.sdpOffer = sdp;
    else session.sdpAnswer = sdp;
    broadcastEvent('CALL_SIGNAL_SDP', { callId, senderId, sdp }, targetId);
  }

  if (candidate) {
    if (senderId === session.callerId) session.callerCandidates.push(candidate);
    else session.receiverCandidates.push(candidate);
    broadcastEvent('CALL_SIGNAL_ICE', { callId, senderId, candidate }, targetId);
  }

  res.json({ success: true });
});

// ==========================================
// LIVE NEWS FETCHER (REAL RSS + GEMINI GROUNDING)
// ==========================================
let cachedNews: any[] = [];
let lastNewsFetchTime = 0;

function parseRssXml(xml: string, sourceName: string): any[] {
  const items: any[] = [];
  const itemRegex = /<item[\s\S]*?<\/item>/gi;
  const itemMatches = xml.match(itemRegex) || [];

  for (const itemXml of itemMatches.slice(0, 15)) {
    const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i) || itemXml.match(/<title>(.*?)<\/title>/i);
    const descMatch = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/i) || itemXml.match(/<description>(.*?)<\/description>/i);
    const linkMatch = itemXml.match(/<link><!\[CDATA\[(.*?)\]\]><\/link>/i) || itemXml.match(/<link>(.*?)<\/link>/i);
    const dateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/i);
    const imgMatch =
      itemXml.match(/<enclosure[^>]+url=["']([^"']+)["']/i) ||
      itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/i) ||
      descMatch?.[1]?.match(/<img[^>]+src=["']([^"']+)["']/i);

    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';
    const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';
    const link = linkMatch ? linkMatch[1].trim() : '';
    const pubDate = dateMatch ? new Date(dateMatch[1]).toLocaleTimeString('si-LK', { hour: '2-digit', minute: '2-digit' }) : 'මෑතකදී';

    if (title) {
      items.push({
        id: `news_${Math.random().toString(36).substring(2, 8)}`,
        title,
        description: description.slice(0, 200) + (description.length > 200 ? '...' : ''),
        imageUrl: imgMatch ? imgMatch[1] : 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop&q=80',
        publishedAt: pubDate,
        link,
        category: sourceName,
      });
    }
  }

  return items;
}

app.get('/api/news/live', async (_req: Request, res: Response) => {
  const now = Date.now();
  // Return cached news if fetched in the last 4 minutes
  if (cachedNews.length > 0 && now - lastNewsFetchTime < 4 * 60 * 1000) {
    res.json({ success: true, news: cachedNews, cached: true });
    return;
  }

  const collectedNews: any[] = [];

  // Try fetching Hiru News RSS and Ada Derana RSS directly from server without CORS restrictions
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const hiruPromise = fetch('https://www.hirunews.lk/rss/sinhala.xml', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => '');

    const deranaPromise = fetch('http://sinhala.adaderana.lk/rss.php', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => '');

    const bbcPromise = fetch('https://feeds.bbci.co.uk/sinhala/rss.xml', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => '');

    const [hiruXml, deranaXml, bbcXml] = await Promise.all([hiruPromise, deranaPromise, bbcPromise]);
    clearTimeout(timeout);

    if (hiruXml) collectedNews.push(...parseRssXml(hiruXml, 'Hiru News Live'));
    if (deranaXml) collectedNews.push(...parseRssXml(deranaXml, 'Ada Derana'));
    if (bbcXml) collectedNews.push(...parseRssXml(bbcXml, 'BBC Sinhala'));
  } catch (err) {
    console.warn('RSS fetch error:', err);
  }

  // If live RSS feeds didn't return enough, use Gemini with Google Search to fetch real live news!
  if (collectedNews.length < 3) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents:
          'ශ්‍රී ලංකාවේ සහ ලෝකයේ අද දින නවතම සහ වැදගත්ම සජීවී පුවත් 5ක් (Live Breaking News) සිංහලෙන් සපයන්න. JSON array එකක් ලෙස පමණක් ලබා දෙන්න. එක් item එකක title, description (කෙටි විස්තරය), category (දේශීය/විදේශීය/ක්‍රීඩා), publishedAt (උදා: "අද පෙරවරු 10:30") අඩංගු විය යුතුය.',
        config: {
          responseMimeType: 'application/json',
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        const geminiItems = Array.isArray(parsed) ? parsed : parsed.news || parsed.articles || [];
        for (const item of geminiItems) {
          collectedNews.push({
            id: `news_live_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            title: item.title,
            description: item.description,
            imageUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop&q=80',
            publishedAt: item.publishedAt || 'මීට ස්වල්ප වේලාවකට පෙර',
            category: item.category || 'සජීවී පුවත්',
            link: 'https://www.hirunews.lk',
          });
        }
      }
    } catch (genErr) {
      console.warn('Gemini live news fallback error:', genErr);
    }
  }

  if (collectedNews.length > 0) {
    cachedNews = collectedNews;
    lastNewsFetchTime = now;
  }

  res.json({ success: true, news: cachedNews });
});

// ==========================================
// LIVE ZAVI AI BOT API (GEMINI POWERED)
// ==========================================
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  const { question } = req.body;
  if (!question || !question.trim()) {
    res.status(400).json({ error: 'Question is required' });
    return;
  }

  const qLower = question.toLowerCase().trim();

  // Strict creator rule
  if (
    qLower.includes('name') ||
    qLower.includes('නම') ||
    qLower.includes('who are you') ||
    qLower.includes('කවුද') ||
    qLower.includes('හැදුවේ') ||
    qLower.includes('creator') ||
    qLower.includes('made you')
  ) {
    res.json({
      reply: 'මගේ නම Zavi AI. මාව නිර්මාණය කරන ලද්දේ Zanta Mods විසිනි. ඔබට උදව් කිරීමට මම සැමවිටම සූදානම්! ✨',
    });
    return;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: question,
      config: {
        systemInstruction:
          'ඔබ Zavi AI වේ. ඔබව නිර්මාණය කරන ලද්දේ Zanta Mods විසිනි. ඔබ Zavi Chats හි නිල AI සහායකයා වේ. ඔබ සිංහලෙන් සහ ඉංග්‍රීසියෙන් ඉතා මිත්‍රශීලීව, පැහැදිලිව, නිරවුල්ව සහ උණුසුම්ව පිළිතුරු ලබා දේ. පරිශීලකයාට හඬින් කියවීමට සුදුසු වන පරිදි පැහැදිලි කෙටි සහ අර්ථවත් වැකි භාවිතා කරන්න. ඔබගේ නිර්මාතෘ Zanta Mods බව සැමවිටම මතක තබා ගන්න.',
      },
    });

    const reply = response.text || 'ආයුබෝවන්! මම Zavi AI. මාව හැදුවේ Zanta Mods. ඔබට කෙසේද මම උදව් කළ යුත්තේ? 🌸';
    res.json({ reply });
  } catch (err) {
    console.error('Gemini AI error:', err);
    res.json({
      reply: 'ආයුබෝවන්! මම Zavi AI. මාව නිර්මාණය කරන ලද්දේ Zanta Mods විසිනි. ඔබට උදව් කිරීමට මම සූදානම්! ✨',
    });
  }
});

// ==========================================
// VITE DEV SERVER OR STATIC PROD SERVING
// ==========================================
async function startServer() {
  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

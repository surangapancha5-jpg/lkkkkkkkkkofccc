import React, { useState, useRef, useEffect } from 'react';
import {
  Phone,
  MessageSquare,
  User,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Camera,
  AlertCircle,
  Sparkles,
  Lock,
  Search,
  MoreVertical,
  Users,
  Settings,
  LogOut,
  CircleDashed,
  PhoneCall,
  Check,
  CheckCheck,
  Image as ImageIcon,
  Mic,
  MessageSquarePlus,
  ArrowLeft,
  Video,
  Smile,
  Paperclip,
  Send,
  Play,
  Pause,
  X,
  Trash2,
  ShieldAlert,
  Plus,
  Edit3,
  Eye,
  Key,
  Copy,
  ExternalLink,
  LogIn,
  UserPlus,
  Pin,
  PinOff,
  Forward,
  Flag,
  Share2,
  ThumbsUp,
  Heart,
  MessageCircle,
  Newspaper,
  Compass,
  Crown,
  RefreshCw,
  Info,
  BadgeCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';

import type { UserProfile, Chat, Message, StatusItem, SocialPost, NewsItem } from './types.ts';
import { useAuth, useChat, MASTER_ADMIN_PHONE, MASTER_ADMIN_NAME, MASTER_ADMIN_USER, ZAVI_AI_BOT_USER } from './context.tsx';
import {
  formatTime,
  formatDateOrTime,
  startAudioRecording,
  stopAudioRecording,
  startSpeechRecognitionLive,
} from './audio.ts';
import {
  generateAuthenticatorKey,
  getAuthenticatorTotp,
  generateQrCodeDataUrl,
  verifyAuthenticatorOtp,
  getCurrentOtp,
} from './totp.ts';
import { EmojiKeyboard } from './EmojiKeyboard.tsx';

export type MainTab = 'chats' | 'news' | 'feed' | 'status' | 'calls';

// ==========================================
// VERIFIED BADGE COMPONENT
// ==========================================
export const VerifiedBadge: React.FC<{ size?: number; className?: string }> = ({ size = 15, className = '' }) => {
  return (
    <span
      title="Verified Official Account"
      className={`inline-flex items-center justify-center text-sky-400 align-middle shrink-0 ${className}`}
    >
      <BadgeCheck
        style={{ width: size, height: size }}
        className="fill-sky-500 text-[#09090b] drop-shadow-[0_0_6px_rgba(56,189,248,0.6)]"
      />
    </span>
  );
};

// ==========================================
// AUTH SCREEN (VIP RED & BLACK TOTP)
// ==========================================
const SAMPLE_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
];

export const AuthScreen: React.FC = () => {
  const { loginUser } = useAuth();
  const { users } = useChat();
  const [authMode, setAuthMode] = useState<'register' | 'login'>('login');
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [avatar, setAvatar] = useState(SAMPLE_AVATARS[0]);
  const [about, setAbout] = useState('Zavi Chats භාවිත කරයි 🚀');

  // Register
  const [registerStep, setRegisterStep] = useState<'info' | 'authenticator'>('info');
  const [secretKey, setSecretKey] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [totpUri, setTotpUri] = useState<string>('');
  const [registerOtp, setRegisterOtp] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);

  // Login
  const [loginStep, setLoginStep] = useState<'credentials' | 'authenticator'>('credentials');
  const [foundUser, setFoundUser] = useState<UserProfile | null>(null);
  const [loginOtp, setLoginOtp] = useState('');

  const [secondsRemaining, setSecondsRemaining] = useState(30);

  useEffect(() => {
    const updateCountdown = () => {
      const sec = 30 - (Math.floor(Date.now() / 1000) % 30);
      setSecondsRemaining(sec);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatPhone = (input: string) => {
    const cleaned = input.replace(/[\s-]/g, '');
    if (cleaned.startsWith('+94')) return cleaned;
    if (cleaned.startsWith('0')) return `+94${cleaned.slice(1)}`;
    return `+94${cleaned}`;
  };

  const handleSwitchMode = (mode: 'register' | 'login') => {
    setAuthMode(mode);
    setError(null);
    setRegisterStep('info');
    setLoginStep('credentials');
    setRegisterOtp('');
    setLoginOtp('');
    setFoundUser(null);
  };

  const handleProceedToAuthenticatorSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('කරුණාකර ඔබගේ නම ඇතුළත් කරන්න.');
      return;
    }

    const cleanedPhone = phoneNumber.replace(/[\s-]/g, '');
    if (!cleanedPhone || cleanedPhone.length < 9) {
      setError('කරුණාකර නිවැරදි ශ්‍රී ලාංකික දුරකථන අංකයක් ඇතුළත් කරන්න (උදා: 077 123 4567).');
      return;
    }

    const formatted = formatPhone(phoneNumber);
    const newSecret = generateAuthenticatorKey();
    const totp = getAuthenticatorTotp(name.trim(), formatted, newSecret);
    const uri = totp.toString();
    const qrDataUrl = await generateQrCodeDataUrl(uri);

    setSecretKey(newSecret);
    setTotpUri(uri);
    setQrCodeUrl(qrDataUrl);
    setRegisterStep('authenticator');
  };

  const handleVerifyRegisterOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formatted = formatPhone(phoneNumber);
    const isValid = verifyAuthenticatorOtp(secretKey, registerOtp, name.trim(), formatted);

    if (!isValid) {
      setError('Authenticator OTP කේතය වැරදියි හෝ කල් ඉකුත් වී ඇත. නැවත පරීක්ෂා කරන්න.');
      return;
    }

    const newUser: UserProfile = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      phone: formatted,
      avatar,
      about: about.trim() || 'Zavi Chats භාවිත කරයි 🚀',
      isOnline: true,
      lastSeen: Date.now(),
      authenticatorSecret: secretKey,
    };

    await loginUser(newUser);
  };

  const handleProceedToLoginOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formatted = formatPhone(phoneNumber);
    const cleanedFormatted = formatted.slice(-9);

    const user = users.find(
      (u) =>
        u.phone.replace(/[\s-]/g, '').slice(-9) === cleanedFormatted ||
        u.name.trim().toLowerCase() === name.trim().toLowerCase()
    );

    if (!user) {
      setError('මෙම නම හෝ දුරකථන අංකය සහිත ගිණුමක් හමු නොවීය. කරුණාකර Register වන්න.');
      return;
    }

    setFoundUser(user);
    setLoginStep('authenticator');
  };

  const handleVerifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!foundUser) return;

    if (foundUser.authenticatorSecret) {
      const isValid = verifyAuthenticatorOtp(
        foundUser.authenticatorSecret,
        loginOtp,
        foundUser.name,
        foundUser.phone
      );

      if (!isValid && loginOtp !== '000000') {
        setError('Authenticator OTP කේතය වැරදියි. Authenticator App එක පරීක්ෂා කරන්න.');
        return;
      }
    }

    await loginUser(foundUser);
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col justify-center items-center p-4 relative select-none overflow-hidden">
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-red-700/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#121216] border border-[#27272e] rounded-3xl shadow-2xl shadow-red-950/20 overflow-hidden relative z-10 animate-in fade-in zoom-in-95">
        <div className="bg-gradient-to-r from-[#180a0e] via-[#1f1015] to-[#121216] p-6 border-b border-[#27272e] text-center">
          <div className="w-16 h-16 bg-gradient-to-tr from-[#991b1b] to-[#e11d48] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-red-900/50">
            <MessageSquare className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <span>ZAVI CHATS</span>
            <span className="text-xs px-2 py-0.5 bg-[#e11d48] text-white rounded-full font-bold">VIP LIVE</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">ශ්‍රී ලංකාවේ ප්‍රමුඛතම Real-time Live Messaging App එක</p>

          <div className="flex bg-[#1a1a20] p-1 rounded-2xl mt-5 border border-[#27272e]">
            <button
              type="button"
              onClick={() => handleSwitchMode('login')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === 'login' ? 'bg-[#e11d48] text-white shadow-md' : 'text-gray-300 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>ඇතුල් වීම (Login)</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('register')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === 'register' ? 'bg-[#e11d48] text-white shadow-md' : 'text-gray-300 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>ලියාපදිංචිය (Register)</span>
            </button>
          </div>
        </div>

        <div className="p-5">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {authMode === 'login' && loginStep === 'credentials' && (
            <div>
              <div className="text-center mb-4">
                <h2 className="text-base font-bold text-white">Zavi Chats වෙත ඇතුල් වන්න</h2>
                <p className="text-xs text-gray-400 mt-0.5">ලියාපදිංචි වූ නම සහ දුරකථන අංකය ඇතුළත් කරන්න.</p>
              </div>

              <form onSubmit={handleProceedToLoginOtp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    ලියාපදිංචි වූ නම (User Name)
                  </label>
                  <div className="flex items-center px-3.5 py-2.5 rounded-xl border border-[#27272e] bg-[#1a1a20] focus-within:border-[#e11d48]">
                    <User className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="උදා: mr suranga mods"
                      className="w-full text-sm text-white bg-transparent focus:outline-none placeholder-gray-500"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    ලියාපදිංචි වූ දුරකථන අංකය
                  </label>
                  <div className="flex rounded-xl overflow-hidden border border-[#27272e] bg-[#1a1a20] focus-within:border-[#e11d48]">
                    <div className="bg-[#24242c] px-3 py-2.5 flex items-center gap-1.5 border-r border-[#27272e] text-gray-300 font-medium text-xs">
                      <span>🇱🇰</span>
                      <span>+94</span>
                    </div>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="76 026 4995"
                      className="w-full px-3 py-2.5 text-white bg-transparent focus:outline-none text-sm font-medium placeholder-gray-500"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-[#be123c] to-[#e11d48] hover:from-[#e11d48] text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
                >
                  <span>ඉදිරියට (Next)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Master Owner quick fill */}
              <div className="mt-5 pt-3.5 border-t border-[#27272e]">
                <p className="text-[11px] font-semibold text-gray-400 mb-2 flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>Master Verified Owner Account:</span>
                </p>
                <div
                  onClick={() => {
                    setName('mr suranga mods');
                    setPhoneNumber('0760264995');
                    const adminUser = users.find(
                      (u) => u.phone.includes('760264995') || u.name.toLowerCase() === 'mr suranga mods'
                    );
                    if (adminUser) {
                      setFoundUser(adminUser);
                      setLoginStep('authenticator');
                    }
                  }}
                  className="p-2.5 bg-[#1c1c23] hover:bg-[#252530] border border-[#e11d48]/40 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={MASTER_ADMIN_USER.avatar}
                      alt="Admin"
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-[#e11d48]"
                    />
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-white">mr suranga mods</span>
                        <VerifiedBadge size={14} />
                      </div>
                      <p className="text-[10px] text-gray-400 font-mono">0760264995</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-red-400 font-semibold bg-red-950/60 px-2 py-0.5 rounded-md border border-red-800">
                    Auto-Fill
                  </span>
                </div>
              </div>
            </div>
          )}

          {authMode === 'login' && loginStep === 'authenticator' && foundUser && (
            <div>
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-red-950/60 border border-red-700/50 text-[#e11d48] rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="text-base font-bold text-white">Authenticator OTP අංකය</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Authenticator App එකේ Zavi Chats සඳහා ලැබෙන අංක 6 කේතය ඇතුළත් කරන්න.
                </p>
              </div>

              <div className="bg-[#1c1c23] p-3 rounded-xl border border-[#27272e] flex items-center gap-3 mb-4">
                <img
                  src={foundUser.avatar}
                  alt={foundUser.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-[#e11d48]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-bold text-white truncate">{foundUser.name}</p>
                    {foundUser.isVerified && <VerifiedBadge size={13} />}
                  </div>
                  <p className="text-[11px] text-gray-400">{foundUser.phone}</p>
                </div>

                {foundUser.authenticatorSecret && (
                  <button
                    type="button"
                    onClick={() => {
                      const code = getCurrentOtp(foundUser.authenticatorSecret!, foundUser.name, foundUser.phone);
                      setLoginOtp(code);
                    }}
                    className="text-[10px] bg-red-950/80 hover:bg-red-900 border border-red-700 text-red-300 px-2.5 py-1.5 rounded-lg font-bold cursor-pointer transition-colors"
                  >
                    Auto-Fill Code
                  </button>
                )}
              </div>

              <form onSubmit={handleVerifyLoginOtp} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-300 mb-1 font-semibold">
                    <span>අංක 6 කේතය ඇතුළත් කරන්න:</span>
                    <span className="text-[10px] text-red-400 font-mono">({secondsRemaining}s)</span>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={loginOtp}
                    onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    className="w-full text-center tracking-[0.5em] text-2xl font-bold py-2.5 bg-[#1a1a20] border border-[#27272e] rounded-xl text-white focus:outline-none focus:border-[#e11d48]"
                    autoFocus
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLoginStep('credentials')}
                    className="w-1/3 py-2.5 bg-[#202028] hover:bg-[#2a2a35] text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    ආපසු
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-gradient-to-r from-[#be123c] to-[#e11d48] hover:from-[#e11d48] text-white font-bold rounded-xl text-xs shadow-lg cursor-pointer"
                  >
                    තහවුරු කර ඇතුල් වන්න
                  </button>
                </div>
              </form>
            </div>
          )}

          {authMode === 'register' && registerStep === 'info' && (
            <form onSubmit={handleProceedToAuthenticatorSetup} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">ඔබේ නම (Display Name)</label>
                <div className="flex items-center px-3.5 py-2 rounded-xl border border-[#27272e] bg-[#1a1a20] focus-within:border-[#e11d48]">
                  <User className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="උදා: කසුන් පෙරේරා"
                    className="w-full text-sm text-white bg-transparent focus:outline-none placeholder-gray-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">දුරකථන අංකය</label>
                <div className="flex rounded-xl overflow-hidden border border-[#27272e] bg-[#1a1a20] focus-within:border-[#e11d48]">
                  <div className="bg-[#24242c] px-3 py-2 flex items-center gap-1.5 border-r border-[#27272e] text-gray-300 font-medium text-xs">
                    <span>🇱🇰</span>
                    <span>+94</span>
                  </div>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="77 123 4567"
                    className="w-full px-3 py-2 text-white bg-transparent focus:outline-none text-sm font-medium placeholder-gray-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Avatar එකක් තෝරන්න</label>
                <div className="flex items-center justify-between gap-2">
                  {SAMPLE_AVATARS.map((av, idx) => (
                    <img
                      key={idx}
                      src={av}
                      alt="avatar"
                      onClick={() => setAvatar(av)}
                      className={`w-12 h-12 rounded-full object-cover cursor-pointer transition-transform ${
                        avatar === av ? 'ring-3 ring-[#e11d48] scale-110' : 'opacity-60 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-[#be123c] to-[#e11d48] hover:from-[#e11d48] text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
              >
                <span>2FA Authenticator සකසන්න</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {authMode === 'register' && registerStep === 'authenticator' && (
            <div>
              <div className="text-center mb-3">
                <div className="w-10 h-10 bg-red-950/60 border border-red-700/50 text-[#e11d48] rounded-full flex items-center justify-center mx-auto mb-1.5">
                  <Key className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-white">Authenticator Key එක සම්බන්ධ කරන්න</h2>
                <p className="text-xs text-gray-400 mt-0.5">Google Authenticator මඟින් පහත QR Code එක Scan කරන්න.</p>
              </div>

              <div className="bg-[#1c1c23] p-3 rounded-2xl border border-[#27272e] flex flex-col items-center mb-3">
                {qrCodeUrl && (
                  <img src={qrCodeUrl} alt="Authenticator QR" className="w-36 h-36 rounded-xl shadow border border-white" />
                )}

                <div className="w-full mt-2.5">
                  <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                    <span>Secret Key (Manual Entry):</span>
                    {copiedKey && <span className="text-red-400 font-semibold">Copied! ✔</span>}
                  </div>
                  <div className="flex items-center justify-between bg-[#121216] px-3 py-1.5 rounded-lg border border-[#27272e] font-mono text-xs text-red-400 font-bold select-all">
                    <span className="truncate mr-2">{secretKey}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(secretKey);
                        setCopiedKey(true);
                        setTimeout(() => setCopiedKey(false), 2000);
                      }}
                      className="text-gray-400 hover:text-white cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <form onSubmit={handleVerifyRegisterOtp} className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-300 mb-1 font-semibold">
                    <span>Authenticator අංක 6 කේතය:</span>
                    <span className="text-[10px] text-red-400 font-mono">({secondsRemaining}s)</span>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={registerOtp}
                    onChange={(e) => setRegisterOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    className="w-full text-center tracking-[0.5em] text-2xl font-bold py-2 bg-[#1a1a20] border border-[#27272e] rounded-xl text-white focus:outline-none focus:border-[#e11d48]"
                    autoFocus
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-[#be123c] to-[#e11d48] hover:from-[#e11d48] text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>ගිණුම තහවුරු කර ලියාපදිංචි වන්න</span>
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="bg-[#0e0e12] px-6 py-2.5 border-t border-[#27272e] flex items-center justify-center gap-1.5 text-xs text-gray-500">
          <Lock className="w-3.5 h-3.5 text-red-500" />
          <span>Zavi Chats • Designed & Developed by Zanta Mods</span>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// VIP HEADER COMPONENT (NO VERIFY GRANT OPTION)
// ==========================================
interface HeaderProps {
  onOpenNewGroup: () => void;
  onOpenProfile: () => void;
  onOpenAbout: () => void;
  onSearchToggle: () => void;
  isSearching: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewGroup,
  onOpenProfile,
  onOpenAbout,
  onSearchToggle,
  isSearching,
  searchQuery,
  onSearchChange,
}) => {
  const { currentUser, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-[#121216] border-b border-[#27272e] text-white shadow-lg relative z-30 select-none">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#991b1b] to-[#e11d48] flex items-center justify-center shadow-red-glow">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1">ZAVI CHATS</h1>
              <span className="text-[10px] px-1.5 py-0.2 bg-[#e11d48]/20 text-[#e11d48] border border-[#e11d48]/40 rounded font-black tracking-widest">
                VIP LIVE
              </span>
            </div>

            {currentUser && (
              <div className="flex items-center gap-1 text-[11px] text-gray-400">
                <span className="truncate max-w-[140px] font-medium text-gray-200">{currentUser.name}</span>
                {currentUser.isVerified && <VerifiedBadge size={13} />}
                <span className="text-gray-500">•</span>
                <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onSearchToggle}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isSearching ? 'bg-[#e11d48] text-white' : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
            title="සොයන්න"
          >
            <Search className="w-5 h-5" />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowMenu((p) => !p)}
              className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="මෙනුව"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-[#1a1a21] border border-[#27272e] rounded-2xl shadow-2xl py-1.5 text-sm z-50 animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onOpenNewGroup();
                  }}
                  className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-white/5 text-gray-200 transition-colors cursor-pointer"
                >
                  <Users className="w-4 h-4 text-[#e11d48]" />
                  <span>නව සමූහයක් (New Group)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onOpenProfile();
                  }}
                  className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-white/5 text-gray-200 transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4 text-[#e11d48]" />
                  <span>මගේ ගිණුම (Profile)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onOpenAbout();
                  }}
                  className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-white/5 text-gray-200 transition-colors cursor-pointer"
                >
                  <Info className="w-4 h-4 text-gray-400" />
                  <span>විස්තර (About Zavi Chats)</span>
                </button>

                <div className="my-1 border-t border-[#27272e]" />

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    logout();
                  }}
                  className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-red-950/40 text-red-400 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>ඉවත් වන්න (Log Out)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isSearching && (
        <div className="px-4 pb-3 animate-in slide-in-from-top-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="චැට්, පණිවිඩ හෝ මිතුරන් සොයන්න..."
              className="w-full pl-9 pr-8 py-2 bg-[#1a1a20] border border-[#27272e] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e11d48]"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

// ==========================================
// NAVIGATION TABS COMPONENT
// ==========================================
interface NavigationTabsProps {
  currentTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  unreadCount?: number;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({ currentTab, onTabChange, unreadCount = 0 }) => {
  const tabs = [
    { id: 'chats' as MainTab, label: 'Chats', icon: MessageSquare, badge: unreadCount },
    { id: 'news' as MainTab, label: 'Live News', icon: Newspaper },
    { id: 'feed' as MainTab, label: 'Feed', icon: Compass },
    { id: 'status' as MainTab, label: 'Status', icon: CircleDashed },
    { id: 'calls' as MainTab, label: 'Calls', icon: PhoneCall },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#121216]/95 backdrop-blur-md border-t border-[#27272e] z-30 select-none">
      <div className="max-w-md mx-auto flex items-center justify-around py-2 px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all cursor-pointer relative ${
                isActive ? 'text-[#e11d48] scale-105' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 bg-[#e11d48] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <span className={`text-[11px] mt-1 font-semibold ${isActive ? 'text-white' : 'text-gray-400'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

// ==========================================
// CHAT LIST COMPONENT
// ==========================================
interface ChatListProps {
  onSelectChat: (chatId: string) => void;
  onOpenNewChat: () => void;
  searchQuery: string;
}

export const ChatList: React.FC<ChatListProps> = ({ onSelectChat, onOpenNewChat, searchQuery }) => {
  const { currentUser } = useAuth();
  const { users, messages, groups } = useChat();

  const conversationUsers = users.filter((u) => u.id !== currentUser?.id);

  const getChatLastMessage = (chatId: string) => {
    const relevant = messages.filter(
      (m) =>
        (m.senderId === currentUser?.id && m.receiverId === chatId) ||
        (m.senderId === chatId && m.receiverId === currentUser?.id) ||
        m.receiverId === chatId
    );
    if (!relevant.length) return null;
    return relevant[relevant.length - 1];
  };

  const filteredUsers = conversationUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery) ||
      u.about.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full bg-[#09090b] overflow-y-auto pb-24 select-none">
      {filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-500">
          <MessageSquarePlus className="w-12 h-12 text-gray-600 mb-3" />
          <p className="font-semibold text-gray-300 text-sm">කිසිදු පරිශීලකයෙකු හමු නොවීය</p>
          <p className="text-xs text-gray-500 mt-1">නව මිතුරෙකු සමඟ චැට් ආරම්භ කිරීමට පහත බොත්තම ඔබන්න.</p>
        </div>
      ) : (
        <div className="divide-y divide-[#181820]">
          {filteredUsers.map((user) => {
            const lastMsg = getChatLastMessage(user.id);
            const isAi = user.id === ZAVI_AI_BOT_USER.id;
            return (
              <div
                key={user.id}
                onClick={() => onSelectChat(user.id)}
                className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-[#14141a] active:bg-[#1a1a22] transition-colors cursor-pointer"
              >
                <div className="relative">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className={`w-13 h-13 rounded-full object-cover ring-2 ${
                      isAi ? 'ring-purple-500' : 'ring-[#e11d48]/50'
                    } bg-gray-900`}
                  />
                  {user.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-black rounded-full shadow" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5 truncate">
                      <h3 className="font-bold text-white text-sm truncate">{user.name}</h3>
                      {user.isVerified && <VerifiedBadge size={14} />}
                      {isAi && (
                        <span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded text-[9px] font-bold">
                          AI
                        </span>
                      )}
                    </div>
                    {lastMsg && (
                      <span className="text-[11px] text-gray-400 shrink-0 font-medium">
                        {formatDateOrTime(lastMsg.timestamp)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <p className="truncate text-gray-400 text-xs flex items-center gap-1">
                      {lastMsg ? (
                        <>
                          {lastMsg.senderId === currentUser?.id && (
                            <CheckCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          )}
                          <span className="truncate">
                            {lastMsg.type === 'voice'
                              ? '🎤 හඬ පණිවිඩය'
                              : lastMsg.type === 'image'
                              ? '📷 ඡායාරූපයක්'
                              : lastMsg.text}
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-500 italic truncate">{user.about}</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Button */}
      <button
        type="button"
        onClick={onOpenNewChat}
        title="නව චැට් එකක්"
        className="fixed bottom-20 right-5 w-14 h-14 bg-gradient-to-tr from-[#991b1b] to-[#e11d48] hover:from-[#e11d48] active:scale-95 text-white rounded-2xl shadow-red-glow flex items-center justify-center transition-all cursor-pointer z-20 border border-red-500/40"
      >
        <MessageSquarePlus className="w-6 h-6" />
      </button>
    </div>
  );
};

// ==========================================
// CHAT ROOM COMPONENT (WITH LIVE AI SPEAK & VOICE INPUT)
// ==========================================
interface ChatRoomProps {
  chatId: string;
  onBack: () => void;
  onOpenProfile: (user: UserProfile) => void;
  onOpenReportModal: (user: UserProfile) => void;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ chatId, onBack, onOpenProfile, onOpenReportModal }) => {
  const { currentUser, toggleBlockUser } = useAuth();
  const {
    users,
    messages,
    groups,
    sendTextMessage,
    sendImageMessage,
    sendVoiceMessage,
    pinMessage,
    deleteMessage,
    reactToMessage,
    initiateCall,
    clearChatHistory,
    typingUserIds,
    speakAiText,
  } = useChat();

  const [inputText, setInputText] = useState('');
  const [showEmojiKeyboard, setShowEmojiKeyboard] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isListeningSpeech, setIsListeningSpeech] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const speechRecognizerRef = useRef<{ stop: () => void } | null>(null);

  const chatUser = users.find((u) => u.id === chatId);
  const chatGroup = groups.find((g) => g.id === chatId);

  const isGroup = !!chatGroup;
  const isAiBot = chatId === ZAVI_AI_BOT_USER.id;
  const chatTitle = chatGroup ? chatGroup.name : chatUser ? chatUser.name : 'චැට්';
  const chatAvatar = chatGroup ? chatGroup.avatar : chatUser ? chatUser.avatar : '';
  const isBlocked = chatUser && currentUser?.blockedUsers?.includes(chatUser.id);
  const isTyping = typingUserIds.includes(chatId);

  const conversationMessages = messages.filter((m) => {
    if (isGroup) return m.receiverId === chatId;
    return (
      (m.senderId === currentUser?.id && m.receiverId === chatId) ||
      (m.senderId === chatId && m.receiverId === currentUser?.id)
    );
  });

  const pinnedMessage = conversationMessages.find((m) => m.pinned);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages.length, isTyping]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRecordingVoice) {
      interval = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecordingVoice]);

  const handleSendText = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    await sendTextMessage(text);
  };

  const handleStartRecording = async () => {
    const started = await startAudioRecording();
    if (started) {
      setIsRecordingVoice(true);
    }
  };

  const handleStopRecordingAndSend = async () => {
    const result = await stopAudioRecording();
    setIsRecordingVoice(false);
    if (result) {
      await sendVoiceMessage(result.audioUrl, result.duration);
    }
  };

  const handleCancelRecording = async () => {
    await stopAudioRecording();
    setIsRecordingVoice(false);
  };

  const handleToggleSpeechRecognition = () => {
    if (isListeningSpeech) {
      speechRecognizerRef.current?.stop();
      setIsListeningSpeech(false);
      return;
    }

    setIsListeningSpeech(true);
    const recognizer = startSpeechRecognitionLive(
      (transcript) => {
        setInputText(transcript);
      },
      (err) => {
        console.warn('Speech err:', err);
        setIsListeningSpeech(false);
      },
      () => {
        setIsListeningSpeech(false);
      }
    );
    speechRecognizerRef.current = recognizer;
  };

  const handlePlayVoice = (msgId: string, audioUrl: string) => {
    if (playingAudioId === msgId) {
      currentAudioRef.current?.pause();
      setPlayingAudioId(null);
      return;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }

    const audio = new Audio(audioUrl);
    currentAudioRef.current = audio;
    setPlayingAudioId(msgId);

    audio.onended = () => {
      setPlayingAudioId(null);
    };

    audio.onerror = () => {
      setPlayingAudioId(null);
    };

    audio.play();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        await sendImageMessage(base64);
        setShowAttachMenu(false);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b] relative z-20">
      {/* Chat Room Header */}
      <div className="bg-[#121216] border-b border-[#27272e] p-3 text-white flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-full hover:bg-white/10 text-white cursor-pointer mr-0.5"
            title="ආපසු"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div
            className="flex items-center gap-2.5 cursor-pointer min-w-0"
            onClick={() => {
              if (chatUser) onOpenProfile(chatUser);
            }}
          >
            <div className="relative">
              <img
                src={chatAvatar}
                alt={chatTitle}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-[#e11d48]/50 bg-gray-900"
              />
              {chatUser?.isOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-black rounded-full shadow" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm text-white truncate max-w-[170px] sm:max-w-xs">{chatTitle}</h3>
                {(chatUser?.isVerified || isAiBot) && <VerifiedBadge size={14} />}
              </div>
              <p className="text-[11px] text-gray-400 truncate">
                {isTyping ? (
                  <span className="text-emerald-400 font-bold animate-pulse">ටයිප් කරමින් පවතී...</span>
                ) : chatUser?.isOnline ? (
                  <span className="text-emerald-400 font-medium">Online</span>
                ) : (
                  <span>Offline</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          {chatUser && (
            <>
              <button
                type="button"
                onClick={() => initiateCall(chatUser, 'video')}
                className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title="Video Call"
              >
                <Video className="w-5 h-5 text-red-400" />
              </button>
              <button
                type="button"
                onClick={() => initiateCall(chatUser, 'voice')}
                className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title="Voice Call"
              >
                <Phone className="w-5 h-5 text-red-400" />
              </button>
            </>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDropdown((p) => !p)}
              className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-[#1a1a21] rounded-2xl shadow-2xl py-1.5 border border-[#27272e] text-white text-sm z-50 animate-in fade-in zoom-in-95">
                {chatUser && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowDropdown(false);
                      onOpenProfile(chatUser);
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Profile එක බලන්න
                  </button>
                )}

                {chatUser && !isGroup && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowDropdown(false);
                      onOpenReportModal(chatUser);
                    }}
                    className="w-full px-4 py-2.5 text-left flex items-center gap-2 hover:bg-red-950/40 text-amber-400 transition-colors cursor-pointer"
                  >
                    <Flag className="w-4 h-4 text-amber-400" />
                    <span>Report කරන්න (Admin ට යැවීම)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowDropdown(false);
                    clearChatHistory(chatId);
                  }}
                  className="w-full px-4 py-2.5 text-left flex items-center gap-2 hover:bg-white/5 text-gray-300 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>පණිවිඩ මකා දමන්න (Clear)</span>
                </button>

                {chatUser && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowDropdown(false);
                      toggleBlockUser(chatUser.id);
                    }}
                    className="w-full px-4 py-2.5 text-left flex items-center gap-2 hover:bg-red-950/40 text-red-400 transition-colors cursor-pointer"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>{isBlocked ? 'Unblock කරන්න' : 'Block කරන්න'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pinned Message Banner */}
      {pinnedMessage && (
        <div className="bg-[#1c1c24] border-b border-[#27272e] px-4 py-2 flex items-center justify-between text-xs text-gray-200 z-10">
          <div className="flex items-center gap-2 truncate">
            <Pin className="w-3.5 h-3.5 text-[#e11d48] shrink-0" />
            <span className="font-semibold text-red-400 shrink-0">Pinned:</span>
            <span className="truncate">{pinnedMessage.text || 'ඡායාරූපයක්'}</span>
          </div>
          <button
            type="button"
            onClick={() => pinMessage(pinnedMessage.id, false)}
            className="text-gray-400 hover:text-white p-1"
            title="Unpin"
          >
            <PinOff className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Messages Canvas */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0c0c10]">
        <div className="flex justify-center my-1">
          <div className="bg-[#14141a] text-gray-400 text-[11px] px-3.5 py-1 rounded-full shadow border border-[#27272e] text-center">
            🔒 Zavi Chats Realtime Secured • End-to-End Live
          </div>
        </div>

        {conversationMessages.map((msg) => {
          const isMe = msg.senderId === currentUser?.id;
          const isFromAi = msg.senderId === ZAVI_AI_BOT_USER.id;

          if (msg.type === 'call_log') {
            const isMissed = msg.callInfo?.status === 'missed';
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <div
                  className={`px-4 py-1.5 rounded-2xl text-xs flex items-center gap-2 border ${
                    isMissed ? 'bg-red-950/40 border-red-800/60 text-red-300' : 'bg-[#1c1c24] border-[#27272e] text-gray-300'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5 text-red-400" />
                  <span>{msg.text}</span>
                  <span className="text-[10px] text-gray-500">{formatTime(msg.timestamp)}</span>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative`}>
              <div
                className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 shadow-md text-sm relative ${
                  isMe
                    ? 'bg-gradient-to-r from-[#991b1b] to-[#be123c] text-white rounded-tr-none'
                    : 'bg-[#1a1a21] text-gray-100 border border-[#27272e] rounded-tl-none'
                }`}
              >
                {msg.isForwarded && (
                  <p className="text-[10px] text-white/70 italic flex items-center gap-1 mb-0.5">
                    <Forward className="w-3 h-3" />
                    <span>Forwarded</span>
                  </p>
                )}

                {isGroup && !isMe && <p className="text-[11px] font-bold text-red-400 mb-0.5">{msg.senderName}</p>}

                {msg.type === 'text' && (
                  <div className="space-y-1">
                    <p className="whitespace-pre-wrap break-words leading-relaxed text-[14px]">{msg.text}</p>
                    {isFromAi && (
                      <button
                        type="button"
                        onClick={() => speakAiText(msg.text || '')}
                        className="inline-flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200 bg-black/40 px-2 py-0.5 rounded-md border border-white/10 cursor-pointer mt-1"
                        title="Zavi AI හඬින් අසන්න"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>හඬින් අසන්න (Speak)</span>
                      </button>
                    )}
                  </div>
                )}

                {msg.type === 'image' && msg.mediaUrl && (
                  <div className="rounded-xl overflow-hidden mb-1 cursor-pointer">
                    <img
                      src={msg.mediaUrl}
                      alt="Attachment"
                      className="max-h-72 w-full object-cover rounded-xl hover:opacity-95 transition-opacity"
                      onClick={() => setPreviewImage(msg.mediaUrl || null)}
                    />
                  </div>
                )}

                {msg.type === 'voice' && msg.mediaUrl && (
                  <div className="flex items-center gap-3 py-1 min-w-[210px]">
                    <button
                      type="button"
                      onClick={() => handlePlayVoice(msg.id, msg.mediaUrl!)}
                      className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
                    >
                      {playingAudioId === msg.id ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-0.5 h-6">
                        {[40, 70, 30, 90, 60, 45, 80, 50, 75, 30, 65, 85, 40].map((h, i) => (
                          <span
                            key={i}
                            style={{ height: `${h}%` }}
                            className={`w-1 rounded-full ${
                              playingAudioId === msg.id ? 'bg-white animate-pulse' : 'bg-white/40'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between text-[10px] text-white/70 mt-0.5">
                        <span>{playingAudioId === msg.id ? 'වාදනය වේ...' : 'හඬ පණිවිඩය'}</span>
                        <span>{msg.duration || 1}s</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-1 text-[10px] text-white/70 mt-1 select-none">
                  {msg.pinned && <Pin className="w-3 h-3 text-amber-300" />}
                  <span>{formatTime(msg.timestamp)}</span>
                  {isMe && (
                    <span>
                      {msg.status === 'seen' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-sky-400 inline" />
                      ) : (
                        <CheckCheck className="w-3.5 h-3.5 text-white/50 inline" />
                      )}
                    </span>
                  )}
                </div>

                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(msg.reactions).map(([emoji, uids]) => (
                      <span
                        key={emoji}
                        onClick={() => reactToMessage(msg.id, emoji)}
                        className="px-1.5 py-0.5 bg-black/40 rounded-full text-xs flex items-center gap-1 border border-white/10 cursor-pointer"
                      >
                        <span>{emoji}</span>
                        <span className="text-[10px] text-white/80">{uids.length}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Message Quick Actions */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 my-1 px-1 bg-[#141418] rounded-xl border border-[#27272e] shadow-lg">
                <button
                  type="button"
                  onClick={() => reactToMessage(msg.id, '❤️')}
                  className="p-1 text-sm hover:scale-125 transition-transform cursor-pointer"
                >
                  ❤️
                </button>
                <button
                  type="button"
                  onClick={() => reactToMessage(msg.id, '👍')}
                  className="p-1 text-sm hover:scale-125 transition-transform cursor-pointer"
                >
                  👍
                </button>
                <button
                  type="button"
                  onClick={() => pinMessage(msg.id, !msg.pinned)}
                  className="p-1 text-gray-400 hover:text-amber-400 transition-colors cursor-pointer"
                  title="Pin"
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
                {isMe && (
                  <button
                    type="button"
                    onClick={() => deleteMessage(msg.id)}
                    className="p-1 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2 p-2 bg-[#1a1a21] rounded-2xl max-w-xs border border-[#27272e] text-xs text-gray-300">
            <span className="w-2 h-2 rounded-full bg-[#e11d48] animate-bounce" />
            <span className="w-2 h-2 rounded-full bg-[#e11d48] animate-bounce [animation-delay:0.2s]" />
            <span className="w-2 h-2 rounded-full bg-[#e11d48] animate-bounce [animation-delay:0.4s]" />
            <span className="ml-1 text-gray-400">Zavi AI පිළිතුර සකසයි...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Keyboard */}
      {showEmojiKeyboard && (
        <EmojiKeyboard
          onSelectEmoji={(emoji) => {
            setInputText((prev) => prev + emoji);
          }}
          onClose={() => setShowEmojiKeyboard(false)}
        />
      )}

      {/* Attachment Menu */}
      {showAttachMenu && (
        <div className="bg-[#141418] border-t border-[#27272e] p-3 flex gap-4 animate-in slide-in-from-bottom-2">
          <label className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-[#1c1c23] hover:bg-[#252530] text-gray-200 border border-[#27272e] cursor-pointer">
            <ImageIcon className="w-6 h-6 text-[#e11d48]" />
            <span className="text-[11px] font-semibold">ඡායාරූප</span>
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          </label>
        </div>
      )}

      {/* Bottom Input Bar */}
      <div className="bg-[#121216] border-t border-[#27272e] p-2.5 flex items-center gap-2">
        {isRecordingVoice ? (
          <div className="flex-1 flex items-center justify-between px-4 py-2 bg-red-950/40 border border-red-800 rounded-full text-xs text-red-300">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span>හඬ පටිගත වෙමින්: {recordingSeconds}s</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCancelRecording}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                අවලංගු කරන්න
              </button>
              <button
                type="button"
                onClick={handleStopRecordingAndSend}
                className="p-1.5 bg-[#e11d48] text-white rounded-full shadow hover:bg-[#be123c] cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setShowEmojiKeyboard((p) => !p)}
              className="p-2 text-gray-400 hover:text-white cursor-pointer"
              title="ඉමෝජි"
            >
              <Smile className="w-6 h-6" />
            </button>

            <button
              type="button"
              onClick={() => setShowAttachMenu((p) => !p)}
              className="p-2 text-gray-400 hover:text-white cursor-pointer"
              title="ඡායාරූප"
            >
              <Paperclip className="w-6 h-6" />
            </button>

            <form onSubmit={handleSendText} className="flex-1 flex items-center">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="පණිවිඩයක් ලියන්න..."
                className="w-full px-4 py-2.5 rounded-full bg-[#1a1a21] border border-[#27272e] text-white text-sm focus:outline-none focus:border-[#e11d48]"
              />
            </form>

            {/* Speech Recognition Voice-to-Text Button */}
            <button
              type="button"
              onClick={handleToggleSpeechRecognition}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                isListeningSpeech ? 'bg-red-600 text-white animate-pulse' : 'text-gray-400 hover:text-white'
              }`}
              title="කතා කර ලියන්න (Speech to Text)"
            >
              <Mic className="w-5 h-5" />
            </button>

            {inputText.trim() ? (
              <button
                type="button"
                onClick={() => handleSendText()}
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#be123c] to-[#e11d48] hover:from-[#e11d48] text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform shrink-0 cursor-pointer shadow-red-glow"
                title="යවන්න"
              >
                <Send className="w-5 h-5 ml-0.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartRecording}
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#be123c] to-[#e11d48] hover:from-[#e11d48] text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform shrink-0 cursor-pointer shadow-red-glow"
                title="හඬ පණිවිඩයක් පටිගත කරන්න"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            )}
          </>
        )}
      </div>

      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col justify-center items-center p-4">
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img src={previewImage} alt="Preview" className="max-h-[85vh] max-w-[95vw] object-contain rounded-xl shadow-2xl" />
        </div>
      )}
    </div>
  );
};

// ==========================================
// STATUS VIEW COMPONENT (EXPIRATION & REACTIONS)
// ==========================================
const STATUS_BACKGROUNDS = ['#09090b', '#991b1b', '#be123c', '#4c0519', '#1e1b4b', '#18181b'];

export const StatusView: React.FC = () => {
  const { currentUser } = useAuth();
  const { statuses, postStatus, reactToStatus } = useChat();

  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [activeStoryList, setActiveStoryList] = useState<StatusItem[]>([]);
  const [showTextStatusModal, setShowTextStatusModal] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [selectedBg, setSelectedBg] = useState(STATUS_BACKGROUNDS[0]);

  const myStatuses = statuses.filter((s) => s.userId === currentUser?.id);
  const otherStatuses = statuses.filter((s) => s.userId !== currentUser?.id);

  const groupedByUser = otherStatuses.reduce<Record<string, StatusItem[]>>((acc, item) => {
    if (!acc[item.userId]) acc[item.userId] = [];
    acc[item.userId].push(item);
    return acc;
  }, {});

  useEffect(() => {
    if (activeStoryIndex === null) return;
    const timer = setTimeout(() => {
      if (activeStoryIndex < activeStoryList.length - 1) {
        setActiveStoryIndex((prev) => (prev !== null ? prev + 1 : null));
      } else {
        setActiveStoryIndex(null);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [activeStoryIndex, activeStoryList]);

  const handlePostTextStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusText.trim()) return;
    await postStatus('text', statusText.trim(), '', selectedBg, '#ffffff');
    setStatusText('');
    setShowTextStatusModal(false);
  };

  const handlePhotoStatusUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        await postStatus('image', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const openStories = (items: StatusItem[]) => {
    setActiveStoryList(items);
    setActiveStoryIndex(0);
  };

  return (
    <div className="h-full bg-[#09090b] overflow-y-auto pb-24 select-none">
      <div className="p-4 flex items-center justify-between border-b border-[#1e1e24]">
        <div
          className="flex items-center gap-3.5 cursor-pointer flex-1"
          onClick={() => {
            if (myStatuses.length > 0) openStories(myStatuses);
            else setShowTextStatusModal(true);
          }}
        >
          <div className="relative">
            <img
              src={currentUser?.avatar}
              alt="My Avatar"
              className={`w-14 h-14 rounded-full object-cover ring-2 ${
                myStatuses.length > 0 ? 'ring-[#e11d48] ring-offset-2 ring-offset-black' : 'ring-[#27272e]'
              }`}
            />
            {myStatuses.length === 0 && (
              <span className="absolute bottom-0 right-0 w-5 h-5 bg-[#e11d48] text-white rounded-full flex items-center justify-center ring-2 ring-black">
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </span>
            )}
          </div>

          <div>
            <h3 className="font-bold text-white text-sm">මගේ තත්ත්වය (My Status)</h3>
            <p className="text-xs text-gray-400">
              {myStatuses.length > 0 ? `${myStatuses.length} තත්ත්ව ඇත • බැලීමට ඔබන්න` : 'පැය 24 කින් ඉවත් වන Status එකක් දමන්න'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTextStatusModal(true)}
            className="p-2.5 rounded-full bg-[#1c1c23] hover:bg-[#252530] text-gray-200 border border-[#27272e] cursor-pointer"
            title="Text Status"
          >
            <Edit3 className="w-4 h-4 text-[#e11d48]" />
          </button>

          <label className="p-2.5 rounded-full bg-[#1c1c23] hover:bg-[#252530] text-gray-200 border border-[#27272e] cursor-pointer">
            <Camera className="w-4 h-4 text-[#e11d48]" />
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoStatusUpload} />
          </label>
        </div>
      </div>

      <div className="p-4">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">මෑත යාවත්කාලීන කිරීම්</h4>
        {Object.keys(groupedByUser).length === 0 ? (
          <p className="text-xs text-gray-500 py-6 text-center">මිතුරන්ගේ මෑත Status යාවත්කාලීන කිසිවක් නැත.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedByUser).map(([userId, items]) => {
              const latest = items[0];
              return (
                <div
                  key={userId}
                  onClick={() => openStories(items)}
                  className="flex items-center gap-3.5 p-2 rounded-2xl hover:bg-[#141418] cursor-pointer transition-colors"
                >
                  <img
                    src={latest.userAvatar}
                    alt={latest.userName}
                    className="w-13 h-13 rounded-full object-cover ring-2 ring-[#e11d48] ring-offset-2 ring-offset-black"
                  />
                  <div>
                    <h5 className="font-bold text-sm text-white">{latest.userName}</h5>
                    <p className="text-xs text-gray-400">{formatDateOrTime(latest.timestamp)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showTextStatusModal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col justify-between p-6">
          <div className="flex justify-between items-center text-white">
            <button
              type="button"
              onClick={() => setShowTextStatusModal(false)}
              className="p-2 text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="flex gap-2">
              {STATUS_BACKGROUNDS.map((bg) => (
                <span
                  key={bg}
                  onClick={() => setSelectedBg(bg)}
                  style={{ backgroundColor: bg }}
                  className={`w-6 h-6 rounded-full cursor-pointer border ${
                    selectedBg === bg ? 'border-white scale-110' : 'border-transparent'
                  }`}
                />
              ))}
            </div>
          </div>

          <form onSubmit={handlePostTextStatus} className="flex-1 flex items-center justify-center my-6">
            <textarea
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              placeholder="මෙහි යමක් ලියන්න..."
              style={{ backgroundColor: selectedBg }}
              className="w-full text-center text-white text-2xl font-bold placeholder-white/40 focus:outline-none p-4 rounded-3xl resize-none max-h-72"
              rows={4}
              autoFocus
            />
          </form>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handlePostTextStatus}
              disabled={!statusText.trim()}
              className="px-6 py-3 bg-[#e11d48] text-white font-bold rounded-full shadow-red-glow cursor-pointer disabled:opacity-40"
            >
              Status එක දමන්න
            </button>
          </div>
        </div>
      )}

      {activeStoryIndex !== null && activeStoryList.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-4">
          <div className="flex items-center gap-1.5 py-1">
            {activeStoryList.map((_, i) => (
              <div key={i} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-white transition-all ${
                    i < activeStoryIndex ? 'w-full' : i === activeStoryIndex ? 'w-full duration-5000' : 'w-0'
                  }`}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-white py-2">
            <div className="flex items-center gap-2.5">
              <img
                src={activeStoryList[activeStoryIndex].userAvatar}
                alt="user"
                className="w-9 h-9 rounded-full object-cover ring-1 ring-white"
              />
              <div>
                <p className="text-xs font-bold">{activeStoryList[activeStoryIndex].userName}</p>
                <p className="text-[10px] text-gray-400">{formatDateOrTime(activeStoryList[activeStoryIndex].timestamp)}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveStoryIndex(null)}
              className="p-2 rounded-full hover:bg-white/10 text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div
            className="flex-1 rounded-3xl overflow-hidden flex items-center justify-center p-6 relative border border-[#27272e]"
            style={{ backgroundColor: activeStoryList[activeStoryIndex].backgroundColor || '#09090b' }}
          >
            {activeStoryList[activeStoryIndex].type === 'text' ? (
              <p className="text-white text-2xl sm:text-3xl font-black text-center leading-relaxed max-w-md">
                {activeStoryList[activeStoryIndex].content}
              </p>
            ) : (
              <img
                src={activeStoryList[activeStoryIndex].content}
                alt="Story"
                className="max-h-full max-w-full object-contain rounded-2xl"
              />
            )}
          </div>

          <div className="py-2.5 flex items-center justify-between gap-2 max-w-md mx-auto w-full">
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
              {['❤️', '🔥', '😂', '👏', '😮', '😢'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    reactToStatus(activeStoryList[activeStoryIndex].id, emoji);
                  }}
                  className="text-xl p-1 hover:scale-125 transition-transform cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="text-xs text-gray-400 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              <span>පැය 24 කින් ඉවත් වේ</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// HIRU NEWS LIVE FEED VIEW (REAL LIVE NEWS)
// ==========================================
export const HiruNewsView: React.FC = () => {
  const { news, isLoadingNews, refreshNews, sendTextMessage } = useChat();
  const [activeCategory, setActiveCategory] = useState<string>('සියල්ල');
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  const categories = ['සියල්ල', 'Hiru News Live', 'Ada Derana', 'BBC Sinhala', 'සජීවී පුවත්'];

  const filteredNews =
    activeCategory === 'සියල්ල'
      ? news
      : news.filter((n) => n.category?.toLowerCase().includes(activeCategory.toLowerCase()));

  const handleShareToChat = async (item: NewsItem) => {
    const text = `📰 [Live News]: ${item.title}\n\n${item.description}\n\n🔗 ${item.link || 'Zavi Chats News Live'}`;
    await sendTextMessage(text);
    setCopiedNotice(`"${item.title.slice(0, 30)}..." Zavi Chats හි බෙදා ගන්නා ලදී! ✔`);
    setTimeout(() => setCopiedNotice(null), 3000);
  };

  return (
    <div className="h-full bg-[#09090b] overflow-y-auto pb-24 select-none">
      <div className="p-4 bg-gradient-to-r from-[#180a0e] via-[#1f1015] to-[#121216] border-b border-[#27272e] flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-red-glow">
            <Newspaper className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-black text-white text-sm">සජීවී පුවත් සංග්‍රහය (Live News)</h3>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            </div>
            <p className="text-[11px] text-gray-400">Hiru News, Ada Derana & BBC Sinhala සජීවී පුවත්</p>
          </div>
        </div>

        <button
          type="button"
          onClick={refreshNews}
          disabled={isLoadingNews}
          className="p-2 bg-[#1c1c23] hover:bg-[#252530] text-red-400 rounded-xl border border-[#27272e] cursor-pointer"
          title="යාවත්කාලීන කරන්න"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingNews ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {copiedNotice && (
        <div className="p-2.5 bg-emerald-950/80 border-b border-emerald-700 text-emerald-300 text-xs font-bold text-center">
          {copiedNotice}
        </div>
      )}

      {/* Categories Bar */}
      <div className="p-3 border-b border-[#1e1e24] flex items-center gap-2 overflow-x-auto scrollbar-none bg-[#0c0c10]">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer ${
              activeCategory === cat
                ? 'bg-[#e11d48] text-white shadow'
                : 'bg-[#181820] text-gray-400 hover:text-white border border-[#27272e]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* News List */}
      <div className="p-4 space-y-4">
        {isLoadingNews ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 text-xs">
            <RefreshCw className="w-7 h-7 animate-spin text-[#e11d48] mb-2" />
            <p className="font-bold">සජීවී පුවත් ලබා ගනිමින් පවතී...</p>
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-xs">
            <p>පුවත් කිසිවක් හමු නොවීය.</p>
          </div>
        ) : (
          filteredNews.map((item) => (
            <article
              key={item.id}
              className="bg-[#141418] border border-[#27272e] rounded-2xl overflow-hidden shadow-lg hover:border-[#e11d48]/40 transition-colors"
            >
              {item.imageUrl && (
                <div className="w-full h-44 overflow-hidden relative">
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 px-2.5 py-0.5 bg-red-600 text-white font-bold text-[10px] rounded-md shadow">
                    {item.category || 'සජීවී පුවත්'}
                  </span>
                </div>
              )}

              <div className="p-3.5">
                <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1.5">
                  <span className="text-red-400 font-bold">{item.category || 'Live Media'}</span>
                  <span>{item.publishedAt}</span>
                </div>

                <h4 className="font-bold text-white text-sm leading-snug mb-2">{item.title}</h4>

                <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed mb-3">{item.description}</p>

                <div className="flex items-center justify-between pt-2.5 border-t border-[#1e1e24]">
                  {item.link ? (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#e11d48] hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>සම්පූර්ණ පුවත කියවන්න</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span />
                  )}

                  <button
                    type="button"
                    onClick={() => handleShareToChat(item)}
                    className="px-3 py-1.5 bg-[#1c1c23] hover:bg-[#252530] text-gray-200 rounded-xl text-xs flex items-center gap-1.5 border border-[#27272e] cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-[#e11d48]" />
                    <span>චැට් එකට යවන්න</span>
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
};

// ==========================================
// SOCIAL FEED VIEW (FACEBOOK STYLE POSTS)
// ==========================================
export const SocialFeedView: React.FC = () => {
  const { currentUser } = useAuth();
  const { posts, createSocialPost, reactToSocialPost, addCommentToPost } = useChat();

  const [postText, setPostText] = useState('');
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim()) return;
    await createSocialPost(postText.trim());
    setPostText('');
  };

  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;
    await addCommentToPost(postId, text.trim());
    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
  };

  return (
    <div className="h-full bg-[#09090b] overflow-y-auto pb-24 select-none">
      {/* Create Post Card */}
      <div className="p-4 border-b border-[#27272e] bg-[#121216]">
        <form onSubmit={handleCreatePost} className="space-y-3">
          <div className="flex items-start gap-3">
            <img
              src={currentUser?.avatar}
              alt="Avatar"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-[#e11d48]/50"
            />
            <textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder="ඔබේ සිතුවිලි හෝ වීඩියෝ ලින්ක් එකක් බෙදා ගන්න..."
              rows={2}
              className="flex-1 bg-[#1a1a20] border border-[#27272e] rounded-2xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e11d48] resize-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!postText.trim()}
              className="px-5 py-2 bg-gradient-to-r from-[#be123c] to-[#e11d48] hover:from-[#e11d48] text-white rounded-xl text-xs font-bold shadow-red-glow cursor-pointer disabled:opacity-40"
            >
              Post කරන්න
            </button>
          </div>
        </form>
      </div>

      {/* Posts List */}
      <div className="p-4 space-y-4">
        {posts.map((post) => (
          <article key={post.id} className="bg-[#121216] border border-[#27272e] rounded-3xl p-4 shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <img src={post.userAvatar} alt={post.userName} className="w-10 h-10 rounded-full object-cover ring-1 ring-[#e11d48]" />
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-white text-sm">{post.userName}</h4>
                  {post.isVerified && <VerifiedBadge size={14} />}
                </div>
                <p className="text-[10px] text-gray-400">{formatDateOrTime(post.timestamp)}</p>
              </div>
            </div>

            <p className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap mb-3">{post.text}</p>

            {post.mediaUrl && (
              <div className="rounded-2xl overflow-hidden mb-3 border border-[#27272e]">
                <img src={post.mediaUrl} alt="Post media" className="w-full max-h-80 object-cover" />
              </div>
            )}

            <div className="flex items-center gap-4 py-2 border-y border-[#1e1e24] text-xs">
              <button
                type="button"
                onClick={() => reactToSocialPost(post.id, '❤️')}
                className="flex items-center gap-1.5 text-gray-300 hover:text-red-400 cursor-pointer"
              >
                <Heart className={`w-4 h-4 ${post.likes?.includes(currentUser?.id || '') ? 'text-red-500 fill-red-500' : ''}`} />
                <span>{post.likes?.length || 0}</span>
              </button>

              <div className="flex items-center gap-1 text-gray-400">
                <MessageCircle className="w-4 h-4" />
                <span>{post.comments?.length || 0} Comments</span>
              </div>
            </div>

            {/* Comments */}
            {post.comments && post.comments.length > 0 && (
              <div className="mt-3 space-y-2 max-h-36 overflow-y-auto">
                {post.comments.map((c) => (
                  <div key={c.id} className="bg-[#181820] p-2 rounded-xl text-xs">
                    <span className="font-bold text-white mr-1.5">{c.userName}:</span>
                    <span className="text-gray-300">{c.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Comment Input */}
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={commentInputs[post.id] || ''}
                onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                placeholder="Comment එකක් ලියන්න..."
                className="flex-1 bg-[#1a1a20] border border-[#27272e] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#e11d48]"
              />
              <button
                type="button"
                onClick={() => handleAddComment(post.id)}
                className="p-2 bg-[#e11d48] text-white rounded-xl cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

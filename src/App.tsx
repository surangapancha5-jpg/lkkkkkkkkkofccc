import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  VideoOff,
  X,
  Search,
  Users,
  Check,
  Camera,
  Copy,
  ShieldCheck,
  Moon,
  Sun,
  LogOut,
  ChevronRight,
  Crown,
  Info,
  Flag,
  Forward,
  Trash2,
  AlertTriangle,
  BadgeCheck,
  Sparkles,
  Heart,
  Send,
  UserCheck,
  UserX,
  FileText,
  Volume2,
} from 'lucide-react';

import type { UserProfile, Chat, CallRecord, Message } from './types.ts';
import { AuthProvider, useAuth, ChatProvider, useChat, MASTER_ADMIN_PHONE, MASTER_ADMIN_NAME, ZAVI_AI_BOT_USER } from './context.tsx';
import { formatDateOrTime, startSpeechRecognitionLive } from './audio.ts';
import {
  AuthScreen,
  Header,
  NavigationTabs,
  type MainTab,
  ChatList,
  ChatRoom,
  StatusView,
  HiruNewsView,
  SocialFeedView,
  VerifiedBadge,
} from './components.tsx';

// ==========================================
// CALLS VIEW COMPONENT (VIP RED & BLACK)
// ==========================================
const CallsView: React.FC<{ onOpenNewCall: () => void }> = ({ onOpenNewCall }) => {
  const { currentUser } = useAuth();
  const { callRecords, users, initiateCall } = useChat();

  const handleCallBack = (record: CallRecord) => {
    const isCallerMe = record.callerId === currentUser?.id;
    const targetId = isCallerMe ? record.receiverId : record.callerId;
    const targetUser = users.find((u) => u.id === targetId);
    if (targetUser) {
      initiateCall(targetUser, record.type);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `(${mins}m ${secs}s)`;
    return `(${secs}s)`;
  };

  return (
    <div className="h-full bg-[#09090b] overflow-y-auto pb-24 select-none">
      {callRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-400">
          <div className="w-16 h-16 rounded-full bg-red-950/40 border border-red-800/40 flex items-center justify-center text-[#e11d48] mb-3 shadow-red-glow">
            <PhoneCall className="w-8 h-8" />
          </div>
          <p className="font-bold text-white text-base">මෑත ඇමතුම් කිසිවක් නැත</p>
          <p className="text-xs mt-1 text-gray-400 max-w-xs leading-relaxed">
            ඔබේ මිතුරන් හෝ Zavi AI සමඟ සැබෑ HD Voice හෝ Video ඇමතුම් ලබා ගන්න.
          </p>
          <button
            type="button"
            onClick={onOpenNewCall}
            className="mt-5 px-5 py-2.5 bg-gradient-to-r from-[#be123c] to-[#e11d48] hover:from-[#e11d48] text-white rounded-full text-xs font-bold shadow-red-glow cursor-pointer transition-all"
          >
            ඇමතුමක් ආරම්භ කරන්න
          </button>
        </div>
      ) : (
        <div className="divide-y divide-[#1e1e24]">
          {callRecords.map((record) => {
            const isCallerMe = record.callerId === currentUser?.id;
            const contactName = isCallerMe ? record.receiverName : record.callerName;
            const contactAvatar = isCallerMe ? record.receiverAvatar : record.callerAvatar;

            return (
              <div
                key={record.id}
                className="flex items-center justify-between px-4 py-3.5 hover:bg-[#141418] transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <img
                    src={contactAvatar}
                    alt={contactName}
                    className="w-12 h-12 rounded-full object-cover ring-1 ring-[#e11d48] shadow-sm bg-gray-900"
                  />

                  <div>
                    <h4
                      className={`font-semibold text-sm ${
                        record.status === 'missed' ? 'text-red-400' : 'text-white'
                      }`}
                    >
                      {contactName}
                    </h4>

                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                      {record.status === 'missed' ? (
                        <PhoneMissed className="w-3.5 h-3.5 text-red-500" />
                      ) : isCallerMe ? (
                        <PhoneOutgoing className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <PhoneIncoming className="w-3.5 h-3.5 text-sky-400" />
                      )}

                      <span>
                        {formatDateOrTime(record.timestamp)} {formatDuration(record.duration)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCallBack(record)}
                  className="p-2.5 rounded-full hover:bg-white/5 text-red-400 hover:text-white transition-colors cursor-pointer"
                  title="නැවත අමතන්න"
                >
                  {record.type === 'video' ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Button */}
      <button
        type="button"
        onClick={onOpenNewCall}
        title="නව ඇමතුමක්"
        className="fixed bottom-20 right-5 w-14 h-14 bg-gradient-to-tr from-[#991b1b] to-[#e11d48] hover:from-[#e11d48] active:scale-95 text-white rounded-2xl shadow-red-glow flex items-center justify-center transition-all cursor-pointer z-20 border border-red-500/40"
      >
        <PhoneCall className="w-6 h-6" />
      </button>
    </div>
  );
};

// ==========================================
// INCOMING CALL MODAL (REAL RINGTONE & ACTION)
// ==========================================
const IncomingCallModal: React.FC = () => {
  const { incomingCall, answerIncomingCall, rejectIncomingCall } = useChat();

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-6 select-none animate-in fade-in">
      <div className="text-center pt-12 text-white">
        <p className="text-xs uppercase tracking-widest text-[#e11d48] font-bold mb-2">
          {incomingCall.type === 'video' ? '📹 Incoming Video Call' : '📞 Incoming Voice Call'}
        </p>
        <div className="w-24 h-24 mx-auto rounded-full overflow-hidden ring-4 ring-[#e11d48] mb-4 shadow-red-glow animate-pulse">
          <img src={incomingCall.callerAvatar} alt={incomingCall.callerName} className="w-full h-full object-cover" />
        </div>
        <h2 className="text-2xl font-black text-white">{incomingCall.callerName}</h2>
        <p className="text-xs text-gray-400 mt-1">ඔබට සජීවීව ඇමතුමක් ලබා ගනිමින් පවතී...</p>
      </div>

      <div className="flex items-center justify-around max-w-xs mx-auto w-full pb-12">
        {/* Reject Button */}
        <button
          type="button"
          onClick={rejectIncomingCall}
          className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-2xl active:scale-90 transition-transform cursor-pointer"
          title="ප්‍රතික්ෂේප කරන්න"
        >
          <PhoneOff className="w-7 h-7" />
        </button>

        {/* Accept Button */}
        <button
          type="button"
          onClick={answerIncomingCall}
          className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-2xl active:scale-90 transition-transform cursor-pointer animate-bounce"
          title="පිළිගන්න"
        >
          <Phone className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
};

// ==========================================
// ACTIVE CALL MODAL (REAL WEBRTC & AI VOICE)
// ==========================================
const CallModal: React.FC = () => {
  const {
    activeCall,
    endCall,
    toggleMuteCall,
    toggleVideoCall,
    localStream,
    remoteStream,
    isAiTalking,
    askZaviAiLive,
    speakAiText,
  } = useChat();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isAiListening, setIsAiListening] = useState(false);
  const [aiSpeechText, setAiSpeechText] = useState('');

  // Attach local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, activeCall?.isVideoOff]);

  // Attach remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!activeCall) return null;

  const isVideo = activeCall.record.type === 'video';
  const isAi = activeCall.isAiCall;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // AI Voice Call Mic button
  const handleTalkToAi = () => {
    if (isAiListening) return;
    setIsAiListening(true);
    setAiSpeechText('අහගෙන ඉන්නේ...');

    startSpeechRecognitionLive(
      async (transcript) => {
        setAiSpeechText(transcript);
        setIsAiListening(false);
        const reply = await askZaviAiLive(transcript);
        speakAiText(reply);
      },
      (err) => {
        setIsAiListening(false);
        setAiSpeechText('');
      },
      () => {
        setIsAiListening(false);
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#09090b]/98 backdrop-blur-md flex flex-col justify-between p-6 select-none animate-in fade-in">
      {/* Top Header */}
      <div className="flex flex-col items-center pt-6 text-center text-white">
        <div className="flex items-center gap-1.5">
          <h2 className="text-2xl font-black tracking-wide">{activeCall.record.receiverName}</h2>
          <VerifiedBadge size={18} />
        </div>
        <p className="text-xs text-red-400 mt-1 font-semibold uppercase tracking-wider">
          {activeCall.isRinging
            ? 'නාද වෙමින් පවතී (Ringing...)'
            : activeCall.isConnected
            ? `සම්බන්ධයි: ${formatTimer(activeCall.duration)}`
            : 'සම්බන්ධ වෙමින්...'}
        </p>
      </div>

      {/* Center Media Area */}
      <div className="flex-1 flex items-center justify-center relative my-4">
        {isAi ? (
          /* Live Zavi AI Voice Call Visualizer */
          <div className="flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative">
              <div
                className={`w-36 h-36 rounded-full overflow-hidden ring-4 ring-purple-500 shadow-2xl transition-transform ${
                  isAiTalking || isAiListening ? 'scale-110 shadow-purple-900/80 animate-pulse' : ''
                }`}
              >
                <img src={activeCall.record.receiverAvatar} alt="Zavi AI" className="w-full h-full object-cover" />
              </div>

              {/* Soundwaves */}
              {(isAiTalking || isAiListening) && (
                <div className="absolute -inset-4 rounded-full border-2 border-purple-500/60 animate-ping pointer-events-none" />
              )}
            </div>

            <div className="max-w-xs space-y-2">
              <div className="flex items-center justify-center gap-1 h-8">
                {[30, 60, 90, 45, 80, 100, 70, 50, 85, 40].map((h, i) => (
                  <span
                    key={i}
                    style={{ height: `${h}%` }}
                    className={`w-1 rounded-full ${
                      isAiTalking ? 'bg-purple-400 animate-pulse' : 'bg-gray-600'
                    }`}
                  />
                ))}
              </div>

              <p className="text-xs font-semibold text-purple-300">
                {isAiTalking ? 'Zavi AI කතා කරයි...' : isAiListening ? 'ඔබ කතා කරන දේ අහගෙන ඉන්නේ...' : 'කතා කිරීමට පහත මයික්‍රෆෝනය ඔබන්න'}
              </p>

              {aiSpeechText && <p className="text-xs text-gray-400 italic">"{aiSpeechText}"</p>}
            </div>

            <button
              type="button"
              onClick={handleTalkToAi}
              className={`px-6 py-2.5 rounded-full font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg transition-transform active:scale-95 ${
                isAiListening
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>{isAiListening ? 'අහගෙන ඉන්නේ...' : 'AI ට කතා කරන්න (Speak)'}</span>
            </button>
          </div>
        ) : isVideo ? (
          /* WebRTC Video Call */
          <div className="relative w-full max-w-sm h-96 rounded-3xl overflow-hidden shadow-2xl bg-black border border-[#e11d48]/40">
            {/* Remote Video Stream */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Local Video Stream Pip */}
            {!activeCall.isVideoOff && (
              <div className="absolute top-4 right-4 w-24 h-32 rounded-xl overflow-hidden border-2 border-red-500 shadow-lg bg-gray-900">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        ) : (
          /* Voice Call Avatar */
          <div className="flex flex-col items-center">
            <div className="relative">
              <img
                src={activeCall.record.receiverAvatar}
                alt="Avatar"
                className="w-32 h-32 rounded-full object-cover ring-4 ring-[#e11d48] shadow-red-glow"
              />
              {activeCall.isConnected && (
                <span className="absolute -inset-2 rounded-full border border-red-500/50 animate-ping pointer-events-none" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Call Controls */}
      <div className="flex items-center justify-center gap-6 pb-6">
        <button
          type="button"
          onClick={toggleMuteCall}
          className={`p-4 rounded-full transition-all cursor-pointer ${
            activeCall.isMuted
              ? 'bg-red-600 text-white'
              : 'bg-[#1e1e24] text-gray-200 hover:bg-[#2a2a35]'
          }`}
          title={activeCall.isMuted ? 'Unmute' : 'Mute'}
        >
          {activeCall.isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        {isVideo && (
          <button
            type="button"
            onClick={toggleVideoCall}
            className={`p-4 rounded-full transition-all cursor-pointer ${
              activeCall.isVideoOff
                ? 'bg-red-600 text-white'
                : 'bg-[#1e1e24] text-gray-200 hover:bg-[#2a2a35]'
            }`}
            title={activeCall.isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
          >
            {activeCall.isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>
        )}

        <button
          type="button"
          onClick={() => endCall('completed')}
          className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-2xl active:scale-95 transition-transform cursor-pointer"
          title="ඇමතුම අවසන් කරන්න"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

// ==========================================
// NEW CHAT / CALL SELECT USER MODAL
// ==========================================
interface UserPickerModalProps {
  onClose: () => void;
  onSelectUser: (user: UserProfile) => void;
  title: string;
}

const UserPickerModal: React.FC<UserPickerModalProps> = ({ onClose, onSelectUser, title }) => {
  const { currentUser } = useAuth();
  const { users } = useChat();
  const [search, setSearch] = useState('');

  const otherUsers = users.filter((u) => u.id !== currentUser?.id);
  const filtered = otherUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.phone.includes(search) ||
      u.about.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 select-none">
      <div className="bg-[#121216] border border-[#27272e] w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col animate-in slide-in-from-bottom-4">
        <div className="p-4 border-b border-[#27272e] flex items-center justify-between text-white bg-gradient-to-r from-[#180a0e] via-[#1f1015] to-[#121216]">
          <h3 className="font-bold text-base">{title}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 border-b border-[#1e1e24]">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="නම හෝ දුරකථන අංකය සොයන්න..."
              className="w-full pl-9 pr-3 py-2 bg-[#1a1a20] border border-[#27272e] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e11d48]"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#1e1e24] p-2">
          {filtered.map((user) => (
            <div
              key={user.id}
              onClick={() => {
                onSelectUser(user);
                onClose();
              }}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#1a1a20] cursor-pointer transition-colors"
            >
              <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover ring-1 ring-[#e11d48]" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <h4 className="font-bold text-sm text-white truncate">{user.name}</h4>
                  {user.isVerified && <VerifiedBadge size={13} />}
                </div>
                <p className="text-xs text-gray-400 font-mono truncate">{user.phone}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// NEW GROUP MODAL
// ==========================================
const NewGroupModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { currentUser } = useAuth();
  const { users, createGroup } = useChat();
  const [groupName, setGroupName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const otherUsers = users.filter((u) => u.id !== currentUser?.id);

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedUserIds.length === 0) return;
    createGroup(groupName.trim(), '', selectedUserIds);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 select-none">
      <div className="bg-[#121216] border border-[#27272e] w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        <div className="bg-gradient-to-r from-[#180a0e] via-[#1f1015] to-[#121216] border-b border-[#27272e] text-white p-4 flex items-center justify-between">
          <h3 className="font-bold text-base text-white">නව සමූහයක් සාදන්න (New Group)</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreateGroup} className="p-4 border-b border-[#1e1e24] space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">සමූහයේ නම</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="උදා: අපේ VIP සෙට් එක 🔥"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#27272e] bg-[#1a1a20] text-sm text-white focus:outline-none focus:border-[#e11d48]"
              autoFocus
              required
            />
          </div>
          <p className="text-xs text-gray-400">සාමාජිකයන් තෝරන්න ({selectedUserIds.length} තෝරාගෙන ඇත):</p>
        </form>

        <div className="flex-1 overflow-y-auto divide-y divide-[#1e1e24] p-2">
          {otherUsers.map((user) => {
            const isChecked = selectedUserIds.includes(user.id);
            return (
              <div
                key={user.id}
                onClick={() => toggleSelectUser(user.id)}
                className={`flex items-center justify-between p-2.5 rounded-xl transition-colors cursor-pointer ${
                  isChecked ? 'bg-red-950/40 border border-red-800/40' : 'hover:bg-[#1a1a20]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover ring-1 ring-[#e11d48]" />
                  <div>
                    <div className="flex items-center gap-1">
                      <h4 className="font-semibold text-sm text-white">{user.name}</h4>
                      {user.isVerified && <VerifiedBadge size={13} />}
                    </div>
                    <p className="text-xs text-gray-400">{user.phone}</p>
                  </div>
                </div>

                <div
                  className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                    isChecked ? 'bg-[#e11d48] border-[#e11d48] text-white shadow-red-glow' : 'border-gray-600'
                  }`}
                >
                  {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-[#1e1e24]">
          <button
            type="button"
            onClick={handleCreateGroup}
            disabled={!groupName.trim() || selectedUserIds.length === 0}
            className="w-full py-3 bg-gradient-to-r from-[#be123c] to-[#e11d48] hover:from-[#e11d48] text-white font-bold rounded-xl shadow-red-glow cursor-pointer disabled:opacity-40"
          >
            සමූහය සාදන්න
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// PROFILE MODAL COMPONENT
// ==========================================
const ProfileModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { currentUser, updateProfile } = useAuth();
  const [name, setName] = useState(currentUser?.name || '');
  const [about, setAbout] = useState(currentUser?.about || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await updateProfile({ name: name.trim(), about: about.trim(), avatar });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 select-none">
      <div className="bg-[#121216] border border-[#27272e] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="bg-gradient-to-r from-[#180a0e] via-[#1f1015] to-[#121216] border-b border-[#27272e] text-white p-4 flex items-center justify-between">
          <h3 className="font-bold text-base text-white">මගේ VIP ගිණුම (Profile)</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="flex flex-col items-center">
            <div className="relative">
              <img
                src={avatar}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover ring-4 ring-[#e11d48] shadow-red-glow"
              />
              <label className="absolute bottom-0 right-0 bg-[#e11d48] p-2 rounded-full text-white shadow-lg hover:bg-[#be123c] cursor-pointer">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setAvatar(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>

            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs text-gray-300 font-mono">{currentUser?.phone}</span>
              {currentUser?.isVerified && <VerifiedBadge size={14} />}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">ඔබගේ නම (User Name)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#27272e] bg-[#1a1a20] text-sm text-white focus:outline-none focus:border-[#e11d48]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">About (තත්ත්වය)</label>
            <input
              type="text"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#27272e] bg-[#1a1a20] text-sm text-white focus:outline-none focus:border-[#e11d48]"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-[#be123c] to-[#e11d48] hover:from-[#e11d48] text-white font-bold rounded-xl shadow-red-glow transition-all cursor-pointer"
          >
            {isSaved ? 'සුරැකිණි! ✔' : 'වෙනස්කම් සුරකින්න'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// REPORT USER MODAL
// ==========================================
const ReportUserModal: React.FC<{ reportedUser: UserProfile; onClose: () => void }> = ({ reportedUser, onClose }) => {
  const { reportUser } = useChat();
  const [reason, setReason] = useState('ස්පෑම් හෝ අනවශ්‍ය පණිවිඩ (Spam)');
  const [details, setDetails] = useState('');
  const [isSent, setIsSent] = useState(false);

  const REASONS = [
    'ස්පෑම් හෝ අනවශ්‍ය පණිවිඩ (Spam)',
    'අපහාසාත්මක හෝ අශිෂ්ට හැසිරීම (Harassment & Abuse)',
    'වංචනික හෝ මුදල් වංචා (Fraud / Scam)',
    'අසත්‍ය තොරතුරු හෝ අනන්‍යතා සොරකම (Impersonation)',
    'නුසුදුසු අන්තර්ගතය (Inappropriate Content)',
    'වෙනත් හේතුවක් (Other Reason)',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await reportUser(reportedUser.id, reason, details);
    setIsSent(true);
    setTimeout(() => {
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex justify-center items-center p-4 select-none">
      <div className="bg-[#121216] border border-[#27272e] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="bg-gradient-to-r from-[#20090e] via-[#2c0e16] to-[#121216] border-b border-[#27272e] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-sm text-white">පරිශීලකයා වාර්තා කරන්න (Report User)</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSent ? (
          <div className="p-6 text-center space-y-3">
            <div className="w-14 h-14 bg-red-950/60 border border-red-700 text-[#e11d48] rounded-full flex items-center justify-center mx-auto shadow-red-glow">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h4 className="text-base font-bold text-white">වාර්තාව සාර්ථකව යොමු විය!</h4>
            <p className="text-xs text-gray-300 leading-relaxed">
              ඔබගේ පැමිණිල්ල <strong>0760264995 (mr suranga mods)</strong> වෙත ක්ෂණිකව යවන ලදී.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="bg-[#18181f] p-3 rounded-2xl border border-[#27272e] flex items-center gap-3">
              <img src={reportedUser.avatar} alt={reportedUser.name} className="w-10 h-10 rounded-full object-cover ring-1 ring-[#e11d48]" />
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <h4 className="font-bold text-white text-xs sm:text-sm">{reportedUser.name}</h4>
                  {reportedUser.isVerified && <VerifiedBadge size={13} />}
                </div>
                <p className="text-[11px] text-gray-400 font-mono">{reportedUser.phone}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">වාර්තා කිරීමට හේතුව තෝරන්න:</label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {REASONS.map((r) => (
                  <label
                    key={r}
                    className={`flex items-center gap-2.5 p-2 rounded-xl text-xs cursor-pointer border transition-colors ${
                      reason === r
                        ? 'bg-red-950/40 border-[#e11d48] text-white font-semibold'
                        : 'border-[#27272e] text-gray-300 hover:bg-[#1a1a20]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      className="accent-[#e11d48]"
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">අමතර විස්තර (විකල්ප):</label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="සිදුවූ ගැටලුව පිළිබඳව කෙටි විස්තරයක් ලියන්න..."
                rows={2}
                className="w-full bg-[#18181f] border border-[#27272e] rounded-xl p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e11d48]"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-[#202028] hover:bg-[#2a2a35] text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                අවලංගු කරන්න
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-[#e11d48] hover:from-red-500 text-white rounded-xl text-xs font-bold shadow-red-glow cursor-pointer"
              >
                වාර්තාව යවන්න
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// ==========================================
// ABOUT APP MODAL
// ==========================================
const AboutModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 select-none">
      <div className="bg-[#121216] border border-[#27272e] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 text-center text-white space-y-4">
        <div className="w-16 h-16 bg-gradient-to-tr from-[#991b1b] to-[#e11d48] rounded-2xl flex items-center justify-center mx-auto shadow-red-glow">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black">ZAVI CHATS VIP LIVE</h3>
        <p className="text-xs text-gray-400 leading-relaxed">
          ශ්‍රී ලංකාවේ ප්‍රථම සහ එකම සම්පූර්ණ Real-time Messaging, WebRTC Audio & Video Calls, සජීවී Hiru News සහ Gemini Live AI Voice සංවාද සහිත සැබෑ Live Messaging App එකයි.
        </p>
        <div className="p-3 bg-[#181820] rounded-2xl border border-[#27272e] text-xs text-gray-300 text-left space-y-1">
          <p>
            👑 <strong>Owner:</strong> mr suranga mods (0760264995)
          </p>
          <p>
            ⚡ <strong>Technology:</strong> Node.js, Express SSE, WebRTC, Gemini AI
          </p>
          <p>
            🛡️ <strong>Security:</strong> 2FA Google Authenticator TOTP
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-[#e11d48] text-white rounded-xl font-bold text-xs cursor-pointer shadow-red-glow"
        >
          වසන්න (Close)
        </button>
      </div>
    </div>
  );
};

// ==========================================
// MAIN APP COMPONENT
// ==========================================
function MainAppContent() {
  const { currentUser, isLoading } = useAuth();
  const { activeChatId, setActiveChatId, initiateCall } = useChat();

  const [currentTab, setCurrentTab] = useState<MainTab>('chats');
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showNewCallModal, setShowNewCallModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [reportingUser, setReportingUser] = useState<UserProfile | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#e11d48] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090b] text-gray-100 justify-center">
      <div className="w-full max-w-md h-full flex flex-col relative bg-[#09090b] border-x border-[#1e1e24] shadow-2xl">
        {/* If Active Chat is Open -> Show Full Chat Room */}
        {activeChatId ? (
          <ChatRoom
            chatId={activeChatId}
            onBack={() => setActiveChatId(null)}
            onOpenProfile={(u) => setShowProfileModal(true)}
            onOpenReportModal={(u) => setReportingUser(u)}
          />
        ) : (
          /* Main Navigation View */
          <>
            <Header
              onOpenNewGroup={() => setShowNewGroupModal(true)}
              onOpenProfile={() => setShowProfileModal(true)}
              onOpenAbout={() => setShowAboutModal(true)}
              onSearchToggle={() => setIsSearching((p) => !p)}
              isSearching={isSearching}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />

            <main className="flex-1 overflow-hidden relative">
              {currentTab === 'chats' && (
                <ChatList
                  onSelectChat={(id) => setActiveChatId(id)}
                  onOpenNewChat={() => setShowNewChatModal(true)}
                  searchQuery={searchQuery}
                />
              )}
              {currentTab === 'news' && <HiruNewsView />}
              {currentTab === 'feed' && <SocialFeedView />}
              {currentTab === 'status' && <StatusView />}
              {currentTab === 'calls' && <CallsView onOpenNewCall={() => setShowNewCallModal(true)} />}
            </main>

            <NavigationTabs currentTab={currentTab} onTabChange={setCurrentTab} />
          </>
        )}

        {/* Global Modals */}
        <IncomingCallModal />
        <CallModal />

        {showNewChatModal && (
          <UserPickerModal
            title="නව චැට් එකක් (New Chat)"
            onClose={() => setShowNewChatModal(false)}
            onSelectUser={(u) => setActiveChatId(u.id)}
          />
        )}

        {showNewCallModal && (
          <UserPickerModal
            title="නව ඇමතුමක් (New Call)"
            onClose={() => setShowNewCallModal(false)}
            onSelectUser={(u) => initiateCall(u, 'voice')}
          />
        )}

        {showNewGroupModal && <NewGroupModal onClose={() => setShowNewGroupModal(false)} />}
        {showProfileModal && <ProfileModal onClose={() => setShowProfileModal(false)} />}
        {showAboutModal && <AboutModal onClose={() => setShowAboutModal(false)} />}
        {reportingUser && <ReportUserModal reportedUser={reportingUser} onClose={() => setReportingUser(null)} />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <MainAppContent />
      </ChatProvider>
    </AuthProvider>
  );
}

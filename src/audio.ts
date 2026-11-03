// Audio synthesizer, ringtone, voice recorder and live speech synthesis / recognition

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playSentSound() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  } catch {
    // Audio context may require user interaction
  }
}

export function playReceivedSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const playNote = (freq: number, delay: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0.25, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + duration);
    };

    playNote(659.25, 0, 0.12); // E5
    playNote(880, 0.1, 0.22); // A5
  } catch {
    // Ignore
  }
}

let ringtoneInterval: ReturnType<typeof setInterval> | null = null;

export function startRingtone(): () => void {
  stopRingtone();

  const playRingPattern = () => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      const pulse = (startTime: number) => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, startTime);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, startTime);

        gain.gain.setValueAtTime(0.22, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.7);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(startTime);
        osc2.start(startTime);
        osc1.stop(startTime + 0.75);
        osc2.stop(startTime + 0.75);
      };

      pulse(now);
      pulse(now + 0.85);
    } catch {
      // Audio error
    }
  };

  playRingPattern();
  ringtoneInterval = setInterval(playRingPattern, 2800);

  return stopRingtone;
}

export function stopRingtone() {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
}

// Media Recorder for Voice Notes
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let recordingStartTime = 0;

export async function startAudioRecording(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    recordingStartTime = Date.now();
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.start();
    return true;
  } catch (err) {
    console.error('Error starting audio recording:', err);
    return false;
  }
}

export function stopAudioRecording(): Promise<{ audioUrl: string; duration: number } | null> {
  return new Promise((resolve) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      resolve(null);
      return;
    }

    const duration = Math.round((Date.now() - recordingStartTime) / 1000);

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      mediaRecorder?.stream.getTracks().forEach((track) => track.stop());

      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = () => {
        const base64Audio = reader.result as string;
        resolve({
          audioUrl: base64Audio,
          duration: Math.max(1, duration),
        });
      };
      reader.onerror = () => {
        resolve(null);
      };
    };

    mediaRecorder.stop();
  });
}

// ==========================================
// LIVE TEXT-TO-SPEECH (TTS) FOR LIVE ZAVI AI
// ==========================================
let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speakTextLive(text: string, onEnd?: () => void): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.();
    return false;
  }

  try {
    window.speechSynthesis.cancel();

    // Clean markdown/emojis for smoother speech pronunciation
    const cleanText = text
      .replace(/[#*`_~]/g, '')
      .replace(/https?:\/\/\S+/g, 'link')
      .trim();

    if (!cleanText) {
      onEnd?.();
      return false;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    currentUtterance = utterance;

    // Check available voices for Sinhala or smooth English
    const voices = window.speechSynthesis.getVoices();
    const sinhalaVoice = voices.find((v) => v.lang.startsWith('si') || v.name.toLowerCase().includes('sinhala'));
    const naturalVoice = voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));

    if (sinhalaVoice) {
      utterance.voice = sinhalaVoice;
      utterance.lang = 'si-LK';
    } else if (naturalVoice) {
      utterance.voice = naturalVoice;
      utterance.lang = naturalVoice.lang;
    } else {
      utterance.lang = 'si-LK';
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    utterance.onend = () => {
      currentUtterance = null;
      onEnd?.();
    };

    utterance.onerror = () => {
      currentUtterance = null;
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (e) {
    console.warn('TTS error:', e);
    onEnd?.();
    return false;
  }
}

export function stopSpeakingLive() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
}

// ==========================================
// LIVE SPEECH RECOGNITION (VOICE INPUT)
// ==========================================
export function startSpeechRecognitionLive(
  onTranscript: (text: string) => void,
  onError?: (err: string) => void,
  onFinish?: () => void
): { stop: () => void } | null {
  const SpeechRecognitionClass =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognitionClass) {
    onError?.('Speech recognition is not supported in this browser');
    return null;
  }

  try {
    const recognition = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'si-LK'; // Sinhala primary, falls back to en-US

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        onTranscript(finalTranscript);
      }
    };

    recognition.onerror = (e: any) => {
      onError?.(e.error || 'Speech error');
    };

    recognition.onend = () => {
      onFinish?.();
    };

    recognition.start();

    return {
      stop: () => {
        try {
          recognition.stop();
        } catch {}
      },
    };
  } catch (e) {
    onError?.(String(e));
    return null;
  }
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('si-LK', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function formatDateOrTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return formatTime(timestamp);
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'ඊයේ';
  }

  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

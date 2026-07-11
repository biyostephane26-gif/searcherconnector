'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Volume2, VolumeX, Loader2, Bot } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

type VoiceMode = 'idle' | 'recording' | 'processing' | 'playing';

export default function SCAIVoice() {
  const { user } = useAuth();
  const [mode, setMode] = useState<VoiceMode>('idle');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      setTranscript('');
      setResponse('');
      setAudioUrl(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stopStream();
      };

      mediaRecorder.start();
      setMode('recording');
    } catch (err: any) {
      console.error('Recording error:', err);
      setError("Impossible d'accéder au microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setMode('processing');
    }
    stopStream();
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      setError(null);
      setMode('processing');

      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(audioBlob);
      });
      const audioBase64 = await base64Promise;

      // Call our voice API
      const res = await fetch('/api/scai/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          audio: audioBase64,
          mode: 'full'
        })
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Erreur');
      }

      setTranscript(data.text || '');
      setResponse(data.response || '');

      // Play audio response if available
      if (data.audioBuffer && !isMuted) {
        const buffer = Buffer.from(data.audioBuffer, 'base64');
        const blob = new Blob([buffer], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        playAudio(url);
      } else {
        setMode('idle');
      }

    } catch (err: any) {
      console.error('Processing error:', err);
      setError(err.message || 'Erreur de traitement');
      setMode('idle');
    }
  };

  const playAudio = (url: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onplay = () => setMode('playing');
    audio.onended = () => {
      setMode('idle');
      setAudioUrl(null);
    };
    audio.onerror = () => {
      setError('Erreur de lecture audio');
      setMode('idle');
    };

    audio.play().catch(() => {
      // Fallback: just show text response
      setMode('idle');
    });
  };

  const stopPlaying = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setMode('idle');
    setAudioUrl(null);
  };

  const speakText = async (text: string) => {
    try {
      setError(null);
      setMode('processing');

      const res = await fetch('/api/scai/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          mode: 'tts'
        })
      });

      if (!res.ok) throw new Error('TTS failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      playAudio(url);
    } catch (err: any) {
      console.error('TTS error:', err);
      setError('Impossible de générer la voix');
      setMode('idle');
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-[#0f0f0f] rounded-2xl border border-[#2a2a2a]">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Bot className="w-8 h-8 text-[#D4AF37]" />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse border-2 border-[#0f0f0f]" />
        </div>
        <div>
          <h3 className="font-bold text-white">SCAI Voice</h3>
          <p className="text-xs text-gray-500">Parle directement à ton agent</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="w-full p-3 bg-red-900/20 border border-red-800/50 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Status Display */}
      <div className="w-full text-center">
        {mode === 'recording' && (
          <div className="flex items-center justify-center gap-2 text-red-400">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="font-bold">Enregistrement...</span>
          </div>
        )}
        {mode === 'processing' && (
          <div className="flex items-center justify-center gap-2 text-[#D4AF37]">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-bold">Traitement...</span>
          </div>
        )}
        {mode === 'playing' && (
          <div className="flex items-center justify-center gap-2 text-green-400">
            <Volume2 className="w-5 h-5 animate-pulse" />
            <span className="font-bold">SCAI parle...</span>
          </div>
        )}
      </div>

      {/* Transcript & Response */}
      {(transcript || response) && (
        <div className="w-full space-y-3">
          {transcript && (
            <div className="p-3 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
              <p className="text-xs text-gray-500 mb-1">Toi:</p>
              <p className="text-white">{transcript}</p>
            </div>
          )}
          {response && (
            <div className="p-3 bg-[#1a1a1a] rounded-xl border border-[#D4AF37]/30">
              <p className="text-xs text-[#D4AF37] mb-1">SCAI:</p>
              <p className="text-white">{response}</p>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-4">
        {mode === 'idle' && (
          <button
            onClick={startRecording}
            className="flex items-center justify-center w-16 h-16 bg-red-600 hover:bg-red-500 rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-900/30"
          >
            <Mic className="w-8 h-8 text-white" />
          </button>
        )}

        {mode === 'recording' && (
          <button
            onClick={stopRecording}
            className="flex items-center justify-center w-16 h-16 bg-red-600 hover:bg-red-500 rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-900/30 animate-pulse"
          >
            <Square className="w-8 h-8 text-white" />
          </button>
        )}

        {mode === 'playing' && (
          <button
            onClick={stopPlaying}
            className="flex items-center justify-center w-16 h-16 bg-gray-700 hover:bg-gray-600 rounded-full transition-all"
          >
            <Square className="w-8 h-8 text-white" />
          </button>
        )}

        {/* Mute Toggle */}
        {response && !audioUrl && (
          <button
            onClick={() => speakText(response)}
            className="flex items-center justify-center w-12 h-12 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#2a2a2a] rounded-full transition-all"
            title="Écouter la réponse"
          >
            <Play className="w-5 h-5 text-[#D4AF37]" />
          </button>
        )}

        <button
          onClick={() => setIsMuted(!isMuted)}
          className="flex items-center justify-center w-12 h-12 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#2a2a2a] rounded-full transition-all"
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-gray-500" />
          ) : (
            <Volume2 className="w-5 h-5 text-[#D4AF37]" />
          )}
        </button>
      </div>

      {/* Mode Info */}
      <div className="text-xs text-gray-600 text-center max-w-xs">
        {isMuted ? 'Mode silencieux - Réponses en texte uniquement' : 'Clique sur le micro pour parler à SCAI'}
      </div>
    </div>
  );
}

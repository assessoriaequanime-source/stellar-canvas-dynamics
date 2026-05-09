/**
 * useVoiceAgent Hook
 * React hook for managing xAI Realtime Voice Agent WebSocket connection
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SessionTokenManager,
  audioToBase64,
  base64ToAudio,
  getDefaultSessionConfig,
  XaiMessageEvent,
  XaiSessionConfig,
} from '@/lib/xai-utils';

export interface VoiceMessage {
  id: string;
  role: 'user' | 'assistant';
  type: 'text' | 'audio';
  content: string; // For text: the message, for audio: base64-encoded PCM (optional in transcript mode)
  transcript?: string; // Transcription of user speech or assistant audio
  interrupted?: boolean;
  timestamp: number;
}

export interface UseVoiceAgentOptions {
  sessionConfig?: Partial<XaiSessionConfig>;
  autoConnect?: boolean;
  onMessage?: (message: VoiceMessage) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  onError?: (error: Error) => void;
}

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'active' | 'error';

export function useVoiceAgent(options: UseVoiceAgentOptions = {}) {
  const { sessionConfig, autoConnect = false, onMessage, onStatusChange, onError } = options;

  // ─── State ────────────────────────────────────────────────────────────
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // ─── Refs ─────────────────────────────────────────────────────────────
  const wsRef = useRef<WebSocket | null>(null);
  const tokenManagerRef = useRef(new SessionTokenManager());
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micBufferRef = useRef<Int16Array[]>([]);
  const sessionReadyRef = useRef(false);
  const currentResponseIdRef = useRef<string | null>(null);
  const nextPlayTimeRef = useRef(0);
  const queuedSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const messageIdCounterRef = useRef(0);

  // ─── Status Management ────────────────────────────────────────────────
  const updateStatus = useCallback((newStatus: ConnectionStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  const addMessage = useCallback(
    (message: VoiceMessage) => {
      setMessages((prev) => [...prev, message]);
      onMessage?.(message);
    },
    [onMessage],
  );

  // ─── Audio Playback ───────────────────────────────────────────────────
  const playPcmChunk = useCallback((base64: string) => {
    if (!audioContextRef.current) return;

    const int16 = base64ToAudio(base64);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const buf = audioContextRef.current.createBuffer(1, float32.length, 24000);
    buf.getChannelData(0).set(float32);

    const src = audioContextRef.current.createBufferSource();
    src.buffer = buf;
    src.connect(audioContextRef.current.destination);

    const now = audioContextRef.current.currentTime;
    const startAt = Math.max(now, nextPlayTimeRef.current);
    src.start(startAt);
    nextPlayTimeRef.current = startAt + buf.duration;

    queuedSourcesRef.current.push(src);
    src.onended = () => {
      const idx = queuedSourcesRef.current.indexOf(src);
      if (idx !== -1) queuedSourcesRef.current.splice(idx, 1);
    };
  }, []);

  const interruptPlayback = useCallback(() => {
    for (const src of queuedSourcesRef.current) {
      try {
        src.stop();
      } catch {
        // Already stopped
      }
    }
    queuedSourcesRef.current.length = 0;
    nextPlayTimeRef.current = 0;

    // Mark current response as interrupted
    if (currentResponseIdRef.current) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === currentResponseIdRef.current ? { ...msg, interrupted: true } : msg,
        ),
      );
    }
  }, []);

  // ─── Microphone & Audio Setup ─────────────────────────────────────────
  const startMicCapture = useCallback(async () => {
    try {
      // Warm up AudioContext inside user gesture (Safari requirement)
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
      }

      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000,
        },
      });

      micStreamRef.current = stream;

      // Add AudioWorklet module
      await audioContextRef.current.audioWorklet.addModule('/pcm-processor-worklet.js');

      // Create worklet node for PCM processing
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(audioContextRef.current, 'pcm-processor');

      // Handle audio chunks
      workletNode.port.onmessage = (event) => {
        const int16Data = event.data as Int16Array;

        if (sessionReadyRef.current) {
          // Live streaming — send directly to xAI
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: 'input_audio_buffer.append',
                audio: audioToBase64(int16Data),
              }),
            );
          }
        } else {
          // Buffer until session is ready
          micBufferRef.current.push(int16Data);
        }
      };

      source.connect(workletNode);
      setIsRecording(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
      updateStatus('error');
    }
  }, [onError, updateStatus]);

  const stopMicCapture = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    setIsRecording(false);
  }, []);

  // ─── WebSocket Management ─────────────────────────────────────────────
  const connect = useCallback(async () => {
    if (status !== 'idle') {
      console.warn('[xAI] Not in idle state, skipping connect');
      return;
    }

    updateStatus('connecting');

    try {
      // Start mic capture in parallel (do NOT wait for WebSocket)
      const micPromise = startMicCapture();

      // Mint ephemeral session token
      const token = await tokenManagerRef.current.getToken();

      // Create WebSocket
      const ws = new WebSocket('wss://api.x.ai/v1/realtime?model=grok-voice-think-fast-1.0', [
        `xai-client-secret.${token}`,
      ]);

      wsRef.current = ws;

      // Connection timeout
      const timeoutHandle = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          const err = new Error('WebSocket connection timeout (10s)');
          setError(err);
          onError?.(err);
          updateStatus('error');
        }
      }, 10000);

      ws.onopen = () => {
        clearTimeout(timeoutHandle);
        console.debug('[xAI] WebSocket open');

        // Send session config
        const config = { ...getDefaultSessionConfig(), ...sessionConfig };
        ws.send(
          JSON.stringify({
            type: 'session.update',
            session: config,
          }),
        );
      };

      ws.onmessage = ({ data }) => {
        try {
          const event = JSON.parse(data) as XaiMessageEvent;
          handleXaiMessage(event);
        } catch (err) {
          console.error('[xAI] Message parsing error:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('[xAI] WebSocket error:', event);
        const err = new Error('WebSocket error');
        setError(err);
        onError?.(err);
        updateStatus('error');
      };

      ws.onclose = () => {
        console.debug('[xAI] WebSocket closed');
        sessionReadyRef.current = false;
        micBufferRef.current = [];
        updateStatus('idle');
      };

      // Wait for mic setup
      await micPromise;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
      updateStatus('error');
      stopMicCapture();
    }
  }, [status, startMicCapture, stopMicCapture, sessionConfig, onError, updateStatus]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    stopMicCapture();
    interruptPlayback();
    sessionReadyRef.current = false;
    micBufferRef.current = [];
    updateStatus('idle');
  }, [stopMicCapture, interruptPlayback, updateStatus]);

  // ─── Message Handler ──────────────────────────────────────────────────
  const handleXaiMessage = useCallback(
    (event: XaiMessageEvent) => {
      const messageIdCounter = messageIdCounterRef.current++;

      switch (event.type) {
        case 'session.created':
          console.debug('[xAI] Session created:', event.session?.id);
          break;

        case 'session.updated':
          console.debug('[xAI] Session updated');
          sessionReadyRef.current = true;
          updateStatus('connected');

          // Flush buffered audio in order
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            for (const chunk of micBufferRef.current) {
              wsRef.current.send(
                JSON.stringify({
                  type: 'input_audio_buffer.append',
                  audio: audioToBase64(chunk),
                }),
              );
            }
            micBufferRef.current = [];
          }
          break;

        case 'input_audio_buffer.speech_started':
          console.debug('[xAI] User started speaking');
          interruptPlayback();
          updateStatus('active');
          break;

        case 'response.created':
          currentResponseIdRef.current = event.response?.id || `resp-${messageIdCounter}`;
          break;

        case 'response.output_audio_transcript.delta':
          // Stream transcript text
          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg?.id === currentResponseIdRef.current && lastMsg.role === 'assistant') {
              return [
                ...prev.slice(0, -1),
                {
                  ...lastMsg,
                  transcript: (lastMsg.transcript || '') + (event.delta || ''),
                },
              ];
            }
            return prev;
          });
          break;

        case 'response.output_audio.delta':
          // Play audio chunk
          playPcmChunk(event.delta as string);
          break;

        case 'conversation.item.input_audio_transcription.completed':
          // User speech transcected
          if (event.transcript) {
            addMessage({
              id: `user-${messageIdCounter}`,
              role: 'user',
              type: 'text',
              content: event.transcript,
              timestamp: Date.now(),
            });
          }
          break;

        case 'response.output_audio_transcript.done':
          // Finalize assistant transcript
          if (currentResponseIdRef.current) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === currentResponseIdRef.current && msg.transcript
                  ? { ...msg, type: 'text', content: msg.transcript }
                  : msg,
              ),
            );
          }
          break;

        case 'response.done':
          console.debug('[xAI] Response done, tokens:', event.usage?.total_tokens);
          currentResponseIdRef.current = null;
          updateStatus('connected');
          break;

        case 'input_audio_buffer.speech_stopped':
          console.debug('[xAI] User stopped speaking');
          break;

        case 'error':
          console.error('[xAI] Error:', event.message);
          const err = new Error(event.message as string);
          setError(err);
          onError?.(err);
          break;

        default:
          console.debug('[xAI] Unhandled event:', event.type);
      }
    },
    [addMessage, interruptPlayback, playPcmChunk, updateStatus, onError],
  );

  // ─── Text Input ────────────────────────────────────────────────────────
  const sendText = useCallback(
    (text: string) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        console.warn('[xAI] WebSocket not open');
        return;
      }

      addMessage({
        id: `user-${messageIdCounterRef.current++}`,
        role: 'user',
        type: 'text',
        content: text,
        timestamp: Date.now(),
      });

      wsRef.current.send(
        JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text }],
          },
        }),
      );

      wsRef.current.send(JSON.stringify({ type: 'response.create' }));
    },
    [addMessage],
  );

  // ─── Cleanup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (autoConnect && status === 'idle') {
      connect();
    }

    return () => {
      // Cleanup on unmount
      disconnect();
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [autoConnect, status, connect, disconnect]);

  return {
    status,
    messages,
    error,
    isRecording,
    connect,
    disconnect,
    sendText,
    clearMessages: () => setMessages([]),
  };
}

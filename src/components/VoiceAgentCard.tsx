/**
 * VoiceAgentCard
 * Mic button + transcript area for xAI Voice Agent
 * Designed to integrate into the capsule modal
 */

import { useState } from "react";
import { Mic, MicOff, MessageCircle, AlertCircle, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useVoiceAgent, VoiceMessage } from "@/hooks/useVoiceAgent";

export interface VoiceAgentCardProps {
  isOpen?: boolean;
  onTranscript?: (text: string) => void;
  className?: string;
}

interface TranscriptMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  interrupted?: boolean;
}

export function VoiceAgentCard({
  isOpen = true,
  onTranscript,
  className = "",
}: VoiceAgentCardProps) {
  const { status, messages, error, isRecording, connect, disconnect, sendText, clearMessages } =
    useVoiceAgent();

  const [localMessages, setLocalMessages] = useState<TranscriptMessage[]>([]);

  // Convert xAI messages to transcript display
  const displayMessages = messages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    text: msg.transcript || msg.content,
    interrupted: msg.interrupted,
  }));

  const handleMicToggle = async () => {
    if (status === "idle" || status === "error") {
      await connect();
    } else {
      disconnect();
    }
  };

  const handleClearChat = () => {
    clearMessages();
    setLocalMessages([]);
  };

  const isConnecting = status === "connecting";
  const isActive = status === "active" || status === "connected";
  const hasError = status === "error";

  return (
    <div className={`flex flex-col h-full w-full ${className}`}>
      {/* Header */}
      <div className="border-b bg-background/50 backdrop-blur px-4 py-3 flex items-center justify-between rounded-t-lg">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-blue-500" />
          <span className="font-semibold text-sm">SingulAI Voice Agent</span>
          <span
            className={`ml-2 text-xs font-medium px-2 py-1 rounded-full ${
              status === "idle"
                ? "bg-slate-200 text-slate-700"
                : isConnecting
                  ? "bg-blue-200 text-blue-700 animate-pulse"
                  : isActive
                    ? "bg-green-200 text-green-700"
                    : hasError
                      ? "bg-red-200 text-red-700"
                      : "bg-slate-200 text-slate-700"
            }`}
          >
            {status === "idle"
              ? "Ready"
              : isConnecting
                ? "Connecting..."
                : isActive
                  ? "Listening"
                  : hasError
                    ? "Error"
                    : status}
          </span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleClearChat}
          disabled={displayMessages.length === 0}
          className="text-xs"
        >
          Clear
        </Button>
      </div>

      {/* Transcript Area */}
      <ScrollArea className="flex-1 p-4 border-b">
        <div className="space-y-3">
          {displayMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <Mic className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">Click the mic to start listening...</p>
            </div>
          ) : (
            displayMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 text-sm ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs rounded-lg px-3 py-2 ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : msg.interrupted
                        ? "bg-slate-200 text-slate-700 opacity-50"
                        : "bg-slate-100 text-slate-900"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Error Display */}
      {hasError && error && (
        <div className="border-b bg-red-50 px-4 py-2 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <span className="text-xs text-red-700">{error.message}</span>
        </div>
      )}

      {/* Footer — Mic Button + Recording Indicator */}
      <div className="border-t bg-background/50 backdrop-blur px-4 py-3 flex items-center justify-center gap-3 rounded-b-lg">
        <Button
          size="lg"
          onClick={handleMicToggle}
          disabled={isConnecting}
          className={`rounded-full w-14 h-14 p-0 transition-all ${
            isActive
              ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
              : isConnecting
                ? "bg-blue-400 text-white"
                : hasError
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
          title={
            status === "idle" || status === "error"
              ? "Start listening"
              : isConnecting
                ? "Connecting..."
                : "Stop listening"
          }
        >
          {isConnecting ? (
            <Loader className="w-6 h-6 animate-spin" />
          ) : isActive ? (
            <MicOff className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </Button>

        {/* Recording Indicator */}
        {isActive && <span className="text-xs text-slate-500">Listening...</span>}
      </div>
    </div>
  );
}

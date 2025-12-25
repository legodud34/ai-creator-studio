import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, MicOff, Phone, PhoneOff, Send, Volume2 } from "lucide-react";
import { useRealtimeVoice } from "@/hooks/useRealtimeVoice";
import { cn } from "@/lib/utils";

const VoiceChat = () => {
  const [textInput, setTextInput] = useState("");
  const {
    isConnected,
    isConnecting,
    isSpeaking,
    transcript,
    connect,
    disconnect,
    sendTextMessage,
  } = useRealtimeVoice();

  const handleSendText = () => {
    if (textInput.trim()) {
      sendTextMessage(textInput);
      setTextInput("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Voice Visualization */}
      <div className="glass rounded-2xl p-6 md:p-8 flex flex-col items-center justify-center min-h-[280px]">
        {/* Animated Voice Circle */}
        <div
          className={cn(
            "relative w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center transition-all duration-500",
            isConnected
              ? isSpeaking
                ? "gradient-primary animate-glow scale-110"
                : "bg-secondary"
              : "bg-muted"
          )}
        >
          {/* Pulse rings when speaking */}
          {isSpeaking && (
            <>
              <div className="absolute inset-0 rounded-full gradient-primary opacity-30 animate-ping" />
              <div className="absolute inset-[-8px] md:inset-[-10px] rounded-full border-2 border-primary/30 animate-pulse" />
            </>
          )}
          
          {isConnecting ? (
            <div className="w-6 h-6 md:w-8 md:h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : isConnected ? (
            isSpeaking ? (
              <Volume2 className="w-10 h-10 md:w-12 md:h-12 text-primary-foreground animate-pulse" />
            ) : (
              <Mic className="w-10 h-10 md:w-12 md:h-12 text-foreground/80" />
            )
          ) : (
            <MicOff className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground" />
          )}
        </div>

        {/* Status Text */}
        <p className="mt-4 md:mt-6 text-base md:text-lg font-medium text-center px-4">
          {isConnecting
            ? "Connecting..."
            : isConnected
            ? isSpeaking
              ? "AI is speaking..."
              : "Listening... speak anytime"
            : "Tap to start voice chat"}
        </p>

        {/* Connect/Disconnect Button */}
        <Button
          onClick={isConnected ? disconnect : connect}
          disabled={isConnecting}
          size="lg"
          className={cn(
            "mt-4 md:mt-6 h-12 md:h-14 px-6 md:px-8 text-base md:text-lg font-semibold rounded-full transition-all",
            isConnected
              ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              : "gradient-primary text-primary-foreground glow-primary"
          )}
        >
          {isConnected ? (
            <>
              <PhoneOff className="w-5 h-5 mr-2" />
              End Chat
            </>
          ) : (
            <>
              <Phone className="w-5 h-5 mr-2" />
              Start Voice Chat
            </>
          )}
        </Button>
      </div>

      {/* Transcript */}
      {transcript && (
        <div className="glass rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-2">AI Response:</p>
          <p className="text-foreground text-sm md:text-base">{transcript}</p>
        </div>
      )}

      {/* Text Input (alternative to voice) */}
      {isConnected && (
        <div className="glass rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-3">Or type a message:</p>
          <div className="flex gap-2">
            <Input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type your message..."
              className="bg-background/50 border-border/50"
              onKeyDown={(e) => e.key === "Enter" && handleSendText()}
            />
            <Button
              onClick={handleSendText}
              disabled={!textInput.trim()}
              className="gradient-accent text-accent-foreground shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Tips */}
      {!isConnected && (
        <div className="text-center text-sm text-muted-foreground space-y-1 px-4">
          <p>💡 Voice chat lets you have natural conversations with AI</p>
        </div>
      )}
    </div>
  );
};

export default VoiceChat;

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, Phone, PhoneOff, Send, Volume2, User, Bot } from "lucide-react";
import { useRealtimeVoice, Message } from "@/hooks/useRealtimeVoice";
import { cn } from "@/lib/utils";

const VoiceChat = () => {
  const [textInput, setTextInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const {
    isConnected,
    isConnecting,
    isSpeaking,
    isListening,
    messages,
    currentTranscript,
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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentTranscript]);

  return (
    <div className="space-y-4">
      {/* Voice Visualization */}
      <div className="glass rounded-2xl p-6 flex flex-col items-center justify-center">
        {/* Animated Voice Circle */}
        <div
          className={cn(
            "relative w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center transition-all duration-500",
            isConnected
              ? isSpeaking
                ? "gradient-primary animate-glow scale-110"
                : isListening
                ? "bg-green-500/20 border-2 border-green-500"
                : "bg-secondary"
              : "bg-muted"
          )}
        >
          {/* Pulse rings when speaking */}
          {isSpeaking && (
            <>
              <div className="absolute inset-0 rounded-full gradient-primary opacity-30 animate-ping" />
              <div className="absolute inset-[-8px] rounded-full border-2 border-primary/30 animate-pulse" />
            </>
          )}
          
          {/* Listening pulse */}
          {isListening && !isSpeaking && (
            <div className="absolute inset-[-4px] rounded-full border-2 border-green-500/50 animate-pulse" />
          )}
          
          {isConnecting ? (
            <div className="w-6 h-6 md:w-8 md:h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : isConnected ? (
            isSpeaking ? (
              <Volume2 className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground animate-pulse" />
            ) : isListening ? (
              <Mic className="w-8 h-8 md:w-10 md:h-10 text-green-500" />
            ) : (
              <Mic className="w-8 h-8 md:w-10 md:h-10 text-foreground/80" />
            )
          ) : (
            <MicOff className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground" />
          )}
        </div>

        {/* Status Text */}
        <p className="mt-3 text-sm md:text-base font-medium text-center">
          {isConnecting
            ? "Connecting..."
            : isConnected
            ? isSpeaking
              ? "AI is speaking..."
              : isListening
              ? "Listening..."
              : "Ready"
            : "Start a voice conversation"}
        </p>

        {/* Connect/Disconnect Button */}
        <Button
          onClick={isConnected ? disconnect : connect}
          disabled={isConnecting}
          size="lg"
          className={cn(
            "mt-4 h-11 px-6 text-base font-semibold rounded-full transition-all",
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

      {/* Chat Messages */}
      {isConnected && (
        <div className="glass rounded-xl overflow-hidden">
          <div className="p-3 border-b border-border/50">
            <h3 className="text-sm font-medium text-muted-foreground">Conversation</h3>
          </div>
          
          <ScrollArea className="h-[300px] p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.length === 0 && !currentTranscript && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Start speaking or type a message...
                </p>
              )}
              
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              
              {/* Current streaming response */}
              {currentTranscript && (
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="bg-secondary/50 rounded-2xl rounded-tl-sm px-4 py-2 max-w-[80%]">
                    <p className="text-sm">{currentTranscript}</p>
                    <span className="inline-block w-1 h-4 bg-primary animate-pulse ml-0.5" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          {/* Text Input */}
          <div className="p-3 border-t border-border/50">
            <div className="flex gap-2">
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type a message..."
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
        </div>
      )}

      {/* Tips when not connected */}
      {!isConnected && (
        <div className="text-center text-sm text-muted-foreground space-y-1 px-4">
          <p>🎤 Speak naturally - the AI will respond with voice</p>
          <p>⌨️ Or type messages while connected</p>
        </div>
      )}
    </div>
  );
};

const MessageBubble = ({ message }: { message: Message }) => {
  const isUser = message.role === "user";
  
  return (
    <div className={cn("flex gap-3 items-start", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
          isUser ? "bg-accent" : "gradient-primary"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-accent-foreground" />
        ) : (
          <Bot className="w-4 h-4 text-primary-foreground" />
        )}
      </div>
      <div
        className={cn(
          "rounded-2xl px-4 py-2 max-w-[80%]",
          isUser
            ? "bg-accent text-accent-foreground rounded-tr-sm"
            : "bg-secondary/50 rounded-tl-sm"
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
};

export default VoiceChat;

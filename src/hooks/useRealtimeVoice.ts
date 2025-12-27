import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface RealtimeVoiceState {
  isConnected: boolean;
  isConnecting: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  messages: Message[];
  currentTranscript: string;
}

export const useRealtimeVoice = () => {
  const [state, setState] = useState<RealtimeVoiceState>({
    isConnected: false,
    isConnecting: false,
    isSpeaking: false,
    isListening: false,
    messages: [],
    currentTranscript: "",
  });

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const currentAssistantMessageRef = useRef<string>("");
  const currentUserTranscriptRef = useRef<string>("");
  const { toast } = useToast();

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isConnecting: true }));

    try {
      // Get ephemeral token from edge function
      const { data, error } = await supabase.functions.invoke("realtime-session", {
        body: {
          instructions: "You are a helpful, friendly AI assistant. Have natural conversations with the user. Be concise but warm. When the user speaks, listen carefully and respond thoughtfully."
        },
      });

      if (error || data.error) {
        throw new Error(data?.error || error?.message || "Failed to create session");
      }

      const EPHEMERAL_KEY = data.client_secret?.value;
      if (!EPHEMERAL_KEY) {
        throw new Error("No ephemeral key received");
      }

      // Create audio element
      if (!audioElRef.current) {
        audioElRef.current = document.createElement("audio");
        audioElRef.current.autoplay = true;
      }

      // Create peer connection (include a public STUN server so ICE completes reliably)
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      pc.onconnectionstatechange = () => {
        console.log("WebRTC connection state:", pc.connectionState);
      };
      pc.oniceconnectionstatechange = () => {
        console.log("WebRTC ICE connection state:", pc.iceConnectionState);
      };
      pc.onicegatheringstatechange = () => {
        console.log("WebRTC ICE gathering state:", pc.iceGatheringState);
      };

      // Set up remote audio
      pc.ontrack = (e) => {
        console.log("Received remote audio track");
        if (audioElRef.current) {
          audioElRef.current.srcObject = e.streams[0];
          // Some browsers require an explicit play() even with autoplay=true
          audioElRef.current.play().catch(() => {
            // ignore - user gesture already happened on the connect click
          });
        }
      };

      // Add local audio track
      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      pc.addTrack(ms.getTracks()[0]);

      // Set up data channel
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      const sendSessionUpdate = () => {
        // Ensure voice/text + server-side VAD are enabled so speaking triggers responses
        const sessionUpdate = {
          type: "session.update",
          session: {
            modalities: ["text", "audio"],
            instructions:
              "You are a helpful, friendly AI assistant. Have natural conversations with the user. Be concise but warm.",
            input_audio_transcription: { model: "whisper-1" },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 900,
            },
          },
        };

        try {
          dc.send(JSON.stringify(sessionUpdate));
          console.log("Sent session.update");
        } catch (err) {
          console.warn("Failed to send session.update", err);
        }
      };

      dc.addEventListener("open", () => {
        console.log("Data channel opened");
        sendSessionUpdate();
        setState((prev) => ({ ...prev, isListening: true }));
      });

      dc.addEventListener("close", () => {
        console.log("Data channel closed");
      });

      dc.addEventListener("error", (e) => {
        console.log("Data channel error", e);
      });

      dc.addEventListener("message", (e) => {
        const event = JSON.parse(e.data);
        console.log("Received event:", event.type, event);

        switch (event.type) {
          case "response.audio.delta":
            setState((prev) => ({ ...prev, isSpeaking: true, isListening: false }));
            break;

          case "response.audio.done":
            setState((prev) => ({ ...prev, isSpeaking: false }));
            break;

          // Some sessions stream text via response.text.* instead of audio transcript events
          case "response.text.delta":
          case "response.output_text.delta":
            currentAssistantMessageRef.current += event.delta || "";
            setState((prev) => ({
              ...prev,
              currentTranscript: currentAssistantMessageRef.current,
            }));
            break;

          case "response.text.done":
          case "response.output_text.done":
          case "response.audio_transcript.done":
            if (currentAssistantMessageRef.current.trim()) {
              const newMessage: Message = {
                id: crypto.randomUUID(),
                role: "assistant",
                content: currentAssistantMessageRef.current.trim(),
                timestamp: new Date(),
              };
              setState((prev) => ({
                ...prev,
                messages: [...prev.messages, newMessage],
                currentTranscript: "",
              }));
            }
            currentAssistantMessageRef.current = "";
            break;

          case "response.audio_transcript.delta":
            currentAssistantMessageRef.current += event.delta || "";
            setState((prev) => ({
              ...prev,
              currentTranscript: currentAssistantMessageRef.current,
            }));
            break;

          case "conversation.item.input_audio_transcription.completed":
            if (event.transcript?.trim()) {
              const userMessage: Message = {
                id: crypto.randomUUID(),
                role: "user",
                content: event.transcript.trim(),
                timestamp: new Date(),
              };
              setState((prev) => ({
                ...prev,
                messages: [...prev.messages, userMessage],
              }));
            }
            break;

          case "input_audio_buffer.speech_started":
            setState((prev) => ({ ...prev, isListening: true }));
            break;

          case "input_audio_buffer.speech_stopped":
            setState((prev) => ({ ...prev, isListening: false }));
            break;

          case "response.done":
            setState((prev) => ({ ...prev, isSpeaking: false, isListening: true }));
            break;

          case "error":
            console.error("Realtime API error:", event.error);
            toast({
              title: "Error",
              description: event.error?.message || "An error occurred",
              variant: "destructive",
            });
            break;
        }
      });

      // Create and set local description
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait until ICE gathering is complete so the SDP includes candidates
      await new Promise<void>((resolve) => {
        if (!pcRef.current) return resolve();
        if (pc.iceGatheringState === "complete") return resolve();

        const onStateChange = () => {
          if (pc.iceGatheringState === "complete") {
            pc.removeEventListener("icegatheringstatechange", onStateChange);
            resolve();
          }
        };

        pc.addEventListener("icegatheringstatechange", onStateChange);

        // Safety timeout
        setTimeout(() => {
          pc.removeEventListener("icegatheringstatechange", onStateChange);
          resolve();
        }, 2500);
      });

      // Connect to OpenAI's Realtime API
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: pc.localDescription?.sdp || offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp",
        },
      });

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        console.error("WebRTC connection failed:", errorText);
        throw new Error("Failed to establish WebRTC connection");
      }

      const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
      };

      await pc.setRemoteDescription(answer);

      setState((prev) => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        messages: [],
        currentTranscript: "",
      }));

      toast({
        title: "Connected",
        description: "Voice chat is ready. Start speaking or type a message.",
      });
    } catch (error) {
      console.error("Error connecting:", error);
      setState((prev) => ({ ...prev, isConnecting: false }));
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Failed to connect",
        variant: "destructive",
      });
    }
  }, [toast]);

  const disconnect = useCallback(() => {
    try {
      // Stop local mic tracks
      const pc = pcRef.current;
      pc?.getSenders().forEach((sender) => sender.track?.stop());
    } catch {
      // ignore
    }

    dcRef.current?.close();
    pcRef.current?.close();
    dcRef.current = null;
    pcRef.current = null;

    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
    }

    currentAssistantMessageRef.current = "";
    currentUserTranscriptRef.current = "";

    setState({
      isConnected: false,
      isConnecting: false,
      isSpeaking: false,
      isListening: false,
      messages: [],
      currentTranscript: "",
    });

    toast({
      title: "Disconnected",
      description: "Voice chat ended.",
    });
  }, [toast]);

  const sendTextMessage = useCallback((text: string) => {
    if (!dcRef.current || dcRef.current.readyState !== "open") {
      toast({
        title: "Not connected",
        description: "Please connect first.",
        variant: "destructive",
      });
      return;
    }

    // Add user message to chat
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      currentTranscript: "",
    }));

    const event = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    };

    dcRef.current.send(JSON.stringify(event));
    dcRef.current.send(JSON.stringify({ type: "response.create" }));
  }, [toast]);

  return {
    ...state,
    connect,
    disconnect,
    sendTextMessage,
  };
};

import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RealtimeVoiceState {
  isConnected: boolean;
  isConnecting: boolean;
  isSpeaking: boolean;
  transcript: string;
}

export const useRealtimeVoice = () => {
  const [state, setState] = useState<RealtimeVoiceState>({
    isConnected: false,
    isConnecting: false,
    isSpeaking: false,
    transcript: "",
  });

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isConnecting: true }));

    try {
      // Get ephemeral token from edge function
      const { data, error } = await supabase.functions.invoke("realtime-session", {
        body: {},
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

      // Create peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Set up remote audio
      pc.ontrack = (e) => {
        if (audioElRef.current) {
          audioElRef.current.srcObject = e.streams[0];
        }
      };

      // Add local audio track
      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      pc.addTrack(ms.getTracks()[0]);

      // Set up data channel
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.addEventListener("message", (e) => {
        const event = JSON.parse(e.data);
        console.log("Received event:", event.type);

        if (event.type === "response.audio.delta") {
          setState((prev) => ({ ...prev, isSpeaking: true }));
        } else if (event.type === "response.audio.done") {
          setState((prev) => ({ ...prev, isSpeaking: false }));
        } else if (event.type === "response.audio_transcript.delta") {
          setState((prev) => ({
            ...prev,
            transcript: prev.transcript + (event.delta || ""),
          }));
        } else if (event.type === "response.done") {
          setState((prev) => ({ ...prev, isSpeaking: false }));
        }
      });

      // Create and set local description
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Connect to OpenAI's Realtime API
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp",
        },
      });

      if (!sdpResponse.ok) {
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
        transcript: "",
      }));

      toast({
        title: "Connected",
        description: "Voice chat is ready. Start speaking!",
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
    dcRef.current?.close();
    pcRef.current?.close();
    dcRef.current = null;
    pcRef.current = null;

    setState({
      isConnected: false,
      isConnecting: false,
      isSpeaking: false,
      transcript: "",
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
    setState((prev) => ({ ...prev, transcript: "" }));
  }, [toast]);

  return {
    ...state,
    connect,
    disconnect,
    sendTextMessage,
  };
};

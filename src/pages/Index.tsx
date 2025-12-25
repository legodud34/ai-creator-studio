import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image, Mic, Wand2 } from "lucide-react";
import ImageGenerator from "@/components/ImageGenerator";
import VoiceChat from "@/components/VoiceChat";

const Index = () => {
  const [activeTab, setActiveTab] = useState("images");

  return (
    <div className="min-h-screen gradient-surface">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-accent/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
            <Wand2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Creative AI Studio</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient">Create</span>{" "}
            <span className="text-foreground">with AI</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Generate stunning images and have creative voice conversations. 
            Your personal AI-powered creative assistant.
          </p>
        </header>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto h-14 p-1 glass">
            <TabsTrigger
              value="images"
              className="h-full text-base font-medium data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground rounded-lg transition-all"
            >
              <Image className="w-5 h-5 mr-2" />
              Images
            </TabsTrigger>
            <TabsTrigger
              value="voice"
              className="h-full text-base font-medium data-[state=active]:gradient-accent data-[state=active]:text-accent-foreground rounded-lg transition-all"
            >
              <Mic className="w-5 h-5 mr-2" />
              Voice Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="images" className="mt-8">
            <ImageGenerator />
          </TabsContent>

          <TabsContent value="voice" className="mt-8">
            <VoiceChat />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <footer className="mt-16 text-center text-sm text-muted-foreground">
          <p>Powered by AI • Your creations are not stored on servers</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;

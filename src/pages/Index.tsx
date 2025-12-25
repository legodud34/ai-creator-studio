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
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-accent/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 container max-w-4xl mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <header className="text-center mb-8 md:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass mb-4 md:mb-6">
            <Wand2 className="w-4 h-4 text-primary" />
            <span className="text-xs md:text-sm font-medium">Creative AI Studio</span>
          </div>
          
          <h1 className="text-3xl md:text-5xl font-bold mb-3 md:mb-4">
            <span className="text-gradient">Create</span>{" "}
            <span className="text-foreground">with AI</span>
          </h1>
          
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto px-4">
            Generate stunning images and have creative voice conversations.
          </p>
        </header>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 w-full max-w-sm mx-auto h-12 md:h-14 p-1 glass">
            <TabsTrigger
              value="images"
              className="h-full text-sm md:text-base font-medium data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground rounded-lg transition-all"
            >
              <Image className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Images
            </TabsTrigger>
            <TabsTrigger
              value="voice"
              className="h-full text-sm md:text-base font-medium data-[state=active]:gradient-accent data-[state=active]:text-accent-foreground rounded-lg transition-all"
            >
              <Mic className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Voice
            </TabsTrigger>
          </TabsList>

          <TabsContent value="images" className="mt-6 md:mt-8">
            <ImageGenerator />
          </TabsContent>

          <TabsContent value="voice" className="mt-6 md:mt-8">
            <VoiceChat />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <footer className="mt-12 md:mt-16 text-center text-xs md:text-sm text-muted-foreground pb-6">
          <p>Powered by AI</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Video, Bookmark, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const ONBOARDING_KEY = "afterglow_onboarding_completed";

const steps = [
  {
    icon: Sparkles,
    title: "Generate AI Images",
    description: "Create stunning images from text descriptions. Just type what you imagine and watch it come to life.",
    color: "text-primary",
  },
  {
    icon: Video,
    title: "Create AI Videos",
    description: "Generate videos up to 90 minutes long. Perfect for shorts, clips, or even full-length movies.",
    color: "text-accent",
  },
  {
    icon: Bookmark,
    title: "Save Custom Words",
    description: "Use [word: definition] syntax to save custom terms. Type 'quackadilla' and the AI knows what you mean!",
    color: "text-primary",
  },
];

const OnboardingDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    // Only show onboarding for logged-in users who haven't completed it
    if (user) {
      const completed = localStorage.getItem(ONBOARDING_KEY);
      if (!completed) {
        // Small delay so it doesn't pop up immediately
        const timer = setTimeout(() => setIsOpen(true), 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setIsOpen(false);
  };

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setIsOpen(false);
  };

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md glass border-border/50">
        <DialogHeader className="text-center space-y-4">
          <div className={`mx-auto w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center ${currentStepData.color}`}>
            <Icon className="w-8 h-8" />
          </div>
          <DialogTitle className="text-xl">{currentStepData.title}</DialogTitle>
          <DialogDescription className="text-base">
            {currentStepData.description}
          </DialogDescription>
        </DialogHeader>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 py-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStep ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleSkip} className="flex-1">
            Skip
          </Button>
          <Button onClick={handleNext} className="flex-1 gradient-primary text-primary-foreground">
            {currentStep < steps.length - 1 ? (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            ) : (
              "Get Started"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingDialog;

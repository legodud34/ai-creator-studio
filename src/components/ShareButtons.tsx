import { useState } from "react";
import { Share2, Twitter, Facebook, Link2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface ShareButtonsProps {
  url: string;
  title: string;
  compact?: boolean;
}

const ShareButtons = ({ url, title, compact = false }: ShareButtonsProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const shareUrl = encodeURIComponent(url);
  const shareTitle = encodeURIComponent(title);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Share link has been copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  const shareToTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${shareTitle}&url=${shareUrl}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const shareToFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url,
        });
      } catch (error) {
        // User cancelled or error
        console.log("Share cancelled");
      }
    }
  };

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Share2 className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="glass border-border/50">
          <DropdownMenuItem onClick={copyToClipboard} className="cursor-pointer">
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
            Copy link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={shareToTwitter} className="cursor-pointer">
            <Twitter className="w-4 h-4 mr-2" />
            Share to X
          </DropdownMenuItem>
          <DropdownMenuItem onClick={shareToFacebook} className="cursor-pointer">
            <Facebook className="w-4 h-4 mr-2" />
            Share to Facebook
          </DropdownMenuItem>
          {navigator.share && (
            <DropdownMenuItem onClick={handleNativeShare} className="cursor-pointer">
              <Share2 className="w-4 h-4 mr-2" />
              More options
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={copyToClipboard}
        className="glass border-border/50 h-9"
      >
        {copied ? <Check className="w-4 h-4 mr-1" /> : <Link2 className="w-4 h-4 mr-1" />}
        {copied ? "Copied!" : "Copy"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={shareToTwitter}
        className="glass border-border/50 h-9"
      >
        <Twitter className="w-4 h-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={shareToFacebook}
        className="glass border-border/50 h-9"
      >
        <Facebook className="w-4 h-4" />
      </Button>
      {navigator.share && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleNativeShare}
          className="glass border-border/50 h-9"
        >
          <Share2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};

export default ShareButtons;

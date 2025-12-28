import { Button } from "@/components/ui/button";
import { X, Bookmark } from "lucide-react";
import { useSavedWords } from "@/hooks/useSavedWords";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SavedWordsBarProps {
  onWordClick: (word: string) => void;
}

const SavedWordsBar = ({ onWordClick }: SavedWordsBarProps) => {
  const { savedWords, removeWord } = useSavedWords();

  if (savedWords.length === 0) {
    return (
      <div className="text-xs text-muted-foreground/70 flex items-center gap-2">
        <Bookmark className="w-3 h-3" />
        <span>Use <code className="bg-muted px-1 rounded">[word: definition]</code> in prompts to save custom words</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Bookmark className="w-3 h-3" />
        <span>Saved Words (click to insert)</span>
      </div>
      
      <TooltipProvider>
        <div className="flex flex-wrap gap-2">
          {savedWords.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <div className="group flex items-center gap-1 bg-secondary/50 hover:bg-secondary/80 rounded-full px-3 py-1 text-sm transition-colors cursor-pointer">
                  <button
                    onClick={() => onWordClick(item.word)}
                    className="hover:text-primary transition-colors"
                  >
                    {item.word}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeWord(item.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-all ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </TooltipTrigger>
              {item.definition && (
                <TooltipContent>
                  <p className="max-w-xs">{item.definition}</p>
                </TooltipContent>
              )}
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
};

export default SavedWordsBar;

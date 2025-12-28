import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Bookmark } from "lucide-react";
import { useSavedWords } from "@/hooks/useSavedWords";

interface SavedWordsBarProps {
  onWordClick: (word: string) => void;
}

const SavedWordsBar = ({ onWordClick }: SavedWordsBarProps) => {
  const { savedWords, saveWord, removeWord } = useSavedWords();
  const [isAdding, setIsAdding] = useState(false);
  const [newWord, setNewWord] = useState("");

  const handleAdd = () => {
    if (newWord.trim()) {
      saveWord(newWord.trim());
      setNewWord("");
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAdd();
    } else if (e.key === "Escape") {
      setIsAdding(false);
      setNewWord("");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Bookmark className="w-3 h-3" />
        <span>Saved Words</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {savedWords.map((item) => (
          <div
            key={item.id}
            className="group flex items-center gap-1 bg-secondary/50 hover:bg-secondary/80 rounded-full px-3 py-1 text-sm transition-colors cursor-pointer"
          >
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
        ))}
        
        {isAdding ? (
          <div className="flex items-center gap-1">
            <Input
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (!newWord.trim()) {
                  setIsAdding(false);
                }
              }}
              placeholder="Enter word..."
              className="h-7 w-32 text-sm px-2"
              autoFocus
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleAdd}
              className="h-7 w-7 p-0"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="h-7 rounded-full px-3 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add
          </Button>
        )}
      </div>
    </div>
  );
};

export default SavedWordsBar;

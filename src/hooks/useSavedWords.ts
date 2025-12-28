import { useState, useEffect } from "react";

const STORAGE_KEY = "afterglow_saved_words";

export interface SavedWord {
  id: string;
  word: string;
  createdAt: Date;
}

export const useSavedWords = () => {
  const [savedWords, setSavedWords] = useState<SavedWord[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSavedWords(parsed.map((w: any) => ({
          ...w,
          createdAt: new Date(w.createdAt),
        })));
      } catch (e) {
        console.error("Failed to parse saved words:", e);
      }
    }
  }, []);

  const saveWord = (word: string) => {
    const trimmed = word.trim();
    if (!trimmed) return;
    
    // Check if word already exists
    if (savedWords.some(w => w.word.toLowerCase() === trimmed.toLowerCase())) {
      return;
    }

    const newWord: SavedWord = {
      id: crypto.randomUUID(),
      word: trimmed,
      createdAt: new Date(),
    };

    const updated = [newWord, ...savedWords];
    setSavedWords(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const removeWord = (id: string) => {
    const updated = savedWords.filter(w => w.id !== id);
    setSavedWords(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const clearAll = () => {
    setSavedWords([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    savedWords,
    saveWord,
    removeWord,
    clearAll,
  };
};

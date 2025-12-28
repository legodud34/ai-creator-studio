import { useState, useEffect } from "react";

const STORAGE_KEY = "afterglow_saved_words";

export interface SavedWord {
  id: string;
  word: string;
  definition?: string;
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

  const saveWord = (word: string, definition?: string) => {
    const trimmed = word.trim().toLowerCase();
    if (!trimmed) return;
    
    // Check if word already exists - update definition if so
    const existingIndex = savedWords.findIndex(w => w.word.toLowerCase() === trimmed);
    
    if (existingIndex >= 0) {
      // Update existing word's definition
      const updated = [...savedWords];
      updated[existingIndex] = {
        ...updated[existingIndex],
        definition: definition || updated[existingIndex].definition,
      };
      setSavedWords(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return;
    }

    const newWord: SavedWord = {
      id: crypto.randomUUID(),
      word: trimmed,
      definition,
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

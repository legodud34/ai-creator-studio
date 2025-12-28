// Utility functions for parsing and expanding saved words in prompts
// Syntax: [word: definition] to define, just use the word to expand

export interface ParsedWord {
  word: string;
  definition: string;
}

// Parse bracket syntax like [quackadilla: a duck-shaped quesadilla]
export const parseBracketDefinitions = (prompt: string): { cleanPrompt: string; newWords: ParsedWord[] } => {
  const bracketPattern = /\[([^:\]]+):\s*([^\]]+)\]/g;
  const newWords: ParsedWord[] = [];
  
  let cleanPrompt = prompt;
  let match;
  
  while ((match = bracketPattern.exec(prompt)) !== null) {
    const word = match[1].trim().toLowerCase();
    const definition = match[2].trim();
    
    if (word && definition) {
      newWords.push({ word, definition });
    }
  }
  
  // Remove bracket definitions from prompt, leaving just the word
  cleanPrompt = prompt.replace(bracketPattern, (_, word) => word.trim());
  
  return { cleanPrompt, newWords };
};

// Expand saved words in prompt with their definitions
export const expandSavedWords = (
  prompt: string, 
  savedWords: Array<{ word: string; definition?: string }>
): string => {
  let expandedPrompt = prompt;
  
  for (const saved of savedWords) {
    if (!saved.definition) continue;
    
    // Create case-insensitive pattern for the word
    const wordPattern = new RegExp(`\\b${escapeRegex(saved.word)}\\b`, 'gi');
    
    // Replace word with "word (definition)"
    expandedPrompt = expandedPrompt.replace(wordPattern, `${saved.word} (${saved.definition})`);
  }
  
  return expandedPrompt;
};

// Escape special regex characters
const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

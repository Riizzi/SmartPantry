// Centralized Gemini Model constant
export const GEMINI_MODEL =
  (typeof process !== 'undefined' && process.env?.GEMINI_MODEL) || 'gemini-3.8-flash';

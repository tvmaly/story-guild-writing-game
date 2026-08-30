export function countWords(text: string): number {
  const normalized = text.trim();
  return normalized === '' ? 0 : normalized.split(/\s+/u).length;
}

export function countStoryArtifact(storyText: string): number {
  return countWords(storyText);
}

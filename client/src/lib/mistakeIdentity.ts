// Answer attempts share one notebook entry; changing the selected wrong answer
// must not change the identity of the question.
export const mistakeIdentity = (m: any): string => JSON.stringify([
  m.subject || m.question?.subject || 'General',
  m.topic || m.question?.topic || 'General Topic',
  m.questionText || m.question?.questionText || m.question?.text || m.topic || 'Practice Question',
  m.correctAnswer || m.question?.options?.find((o: any) => o.isCorrect)?.text || '',
].map(value => String(value).trim().replace(/\s+/g, ' ')));

export function uniqueMistakes<T>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = mistakeIdentity(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

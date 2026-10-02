export const publishedFilter = {status: {$ne: 'draft'}};
export function safeMediaUrl(value: unknown): boolean {
  try { const url = new URL(String(value)); return ['https:', 'http:'].includes(url.protocol); }
  catch { return false; }
}

export function validateLesson(body: any) {
  const text = (key: string, fallback = '') => typeof body[key] === 'string' ? body[key].trim() : fallback;
  const parse = (key: string, fallback: any) => typeof body[key] === 'string' ? JSON.parse(body[key]) : body[key] ?? fallback;
  const title = text('title'), description = text('description'), topic = text('topic', 'General');
  if (!title || !description || !topic) throw Error('Enter a lesson title, topic and description.');
  const subject = text('subject'), stream = text('stream');
  if (!['Physics','Chemistry','Biology','Combined Maths','ICT'].includes(subject)) throw Error('Select a subject.');
  if (!['Physical Science','Biological Science','Maths','Bio','Both','Non-stream'].includes(stream)) throw Error('Select a stream.');
  const medium = text('medium','English'), syllabus = text('syllabus','current'), status = text('status','published');
  if (!['English','Sinhala','Tamil'].includes(medium) || !['current','old'].includes(syllabus) || !['draft','published'].includes(status)) throw Error('Select a valid medium, syllabus and publishing status.');
  const numeric = (key: string, fallback: number, min: number, max: number) => {
    const value = Number(body[key] ?? fallback);
    if (!Number.isInteger(value) || value < min || value > max) throw Error('Enter valid lesson order and study time.');
    return value;
  };
  const quiz = parse('quizJson', []), videos = parse('videosJson', []), relatedPaperIds = parse('relatedPaperIds', []);
  if (!Array.isArray(quiz) || quiz.length > 100 || quiz.some(q => !q || typeof q.questionText !== 'string' || !q.questionText.trim() || !Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6 || q.options.some((o: any) => typeof o !== 'string' || !o.trim()) || !Number.isInteger(q.correctOptionIndex) || q.correctOptionIndex < 0 || q.correctOptionIndex >= q.options.length || (q.explanation != null && typeof q.explanation !== 'string'))) throw Error('Each quiz question needs text, at least two answers and a valid correct answer.');
  if (!Array.isArray(videos) || videos.length > 20 || videos.some(v => !v || typeof v.title !== 'string' || !v.title.trim() || !safeMediaUrl(v.url))) throw Error('Each video needs a title and an HTTP or HTTPS link.');
  if (!Array.isArray(relatedPaperIds) || relatedPaperIds.length > 30 || relatedPaperIds.some(id => typeof id !== 'string' || !/^[a-f\d]{24}$/i.test(id))) throw Error('Select valid related papers.');
  return {title, description, subject, stream, topic, medium, syllabus, status,
    topicOrder: numeric('topicOrder',1,0,1000), lessonOrder: numeric('lessonOrder',1,0,1000), estimatedMinutes: numeric('estimatedMinutes',15,1,600),
    quiz, videos, relatedPaperIds, videoUrl: ''};
}

export function gradeLesson(quiz: any[], answers: unknown) {
  if (!Array.isArray(answers) || answers.length !== quiz.length || answers.some((answer,index) => !Number.isInteger(answer) || answer < 0 || answer >= quiz[index].options.length)) throw Error('Answer every question before submitting.');
  const results = quiz.map((q,index) => ({questionText:q.questionText, options:q.options, selectedIndex:answers[index], correctOptionIndex:q.correctOptionIndex, explanation:q.explanation || '', correct:answers[index]===q.correctOptionIndex}));
  return {score:results.filter(r=>r.correct).length,total:quiz.length,results};
}

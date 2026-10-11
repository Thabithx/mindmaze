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
  let quiz = parse('quizJson', []), videos = parse('videosJson', []), relatedPaperIds = parse('relatedPaperIds', []), curriculumBlocks = parse('curriculumBlocksJson', []);
  if (!Array.isArray(curriculumBlocks) || curriculumBlocks.length > 50) throw Error('Maximum 50 curriculum items allowed per lesson.');
  if (Array.isArray(curriculumBlocks)) {
    curriculumBlocks = curriculumBlocks.map((b: any, idx: number) => {
      let numericSize = 0;
      if (typeof b.size === 'number') numericSize = b.size;
      else if (typeof b.size === 'string' && parseFloat(b.size)) {
        numericSize = b.size.toLowerCase().includes('mb')
          ? Math.round(parseFloat(b.size) * 1024 * 1024)
          : b.size.toLowerCase().includes('kb')
          ? Math.round(parseFloat(b.size) * 1024)
          : Math.round(parseFloat(b.size));
      }
      const sanitized: any = {
        type: b.type,
        title: typeof b.title === 'string' ? b.title.trim() : '',
        description: typeof b.description === 'string' ? b.description.trim() : '',
        url: typeof b.url === 'string' ? b.url.trim() : '',
        liveLink: typeof b.liveLink === 'string' ? b.liveLink.trim() : '',
        scheduledTime: typeof b.scheduledTime === 'string' ? b.scheduledTime.trim() : '',
        meetingPlatform: typeof b.meetingPlatform === 'string' ? b.meetingPlatform.trim() : 'Zoom / Google Meet',
        isCompleted: Boolean(b.isCompleted),
        recordingUrl: typeof b.recordingUrl === 'string' ? b.recordingUrl.trim() : '',
        pdfProvider: typeof b.pdfProvider === 'string' && b.pdfProvider ? b.pdfProvider : 'cloudinary',
        pdfUrl: typeof b.pdfUrl === 'string' ? b.pdfUrl.trim() : '',
        pdfPublicId: typeof b.pdfPublicId === 'string' ? b.pdfPublicId.trim() : '',
        pdfFileName: typeof b.pdfFileName === 'string' ? b.pdfFileName.trim() : '',
        size: numericSize,
        order: Number(b.order) >= 0 ? Number(b.order) : idx,
      };
      if (b.hasNewUpload) sanitized.hasNewUpload = true;
      if (b._id) sanitized._id = b._id;
      if (b.type === 'quiz' && Array.isArray(b.quizQuestions)) {
        sanitized.quizQuestions = b.quizQuestions.map((q: any) => ({
          questionText: typeof q.questionText === 'string' ? q.questionText.trim() : '',
          questionType: q.questionType === 'text' ? 'text' : 'mcq',
          imageUrl: typeof q.imageUrl === 'string' ? q.imageUrl.trim() : '',
          imagePublicId: typeof q.imagePublicId === 'string' ? q.imagePublicId.trim() : '',
          options: Array.isArray(q.options) ? q.options.map((o: any) => String(o || '').trim()).filter(Boolean) : [],
          correctOptionIndex: Number(q.correctOptionIndex) >= 0 ? Number(q.correctOptionIndex) : 0,
          explanation: typeof q.explanation === 'string' ? q.explanation.trim() : '',
        }));
        sanitized.passPercentage = Number(b.passPercentage) >= 0 && Number(b.passPercentage) <= 100 ? Number(b.passPercentage) : 50;
      }
      return sanitized;
    });
    const fromBlocksQuiz = curriculumBlocks.filter((b: any) => b.type === 'quiz').flatMap((b: any) => b.quizQuestions || []);
    if (fromBlocksQuiz.length > 0) quiz = fromBlocksQuiz;
    const fromBlocksVideos = curriculumBlocks.filter((b: any) => b.type === 'video').map((b: any) => ({ title: b.title || 'Video', url: b.url || '', description: b.description || '' }));
    if (fromBlocksVideos.length > 0) videos = fromBlocksVideos;
  }
  if (!Array.isArray(quiz) || quiz.length > 100) throw Error('Maximum 100 quiz questions allowed.');
  for (const q of quiz) {
    if (!q || typeof q.questionText !== 'string' || !q.questionText.trim()) {
      throw Error('Each quiz question must have question text.');
    }
    if (q.questionType !== 'text') {
      if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6 || q.options.some((o: any) => typeof o !== 'string' || !o.trim())) {
        throw Error('Each multiple-choice question needs at least two valid answer options.');
      }
      if (!Number.isInteger(q.correctOptionIndex) || q.correctOptionIndex < 0 || q.correctOptionIndex >= q.options.length) {
        throw Error('Each multiple-choice question needs a valid correct answer option.');
      }
    }
  }
  if (!Array.isArray(videos) || videos.length > 20 || videos.some(v => !v || typeof v.title !== 'string' || !v.title.trim() || !safeMediaUrl(v.url))) throw Error('Each video needs a title and an HTTP or HTTPS link.');
  if (!Array.isArray(relatedPaperIds) || relatedPaperIds.length > 30 || relatedPaperIds.some(id => typeof id !== 'string' || !/^[a-f\d]{24}$/i.test(id))) throw Error('Select valid related papers.');
  const price = Math.max(0, Number(body['price'] ?? 0) || 0);
  const isFree = body['isFree'] === true || body['isFree'] === 'true' || price === 0;
  const billingType = body['billingType'] === 'monthly' ? 'monthly' : 'one_time';
  const monthlyFee = Math.max(0, Number(body['monthlyFee'] ?? 0) || 0);
  const bankDetails = text('bankDetails');
  const thumbnailUrl = text('thumbnailUrl');
  return {title, description, subject, stream, topic, medium, syllabus, status,
    price, isFree, billingType, monthlyFee, bankDetails, thumbnailUrl,
    topicOrder: numeric('topicOrder',1,0,1000), lessonOrder: numeric('lessonOrder',1,0,1000), estimatedMinutes: numeric('estimatedMinutes',15,1,600),
    quiz, videos, curriculumBlocks, relatedPaperIds, videoUrl: ''};
}

export function gradeLesson(quiz: any[], answers: unknown) {
  if (!Array.isArray(answers) || answers.length !== quiz.length) {
    throw Error('Answer every question before submitting.');
  }

  let autoScore = 0;
  let hasOpenEnded = false;

  const results = quiz.map((q, index) => {
    const rawAnswer = answers[index];
    const isText = q.questionType === 'text';

    if (isText) {
      hasOpenEnded = true;
      const textAns = typeof rawAnswer === 'string'
        ? rawAnswer.trim()
        : typeof rawAnswer === 'object' && rawAnswer
        ? String((rawAnswer as any).textAnswer || '').trim()
        : '';
      if (!textAns) {
        throw Error(`Please provide a written answer for question ${index + 1}.`);
      }
      return {
        questionText: q.questionText,
        questionType: 'text',
        imageUrl: q.imageUrl || '',
        textAnswer: textAns,
        explanation: q.explanation || '',
        isCorrect: false, // Requires admin review
        adminGraded: false,
      };
    } else {
      let selectedIdx = -1;
      if (Number.isInteger(rawAnswer)) selectedIdx = Number(rawAnswer);
      else if (typeof rawAnswer === 'object' && rawAnswer && Number.isInteger((rawAnswer as any).selectedIndex)) {
        selectedIdx = Number((rawAnswer as any).selectedIndex);
      }
      if (selectedIdx < 0 || selectedIdx >= (q.options?.length || 0)) {
        throw Error(`Please select an answer for question ${index + 1}.`);
      }
      const isCorrect = selectedIdx === q.correctOptionIndex;
      if (isCorrect) autoScore += 1;
      return {
        questionText: q.questionText,
        questionType: 'mcq',
        imageUrl: q.imageUrl || '',
        options: q.options || [],
        selectedIndex: selectedIdx,
        correctOptionIndex: q.correctOptionIndex,
        explanation: q.explanation || '',
        isCorrect,
        correct: isCorrect,
      };
    }
  });

  return {
    score: autoScore,
    total: quiz.length,
    hasOpenEnded,
    results,
  };
}

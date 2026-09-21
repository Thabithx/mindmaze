import React, { useState, useEffect, useCallback } from 'react';
import { MistakeItem, Question, ScreenId, TryExample, UserProfile } from '../../types';
import { MOCK_QUESTIONS } from '../../data/mockData';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  Brain,
  BookOpen,
  BookmarkCheck,
  ArrowRight,
  RotateCcw,
  Award,
  Zap,
  HelpCircle,
  ChevronRight,
  Flame,
  Check,
  Share2,
  ListOrdered,
  Lightbulb,
  AlertCircle,
} from 'lucide-react';

interface PracticeQuizScreenProps {
  userProfile: UserProfile;
  onNavigate: (screen: ScreenId) => void;
  onSaveMistake: (mistake: MistakeItem) => void;
  onUpdateXP: (earnedXP: number) => void;
  initialQuestionId?: string;
  initialTopicFilter?: string;
}

export const PracticeQuizScreen: React.FC<PracticeQuizScreenProps> = ({
  userProfile,
  onNavigate,
  onSaveMistake,
  onUpdateXP,
  initialQuestionId,
  initialTopicFilter,
}) => {
  // Questions pool
  const questionsList = React.useMemo(() => {
    if (initialQuestionId) {
      const specific = MOCK_QUESTIONS.find((q) => q.id === initialQuestionId);
      const rest = MOCK_QUESTIONS.filter((q) => q.id !== initialQuestionId);
      return specific ? [specific, ...rest] : MOCK_QUESTIONS;
    }
    if (initialTopicFilter) {
      const filtered = MOCK_QUESTIONS.filter((q) => q.topic.toLowerCase().includes(initialTopicFilter.toLowerCase()));
      return filtered.length > 0 ? filtered : MOCK_QUESTIONS;
    }
    return MOCK_QUESTIONS;
  }, [initialQuestionId, initialTopicFilter]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isWrongModalOpen, setIsWrongModalOpen] = useState(false);
  const [isSavedForLater, setIsSavedForLater] = useState(false);
  const [activeTryExample, setActiveTryExample] = useState<TryExample | null>(null);
  const [exampleSelectedOption, setExampleSelectedOption] = useState<string | null>(null);
  const [exampleFeedback, setExampleFeedback] = useState<string | null>(null);

  // Score tracking
  const [quizFinished, setQuizFinished] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [totalXPEarned, setTotalXPEarned] = useState(0);

  // Timer per question (e.g. 90 seconds typical A/L MCQ pace)
  const [secondsRemaining, setSecondsRemaining] = useState(90);

  // Track wrong question IDs in current session for retry
  const [sessionMistakeIds, setSessionMistakeIds] = useState<string[]>([]);
  const [isExplanationModalOpen, setIsExplanationModalOpen] = useState(false);

  const currentQuestion = questionsList[currentIndex] || questionsList[0];

  // Reset timer on question change
  useEffect(() => {
    setSecondsRemaining(90);
    setSelectedOptionId(null);
    setIsAnswerSubmitted(false);
    setIsWrongModalOpen(false);
    setIsExplanationModalOpen(false);
    setIsSavedForLater(false);
    setActiveTryExample(null);
  }, [currentIndex]);

  // Countdown timer
  useEffect(() => {
    if (quizFinished || isAnswerSubmitted) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizFinished, isAnswerSubmitted, currentIndex]);

  const handleTimeExpired = () => {
    if (!isAnswerSubmitted) {
      setIsAnswerSubmitted(true);
      setWrongCount((prev) => prev + 1);
      setSessionMistakeIds((prev) => [...prev, currentQuestion.id]);
      // Auto open explanation modal
      setIsWrongModalOpen(true);
    }
  };

  const handleSelectOption = (optionId: string) => {
    if (isAnswerSubmitted) return;
    setSelectedOptionId(optionId);
  };

  const handleSubmitAnswer = () => {
    if (!selectedOptionId || isAnswerSubmitted) return;

    setIsAnswerSubmitted(true);
    const chosenOption = currentQuestion.options.find((o) => o.id === selectedOptionId);
    const isCorrect = chosenOption?.isCorrect ?? false;

    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
      setTotalXPEarned((prev) => prev + 25);
      onUpdateXP(25);
      // Confetti celebration
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#6B4EFF', '#00F5FF', '#FBBF24'],
      });
    } else {
      setWrongCount((prev) => prev + 1);
      setSessionMistakeIds((prev) => [...prev, currentQuestion.id]);
      // Prompt modal specifically requested:
      // "When the user answers WRONG, open a popup modal titled '📚 Want to learn how to answer these?'"
      setIsWrongModalOpen(true);
    }
  };

  const handleSaveToNotebook = () => {
    if (!selectedOptionId) return;
    const newMistake: MistakeItem = {
      id: `mst-${Date.now()}`,
      question: currentQuestion,
      userSelectedOptionId: selectedOptionId,
      savedAt: 'Just now',
      reviewCount: 0,
      isMastered: false,
    };
    onSaveMistake(newMistake);
    setIsSavedForLater(true);
  };

  const handleNextQuestion = () => {
    setIsWrongModalOpen(false);
    setIsExplanationModalOpen(false);
    if (currentIndex + 1 < questionsList.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setQuizFinished(true);
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  };

  const handleRestartQuiz = () => {
    setCurrentIndex(0);
    setCorrectCount(0);
    setWrongCount(0);
    setTotalXPEarned(0);
    setQuizFinished(false);
    setSelectedOptionId(null);
    setIsAnswerSubmitted(false);
    setIsWrongModalOpen(false);
    setIsExplanationModalOpen(false);
    setSessionMistakeIds([]);
  };

  const handleRetryMistakes = () => {
    setCurrentIndex(0);
    setCorrectCount(0);
    setWrongCount(0);
    setTotalXPEarned(0);
    setQuizFinished(false);
    setSelectedOptionId(null);
    setIsAnswerSubmitted(false);
    setIsWrongModalOpen(false);
    setIsExplanationModalOpen(false);
  };

  const handleOpenTryExample = (example: TryExample) => {
    setActiveTryExample(example);
    setExampleSelectedOption(null);
    setExampleFeedback(null);
  };

  const handleTestExampleAnswer = (optId: string) => {
    setExampleSelectedOption(optId);
    const chosen = activeTryExample?.options.find((o) => o.id === optId);
    if (chosen?.isCorrect) {
      setExampleFeedback('Correct! Great application of the concept.');
    } else {
      setExampleFeedback('Not quite. Review the step-by-step formula note above.');
    }
  };

  // Score calculations
  const totalQuestions = questionsList.length;
  const accuracyPercentage = Math.round((correctCount / Math.max(1, totalQuestions)) * 100);

  return (
    <div id="mind-maze-practice-quiz-view" className="space-y-6 pb-16 max-w-4xl mx-auto">
      {!quizFinished ? (
        <>
          {/* Top Progress & Timer Bar */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-5 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 border border-purple-400/40 font-bold text-sm text-cyan-300">
                {currentIndex + 1}
              </span>
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="font-semibold text-purple-300">{currentQuestion.subject}</span>
                  <span>•</span>
                  <span>{currentQuestion.paperYear} A/L</span>
                  <span>•</span>
                  <span className="text-cyan-300 font-medium">{currentQuestion.topic}</span>
                </div>
                <div className="text-xs text-slate-300 font-medium">
                  Question {currentIndex + 1} of {totalQuestions}
                </div>
              </div>
            </div>

            {/* Timer & XP */}
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold ${
                  secondsRemaining < 20
                    ? 'border-rose-500/50 bg-rose-950/30 text-rose-300 animate-pulse'
                    : 'border-white/10 bg-white/5 text-slate-200 backdrop-blur-md'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-cyan-300" />
                <span>
                  {Math.floor(secondsRemaining / 60)}:
                  {String(secondsRemaining % 60).padStart(2, '0')}
                </span>
              </div>

              <div className="flex items-center gap-1 text-xs font-bold text-purple-300 bg-purple-500/15 border border-purple-400/30 px-3 py-1.5 rounded-xl backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                <span>+25 XP</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden border border-white/5">
            <div
              className="bg-gradient-to-r from-[#6B4EFF] to-cyan-400 h-full transition-all duration-300 ease-out"
              style={{ width: `${((currentIndex) / totalQuestions) * 100}%` }}
            />
          </div>

          {/* Question Card */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 backdrop-blur-md space-y-6 shadow-xl">
            {/* Repeat Probability Header Badge */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400/10 border border-amber-400/30 px-3 py-1 text-xs font-semibold text-amber-300">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>{currentQuestion.repeatFrequency}</span>
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${
                currentQuestion.difficulty === 'Hard' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {currentQuestion.difficulty} Difficulty
              </span>
            </div>

            {/* Question Text */}
            <div>
              <p className="text-base sm:text-lg font-medium text-white leading-relaxed">
                {currentQuestion.questionText}
              </p>
            </div>

            {/* Options List */}
            <div className="space-y-3 pt-2">
              {currentQuestion.options.map((option) => {
                const isSelected = selectedOptionId === option.id;
                let optionStyle = 'border-white/10 bg-white/5 text-slate-200 hover:border-purple-400/40 hover:bg-white/10';

                if (isAnswerSubmitted) {
                  if (option.isCorrect) {
                    optionStyle = 'border-emerald-500 bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-500 shadow-lg shadow-emerald-950/40';
                  } else if (isSelected && !option.isCorrect) {
                    optionStyle = 'border-rose-500 bg-rose-500/20 text-rose-100 ring-1 ring-rose-500 shadow-lg shadow-rose-950/40';
                  } else {
                    optionStyle = 'border-white/5 bg-white/[0.02] text-slate-500 opacity-60';
                  }
                } else if (isSelected) {
                  optionStyle = 'border-purple-400 bg-purple-500/20 text-white ring-1 ring-purple-400 shadow-[0_0_15px_rgba(107,78,255,0.3)]';
                }

                return (
                  <button
                    key={option.id}
                    id={`quiz-option-${option.id}`}
                    type="button"
                    disabled={isAnswerSubmitted}
                    onClick={() => handleSelectOption(option.id)}
                    className={`w-full flex items-start gap-4 p-4 rounded-2xl border text-left text-sm font-medium transition-all duration-150 backdrop-blur-sm ${optionStyle}`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl font-bold text-xs border ${
                        isSelected
                          ? isAnswerSubmitted
                            ? option.isCorrect
                              ? 'border-emerald-400 bg-emerald-500 text-slate-950'
                              : 'border-rose-400 bg-rose-500 text-white'
                            : 'border-cyan-300 bg-cyan-400 text-slate-950'
                          : 'border-white/15 bg-white/10 text-slate-400'
                      }`}
                    >
                      {option.id}
                    </span>
                    <span className="pt-0.5 flex-1">{option.text}</span>

                    {isAnswerSubmitted && option.isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    )}
                    {isAnswerSubmitted && isSelected && !option.isCorrect && (
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bottom Actions Row */}
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              {!isAnswerSubmitted ? (
                <>
                  <div className="text-xs text-slate-400">
                    Select an option and click Submit to test your understanding.
                  </div>
                  <button
                    id="btn-submit-quiz-answer"
                    disabled={!selectedOptionId}
                    onClick={handleSubmitAnswer}
                    className={`w-full sm:w-auto px-8 py-3 rounded-xl text-xs font-bold text-white shadow-lg transition-all ${
                      selectedOptionId
                        ? 'bg-[#6B4EFF] hover:bg-[#7C5DFA] hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(107,78,255,0.4)] cursor-pointer'
                        : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
                    }`}
                  >
                    Submit Answer
                  </button>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedOptionId && currentQuestion.options.find((o) => o.id === selectedOptionId)?.isCorrect ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> Correct!
                        </span>
                        <button
                          id="btn-check-explanation"
                          onClick={() => setIsWrongModalOpen(true)}
                          className="px-3 py-1.5 rounded-xl bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/30 text-cyan-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Check answer & explanation</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsWrongModalOpen(true)}
                        className="text-amber-400 hover:text-amber-300 text-xs font-bold flex items-center gap-1.5 underline underline-offset-4 cursor-pointer"
                      >
                        <HelpCircle className="w-4 h-4" /> Re-open Step-by-Step Lesson Modal
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      id="btn-quiz-next-question"
                      onClick={handleNextQuestion}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-xs font-bold text-white shadow-[0_0_15px_rgba(107,78,255,0.4)] transition-all cursor-pointer"
                    >
                      <span>{currentIndex + 1 < totalQuestions ? 'Next Question' : 'View Results'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      ) : (
        /* QUIZ SCORE SCREEN */
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-10 backdrop-blur-md text-center space-y-8 shadow-xl">
          <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-purple-500/20 border border-purple-400/40 shadow-xl">
            <Award className="w-12 h-12 text-cyan-300" />
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Quiz Practice Completed!
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-md mx-auto">
              Great effort! Review your performance metrics and strengthen any weak topics in your notebook.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="text-2xl sm:text-3xl font-black text-white">{accuracyPercentage}%</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Accuracy</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">{correctCount}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Correct Answers</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="text-2xl sm:text-3xl font-black text-rose-400">{wrongCount}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Wrong (In Notebook)</div>
            </div>
            <div className="rounded-2xl border border-purple-400/30 bg-purple-500/15 p-4 backdrop-blur-sm">
              <div className="text-2xl sm:text-3xl font-black text-cyan-300">+{totalXPEarned}</div>
              <div className="text-[11px] text-purple-300 mt-0.5">XP Earned</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 max-w-xl mx-auto">
            <button
              onClick={() => onNavigate('mistakes')}
              className="flex-1 min-w-[200px] flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 px-5 py-3.5 text-xs font-bold text-white transition-all backdrop-blur-md cursor-pointer"
            >
              <BookmarkCheck className="w-4 h-4 text-rose-400" />
              <span>Review Mistake Notebook ({wrongCount})</span>
            </button>

            {wrongCount > 0 && (
              <button
                id="btn-retry-mistakes"
                onClick={handleRetryMistakes}
                className="flex-1 min-w-[160px] flex items-center justify-center gap-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 px-5 py-3.5 text-xs font-bold text-amber-200 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Retry Mistakes ({wrongCount})</span>
              </button>
            )}

            <button
              onClick={handleRestartQuiz}
              className="flex-1 min-w-[160px] flex items-center justify-center gap-2 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] px-6 py-3.5 text-xs font-bold text-white shadow-[0_0_15px_rgba(107,78,255,0.4)] hover:scale-105 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Practice Again</span>
            </button>
          </div>
        </div>
      )}

      {/* 📚 WANT TO LEARN HOW TO ANSWER THESE? (POPUP MODAL FOR WRONG/EXPLANATION) */}
      {isWrongModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl my-8 rounded-3xl border border-white/10 bg-[#161831]/95 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6 text-left relative animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full mb-1.5 ${
                  selectedOptionId && currentQuestion.options.find(o => o.id === selectedOptionId)?.isCorrect
                    ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/30'
                    : 'text-rose-400 bg-rose-500/20 border border-rose-500/30'
                }`}>
                  <AlertCircle className="w-3.5 h-3.5" />
                  {selectedOptionId && currentQuestion.options.find(o => o.id === selectedOptionId)?.isCorrect
                    ? 'Correct Solution Breakdown'
                    : 'Mistake Analysis & Key Concept'}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  <span>📚 Want to learn how to answer these?</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {currentQuestion.subject} • {currentQuestion.topic} ({currentQuestion.paperYear} A/L)
                </p>
              </div>

              <button
                onClick={() => setIsWrongModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 1. Correct Answer Banner */}
            <div className="rounded-2xl bg-emerald-500/20 border border-emerald-500/40 p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-400 font-semibold block">Correct Answer:</span>
                <span className="text-base font-bold text-white">
                  Option {currentQuestion.explanation.correctOptionId}: {currentQuestion.explanation.correctOptionText}
                </span>
              </div>
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            </div>

            {/* 2. Short Concept Note (3-4 lines) */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4.5 space-y-2 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 uppercase tracking-wider">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                Concept Note
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {currentQuestion.explanation.conceptNote}
              </p>
              {currentQuestion.explanation.keyFormula && (
                <div className="mt-2 text-xs font-mono bg-purple-500/20 text-purple-200 p-2 rounded-lg border border-purple-400/20">
                  💡 {currentQuestion.explanation.keyFormula}
                </div>
              )}
            </div>

            {/* 3. Step-by-Step Method (Numbered List) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wider">
                <ListOrdered className="w-4 h-4 text-purple-400" />
                Step-by-Step Method
              </div>
              <ol className="space-y-2 text-xs text-slate-300">
                {currentQuestion.explanation.stepByStep.map((step, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/5"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-purple-500/30 text-cyan-300 font-bold text-[11px]">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* 4. 2 "Try these" Example Question Links */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
                <Brain className="w-4 h-4 text-amber-400" />
                Try These Similar Practice Questions
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {currentQuestion.explanation.tryExamples.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => handleOpenTryExample(ex)}
                    className="flex flex-col items-start text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/40 transition-all group cursor-pointer"
                  >
                    <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center justify-between w-full">
                      <span>{ex.title}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-300" />
                    </span>
                    <span className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      {ex.summary}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Buttons: [Try Similar Question] & [Save for Later] & [Got It, Continue] */}
            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <button
                id="btn-save-mistake-for-later"
                onClick={handleSaveToNotebook}
                disabled={isSavedForLater}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  isSavedForLater
                    ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                    : 'border-rose-500/30 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                }`}
              >
                <BookmarkCheck className="w-4 h-4" />
                <span>{isSavedForLater ? 'Saved to Mistake Notebook ✓' : 'Save for Later'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  id="btn-try-similar-question"
                  onClick={() => handleOpenTryExample(currentQuestion.explanation.tryExamples[0])}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/40 text-xs font-bold text-purple-200 transition-all cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Try Similar Question</span>
                </button>

                <button
                  onClick={() => setIsWrongModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-xs font-bold text-white shadow-[0_0_15px_rgba(107,78,255,0.4)] transition-all cursor-pointer"
                >
                  Got It, Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Try Example Drill Modal */}
      {activeTryExample && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#161831]/95 backdrop-blur-xl p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-300" />
                <h4 className="font-bold text-white text-sm">{activeTryExample.title}</h4>
              </div>
              <button
                onClick={() => setActiveTryExample(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              {activeTryExample.questionText}
            </p>

            <div className="space-y-2">
              {activeTryExample.options.map((opt) => {
                const isSelected = exampleSelectedOption === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleTestExampleAnswer(opt.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? opt.isCorrect
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200'
                          : 'border-rose-500 bg-rose-500/20 text-rose-200'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span><strong>{opt.id}.</strong> {opt.text}</span>
                    {isSelected && (opt.isCorrect ? <Check className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />)}
                  </button>
                );
              })}
            </div>

            {exampleFeedback && (
              <div className="rounded-xl bg-black/40 p-3 border border-white/10 text-xs space-y-1">
                <div className="font-bold text-amber-300">Solution:</div>
                <p className="text-slate-300 text-[11px] leading-relaxed">{activeTryExample.solution}</p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveTryExample(null)}
                className="px-4 py-2 rounded-xl bg-white/10 text-xs font-semibold text-white hover:bg-white/20 border border-white/10"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

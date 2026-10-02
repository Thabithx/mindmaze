export const PAPER_DURATION_MS = 2 * 60 * 60 * 1000;
export function correctAnswers(q:any):number[] {
  return Array.isArray(q?.correctIndices) ? q.correctIndices : Number.isInteger(q?.correctIndex) && q.correctIndex >= 0 ? [q.correctIndex] : [];
}

export function validQuestion(q:any):boolean {
  const correct=correctAnswers(q);
  return !!q && typeof q.text==='string' && !!q.text.trim() && q.text.length<=10000 &&
    (q.correctIndices===undefined||Array.isArray(q.correctIndices)) &&
    Array.isArray(q.options) && q.options.length>=2 && q.options.length<=5 && q.options.every((o:any)=>typeof o==='string'&&!!o.trim()&&o.length<=5000) &&
    correct.length>0 && new Set(correct).size===correct.length && correct.every(i=>Number.isInteger(i)&&i>=0&&i<q.options.length) &&

    (q.explanation===undefined||typeof q.explanation==='string'&&q.explanation.length<=10000) &&
    (q.reviewNote===undefined||q.reviewNote==='');
}
export function validAnswers(answers:any,questions:any[]):answers is number[][] {
  return Array.isArray(answers)&&answers.length===questions.length&&answers.every((a:any,i:number)=>Array.isArray(a)&&
    new Set(a).size===a.length&&a.every((n:any)=>Number.isInteger(n)&&n>=0&&n<questions[i].options.length)&&
    a.length<=1);
}
export function gradePaper(questions:any[],answers:number[][]) {
  const review=questions.map((q,i)=>{
    const accepted=correctAnswers(q),selected=answers[i]||[];
    const correct=selected.length===1&&accepted.includes(selected[0]);
    return {questionNumber:i+1,correct,correctIndices:accepted,selectedIndices:selected,explanation:q.explanation||''};
  });
  const score=review.filter(r=>r.correct).length;
  return {score,total:review.length,percentage:review.length?Math.round(score/review.length*100):0,review};
}
export const publicQuestion=(q:any)=>({text:q.text,options:q.options,imageId:q.imageId,imageAlt:q.imageAlt});

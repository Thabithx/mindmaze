export const PAPER_STREAMS=['Maths','Bio','Non-stream'];
export function paperStreams(paper:{streams?:string[];stream?:string}) {return paper.streams?.length?paper.streams:paper.stream==='Both'?['Maths','Bio']:[paper.stream==='Physical Science'?'Maths':paper.stream==='Biological Science'?'Bio':paper.stream||'Non-stream'];}

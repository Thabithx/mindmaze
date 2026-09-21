import React from 'react';
import { Calculator, Atom, FlaskConical, Laptop, Dna, BookOpen } from 'lucide-react';

interface SubjectIconProps {
  subject: string;
  className?: string;
}

export const SubjectIcon: React.FC<SubjectIconProps> = ({ subject, className = 'w-4 h-4' }) => {
  const lower = (subject || '').toLowerCase();
  if (lower.includes('math')) return <Calculator className={className} />;
  if (lower.includes('physic')) return <Atom className={className} />;
  if (lower.includes('chem')) return <FlaskConical className={className} />;
  if (lower.includes('ict') || lower.includes('info')) return <Laptop className={className} />;
  if (lower.includes('bio')) return <Dna className={className} />;
  return <BookOpen className={className} />;
};

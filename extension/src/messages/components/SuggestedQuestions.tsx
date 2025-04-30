import React from 'react';

interface SuggestedQuestionsProps {
  questions: string[];
  onQuestionClick: (question: string) => void;
}

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({ 
  questions,
  onQuestionClick
}) => {
  if (!questions || questions.length === 0) return null;

  return (
    <div className="suggested-questions">
      {questions.map((question, index) => (
        <button
          key={index}
          className="question-button"
          onClick={() => onQuestionClick(question)}
        >
          {question}
        </button>
      ))}
    </div>
  );
}; 
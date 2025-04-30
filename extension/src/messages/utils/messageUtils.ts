import { Message } from '../components/Messages';

/**
 * Add a new message to the messages list
 */
export const createMessage = (
  role: 'user' | 'assistant', 
  content: string | any[], 
  suggestedQuestions?: string[]
): Message => {
  return {
    id: `message-${Date.now()}-${Math.random()}`,
    role,
    content,
    suggestedQuestions
  };
};

/**
 * Extract suggested questions from HTML content
 */
export const extractSuggestedQuestions = (content: string): { questions: string[], cleanedContent: string } => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;
  
  const questions: string[] = [];
  const questionButtons = tempDiv.querySelectorAll('.suggested-questions .question-button');
  
  questionButtons.forEach(button => {
    if (button.textContent) {
      questions.push(button.textContent.trim());
    }
  });

  const suggestedQuestionsElements = tempDiv.querySelectorAll('.suggested-questions');
  suggestedQuestionsElements.forEach(element => {
    element.parentNode?.removeChild(element);
  });
  
  return {
    questions,
    cleanedContent: tempDiv.innerHTML
  };
};

/**
 * Find the last index in an array that matches a predicate
 */
export const findLastIndex = <T,>(array: T[], predicate: (value: T) => boolean): number => {
  for (let i = array.length - 1; i >= 0; i--) {
    if (predicate(array[i])) {
      return i;
    }
  }
  return -1;
}; 
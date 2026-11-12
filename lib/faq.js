const MAX_QUESTION_LENGTH = 200;
const MAX_ANSWER_LENGTH = 10000;

export function validateFaq(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Geçerli bir soru ve yanıt gönderin." };
  }

  const { question, answer } = input;
  if (typeof question !== "string" || !question.trim() || question.trim().length > MAX_QUESTION_LENGTH) {
    return { error: `Soru 1-${MAX_QUESTION_LENGTH} karakter olmalıdır.` };
  }
  if (typeof answer !== "string" || !answer.trim() || answer.trim().length > MAX_ANSWER_LENGTH) {
    return { error: `Yanıt 1-${MAX_ANSWER_LENGTH} karakter olmalıdır.` };
  }

  return { value: { question: question.trim(), answer: answer.trim() } };
}

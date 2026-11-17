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
  const questionEn = input.questionEn ?? "";
  const answerEn = input.answerEn ?? "";
  if (typeof questionEn !== "string" || questionEn.length > MAX_QUESTION_LENGTH) {
    return { error: `İngilizce soru en fazla ${MAX_QUESTION_LENGTH} karakter olabilir.` };
  }
  if (typeof answerEn !== "string" || answerEn.length > MAX_ANSWER_LENGTH) {
    return { error: `İngilizce yanıt en fazla ${MAX_ANSWER_LENGTH} karakter olabilir.` };
  }

  return {
    value: {
      question: question.trim(),
      answer: answer.trim(),
      questionEn: questionEn.trim(),
      answerEn: answerEn.trim(),
    },
  };
}

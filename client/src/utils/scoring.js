// Calculate score based on answers (mock)
export const calculateScore = (questions) => {
  let total = 0;
  questions.forEach((q) => {
    if (!q.answer) q.score = 0;
    else if (q.difficulty === "Easy") q.score = 10;
    else if (q.difficulty === "Medium") q.score = 20;
    else if (q.difficulty === "Hard") q.score = 30;
    total += q.score;
  });
  return total;
};

// Generate summary (mock)
export const generateSummary = (questions) => {
  return `Candidate answered ${
    questions.filter((q) => q.answer).length
  } out of ${questions.length} questions. Total score: ${calculateScore(
    questions
  )}`;
};
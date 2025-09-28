import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.warn(
    "Gemini API key not found. Please add VITE_GEMINI_API_KEY to your .env file."
  );
}

const genAI = new GoogleGenerativeAI(API_KEY);

// Initialize the model
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

/**
 * Generate interview questions using Gemini AI
 */
export const generateInterviewQuestions = async () => {
  try {
    const prompt = `Generate 6 multiple choice questions for a full-stack developer interview (React/Node.js):
    - 2 Easy questions (20 seconds each) - Basic concepts
    - 2 Medium questions (60 seconds each) - Intermediate topics  
    - 2 Hard questions (120 seconds each) - Advanced/design problems
    
    Format as JSON array with this structure:
    [
      {
        "question": "Question text here",
        "difficulty": "Easy|Medium|Hard",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": 0,
        "explanation": "Brief explanation of why this answer is correct",
        "time": 20|60|120
      }
    ]
    
    Focus on practical React and Node.js concepts. Ensure correctAnswer is the index (0-3) of the correct option.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse the JSON response
    try {
      const questions = JSON.parse(text.replace(/```json\n?|\n?```/g, ""));
      return questions.map((q, index) => ({
        id: `q_${Date.now()}_${index}`,
        question: q.question,
        difficulty: q.difficulty,
        time: q.time,
        options: q.options || [],
        correctAnswer: q.correctAnswer || 0,
        explanation: q.explanation || "",
        selectedAnswer: null,
        answer: "",
        score: 0,
        aiScore: null,
        feedback: "",
      }));
    } catch {
      console.error("Failed to parse AI response as JSON:", text);
      // Fallback to hardcoded questions if AI fails
      return getFallbackQuestions();
    }
  } catch (error) {
    console.error("Error generating questions with Gemini:", error);
    // Return fallback questions if API fails
    return getFallbackQuestions();
  }
};

/**
 * Score an individual answer using Gemini AI
 */
export const scoreAnswer = async (question, selectedAnswer, difficulty) => {
  try {
    if (selectedAnswer === null || selectedAnswer === undefined) {
      return {
        score: 0,
        feedback: "No answer selected.",
        aiScore: 0,
      };
    }

    const maxScore =
      difficulty === "Easy" ? 10 : difficulty === "Medium" ? 20 : 30;

    // For MCQ, simple scoring: correct = full points, wrong = 0
    const isCorrect = selectedAnswer === question.correctAnswer;
    const score = isCorrect ? maxScore : 0;

    const selectedOption = question.options
      ? question.options[selectedAnswer]
      : "Unknown";
    const correctOption = question.options
      ? question.options[question.correctAnswer]
      : "Unknown";

    return {
      score: score,
      feedback: isCorrect
        ? `Correct! ${question.explanation || "Well done."}`
        : `Incorrect. You selected "${selectedOption}" but the correct answer is "${correctOption}". ${
            question.explanation || ""
          }`,
      aiScore: score,
    };
  } catch (error) {
    console.error("Error scoring answer with Gemini:", error);
    const maxScore =
      difficulty === "Easy" ? 10 : difficulty === "Medium" ? 20 : 30;
    return {
      score: Math.floor(maxScore * 0.5),
      feedback: "Answer received and evaluated.",
      aiScore: Math.floor(maxScore * 0.5),
    };
  }
};

/**
 * Generate a comprehensive interview summary using Gemini AI
 */
export const generateInterviewSummary = async (candidateInfo, questions) => {
  try {
    const totalScore = questions.reduce((sum, q) => sum + q.score, 0);
    const maxPossibleScore = questions.reduce((sum, q) => {
      const maxScore =
        q.difficulty === "Easy" ? 10 : q.difficulty === "Medium" ? 20 : 30;
      return sum + maxScore;
    }, 0);

    const qaList = questions
      .map(
        (q, i) =>
          `Q${i + 1} (${q.difficulty}): ${q.question}\nA${i + 1}: ${
            q.answer || "No answer"
          }\nScore: ${q.score}`
      )
      .join("\n\n");

    const prompt = `Generate a professional interview summary for this full-stack developer candidate:

Candidate: ${candidateInfo.name}
Email: ${candidateInfo.email}
Phone: ${candidateInfo.phone}

Interview Results:
${qaList}

Total Score: ${totalScore}/${maxPossibleScore}

Provide a JSON response with:
{
  "overallRating": "Excellent|Good|Average|Below Average|Poor",
  "summary": "2-3 sentence overall assessment",
  "technicalStrengths": ["strength1", "strength2"],
  "areasForImprovement": ["area1", "area2"],
  "recommendation": "Strong Hire|Hire|Maybe|No Hire",
  "keyHighlights": ["highlight1", "highlight2"],
  "finalScore": ${totalScore}
}

Base the assessment on technical accuracy, problem-solving approach, and communication skills.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
      const summary = JSON.parse(text.replace(/```json\n?|\n?```/g, ""));
      return {
        overallRating: summary.overallRating || "Average",
        summary:
          summary.summary ||
          `Candidate completed interview with score ${totalScore}/${maxPossibleScore}.`,
        technicalStrengths: summary.technicalStrengths || [],
        areasForImprovement: summary.areasForImprovement || [],
        recommendation: summary.recommendation || "Maybe",
        keyHighlights: summary.keyHighlights || [],
        finalScore: totalScore,
        maxScore: maxPossibleScore,
        completedAt: new Date().toISOString(),
      };
    } catch {
      console.error("Failed to parse AI summary response:", text);
      return getFallbackSummary(candidateInfo, totalScore, maxPossibleScore);
    }
  } catch (error) {
    console.error("Error generating summary with Gemini:", error);
    const totalScore = questions.reduce((sum, q) => sum + q.score, 0);
    const maxPossibleScore = questions.reduce((sum, q) => {
      const maxScore =
        q.difficulty === "Easy" ? 10 : q.difficulty === "Medium" ? 20 : 30;
      return sum + maxScore;
    }, 0);
    return getFallbackSummary(candidateInfo, totalScore, maxPossibleScore);
  }
};

// Fallback questions if AI fails
const getFallbackQuestions = () => [
  {
    id: "q_fallback_1",
    question: "What is the main difference between React state and props?",
    difficulty: "Easy",
    time: 20,
    options: [
      "State is immutable, props are mutable",
      "State is external data, props are internal data",
      "State is internal and mutable, props are external and immutable",
      "There is no difference between state and props",
    ],
    correctAnswer: 2,
    explanation:
      "State is internal component data that can change, while props are external data passed from parent components and should not be modified.",
    selectedAnswer: null,
    answer: "",
    score: 0,
    aiScore: null,
    feedback: "",
  },
  {
    id: "q_fallback_2",
    question: "What is the Node.js event loop responsible for?",
    difficulty: "Easy",
    time: 20,
    options: [
      "Handling synchronous operations only",
      "Managing memory allocation",
      "Handling asynchronous operations and callbacks",
      "Compiling JavaScript code",
    ],
    correctAnswer: 2,
    explanation:
      "The event loop is responsible for handling asynchronous operations, callbacks, and non-blocking I/O in Node.js.",
    selectedAnswer: null,
    answer: "",
    score: 0,
    aiScore: null,
    feedback: "",
  },
  {
    id: "q_fallback_3",
    question: "How do you handle errors in Express.js middleware?",
    difficulty: "Medium",
    time: 60,
    options: [
      "Use try-catch blocks only",
      "Pass errors to next() function",
      "Handle errors in each route individually",
      "Use global error handlers only",
    ],
    correctAnswer: 1,
    explanation:
      "In Express.js, errors should be passed to the next() function, which will trigger error-handling middleware.",
    selectedAnswer: null,
    answer: "",
    score: 0,
    aiScore: null,
    feedback: "",
  },
  {
    id: "q_fallback_4",
    question: "Which React hook is best for expensive calculations?",
    difficulty: "Medium",
    time: 60,
    options: ["useState", "useEffect", "useMemo", "useCallback"],
    correctAnswer: 2,
    explanation:
      "useMemo is designed to memoize expensive calculations and only recalculate when dependencies change.",
    selectedAnswer: null,
    answer: "",
    score: 0,
    aiScore: null,
    feedback: "",
  },
  {
    id: "q_fallback_5",
    question:
      "What is the best approach for scaling Node.js applications horizontally?",
    difficulty: "Hard",
    time: 120,
    options: [
      "Increase server memory only",
      "Use clustering and load balancing",
      "Optimize database queries only",
      "Use synchronous operations",
    ],
    correctAnswer: 1,
    explanation:
      "Horizontal scaling is achieved through clustering (multiple Node.js processes) and load balancing across multiple servers.",
    selectedAnswer: null,
    answer: "",
    score: 0,
    aiScore: null,
    feedback: "",
  },
  {
    id: "q_fallback_6",
    question:
      "Which pattern is most suitable for managing complex React application state?",
    difficulty: "Hard",
    time: 120,
    options: [
      "Component state only",
      "Context API with reducers",
      "Global variables",
      "Local storage only",
    ],
    correctAnswer: 1,
    explanation:
      "Context API with useReducer provides a robust pattern for managing complex state across React applications.",
    selectedAnswer: null,
    answer: "",
    score: 0,
    aiScore: null,
    feedback: "",
  },
];

// Fallback summary if AI fails
const getFallbackSummary = (candidateInfo, totalScore, maxPossibleScore) => {
  const percentage = (totalScore / maxPossibleScore) * 100;
  let rating = "Average";
  let recommendation = "Maybe";

  if (percentage >= 80) {
    rating = "Excellent";
    recommendation = "Strong Hire";
  } else if (percentage >= 65) {
    rating = "Good";
    recommendation = "Hire";
  } else if (percentage >= 50) {
    rating = "Average";
    recommendation = "Maybe";
  } else {
    rating = "Below Average";
    recommendation = "No Hire";
  }

  return {
    overallRating: rating,
    summary: `${
      candidateInfo.name
    } completed the interview with a score of ${totalScore}/${maxPossibleScore} (${percentage.toFixed(
      1
    )}%).`,
    technicalStrengths: [
      "Completed all questions",
      "Participated in full interview",
    ],
    areasForImprovement: [
      "Could improve technical depth",
      "Practice more coding scenarios",
    ],
    recommendation,
    keyHighlights: [
      `Score: ${totalScore}/${maxPossibleScore}`,
      `Interview completion rate: 100%`,
    ],
    finalScore: totalScore,
    maxScore: maxPossibleScore,
    completedAt: new Date().toISOString(),
  };
};

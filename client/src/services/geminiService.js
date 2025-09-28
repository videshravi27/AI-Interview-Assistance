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
 * Generate interview questions using Gemini AI based on resume content
 */
export const generateInterviewQuestions = async (resumeData = null) => {
  try {
    // Extract key information from resume if available
    const resumeContext = resumeData
      ? `
    Candidate Resume Information:
    Name: ${resumeData.name || "N/A"}
    Skills: ${resumeData.skills || "Full-stack development"}
    Experience: ${resumeData.experience || "Software development"}
    Technologies: ${resumeData.technologies || "React, Node.js"}
    Resume Text: ${
      resumeData.resumeText
        ? resumeData.resumeText.substring(0, 1000)
        : "Full-stack developer background"
    }
    `
      : "";

    const prompt = `Generate 6 personalized multiple choice questions for an interview based on the candidate's background:
    ${resumeContext}
    
    Create questions that are specifically relevant to the candidate's experience and skills mentioned in their resume.
    
    Requirements:
    - 2 Easy questions (20 seconds each) - Basic concepts related to their experience
    - 2 Medium questions (60 seconds each) - Intermediate topics from their skillset  
    - 2 Hard questions (120 seconds each) - Advanced problems in their domain
    
    If no resume data is provided, default to full-stack React/Node.js questions.
    
    Format as JSON array with this structure:
    [
      {
        "question": "Question text here",
        "difficulty": "Easy|Medium|Hard",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": 0,
        "explanation": "Brief explanation of why this answer is correct",
        "time": 20|60|120,
        "category": "Category based on resume skills"
      }
    ]
    
    Make questions practical and directly related to the candidate's background. Ensure correctAnswer is the index (0-3) of the correct option. Include a category field that reflects the skill area being tested.`;

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
        category: q.category || "General",
        selectedAnswer: null,
        answer: "",
        score: 0,
        aiScore: null,
        feedback: "",
      }));
    } catch {
      console.error("Failed to parse AI response as JSON:", text);
      // Generate personalized fallback questions based on resume if available
      return getPersonalizedFallbackQuestions(resumeData);
    }
  } catch (error) {
    console.error("Error generating questions with Gemini:", error);
    // Return personalized fallback questions if API fails
    return getPersonalizedFallbackQuestions(resumeData);
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

// Personalized fallback questions based on resume data
const getPersonalizedFallbackQuestions = (resumeData) => {
  // Analyze resume for key technologies
  const resumeText = resumeData?.resumeText?.toLowerCase() || "";
  const skills = resumeData?.skills?.toLowerCase() || "";
  const technologies = resumeData?.technologies?.toLowerCase() || "";
  const allText = `${resumeText} ${skills} ${technologies}`;

  // Check for specific technologies
  const hasReact = allText.includes("react") || allText.includes("reactjs");
  const hasNode =
    allText.includes("node") ||
    allText.includes("nodejs") ||
    allText.includes("express");
  const hasPython =
    allText.includes("python") ||
    allText.includes("django") ||
    allText.includes("flask");
  const hasJava = allText.includes("java") || allText.includes("spring");
  const hasDatabase =
    allText.includes("sql") ||
    allText.includes("database") ||
    allText.includes("mongodb");
  const hasDevOps =
    allText.includes("docker") ||
    allText.includes("kubernetes") ||
    allText.includes("aws");
  const hasJavaScript =
    allText.includes("javascript") || allText.includes("js");

  let questions = [];

  // Generate React-specific questions if React is mentioned
  if (hasReact) {
    questions.push(
      {
        id: "q_react_1",
        question: "What is the purpose of React's useEffect hook?",
        difficulty: "Easy",
        time: 20,
        options: [
          "To manage component state",
          "To perform side effects in functional components",
          "To create reusable components",
          "To handle user events",
        ],
        correctAnswer: 1,
        explanation:
          "useEffect is used to perform side effects like data fetching, subscriptions, or DOM manipulation in functional components.",
        category: "React",
        selectedAnswer: null,
        answer: "",
        score: 0,
        aiScore: null,
        feedback: "",
      },
      {
        id: "q_react_2",
        question: "How do you optimize React app performance for large lists?",
        difficulty: "Medium",
        time: 60,
        options: [
          "Use inline styles for better performance",
          "Implement virtual scrolling or use React.memo",
          "Use class components instead of functional components",
          "Disable React DevTools",
        ],
        correctAnswer: 1,
        explanation:
          "Virtual scrolling and React.memo help optimize performance by reducing unnecessary re-renders and DOM manipulations.",
        category: "React Performance",
        selectedAnswer: null,
        answer: "",
        score: 0,
        aiScore: null,
        feedback: "",
      }
    );
  }

  // Generate Node.js questions if Node is mentioned
  if (hasNode) {
    questions.push(
      {
        id: "q_node_1",
        question: "What is middleware in Express.js?",
        difficulty: "Easy",
        time: 20,
        options: [
          "A database connection library",
          "Functions that execute during request-response cycle",
          "A frontend framework",
          "A testing framework",
        ],
        correctAnswer: 1,
        explanation:
          "Middleware functions execute during the request-response cycle and can modify request/response objects.",
        category: "Node.js/Express",
        selectedAnswer: null,
        answer: "",
        score: 0,
        aiScore: null,
        feedback: "",
      },
      {
        id: "q_node_2",
        question: "How do you handle asynchronous operations in Node.js?",
        difficulty: "Medium",
        time: 60,
        options: [
          "Use only synchronous functions",
          "Use callbacks, promises, or async/await",
          "Use setTimeout for all operations",
          "Avoid asynchronous operations entirely",
        ],
        correctAnswer: 1,
        explanation:
          "Node.js handles async operations using callbacks, promises, and async/await patterns for non-blocking I/O.",
        category: "Node.js Async",
        selectedAnswer: null,
        answer: "",
        score: 0,
        aiScore: null,
        feedback: "",
      }
    );
  }

  // Generate Python questions if Python is mentioned
  if (hasPython) {
    questions.push({
      id: "q_python_1",
      question: "What is the difference between a list and tuple in Python?",
      difficulty: "Easy",
      time: 20,
      options: [
        "Lists are immutable, tuples are mutable",
        "Lists are mutable, tuples are immutable",
        "There is no difference",
        "Lists are for numbers, tuples are for strings",
      ],
      correctAnswer: 1,
      explanation:
        "Lists are mutable (can be changed) while tuples are immutable (cannot be changed after creation).",
      category: "Python",
      selectedAnswer: null,
      answer: "",
      score: 0,
      aiScore: null,
      feedback: "",
    });
  }

  // Generate Database questions if database skills are mentioned
  if (hasDatabase) {
    questions.push({
      id: "q_db_1",
      question: "What is the difference between SQL and NoSQL databases?",
      difficulty: "Medium",
      time: 60,
      options: [
        "SQL is newer than NoSQL",
        "SQL uses structured data with schemas, NoSQL is more flexible",
        "NoSQL is always faster than SQL",
        "SQL is only for small applications",
      ],
      correctAnswer: 1,
      explanation:
        "SQL databases use structured data with predefined schemas, while NoSQL databases offer more flexibility in data structure.",
      category: "Database",
      selectedAnswer: null,
      answer: "",
      score: 0,
      aiScore: null,
      feedback: "",
    });
  }

  // Generate DevOps questions if DevOps skills are mentioned
  if (hasDevOps) {
    questions.push({
      id: "q_devops_1",
      question: "What is the main benefit of containerization with Docker?",
      difficulty: "Hard",
      time: 120,
      options: [
        "It makes applications run faster",
        "It provides consistency across different environments",
        "It eliminates the need for testing",
        "It automatically scales applications",
      ],
      correctAnswer: 1,
      explanation:
        "Docker provides consistency by packaging applications with their dependencies, ensuring they run the same across environments.",
      category: "DevOps",
      selectedAnswer: null,
      answer: "",
      score: 0,
      aiScore: null,
      feedback: "",
    });
  }

  // Generate JavaScript questions if JavaScript is mentioned
  if (hasJavaScript) {
    questions.push({
      id: "q_js_1",
      question: "What is the difference between '==' and '===' in JavaScript?",
      difficulty: "Easy",
      time: 20,
      options: [
        "No difference, they're the same",
        "'==' compares values, '===' compares values and types",
        "'===' is deprecated",
        "'==' is faster than '==='",
      ],
      correctAnswer: 1,
      explanation:
        "'==' performs type coercion before comparison, while '===' compares both value and type without coercion.",
      category: "JavaScript",
      selectedAnswer: null,
      answer: "",
      score: 0,
      aiScore: null,
      feedback: "",
    });
  }

  // Fill remaining slots with general questions if we don't have 6 yet
  const generalQuestions = getFallbackQuestions();
  while (questions.length < 6) {
    const remainingNeeded = 6 - questions.length;
    const generalToAdd = generalQuestions.slice(0, remainingNeeded);
    questions.push(...generalToAdd);
  }

  // Ensure we have exactly 6 questions with proper difficulty distribution
  return questions.slice(0, 6).map((q, index) => {
    // Adjust difficulty to ensure we have 2 easy, 2 medium, 2 hard
    if (index < 2) {
      q.difficulty = "Easy";
      q.time = 20;
    } else if (index < 4) {
      q.difficulty = "Medium";
      q.time = 60;
    } else {
      q.difficulty = "Hard";
      q.time = 120;
    }
    return q;
  });
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

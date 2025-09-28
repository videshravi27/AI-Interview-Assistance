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

// Track recently used questions to avoid immediate repeats
const recentQuestionCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Clean old entries from cache
const cleanCache = () => {
  const now = Date.now();
  for (const [key, timestamp] of recentQuestionCache.entries()) {
    if (now - timestamp > CACHE_DURATION) {
      recentQuestionCache.delete(key);
    }
  }
};

// Generate a cache key based on resume content
const getCacheKey = (resumeData) => {
  if (!resumeData) return "default";
  const keyData = {
    name: resumeData.name || "",
    skills: resumeData.skills || "",
    technologies: resumeData.technologies || "",
    resumeText: resumeData.resumeText
      ? resumeData.resumeText.substring(0, 200)
      : "",
  };
  return btoa(JSON.stringify(keyData));
};

/**
 * Generate interview questions using Gemini AI based on resume content
 */
export const generateInterviewQuestions = async (resumeData = null) => {
  try {
    // Clean old cache entries
    cleanCache();

    // Generate cache key and check for recent questions
    const cacheKey = getCacheKey(resumeData);
    const recentQuestions = JSON.parse(
      localStorage.getItem(`recent_questions_${cacheKey}`) || "[]"
    );

    // Add randomization seed to ensure different questions each time
    const randomSeed = Math.floor(Math.random() * 10000);
    const timestamp = Date.now();

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

    // Add previously asked questions to avoid repeats
    const avoidQuestionsPrompt =
      recentQuestions.length > 0
        ? `\n    IMPORTANT: Avoid generating similar questions to these recently asked ones:\n    ${recentQuestions
            .map((q) => `- ${q.question}`)
            .join("\n    ")}\n    `
        : "";

    const prompt = `Generate 6 UNIQUE and VARIED multiple choice questions for an interview based on the candidate's background:
    ${resumeContext}
    
    IMPORTANT: Create DIFFERENT questions each time this is called. Use various aspects of their skills and experience.
    Random Seed: ${randomSeed} (use this to ensure variety)
    Timestamp: ${timestamp}
    ${avoidQuestionsPrompt}
    
    Create questions that are specifically relevant to the candidate's experience and skills mentioned in their resume.
    Focus on different aspects like: problem-solving, best practices, optimization, debugging, architecture, security, testing, etc.
    
    Requirements:
    - 2 Easy questions (20 seconds each) - Basic concepts related to their experience
    - 2 Medium questions (60 seconds each) - Intermediate topics from their skillset  
    - 2 Hard questions (120 seconds each) - Advanced problems in their domain
    
    If no resume data is provided, default to full-stack React/Node.js questions but still vary the questions.
    
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
      const processedQuestions = questions.map((q, index) => ({
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

      // Store questions in recent cache to avoid repeats
      try {
        const questionsToStore = processedQuestions.map((q) => ({
          question: q.question,
          category: q.category,
        }));
        const updatedRecentQuestions = [
          ...questionsToStore,
          ...recentQuestions,
        ].slice(0, 20); // Keep last 20
        localStorage.setItem(
          `recent_questions_${cacheKey}`,
          JSON.stringify(updatedRecentQuestions)
        );
      } catch (storageError) {
        console.log("Could not store questions in cache:", storageError);
      }

      return processedQuestions;
    } catch {
      console.error("Failed to parse AI response as JSON:", text);
      // Generate personalized fallback questions
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

// Personalized fallback questions based on resume data with randomization
const getPersonalizedFallbackQuestions = (resumeData) => {
  // Add randomization to ensure different questions each time
  const randomSeed = Math.floor(Math.random() * 10000);
  const timestamp = Date.now();

  // Get recent questions to avoid repeats
  const cacheKey = getCacheKey(resumeData);
  const recentQuestions = JSON.parse(
    localStorage.getItem(`recent_questions_${cacheKey}`) || "[]"
  );
  const recentQuestionTexts = recentQuestions.map((q) =>
    q.question.toLowerCase()
  );

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
  const questionPools = {};

  // Generate React-specific questions if React is mentioned
  if (hasReact) {
    questionPools.react = [
      {
        id: `q_react_1_${randomSeed}`,
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
        category: "React Hooks",
      },
      {
        id: `q_react_2_${randomSeed}`,
        question: "What is the difference between useState and useReducer?",
        difficulty: "Easy",
        time: 20,
        options: [
          "useState is for objects, useReducer is for primitives",
          "useReducer is for complex state logic, useState is for simple state",
          "They are exactly the same",
          "useReducer is deprecated",
        ],
        correctAnswer: 1,
        explanation:
          "useReducer is preferred for complex state logic with multiple sub-values or when next state depends on previous one.",
        category: "React State Management",
      },
      {
        id: `q_react_3_${randomSeed}`,
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
      },
      {
        id: `q_react_4_${randomSeed}`,
        question: "What is the purpose of React's key prop in lists?",
        difficulty: "Medium",
        time: 60,
        options: [
          "To style list items",
          "To help React identify which items have changed",
          "To sort the list",
          "To make lists accessible",
        ],
        correctAnswer: 1,
        explanation:
          "Keys help React identify which items have changed, are added, or removed, making list updates more efficient.",
        category: "React Lists",
      },
      {
        id: `q_react_5_${randomSeed}`,
        question:
          "How would you implement code splitting in a React application?",
        difficulty: "Hard",
        time: 120,
        options: [
          "Using React.lazy() and Suspense",
          "Splitting code manually with multiple script tags",
          "Using only external libraries",
          "Code splitting is not possible in React",
        ],
        correctAnswer: 0,
        explanation:
          "React.lazy() allows you to define a component that is loaded dynamically, and Suspense lets you show fallback content.",
        category: "React Advanced",
      },
      {
        id: `q_react_6_${randomSeed}`,
        question: "What are the benefits of using React Server Components?",
        difficulty: "Hard",
        time: 120,
        options: [
          "They only work on the client side",
          "They reduce bundle size and improve performance by rendering on the server",
          "They are the same as regular components",
          "They only work with class components",
        ],
        correctAnswer: 1,
        explanation:
          "Server Components render on the server, reducing bundle size and improving initial page load performance.",
        category: "React Server Components",
      },
    ];

    // Randomly select 2 questions from React pool
    const reactQuestions = questionPools.react
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);
    questions.push(...reactQuestions);
  }

  // Generate Node.js questions if Node is mentioned
  if (hasNode) {
    questionPools.node = [
      {
        id: `q_node_1_${randomSeed}`,
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
        category: "Express Middleware",
      },
      {
        id: `q_node_2_${randomSeed}`,
        question: "What is the Event Loop in Node.js?",
        difficulty: "Easy",
        time: 20,
        options: [
          "A database connection pool",
          "The mechanism that handles asynchronous operations",
          "A frontend rendering engine",
          "A package manager",
        ],
        correctAnswer: 1,
        explanation:
          "The Event Loop is Node.js's mechanism for handling asynchronous operations without blocking the main thread.",
        category: "Node.js Core",
      },
      {
        id: `q_node_3_${randomSeed}`,
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
      },
      {
        id: `q_node_4_${randomSeed}`,
        question:
          "What is the difference between process.nextTick() and setImmediate()?",
        difficulty: "Medium",
        time: 60,
        options: [
          "They are exactly the same",
          "nextTick() executes before I/O events, setImmediate() executes after",
          "setImmediate() is faster",
          "nextTick() only works on Linux",
        ],
        correctAnswer: 1,
        explanation:
          "process.nextTick() callbacks are executed before I/O events, while setImmediate() callbacks are executed after I/O events.",
        category: "Node.js Event Loop",
      },
      {
        id: `q_node_5_${randomSeed}`,
        question:
          "How would you implement clustering in Node.js for scalability?",
        difficulty: "Hard",
        time: 120,
        options: [
          "Use only single-threaded approach",
          "Use the cluster module to spawn multiple worker processes",
          "Use only external load balancers",
          "Clustering is not possible in Node.js",
        ],
        correctAnswer: 1,
        explanation:
          "The cluster module allows you to create child processes that share the same server port, utilizing multi-core systems.",
        category: "Node.js Scaling",
      },
      {
        id: `q_node_6_${randomSeed}`,
        question: "What are streams in Node.js and when would you use them?",
        difficulty: "Hard",
        time: 120,
        options: [
          "Streams are only for video processing",
          "Objects for handling flowing data efficiently, useful for large files",
          "Streams are deprecated in modern Node.js",
          "Streams only work with databases",
        ],
        correctAnswer: 1,
        explanation:
          "Streams are objects for handling flowing data efficiently, especially useful for processing large files without loading everything into memory.",
        category: "Node.js Streams",
      },
    ];

    // Randomly select 2 questions from Node pool
    const nodeQuestions = questionPools.node
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);
    questions.push(...nodeQuestions);
  }

  // Add other technology questions to pools
  if (hasPython) {
    questionPools.python = [
      {
        id: `q_python_1_${randomSeed}`,
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
        category: "Python Data Types",
      },
      {
        id: `q_python_2_${randomSeed}`,
        question: "What is a Python generator?",
        difficulty: "Medium",
        time: 60,
        options: [
          "A function that returns multiple values at once",
          "A function that yields values one at a time using memory efficiently",
          "A tool for generating random numbers",
          "A Python compilation tool",
        ],
        correctAnswer: 1,
        explanation:
          "Generators yield values one at a time and maintain state between calls, making them memory efficient for large datasets.",
        category: "Python Advanced",
      },
    ];
  }

  if (hasDatabase) {
    questionPools.database = [
      {
        id: `q_db_1_${randomSeed}`,
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
        category: "Database Types",
      },
      {
        id: `q_db_2_${randomSeed}`,
        question: "What is database normalization?",
        difficulty: "Medium",
        time: 60,
        options: [
          "Making database faster",
          "Organizing data to reduce redundancy and dependency",
          "Adding more tables to database",
          "Encrypting database data",
        ],
        correctAnswer: 1,
        explanation:
          "Database normalization is the process of organizing data to minimize redundancy and dependency.",
        category: "Database Design",
      },
    ];
  }

  if (hasJavaScript) {
    questionPools.javascript = [
      {
        id: `q_js_1_${randomSeed}`,
        question:
          "What is the difference between '==' and '===' in JavaScript?",
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
        category: "JavaScript Basics",
      },
      {
        id: `q_js_2_${randomSeed}`,
        question: "What is closure in JavaScript?",
        difficulty: "Hard",
        time: 120,
        options: [
          "A way to close the browser",
          "A function with access to variables in its outer scope",
          "A method to end JavaScript execution",
          "A type of loop in JavaScript",
        ],
        correctAnswer: 1,
        explanation:
          "A closure gives you access to an outer function's scope from an inner function, even after the outer function returns.",
        category: "JavaScript Advanced",
      },
    ];
  }

  // Collect all available questions from pools
  const allPoolQuestions = Object.values(questionPools).flat();

  // Filter out questions that were recently asked
  const filteredQuestions = allPoolQuestions.filter(
    (q) =>
      !recentQuestionTexts.some((recent) =>
        recent.toLowerCase().includes(q.question.toLowerCase().substring(0, 30))
      )
  );

  // If we have filtered questions, use them; otherwise use all pool questions
  const availableQuestions =
    filteredQuestions.length > 0 ? filteredQuestions : allPoolQuestions;

  // If we have pool questions, use them; otherwise use general fallback
  if (availableQuestions.length > 0) {
    // Shuffle and select questions
    const shuffledQuestions = availableQuestions.sort(
      () => Math.random() - 0.5
    );
    questions = shuffledQuestions.slice(0, 6);
  }

  // Fill remaining slots with randomized general questions if needed
  if (questions.length < 6) {
    const generalQuestions = getRandomizedFallbackQuestions(randomSeed);
    // Filter general questions to avoid recent ones too
    const filteredGeneral = generalQuestions.filter(
      (q) =>
        !recentQuestionTexts.some((recent) =>
          recent
            .toLowerCase()
            .includes(q.question.toLowerCase().substring(0, 30))
        )
    );
    const remainingNeeded = 6 - questions.length;
    questions.push(
      ...(filteredGeneral.length > 0
        ? filteredGeneral
        : generalQuestions
      ).slice(0, remainingNeeded)
    );
  }

  // Ensure we have exactly 6 questions with proper difficulty distribution
  const finalQuestions = questions.slice(0, 6).map((q, index) => {
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

    // Add required fields for the interview system
    return {
      ...q,
      selectedAnswer: null,
      answer: "",
      score: 0,
      aiScore: null,
      feedback: "",
    };
  });

  // Store questions in recent cache to avoid future repeats
  try {
    const questionsToStore = finalQuestions.map((q) => ({
      question: q.question,
      category: q.category,
    }));
    const updatedRecentQuestions = [
      ...questionsToStore,
      ...recentQuestions,
    ].slice(0, 20); // Keep last 20
    localStorage.setItem(
      `recent_questions_${cacheKey}`,
      JSON.stringify(updatedRecentQuestions)
    );
  } catch (storageError) {
    console.log("Could not store questions in cache:", storageError);
  }

  return finalQuestions;
};

// Randomized fallback questions with variety
const getRandomizedFallbackQuestions = (randomSeed = Math.random() * 1000) => {
  const questionBank = [
    {
      id: `q_fallback_1_${randomSeed}`,
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
      category: "React Basics",
    },
    {
      id: `q_fallback_2_${randomSeed}`,
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
      category: "Node.js Fundamentals",
    },
    {
      id: `q_fallback_3_${randomSeed}`,
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
      category: "Express.js",
    },
    {
      id: `q_fallback_4_${randomSeed}`,
      question: "Which React hook is best for expensive calculations?",
      difficulty: "Medium",
      time: 60,
      options: ["useState", "useEffect", "useMemo", "useCallback"],
      correctAnswer: 2,
      explanation:
        "useMemo is designed to memoize expensive calculations and only recalculate when dependencies change.",
      category: "React Optimization",
    },
    {
      id: `q_fallback_5_${randomSeed}`,
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
      category: "Node.js Scaling",
    },
    {
      id: `q_fallback_6_${randomSeed}`,
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
      category: "React State Management",
    },
    {
      id: `q_fallback_7_${randomSeed}`,
      question: "What is the purpose of webpack in modern web development?",
      difficulty: "Medium",
      time: 60,
      options: [
        "To create web pages",
        "To bundle and optimize web assets",
        "To host websites",
        "To write CSS",
      ],
      correctAnswer: 1,
      explanation:
        "Webpack is a module bundler that bundles JavaScript files and other assets for use in a browser.",
      category: "Build Tools",
    },
    {
      id: `q_fallback_8_${randomSeed}`,
      question: "What is REST API?",
      difficulty: "Easy",
      time: 20,
      options: [
        "A database management system",
        "An architectural style for web services",
        "A programming language",
        "A testing framework",
      ],
      correctAnswer: 1,
      explanation:
        "REST (Representational State Transfer) is an architectural style for designing web services.",
      category: "Web APIs",
    },
    {
      id: `q_fallback_9_${randomSeed}`,
      question: "What is the difference between HTTP and HTTPS?",
      difficulty: "Easy",
      time: 20,
      options: [
        "HTTPS is faster",
        "HTTPS is encrypted, HTTP is not",
        "HTTP is newer",
        "There's no difference",
      ],
      correctAnswer: 1,
      explanation:
        "HTTPS is the secure version of HTTP, using SSL/TLS encryption to protect data in transit.",
      category: "Web Security",
    },
    {
      id: `q_fallback_10_${randomSeed}`,
      question: "What is Git and why is it important?",
      difficulty: "Easy",
      time: 20,
      options: [
        "A programming language",
        "A version control system for tracking changes",
        "A web browser",
        "A database",
      ],
      correctAnswer: 1,
      explanation:
        "Git is a distributed version control system that tracks changes in source code during software development.",
      category: "Version Control",
    },
    {
      id: `q_fallback_11_${randomSeed}`,
      question:
        "What is the difference between var, let, and const in JavaScript?",
      difficulty: "Medium",
      time: 60,
      options: [
        "They are all exactly the same",
        "var is function-scoped, let and const are block-scoped",
        "const is the fastest",
        "let is deprecated",
      ],
      correctAnswer: 1,
      explanation:
        "var has function scope, while let and const have block scope. const also prevents reassignment.",
      category: "JavaScript Fundamentals",
    },
    {
      id: `q_fallback_12_${randomSeed}`,
      question: "What is the purpose of the package.json file?",
      difficulty: "Easy",
      time: 20,
      options: [
        "To store user data",
        "To manage project dependencies and metadata",
        "To write JavaScript code",
        "To create web pages",
      ],
      correctAnswer: 1,
      explanation:
        "package.json contains project metadata, dependencies, scripts, and configuration for Node.js projects.",
      category: "Node.js Configuration",
    },
  ];

  // Shuffle questions and return a randomized subset
  return questionBank.sort(() => Math.random() - 0.5);
};

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

// Fallback questions if AI fails (keeping for backward compatibility)
const getFallbackQuestions = () => getRandomizedFallbackQuestions();

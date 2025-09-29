// Test script to validate enhanced question generation
import { generateInterviewQuestions } from "./src/services/geminiService.js";

// Mock resume data for testing
const mockResumeData = {
  resumeText:
    "Experienced React developer with Node.js and JavaScript expertise. Built multiple full-stack applications using React hooks, Express.js, and MongoDB.",
  skills: "React, Node.js, JavaScript, Express, MongoDB, HTML, CSS",
  technologies: "React.js, Node.js, Express.js, MongoDB, JavaScript ES6+",
};

// Test function
async function testQuestionGeneration() {
  console.log("Testing enhanced question generation...");

  // Generate questions multiple times to test variety
  for (let i = 1; i <= 5; i++) {
    console.log(`\n--- Test Run ${i} ---`);

    try {
      const questions = await generateInterviewQuestions(mockResumeData);
      console.log(`Generated ${questions.length} questions:`);

      questions.forEach((q, index) => {
        console.log(`${index + 1}. [${q.difficulty}] ${q.question}`);
        console.log(`   Category: ${q.category || "Unknown"}`);
      });

      // Check for variety
      const categories = [...new Set(questions.map((q) => q.category))];
      console.log(`Categories: ${categories.join(", ")}`);
    } catch (error) {
      console.error(`Error in test run ${i}:`, error.message);
    }

    // Add delay between tests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

// Run the test
testQuestionGeneration().catch(console.error);

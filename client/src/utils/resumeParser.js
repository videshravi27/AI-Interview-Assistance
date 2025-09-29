import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import mammoth from "mammoth";

// Set worker properly for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

// Parse PDF
export const parsePDF = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join(" ") + " ";
  }
  return extractInfo(text);
};

// Parse DOCX
export const parseDOCX = async (file) => {
  const result = await mammoth.extractRawText({
    arrayBuffer: await file.arrayBuffer(),
  });
  return extractInfo(result.value);
};

// Extract comprehensive information from resume text
const extractInfo = (text) => {
  const lowerText = text.toLowerCase();

  // Improved name extraction - look for name in multiple patterns
  let nameMatch = null;

  // Pattern 1: Look for "Name:" followed by text (but be more restrictive)
  const namePatternMatch = text.match(
    /Name[:\s]+([A-Za-z][A-Za-z\s\.]{1,40}?)(?:\n|$|Phone|Email|Contact|Address|\d)/i
  );
  if (namePatternMatch) {
    const extractedName = namePatternMatch[1].trim();
    const words = extractedName.split(" ").filter((w) => w.length > 0);
    if (words.length >= 1 && words.length <= 4) {
      nameMatch = [null, extractedName];
    }
  }

  if (!nameMatch) {
    // Pattern 2: Look at the first few lines for a name-like pattern
    const lines = text.split("\n").filter((line) => line.trim().length > 0);

    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();

      // Skip lines that contain common non-name indicators
      const skipPatterns = [
        /resume/i,
        /cv/i,
        /curriculum/i,
        /vitae/i,
        /@/,
        /\d{10}/,
        /phone.*:/i,
        /email.*:/i,
        /address.*:/i,
        /linkedin/i,
        /github/i,
        /portfolio/i,
        /website/i,
        /http/i,
      ];

      const shouldSkip = skipPatterns.some((pattern) => pattern.test(line));

      if (!shouldSkip) {
        // Check if line looks like a name - handle both title case and all caps
        const titleCasePattern =
          /^([A-Z][a-z]+(?:\s[A-Z][a-z]*\.?)*(?:\s[A-Z][a-z]+)*)$/;
        const allCapsPattern = /^([A-Z]+(?:\s[A-Z]\.?)*(?:\s[A-Z]+)*)$/;

        let match = line.match(titleCasePattern) || line.match(allCapsPattern);

        if (match && match[1]) {
          const words = match[1].split(" ").filter((w) => w.length > 0);
          // Valid name: 1-4 words, each word 1-20 characters
          if (
            words.length >= 1 &&
            words.length <= 4 &&
            words.every((word) => word.length >= 1 && word.length <= 20)
          ) {
            nameMatch = [null, match[1]];
            break;
          }
        }
      }
    }
  }

  // Pattern 3: If still no match, try a more flexible approach on first non-empty lines
  if (!nameMatch) {
    const lines = text.split("\n").filter((line) => line.trim().length > 0);

    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i].trim();

      // Remove common prefixes and suffixes that might be attached to names
      const cleanLine = line
        .replace(/^(Name[:\s]*|Mr\.?\s*|Mrs\.?\s*|Ms\.?\s*|Dr\.?\s*)/i, "")
        .replace(/(Phone|Email|Address|Contact).*$/i, "")
        .replace(/[^\w\s\.]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      // Check if the cleaned line looks like a name
      if (cleanLine.length >= 2 && cleanLine.length <= 50) {
        const words = cleanLine.split(" ").filter((word) => word.length > 0);

        // Should be 1-4 words, each word reasonable length
        if (words.length >= 1 && words.length <= 4) {
          const allWordsValid = words.every(
            (word) =>
              word.length >= 1 &&
              word.length <= 20 &&
              /^[A-Za-z\.]+$/.test(word) // Only letters and dots
          );

          if (allWordsValid) {
            nameMatch = [null, cleanLine];
            break;
          }
        }
      }
    }
  }
  const emailMatch = text.match(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/
  );
  const phoneMatch =
    text.match(/\b\d{10}\b/) || text.match(/\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/);

  // Skills extraction - look for common skill keywords
  const skillPatterns = [
    "javascript",
    "js",
    "typescript",
    "python",
    "java",
    "c++",
    "c#",
    "php",
    "ruby",
    "go",
    "rust",
    "react",
    "reactjs",
    "angular",
    "vue",
    "vuejs",
    "svelte",
    "next",
    "nextjs",
    "node",
    "nodejs",
    "express",
    "nestjs",
    "koa",
    "fastify",
    "html",
    "css",
    "scss",
    "sass",
    "tailwind",
    "bootstrap",
    "mongodb",
    "mysql",
    "postgresql",
    "redis",
    "sqlite",
    "dynamodb",
    "aws",
    "azure",
    "gcp",
    "docker",
    "kubernetes",
    "jenkins",
    "git",
    "github",
    "spring",
    "django",
    "flask",
    "laravel",
    "rails",
    "asp.net",
    "graphql",
    "rest",
    "api",
    "microservices",
    "serverless",
    "machine learning",
    "ml",
    "ai",
    "data science",
    "tensorflow",
    "pytorch",
    "agile",
    "scrum",
    "devops",
    "ci/cd",
    "testing",
    "jest",
    "cypress",
  ];

  const foundSkills = skillPatterns.filter((skill) =>
    lowerText.includes(skill.toLowerCase())
  );

  // Extract experience level
  const experiencePatterns = [
    /(\d+)[\s]*(?:\+)?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp)/gi,
    /experience[:\s]*(\d+)[\s]*(?:\+)?\s*(?:years?|yrs?)/gi,
    /(\d+)[\s]*(?:\+)?\s*(?:years?|yrs?)\s*(?:in|with)/gi,
  ];

  let experienceYears = 0;
  for (const pattern of experiencePatterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      experienceYears = Math.max(...matches.map((m) => parseInt(m[1]) || 0));
      break;
    }
  }

  // Extract education
  const educationKeywords = [
    "bachelor",
    "master",
    "phd",
    "degree",
    "university",
    "college",
    "computer science",
    "engineering",
  ];
  const hasEducation = educationKeywords.some((keyword) =>
    lowerText.includes(keyword)
  );

  // Extract work experience companies/roles
  const roleKeywords = [
    "software engineer",
    "developer",
    "full stack",
    "frontend",
    "backend",
    "senior",
    "junior",
    "lead",
    "architect",
    "manager",
    "intern",
    "data scientist",
    "ml engineer",
    "devops",
    "sre",
  ];

  const foundRoles = roleKeywords.filter((role) =>
    lowerText.includes(role.toLowerCase())
  );

  // Determine primary technology stack
  let primaryStack = "Full-stack";
  if (
    foundSkills.includes("react") ||
    foundSkills.includes("angular") ||
    foundSkills.includes("vue")
  ) {
    if (foundSkills.includes("node") || foundSkills.includes("nodejs")) {
      primaryStack = "MERN/MEAN Stack";
    } else {
      primaryStack = "Frontend Developer";
    }
  } else if (foundSkills.includes("python")) {
    primaryStack = "Python Developer";
  } else if (foundSkills.includes("java")) {
    primaryStack = "Java Developer";
  } else if (foundSkills.includes("node") || foundSkills.includes("nodejs")) {
    primaryStack = "Backend Developer";
  }

  return {
    name: nameMatch ? nameMatch[1]?.trim() : "",
    email: emailMatch ? emailMatch[0] : "",
    phone: phoneMatch ? phoneMatch[0] : "",
    resumeText: text, // Full resume text for AI analysis
    skills: foundSkills.join(", "),
    technologies: foundSkills.slice(0, 10).join(", "), // Top 10 technologies
    experience:
      experienceYears > 0 ? `${experienceYears} years` : "Entry level",
    roles: foundRoles.join(", "),
    primaryStack,
    hasEducation,
    skillCount: foundSkills.length,
    experienceLevel:
      experienceYears <= 1
        ? "Entry"
        : experienceYears <= 3
        ? "Mid"
        : experienceYears <= 7
        ? "Senior"
        : "Expert",
  };
};

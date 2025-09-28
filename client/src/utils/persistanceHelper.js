// Persistence helper for manual localStorage operations

export const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    console.log(`Data saved to localStorage with key: ${key}`);
    return true;
  } catch (error) {
    console.error("Error saving to localStorage:", error);
    return false;
  }
};

export const loadFromLocalStorage = (key) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error("Error loading from localStorage:", error);
    return null;
  }
};

export const removeFromLocalStorage = (key) => {
  try {
    localStorage.removeItem(key);
    console.log(`Data removed from localStorage with key: ${key}`);
    return true;
  } catch (error) {
    console.error("Error removing from localStorage:", error);
    return false;
  }
};

// Backup interview data specifically
export const backupInterviewData = (candidate) => {
  if (!candidate) return false;

  const backupKey = `interview-backup-${candidate.id}`;
  const backupData = {
    id: candidate.id,
    name: candidate.name,
    email: candidate.email,
    phone: candidate.phone,
    status: candidate.status,
    questions: candidate.questions,
    currentQuestionIndex: candidate.currentQuestionIndex,
    totalScore: candidate.totalScore,
    maxScore: candidate.maxScore,
    interviewStartedAt: candidate.interviewStartedAt,
    interviewCompletedAt: candidate.interviewCompletedAt,
    summary: candidate.summary,
    chatHistory: candidate.chatHistory,
    timestamp: new Date().toISOString(),
  };

  return saveToLocalStorage(backupKey, backupData);
};

// Restore interview data
export const restoreInterviewData = (candidateId) => {
  const backupKey = `interview-backup-${candidateId}`;
  return loadFromLocalStorage(backupKey);
};

// Clean up old backup data
export const cleanupOldBackups = (daysToKeep = 7) => {
  try {
    const keys = Object.keys(localStorage);
    const cutoffTime = new Date().getTime() - daysToKeep * 24 * 60 * 60 * 1000;

    keys.forEach((key) => {
      if (key.startsWith("interview-backup-")) {
        const data = loadFromLocalStorage(key);
        if (data && data.timestamp) {
          const backupTime = new Date(data.timestamp).getTime();
          if (backupTime < cutoffTime) {
            removeFromLocalStorage(key);
          }
        }
      }
    });

    console.log("Old backup cleanup completed");
  } catch (error) {
    console.error("Error during backup cleanup:", error);
  }
};

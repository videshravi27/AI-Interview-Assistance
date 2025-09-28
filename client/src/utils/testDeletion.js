// Test script to validate candidate deletion functionality
export const testCandidateDeletion = () => {
  console.log("=== Testing Candidate Deletion ===");

  try {
    // Check if we have access to Redux store
    if (typeof window !== "undefined" && window.store) {
      const state = window.store.getState();
      console.log(
        "Current candidates count:",
        state.candidates?.candidates?.length || 0
      );
      console.log(
        "Deleted candidates list:",
        state.candidates?.deletedCandidateIds || []
      );
    } else {
      console.log("Redux store not available for testing");
    }

    // Check localStorage cleanup
    const keys = Object.keys(localStorage);
    const candidateKeys = keys.filter(
      (key) =>
        key.includes("interview-backup-") ||
        key.includes("completed-interview-") ||
        key.includes("candidate-")
    );

    console.log(
      "Found localStorage keys related to candidates:",
      candidateKeys
    );

    return true;
  } catch (error) {
    console.error("Error during deletion test:", error);
    return false;
  }
};

// Clean up all candidate-related localStorage entries (for testing purposes)
export const cleanAllCandidateStorage = () => {
  console.log("=== Cleaning All Candidate Storage ===");

  try {
    const keys = Object.keys(localStorage);
    const keysToRemove = keys.filter(
      (key) =>
        key.includes("interview-backup-") ||
        key.includes("completed-interview-") ||
        key.includes("candidate-")
    );

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      console.log(`Removed: ${key}`);
    });

    console.log(`Cleaned up ${keysToRemove.length} storage entries`);
    return keysToRemove.length;
  } catch (error) {
    console.error("Error during storage cleanup:", error);
    return 0;
  }
};

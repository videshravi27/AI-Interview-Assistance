// Clear localStorage utility for AI Interview App
// Run this in browser console if you encounter state issues

// Clear all AI Interview related localStorage
const clearAIInterviewStorage = () => {
  // Clear Redux persist data
  localStorage.removeItem("persist:ai-interview-app");
  localStorage.removeItem("persist:root"); // Legacy key

  // Clear auto-save data
  localStorage.removeItem("ai-interview-autosave");

  // Clear any other related keys
  Object.keys(localStorage).forEach((key) => {
    if (
      key.includes("ai-interview") ||
      key.includes("candidates") ||
      key.includes("interview")
    ) {
      localStorage.removeItem(key);
    }
  });

  console.log("AI Interview localStorage cleared! Please refresh the page.");
};

// Export for use in components if needed
export { clearAIInterviewStorage };

// Make available globally for console use
window.clearAIInterviewStorage = clearAIInterviewStorage;

// Auto-run if called directly
if (typeof window !== "undefined") {
  clearAIInterviewStorage();
}

// localStorage debug utility to diagnose persistence issues

export const debugLocalStorageState = () => {
  console.log("=== localStorage Debug Report ===");

  // 1. Check what's in localStorage
  const allKeys = Object.keys(localStorage);
  console.log("All localStorage keys:", allKeys);

  // 2. Check specific persist key
  const persistKey = "persist:ai-interview-app";
  const persistData = localStorage.getItem(persistKey);

  if (persistData) {
    try {
      const parsed = JSON.parse(persistData);
      console.log("✅ Persist data found:", parsed);

      if (parsed._persist) {
        console.log("Persist metadata:", parsed._persist);
      }

      // Check if candidates data exists and is parseable
      if (typeof parsed === "string") {
        const candidatesData = JSON.parse(parsed);
        console.log("Candidates data:", candidatesData);
      } else if (parsed.candidates) {
        console.log("Direct candidates data:", parsed.candidates);
      }
    } catch (error) {
      console.error("❌ Error parsing persist data:", error);
      console.log("Raw persist data:", persistData);
    }
  } else {
    console.log("⚠️ No persist data found");
  }

  // 3. Check backup keys
  const backupKeys = allKeys.filter(
    (key) =>
      key.startsWith("interview-backup-") ||
      key.startsWith("completed-interview-") ||
      key.startsWith("candidate-")
  );

  console.log(`Found ${backupKeys.length} backup keys:`, backupKeys);

  backupKeys.forEach((key) => {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      console.log(`${key}: ${data.name} (${data.status})`);
    } catch (error) {
      console.log(`${key}: Invalid data`);
    }
  });

  // 4. Redux store state (if available)
  if (window.store) {
    const state = window.store.getState();
    console.log("Current Redux state:", state);
    console.log("Candidates count:", state.candidates?.candidates?.length || 0);
  } else {
    console.log("Redux store not available");
  }

  console.log("=== End Debug Report ===");
};

export const clearAllPersistData = () => {
  console.log("=== Clearing All Persist Data ===");

  const keys = Object.keys(localStorage);
  const persistKeys = keys.filter(
    (key) =>
      key.startsWith("persist:") ||
      key.startsWith("interview-backup-") ||
      key.startsWith("completed-interview-") ||
      key.startsWith("candidate-")
  );

  persistKeys.forEach((key) => {
    localStorage.removeItem(key);
    console.log(`Removed: ${key}`);
  });

  console.log(`Cleared ${persistKeys.length} persistence keys`);

  // Also clear any Redux state
  if (window.store) {
    // This would require a reset action - for now just log
    console.log("Note: Refresh page to reset Redux state");
  }
};

export const recreatePersistData = (sampleData = null) => {
  console.log("=== Recreating Persist Data ===");

  const defaultState = {
    candidates: [],
    activeCandidate: null,
    selectedCandidateId: null,
    searchTerm: "",
    sortBy: "score",
    sortOrder: "desc",
    deletedCandidateIds: [],
    _persist: {
      version: 3,
      rehydrated: true,
    },
  };

  const dataToSave = sampleData || defaultState;

  try {
    localStorage.setItem(
      "persist:ai-interview-app",
      JSON.stringify(dataToSave)
    );
    console.log("✅ Recreated persist data:", dataToSave);
    return true;
  } catch (error) {
    console.error("❌ Error recreating persist data:", error);
    return false;
  }
};

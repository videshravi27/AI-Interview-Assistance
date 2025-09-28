// Test localStorage persistence manually

export const testLocalStoragePersistence = () => {
  console.log("=== Testing localStorage Persistence ===");

  // Test basic localStorage operations
  const testData = { test: true, timestamp: new Date().toISOString() };

  try {
    localStorage.setItem("test-persistence", JSON.stringify(testData));
    const retrieved = localStorage.getItem("test-persistence");
    const parsed = JSON.parse(retrieved);

    if (parsed.test === true) {
      console.log("✅ Basic localStorage test passed");
    } else {
      console.log("❌ Basic localStorage test failed");
    }

    localStorage.removeItem("test-persistence");
  } catch (error) {
    console.log("❌ localStorage not available:", error);
    return false;
  }

  // Check Redux persist state
  const persistKey = localStorage.getItem("persist:ai-interview-app");
  if (persistKey) {
    try {
      const persistData = JSON.parse(persistKey);
      console.log("✅ Redux persist data found:", persistData);

      if (persistData.candidates) {
        const candidates = JSON.parse(persistData.candidates);
        console.log(
          `✅ Found ${candidates.candidates?.length || 0} candidates in persist`
        );
      }
    } catch (error) {
      console.log("❌ Error parsing Redux persist data:", error);
    }
  } else {
    console.log("⚠️ No Redux persist data found");
  }

  // Check backup data
  const backupKeys = Object.keys(localStorage).filter(
    (key) =>
      key.startsWith("interview-backup-") ||
      key.startsWith("completed-interview-")
  );
  console.log(`✅ Found ${backupKeys.length} backup entries`);

  backupKeys.forEach((key) => {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      console.log(`  - ${key}: ${data.name} (${data.status})`);
    } catch (error) {
      console.log(`  - ${key}: Invalid data`);
    }
  });

  console.log("=== End Persistence Test ===");

  return true;
};

// Force save current Redux state to localStorage
export const forceSaveReduxState = (store) => {
  try {
    const state = store.getState();

    // Save using Redux persist format
    const persistData = {
      candidates: JSON.stringify(state.candidates),
      _persist: {
        version: 2,
        rehydrated: true,
      },
    };

    localStorage.setItem(
      "persist:ai-interview-app",
      JSON.stringify(persistData)
    );
    console.log("✅ Forced Redux state save completed");

    // Also save individual completed interviews
    const completedCandidates =
      state.candidates?.candidates?.filter((c) => c.status === "completed") ||
      [];

    completedCandidates.forEach((candidate) => {
      const key = `completed-interview-${candidate.id}`;
      localStorage.setItem(key, JSON.stringify(candidate));
      console.log(`✅ Saved completed interview: ${candidate.name}`);
    });

    return true;
  } catch (error) {
    console.error("❌ Error in force save:", error);
    return false;
  }
};

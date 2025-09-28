// Debug localStorage helper to check what's being stored

export const debugLocalStorage = () => {
  console.log("=== LocalStorage Debug ===");
  console.log("All localStorage keys:", Object.keys(localStorage));

  // Check Redux persist key
  const persistKey = localStorage.getItem("persist:ai-interview-app");
  console.log(
    "Redux persist data:",
    persistKey ? JSON.parse(persistKey) : "Not found"
  );

  // Check individual backup keys
  const backupKeys = Object.keys(localStorage).filter((key) =>
    key.startsWith("interview-backup-")
  );
  console.log("Backup keys found:", backupKeys);

  backupKeys.forEach((key) => {
    const data = localStorage.getItem(key);
    console.log(`Backup ${key}:`, data ? JSON.parse(data) : "Empty");
  });

  // Check autosave
  const autosave = localStorage.getItem("ai-interview-autosave");
  console.log("Autosave data:", autosave ? JSON.parse(autosave) : "Not found");

  console.log("=== End Debug ===");
};

export const forceReduxSave = (store) => {
  console.log("Current Redux state:", store.getState());

  // Force a manual save to localStorage
  const state = store.getState();
  const persistData = {
    candidates: JSON.stringify(state.candidates),
    _persist: {
      version: 2,
      rehydrated: true,
    },
  };

  try {
    localStorage.setItem(
      "persist:ai-interview-app",
      JSON.stringify(persistData)
    );
    console.log("Manual persist save successful");
    return true;
  } catch (error) {
    console.error("Manual persist save failed:", error);
    return false;
  }
};

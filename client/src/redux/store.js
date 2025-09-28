// src/redux/store.js
import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import candidatesReducer from "./slices/candidatesSlice";

// State migration function with better error handling
const migrate = (state) => {
  try {
    if (!state || typeof state !== "object") {
      console.log("Initializing fresh state");
      return undefined; // This will use the initial state
    }

    // Ensure proper structure exists (direct state, not nested under candidates)
    if (!Array.isArray(state.candidates)) {
      console.log("Migrating state structure");
      return {
        candidates: [],
        activeCandidate: null,
        selectedCandidateId: null,
        searchTerm: "",
        sortBy: "score",
        sortOrder: "desc",
        deletedCandidateIds: [],
      };
    }

    // Ensure deletedCandidateIds exists
    if (!Array.isArray(state.deletedCandidateIds)) {
      state.deletedCandidateIds = [];
    }

    // Validate each candidate has required fields
    state.candidates = state.candidates.map((candidate) => ({
      id: candidate.id || null,
      name: candidate.name || "",
      email: candidate.email || "",
      phone: candidate.phone || "",
      resumeText: candidate.resumeText || "",
      fileName: candidate.fileName || "",
      status: candidate.status || "info_collection",
      createdAt: candidate.createdAt || new Date().toISOString(),
      updatedAt: candidate.updatedAt || new Date().toISOString(),
      questions: Array.isArray(candidate.questions) ? candidate.questions : [],
      currentQuestionIndex:
        typeof candidate.currentQuestionIndex === "number"
          ? candidate.currentQuestionIndex
          : 0,
      totalScore:
        typeof candidate.totalScore === "number" ? candidate.totalScore : 0,
      maxScore: typeof candidate.maxScore === "number" ? candidate.maxScore : 0,
      interviewStartedAt: candidate.interviewStartedAt || null,
      interviewCompletedAt: candidate.interviewCompletedAt || null,
      summary: candidate.summary || null,
      chatHistory: Array.isArray(candidate.chatHistory)
        ? candidate.chatHistory
        : [],
    }));

    console.log("State migration completed successfully");
    return state;
  } catch (error) {
    console.error("Error during state migration:", error);
    return undefined; // Fallback to initial state
  }
};

// Enhanced persist config with better error handling
const persistConfig = {
  key: "ai-interview-app",
  storage,
  version: 3, // Increment version for new migration
  migrate,
  whitelist: ["candidates"], // Only persist candidates slice
  throttle: 100, // Reduced throttle for more frequent saves
  serialize: true, // Ensure proper serialization
  debug: false, // Disable debug mode for cleaner logs
};

// Persisted reducer with better error handling
const persistedReducer = persistReducer(persistConfig, candidatesReducer);

// Configure store with enhanced middleware
export const store = configureStore({
  reducer: {
    candidates: persistedReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          "persist/PERSIST",
          "persist/REHYDRATE",
          "persist/REGISTER",
          "persist/FLUSH",
          "persist/PAUSE",
          "persist/PURGE",
          "persist/PASTE",
        ],
        ignoredActionsPaths: ["payload.timestamp", "meta.arg.timestamp"],
        ignoredPaths: ["candidates.activeCandidate.chatHistory"],
      },
    }),
  devTools: process.env.NODE_ENV !== "production",
});

// Create and export persistor with error handling
export const persistor = persistStore(store, null, () => {
  console.log("Redux persist rehydration completed");
  console.log("Current state after rehydration:", store.getState());
});

// Make store globally accessible for testing (development only)
if (process.env.NODE_ENV !== "production") {
  window.store = store;
}

// Add global flush function for immediate persistence
window.__REDUX_PERSIST_FLUSH__ = () => {
  try {
    persistor.flush();
    console.log("Redux persist flush completed");
    return true;
  } catch (error) {
    console.error("Error during persist operations:", error);
    return false;
  }
};

// Auto-save every 5 seconds during active sessions
setInterval(() => {
  try {
    const state = store.getState();
    const activeCandidate = state.candidates?.activeCandidate;

    if (
      activeCandidate &&
      (activeCandidate.status === "interview" ||
        activeCandidate.status === "paused")
    ) {
      window.__REDUX_PERSIST_FLUSH__();
    }
  } catch (error) {
    console.error("Error in auto-save interval:", error);
  }
}, 5000);

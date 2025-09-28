import { createSlice } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";

const initialState = {
  candidates: [], // list of all candidates
  activeCandidate: null, // candidate currently in chat
  selectedCandidateId: null, // for dashboard candidate detail view
  searchTerm: "",
  sortBy: "score", // 'score', 'name', 'date'
  sortOrder: "desc", // 'asc', 'desc'
  deletedCandidateIds: [], // Track deleted candidates to prevent restoration
};

const candidatesSlice = createSlice({
  name: "candidates",
  initialState,
  reducers: {
    // Create a new candidate
    createCandidate: (state, action) => {
      // Ensure candidates is always an array
      if (!Array.isArray(state.candidates)) {
        state.candidates = [];
      }

      const newCandidate = {
        id: uuidv4(),
        ...action.payload,
        status: "info_collection", // 'info_collection', 'interview', 'completed', 'paused'
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        questions: [],
        currentQuestionIndex: 0,
        totalScore: 0,
        maxScore: 0,
        interviewStartedAt: null,
        interviewCompletedAt: null,
        summary: null,
        chatHistory: [], // Array of chat messages
      };
      state.candidates.push(newCandidate);
      state.activeCandidate = newCandidate;

      // Force immediate persistence
      setTimeout(() => {
        if (typeof window !== "undefined" && window.__REDUX_PERSIST_FLUSH__) {
          window.__REDUX_PERSIST_FLUSH__();
        }
      }, 100);
    },

    // Update candidate information
    updateCandidate: (state, action) => {
      // Ensure candidates is always an array
      if (!Array.isArray(state.candidates)) {
        state.candidates = [];
        return;
      }

      const { id, data } = action.payload;
      const index = state.candidates.findIndex((c) => c.id === id);
      if (index !== -1) {
        state.candidates[index] = {
          ...state.candidates[index],
          ...data,
          updatedAt: new Date().toISOString(),
        };

        // Update active candidate if it's the same one
        if (state.activeCandidate && state.activeCandidate.id === id) {
          state.activeCandidate = state.candidates[index];
        }
      } else {
        // If candidate doesn't exist, create it (for restoration)
        const newCandidate = {
          id: id || uuidv4(),
          ...data,
          updatedAt: new Date().toISOString(),
        };
        state.candidates.push(newCandidate);
      }
    },

    // Restore candidate from localStorage backup
    restoreCandidate: (state, action) => {
      // Ensure candidates is always an array
      if (!Array.isArray(state.candidates)) {
        state.candidates = [];
      }

      const candidateData = action.payload;

      // Don't restore if candidate was deliberately deleted
      if (state.deletedCandidateIds.includes(candidateData.id)) {
        console.log(
          `Skipping restoration of deleted candidate: ${candidateData.name}`
        );
        return;
      }

      const existingIndex = state.candidates.findIndex(
        (c) => c.id === candidateData.id
      );

      if (existingIndex === -1) {
        // Add new candidate if it doesn't exist
        state.candidates.push({
          ...candidateData,
          restoredAt: new Date().toISOString(),
        });
        console.log(`Restored candidate: ${candidateData.name}`);
      } else {
        // Update existing candidate with restored data if it has more recent info
        const existing = state.candidates[existingIndex];
        const existingCompleted = existing.interviewCompletedAt
          ? new Date(existing.interviewCompletedAt)
          : null;
        const restoredCompleted = candidateData.interviewCompletedAt
          ? new Date(candidateData.interviewCompletedAt)
          : null;

        if (
          !existingCompleted ||
          (restoredCompleted && restoredCompleted > existingCompleted)
        ) {
          state.candidates[existingIndex] = {
            ...candidateData,
            restoredAt: new Date().toISOString(),
          };
          console.log(
            `Updated candidate with restored data: ${candidateData.name}`
          );
        }
      }
    },

    // Set active candidate for chat
    setActiveCandidate: (state, action) => {
      state.activeCandidate = action.payload;
    },

    // Start interview with questions
    startInterview: (state, action) => {
      // Ensure candidates is always an array
      if (!Array.isArray(state.candidates)) {
        state.candidates = [];
        return;
      }

      const { candidateId, questions } = action.payload;
      const index = state.candidates.findIndex((c) => c.id === candidateId);
      if (index !== -1) {
        state.candidates[index].questions = questions;
        state.candidates[index].status = "interview";
        state.candidates[index].interviewStartedAt = new Date().toISOString();
        state.candidates[index].currentQuestionIndex = 0;
        state.candidates[index].maxScore = questions.reduce((sum, q) => {
          const maxScore =
            q.difficulty === "Easy" ? 10 : q.difficulty === "Medium" ? 20 : 30;
          return sum + maxScore;
        }, 0);

        if (state.activeCandidate && state.activeCandidate.id === candidateId) {
          state.activeCandidate = state.candidates[index];
        }
      }
    },

    // Submit answer for current question
    submitAnswer: (state, action) => {
      const {
        candidateId,
        questionId,
        answer,
        selectedAnswer,
        score,
        feedback,
      } = action.payload;
      const candidateIndex = state.candidates.findIndex(
        (c) => c.id === candidateId
      );

      if (candidateIndex !== -1) {
        const candidate = state.candidates[candidateIndex];
        const questionIndex = candidate.questions.findIndex(
          (q) => q.id === questionId
        );

        if (questionIndex !== -1) {
          // Update question with answer and score
          candidate.questions[questionIndex] = {
            ...candidate.questions[questionIndex],
            answer,
            selectedAnswer,
            score,
            feedback,
            answeredAt: new Date().toISOString(),
          };

          // Update total score
          candidate.totalScore = candidate.questions.reduce(
            (sum, q) => sum + (q.score || 0),
            0
          );
          candidate.updatedAt = new Date().toISOString();

          // Update active candidate if it's the same one
          if (
            state.activeCandidate &&
            state.activeCandidate.id === candidateId
          ) {
            state.activeCandidate = candidate;
          }
        }
      }
    },

    // Move to next question
    nextQuestion: (state, action) => {
      const { candidateId } = action.payload;
      const index = state.candidates.findIndex((c) => c.id === candidateId);

      if (index !== -1) {
        const candidate = state.candidates[index];
        if (candidate.currentQuestionIndex < candidate.questions.length - 1) {
          candidate.currentQuestionIndex++;
        } else {
          // Interview completed
          candidate.status = "completed";
          candidate.interviewCompletedAt = new Date().toISOString();
        }
        candidate.updatedAt = new Date().toISOString();

        if (state.activeCandidate && state.activeCandidate.id === candidateId) {
          state.activeCandidate = candidate;
        }
      }
    },

    // Pause interview
    pauseInterview: (state, action) => {
      const { candidateId } = action.payload;
      const index = state.candidates.findIndex((c) => c.id === candidateId);

      if (index !== -1) {
        state.candidates[index].status = "paused";
        state.candidates[index].updatedAt = new Date().toISOString();

        if (state.activeCandidate && state.activeCandidate.id === candidateId) {
          state.activeCandidate = state.candidates[index];
        }
      }
    },

    // Resume interview
    resumeInterview: (state, action) => {
      const { candidateId } = action.payload;
      const index = state.candidates.findIndex((c) => c.id === candidateId);

      if (index !== -1) {
        state.candidates[index].status = "interview";
        state.candidates[index].updatedAt = new Date().toISOString();

        if (state.activeCandidate && state.activeCandidate.id === candidateId) {
          state.activeCandidate = state.candidates[index];
        }
      }
    },

    // Complete interview with summary
    completeInterview: (state, action) => {
      const { candidateId, summary } = action.payload;
      const index = state.candidates.findIndex((c) => c.id === candidateId);

      if (index !== -1) {
        state.candidates[index].status = "completed";
        state.candidates[index].summary = summary;
        state.candidates[index].interviewCompletedAt = new Date().toISOString();
        state.candidates[index].updatedAt = new Date().toISOString();

        if (state.activeCandidate && state.activeCandidate.id === candidateId) {
          state.activeCandidate = state.candidates[index];
        }

        // Force immediate persistence for completed interviews
        setTimeout(() => {
          if (typeof window !== "undefined" && window.__REDUX_PERSIST_FLUSH__) {
            window.__REDUX_PERSIST_FLUSH__();
          }

          // Also create backup
          try {
            const completedCandidate = state.candidates[index];
            localStorage.setItem(
              `completed-interview-${candidateId}`,
              JSON.stringify(completedCandidate)
            );
          } catch (error) {
            console.error("Error creating interview backup:", error);
          }
        }, 100);
      }
    },

    // Add chat message
    addChatMessage: (state, action) => {
      const { candidateId, message } = action.payload;
      const index = state.candidates.findIndex((c) => c.id === candidateId);

      if (index !== -1) {
        state.candidates[index].chatHistory.push({
          id: uuidv4(),
          ...message,
          timestamp: new Date().toISOString(),
        });
        state.candidates[index].updatedAt = new Date().toISOString();

        if (state.activeCandidate && state.activeCandidate.id === candidateId) {
          state.activeCandidate = state.candidates[index];
        }
      }
    },

    // Dashboard actions
    setSelectedCandidate: (state, action) => {
      state.selectedCandidateId = action.payload;
    },

    setSearchTerm: (state, action) => {
      state.searchTerm = action.payload;
    },

    setSortBy: (state, action) => {
      state.sortBy = action.payload;
    },

    setSortOrder: (state, action) => {
      state.sortOrder = action.payload;
    },

    // Clear active candidate (for starting new interview)
    clearActiveCandidate: (state) => {
      state.activeCandidate = null;
    },

    // Delete candidate
    deleteCandidate: (state, action) => {
      // Ensure candidates is always an array
      if (!Array.isArray(state.candidates)) {
        state.candidates = [];
        return;
      }

      const candidateId = action.payload;

      // Add to deleted candidates list to prevent restoration
      if (!state.deletedCandidateIds.includes(candidateId)) {
        state.deletedCandidateIds.push(candidateId);
      }

      // Remove candidate from state
      state.candidates = state.candidates.filter((c) => c.id !== candidateId);

      // Clear related state references
      if (state.activeCandidate && state.activeCandidate.id === candidateId) {
        state.activeCandidate = null;
      }

      if (state.selectedCandidateId === candidateId) {
        state.selectedCandidateId = null;
      }

      // Clean up localStorage items related to this candidate
      try {
        const keys = Object.keys(localStorage);
        keys.forEach((key) => {
          if (key.includes(candidateId)) {
            localStorage.removeItem(key);
          }
        });

        // Force persist flush to immediately save the deletion
        if (typeof window !== "undefined" && window.__REDUX_PERSIST_FLUSH__) {
          setTimeout(() => {
            window.__REDUX_PERSIST_FLUSH__();
          }, 50);
        }

        console.log(`Cleaned up localStorage for candidate ${candidateId}`);
      } catch (error) {
        console.error("Error cleaning localStorage:", error);
      }
    },
  },
});

export const {
  createCandidate,
  updateCandidate,
  restoreCandidate,
  setActiveCandidate,
  startInterview,
  submitAnswer,
  nextQuestion,
  pauseInterview,
  resumeInterview,
  completeInterview,
  addChatMessage,
  setSelectedCandidate,
  setSearchTerm,
  setSortBy,
  setSortOrder,
  clearActiveCandidate,
  deleteCandidate,
} = candidatesSlice.actions;

export default candidatesSlice.reducer;

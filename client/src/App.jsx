import React, { useEffect, useState } from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "./redux/store";
import ChatWindow from "./components/Chat/ChatWindow";
import CandidateList from "./components/Dashboard/CandidateList";
import CandidateDetail from "./components/Dashboard/CandidateDetail";
import SearchSort from "./components/Dashboard/SearchSort";
import WelcomeBackModal from "./components/Modals/WelcomeBackModal";
import { testLocalStoragePersistence, forceSaveReduxState } from "./utils/testPersistence";
import { debugLocalStorageState } from "./utils/debugStorage";

const App = () => {
  const [tab, setTab] = useState("Interviewee");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Check for unfinished sessions
    const checkUnfinished = () => {
      const state = store.getState();
      const candidates = state.candidates?.candidates || [];

      const hasUnfinished = candidates.some(
        (candidate) =>
          candidate.status === "paused" ||
          (candidate.status === "interview" &&
            candidate.questions &&
            candidate.questions.length > 0)
      );

      if (hasUnfinished) setShowModal(true);
    };

    const timer = setTimeout(checkUnfinished, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Provider store={store}>
      <PersistGate
        loading={
          <div className="bg-gray-100 flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-600 border-t-transparent mx-auto mb-2"></div>
              <p className="text-gray-600">Loading AI Interview Assistant...</p>
            </div>
          </div>
        }
        persistor={persistor}
      >
        <div className="min-h-screen bg-gray-100">

          {/* Modal */}
          {showModal && (
            <WelcomeBackModal onResume={() => setShowModal(false)} />
          )}

          {/* Header */}
          <header className="bg-white border-b border-gray-200 h-20 flex items-center justify-between px-8 sticky top-0 z-40 shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900">
              AI Interview Assistant
            </h1>

            {/* Tab Navigation + Save button */}
            <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
              <button
                className={`px-6 py-3 text-sm font-semibold rounded-md transition-all duration-300 ${tab === "Interviewee"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                onClick={() => setTab("Interviewee")}
              >
                Interviewee
              </button>

              <button
                className={`px-6 py-3 text-sm font-semibold rounded-md transition-all duration-300 ${tab === "Interviewer"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                onClick={() => setTab("Interviewer")}
              >
                Interviewer Dashboard
              </button>

              <button
                className="px-6 py-3 text-sm font-semibold rounded-md bg-gray-800 text-white hover:bg-gray-700 transition-all duration-300"
                onClick={() => forceSaveReduxState(store)}
              >
                Save
              </button>

              <button
                className="px-6 py-3 text-sm font-semibold rounded-md bg-gray-600 text-white hover:bg-gray-500 transition-all duration-300"
                onClick={() => debugLocalStorageState()}
                title="Debug localStorage"
              >
                Debug
              </button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6">
            {tab === "Interviewee" && (
              <div className="h-full">
                <ChatWindow />
              </div>
            )}

            {tab === "Interviewer" && (
              <div className="h-full">
                <div className="h-full grid grid-cols-4 gap-6">
                  {/* Left Panel */}
                  <div className="col-span-1 space-y-6 overflow-y-auto">
                    <SearchSort />
                    <CandidateList />
                  </div>
                  {/* Right Panel */}
                  <div className="col-span-3 overflow-y-auto">
                    <CandidateDetail />
                  </div>
                </div>
              </div>
            )}
          </main>

        </div>
      </PersistGate>
    </Provider>
  );
};

export default App;
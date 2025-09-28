import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from 'react-redux';
import { setActiveCandidate, resumeInterview } from '../../redux/slices/candidatesSlice';

const WelcomeBackModal = ({ onResume }) => {
    const dispatch = useDispatch();
    const { candidates } = useSelector(state => state.candidates);
    const [interruptedCandidates, setInterruptedCandidates] = useState([]);

    useEffect(() => {
        // Find candidates with interrupted interviews
        const interrupted = candidates.filter(candidate =>
            candidate.status === 'paused' ||
            (candidate.status === 'interview' && candidate.questions && candidate.questions.length > 0)
        );
        setInterruptedCandidates(interrupted);
    }, [candidates]);

    const handleResumeInterview = (candidate) => {
        dispatch(setActiveCandidate(candidate));
        if (candidate.status === 'paused') {
            dispatch(resumeInterview({ candidateId: candidate.id }));
        }
        onResume();
    };

    const handleStartNew = () => {
        onResume();
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown time';
        return new Date(dateString).toLocaleString();
    };

    const getInterviewProgress = (candidate) => {
        if (!candidate.questions || candidate.questions.length === 0) return 'Not started';
        const answered = candidate.questions.filter(q => q.answer && q.answer.trim() !== '').length;
        return `${answered}/${candidate.questions.length} questions answered`;
    };

    const getTimeElapsed = (candidate) => {
        if (!candidate.interviewStartedAt) return null;

        const startTime = new Date(candidate.interviewStartedAt);
        const now = new Date();
        const diffMs = now - startTime;
        const diffMins = Math.floor(diffMs / (1000 * 60));

        if (diffMins < 60) {
            return `${diffMins} minutes ago`;
        } else {
            const hours = Math.floor(diffMins / 60);
            const remainingMins = diffMins % 60;
            return `${hours}h ${remainingMins}m ago`;
        }
    };

    if (interruptedCandidates.length === 0) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-t-2xl">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="text-2xl">👋</div>
                        <h2 className="text-xl font-bold">
                            Welcome Back!
                        </h2>
                    </div>
                    <p className="text-purple-100 text-sm">
                        You have unfinished interviews. Would you like to continue where you left off?
                    </p>
                </div>

                {/* Interrupted Interviews List */}
                <div className="p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">
                        Unfinished Interviews ({interruptedCandidates.length})
                    </h3>

                    <div className="space-y-3 mb-6">
                        {interruptedCandidates.map((candidate) => (
                            <div
                                key={candidate.id}
                                className="border border-gray-200 rounded-xl p-4 hover:bg-purple-50 hover:border-purple-200 transition-all duration-200 cursor-pointer group"
                                onClick={() => handleResumeInterview(candidate)}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-gray-900 group-hover:text-purple-800">
                                            {candidate.name || 'Unnamed Candidate'}
                                        </h4>
                                        <p className="text-sm text-gray-600">
                                            {candidate.email}
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${candidate.status === 'paused'
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-blue-100 text-blue-800'
                                        }`}>
                                        {candidate.status === 'paused' ? 'Paused' : 'In Progress'}
                                    </span>
                                </div>

                                <div className="text-xs text-gray-500 space-y-1 mb-3">
                                    <div className="flex items-center gap-1">
                                        📊 {getInterviewProgress(candidate)}
                                    </div>
                                    {candidate.interviewStartedAt && (
                                        <div className="flex items-center gap-1">
                                            🕒 Started {getTimeElapsed(candidate)}
                                        </div>
                                    )}
                                    {candidate.updatedAt && (
                                        <div className="flex items-center gap-1">
                                            📝 Last activity: {formatDate(candidate.updatedAt)}
                                        </div>
                                    )}
                                </div>

                                {/* Progress bar */}
                                {candidate.questions && candidate.questions.length > 0 && (
                                    <div className="mb-3">
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-gradient-to-r from-purple-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                                                style={{
                                                    width: `${((candidate.currentQuestionIndex + 1) / candidate.questions.length) * 100}%`
                                                }}
                                            />
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            Question {candidate.currentQuestionIndex + 1} of {candidate.questions.length}
                                        </div>
                                    </div>
                                )}

                                <div className="text-center">
                                    <button className="text-purple-600 text-sm font-semibold hover:text-purple-800 transition-colors group-hover:text-purple-700">
                                        Click to Resume Interview →
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                        <button
                            onClick={handleStartNew}
                            className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-md"
                        >
                            Start New Interview
                        </button>

                        <button
                            onClick={onResume}
                            className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
                        >
                            Continue Without Resuming
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-6">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                        <p className="text-xs text-blue-700 text-center flex items-center justify-center gap-2">
                            <span>💡</span>
                            Your progress is automatically saved. You can resume anytime!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WelcomeBackModal;
import React from "react";
import { useSelector } from "react-redux";

const CandidateDetail = () => {
    const { candidates, selectedCandidateId } = useSelector((state) => state.candidates);

    const candidate = candidates.find(c => c.id === selectedCandidateId);

    if (!candidate) {
        return (
            <div className="candidate-detail bg-white rounded-xl shadow-sm border border-gray-200 p-12">
                <div className="text-center text-gray-500">
                    <div className="text-8xl mb-6">👤</div>
                    <h3 className="text-2xl font-semibold mb-3">No Candidate Selected</h3>
                    <p className="text-lg">Select a candidate from the list to view their details.</p>
                </div>
            </div>
        );
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed':
                return 'bg-gray-100 text-gray-800';
            case 'interview':
                return 'bg-gray-200 text-gray-900';
            case 'paused':
                return 'bg-gray-50 text-gray-700';
            case 'info_collection':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'completed':
                return 'Completed';
            case 'interview':
                return 'In Progress';
            case 'paused':
                return 'Paused';
            case 'info_collection':
                return 'Info Collection';
            default:
                return 'Unknown';
        }
    };

    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 'Easy':
                return 'bg-gray-100 text-gray-700';
            case 'Medium':
                return 'bg-gray-200 text-gray-800';
            case 'Hard':
                return 'bg-gray-800 text-white';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString();
    };

    const getScorePercentage = () => {
        if (!candidate.maxScore) return 0;
        return ((candidate.totalScore || 0) / candidate.maxScore * 100).toFixed(1);
    };

    const getRatingColor = (rating) => {
        switch (rating?.toLowerCase()) {
            case 'excellent':
                return 'text-gray-900 bg-gray-100 border-gray-300';
            case 'good':
                return 'text-gray-800 bg-gray-50 border-gray-200';
            case 'average':
                return 'text-gray-700 bg-gray-50 border-gray-200';
            case 'below average':
                return 'text-gray-600 bg-gray-50 border-gray-200';
            case 'poor':
                return 'text-gray-500 bg-gray-50 border-gray-200';
            default:
                return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    return (
        <div className="candidate-detail bg-white rounded-xl shadow-sm border border-gray-200">
            {/* Header */}
            <div className="p-8 border-b border-gray-200">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900">
                            {candidate.interviewName}
                        </h2>
                        {candidate.interviewName && (
                            <p className="text-lg text-gray-600 mt-2 font-medium">
                                Name: {candidate.name || 'Unnamed Candidate'}
                            </p>
                        )}
                    </div>
                    <span className={`px-6 py-3 rounded-full text-base font-semibold ${getStatusColor(candidate.status)}`}>
                        {getStatusText(candidate.status)}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-lg">
                    <div>
                        <span className="text-gray-500 font-medium">Email:</span>
                        <span className="ml-3 font-semibold">{candidate.email || 'N/A'}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 font-medium">Phone:</span>
                        <span className="ml-3 font-semibold">{candidate.phone || 'N/A'}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 font-medium">Created:</span>
                        <span className="ml-3 font-semibold">{formatDate(candidate.createdAt)}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 font-medium">Updated:</span>
                        <span className="ml-3 font-semibold">{formatDate(candidate.updatedAt)}</span>
                    </div>
                </div>
            </div>

            {/* Score Overview */}
            {candidate.status === 'completed' && candidate.summary && (
                <div className="p-8 border-b-2 border-gray-200 bg-gray-50">
                    <h3 className="text-2xl font-bold mb-6">Interview Results</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="text-center bg-white p-6 rounded-xl border">
                            <div className="text-4xl font-bold text-blue-600">
                                {candidate.totalScore || 0}
                            </div>
                            <div className="text-base text-gray-500 mt-2">Total Score</div>
                        </div>
                        <div className="text-center bg-white p-6 rounded-xl border">
                            <div className="text-4xl font-bold text-green-600">
                                {getScorePercentage()}%
                            </div>
                            <div className="text-base text-gray-500 mt-2">Success Rate</div>
                        </div>
                        <div className="text-center bg-white p-6 rounded-xl border">
                            <div className={`inline-block px-6 py-3 rounded-full text-xl font-bold border-2 ${getRatingColor(candidate.summary.overallRating)}`}>
                                {candidate.summary.overallRating || 'N/A'}
                            </div>
                            <div className="text-base text-gray-500 mt-2">Overall Rating</div>
                        </div>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-4 mb-6">
                        <div
                            className="bg-blue-500 h-4 rounded-full transition-all duration-300"
                            style={{ width: `${getScorePercentage()}%` }}
                        />
                    </div>

                    <div className="bg-white p-6 rounded-xl border-2">
                        <h4 className="font-bold text-lg mb-3">Recommendation: {candidate.summary.recommendation}</h4>
                        <p className="text-gray-700 text-base leading-relaxed">{candidate.summary.summary}</p>
                    </div>
                </div>
            )}

            {/* Interview Progress */}
            {candidate.status === 'interview' && (
                <div className="p-8 border-b-2 border-gray-200 bg-blue-50">
                    <h3 className="text-2xl font-bold mb-6">Interview In Progress</h3>

                    <div className="mb-6">
                        <div className="flex justify-between text-lg mb-3">
                            <span className="font-medium">Progress</span>
                            <span className="font-semibold">{candidate.currentQuestionIndex + 1} of {candidate.questions?.length || 0} questions</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4">
                            <div
                                className="bg-blue-500 h-4 rounded-full transition-all duration-300"
                                style={{
                                    width: `${((candidate.currentQuestionIndex + 1) / (candidate.questions?.length || 1)) * 100}%`
                                }}
                            />
                        </div>
                    </div>

                    <p className="text-base text-gray-600 font-medium">
                        Started: {formatDate(candidate.interviewStartedAt)}
                    </p>
                </div>
            )}

            {/* Questions and Answers */}
            {candidate.questions && candidate.questions.length > 0 && (
                <div className="p-8">
                    <h3 className="text-2xl font-bold mb-6">Questions & Answers</h3>

                    <div className="space-y-8">
                        {candidate.questions.map((question, index) => (
                            <div key={question.id} className="border-2 rounded-xl p-6 bg-gray-50">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-base font-semibold text-gray-600">
                                            Question {index + 1}
                                        </span>
                                        <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getDifficultyColor(question.difficulty)}`}>
                                            {question.difficulty}
                                        </span>
                                        <span className="text-sm text-gray-500 bg-gray-200 px-3 py-1 rounded-full">
                                            {question.time}s
                                        </span>
                                    </div>

                                    {question.score !== undefined && (
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-blue-600">
                                                {question.score}/{question.difficulty === 'Easy' ? 10 : question.difficulty === 'Medium' ? 20 : 30}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="mb-4">
                                    <div className="font-semibold text-gray-900 text-lg mb-3">
                                        {question.question}
                                    </div>
                                </div>

                                {question.answer ? (
                                    <div className="bg-white rounded-xl p-5 mb-4 border">
                                        <div className="text-base font-semibold text-gray-700 mb-2">Answer:</div>
                                        <div className="text-gray-900 text-base leading-relaxed">{question.answer}</div>
                                    </div>
                                ) : (
                                    <div className="bg-gray-200 rounded-xl p-5 mb-4 text-center text-gray-500 text-base">
                                        {index <= candidate.currentQuestionIndex ? 'No answer provided' : 'Not answered yet'}
                                    </div>
                                )}

                                {question.feedback && (
                                    <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-5">
                                        <div className="text-base font-semibold text-purple-700 mb-2">AI Feedback:</div>
                                        <div className="text-purple-900 text-base leading-relaxed">{question.feedback}</div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* AI Summary Details */}
            {candidate.summary && candidate.status === 'completed' && (
                <div className="p-8 border-t-2 border-gray-200 bg-gray-50">
                    <h3 className="text-2xl font-bold mb-6">Detailed Analysis</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {candidate.summary.technicalStrengths && candidate.summary.technicalStrengths.length > 0 && (
                            <div className="bg-white p-6 rounded-xl border-2">
                                <h4 className="font-bold text-green-800 text-lg mb-4">Technical Strengths</h4>
                                <ul className="list-disc list-inside text-base space-y-2">
                                    {candidate.summary.technicalStrengths.map((strength, idx) => (
                                        <li key={idx} className="text-gray-700">{strength}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {candidate.summary.areasForImprovement && candidate.summary.areasForImprovement.length > 0 && (
                            <div className="bg-white p-6 rounded-xl border-2">
                                <h4 className="font-bold text-orange-800 text-lg mb-4">Areas for Improvement</h4>
                                <ul className="list-disc list-inside text-base space-y-2">
                                    {candidate.summary.areasForImprovement.map((area, idx) => (
                                        <li key={idx} className="text-gray-700">{area}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {candidate.summary.keyHighlights && candidate.summary.keyHighlights.length > 0 && (
                            <div className="bg-white p-6 rounded-xl border-2 md:col-span-2">
                                <h4 className="font-bold text-blue-800 text-lg mb-4">Key Highlights</h4>
                                <ul className="list-disc list-inside text-base space-y-2">
                                    {candidate.summary.keyHighlights.map((highlight, idx) => (
                                        <li key={idx} className="text-gray-700">{highlight}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CandidateDetail;
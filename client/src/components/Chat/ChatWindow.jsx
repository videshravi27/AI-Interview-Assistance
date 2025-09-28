import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from 'react-redux';
import ResumeUpload from "./ResumeUpload";
import Message from "./Message";
import Timer from "./Timer";
import {
    startInterview,
    submitAnswer,
    nextQuestion,
    addChatMessage,
    pauseInterview,
    resumeInterview,
    completeInterview,
    clearActiveCandidate
} from '../../redux/slices/candidatesSlice';
import { generateInterviewQuestions, scoreAnswer, generateInterviewSummary } from '../../services/geminiService';
import { backupInterviewData } from '../../utils/persistanceHelper';
import { debugLocalStorage, forceReduxSave } from '../../utils/debugLocalStorage';

const ChatWindow = () => {
    const dispatch = useDispatch();
    const { activeCandidate } = useSelector(state => state.candidates);

    const [loading, setLoading] = useState(false);
    const [currentAnswer, setCurrentAnswer] = useState('');
    const [selectedOption, setSelectedOption] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    const [showStartButton, setShowStartButton] = useState(false);

    const chatEndRef = useRef(null);
    const answerInputRef = useRef(null);

    // Debug localStorage on component mount
    useEffect(() => {
        console.log("ChatWindow mounted, checking localStorage...");
        debugLocalStorage();
    }, []);

    // Define interview status variables early
    const currentQuestion = activeCandidate?.status === 'interview' ?
        activeCandidate.questions[activeCandidate.currentQuestionIndex] : null;

    const isInterviewActive = activeCandidate?.status === 'interview';
    const isInterviewPaused = activeCandidate?.status === 'paused';
    const isInterviewCompleted = activeCandidate?.status === 'completed';

    // Only scroll to bottom when interview is completed or not active
    useEffect(() => {
        if (chatEndRef.current && activeCandidate?.chatHistory && !isInterviewActive) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [activeCandidate?.chatHistory?.length, isInterviewActive]);

    // Auto-save selected option when changed
    useEffect(() => {
        if (activeCandidate && selectedOption !== null && isInterviewActive) {
            // Save current selection state to localStorage as backup
            const autoSaveData = {
                candidateId: activeCandidate.id,
                currentQuestionIndex: activeCandidate.currentQuestionIndex,
                selectedOption: selectedOption,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('ai-interview-autosave', JSON.stringify(autoSaveData));
        }
    }, [selectedOption, activeCandidate, isInterviewActive]);

    // Auto-save text answer when typing (debounced)
    useEffect(() => {
        if (activeCandidate && currentAnswer.trim() && isInterviewActive) {
            const timeoutId = setTimeout(() => {
                const autoSaveData = {
                    candidateId: activeCandidate.id,
                    currentQuestionIndex: activeCandidate.currentQuestionIndex,
                    currentAnswer: currentAnswer,
                    timestamp: new Date().toISOString()
                };
                localStorage.setItem('ai-interview-autosave', JSON.stringify(autoSaveData));
            }, 2000); // Save after 2 seconds of inactivity

            return () => clearTimeout(timeoutId);
        }
    }, [currentAnswer, activeCandidate, isInterviewActive]);

    // Restore auto-saved data when component mounts or question changes
    useEffect(() => {
        if (activeCandidate && isInterviewActive) {
            const savedData = localStorage.getItem('ai-interview-autosave');
            if (savedData) {
                try {
                    const autoSaveData = JSON.parse(savedData);
                    if (autoSaveData.candidateId === activeCandidate.id &&
                        autoSaveData.currentQuestionIndex === activeCandidate.currentQuestionIndex) {

                        if (autoSaveData.selectedOption !== undefined) {
                            setSelectedOption(autoSaveData.selectedOption);
                        }
                        if (autoSaveData.currentAnswer) {
                            setCurrentAnswer(autoSaveData.currentAnswer);
                        }
                    }
                } catch (error) {
                    console.error('Error restoring auto-save data:', error);
                }
            }
        }
    }, [activeCandidate?.currentQuestionIndex, isInterviewActive]);

    // Clear auto-save data when answer is submitted
    const clearAutoSave = () => {
        localStorage.removeItem('ai-interview-autosave');
    };

    // Handle resume upload completion
    const handleResumeComplete = async (candidateInfo) => {
        setShowStartButton(true);

        // Add initial welcome message
        setTimeout(() => {
            dispatch(addChatMessage({
                candidateId: activeCandidate.id,
                message: {
                    type: 'system',
                    text: `Perfect! I've processed your resume. Ready to start your interview, ${candidateInfo.name}?`,
                    sender: 'assistant'
                }
            }));
        }, 500);
    };

    // Start the interview
    const startInterviewProcess = async () => {
        if (!activeCandidate) return;

        setLoading(true);
        setShowStartButton(false);

        try {
            // Add starting message
            dispatch(addChatMessage({
                candidateId: activeCandidate.id,
                message: {
                    type: 'system',
                    text: 'Great! Generating your personalized interview questions using AI. This may take a moment...',
                    sender: 'assistant'
                }
            }));

            // Generate questions using AI
            const questions = await generateInterviewQuestions();

            // Start interview in Redux
            dispatch(startInterview({
                candidateId: activeCandidate.id,
                questions
            }));

            // No need to add first question to chat - it displays at the top

        } catch (error) {
            console.error('Error starting interview:', error);
            dispatch(addChatMessage({
                candidateId: activeCandidate.id,
                message: {
                    type: 'error',
                    text: 'Sorry, there was an error starting your interview. Please refresh and try again.',
                    sender: 'assistant'
                }
            }));
        } finally {
            setLoading(false);
        }
    };

    // Submit current answer
    const handleSubmitAnswer = async () => {
        if (!activeCandidate) return;

        const currentQuestion = activeCandidate.questions[activeCandidate.currentQuestionIndex];
        if (!currentQuestion) return;

        // For MCQ questions, check if an option is selected
        if (currentQuestion.options && currentQuestion.options.length > 0) {
            if (selectedOption === null) return;
        } else {
            // For text questions, check if answer is provided
            if (!currentAnswer.trim()) return;
        }

        setLoading(true);
        setIsTyping(true);

        // Store user's answer (for scoring) but don't add to chat history
        const answerText = currentQuestion.options && currentQuestion.options.length > 0
            ? currentQuestion.options[selectedOption]
            : currentAnswer.trim();

        try {
            // Score the answer using AI
            const answerForScoring = currentQuestion.options && currentQuestion.options.length > 0
                ? selectedOption
                : currentAnswer.trim();

            const scoring = await scoreAnswer(
                currentQuestion,
                answerForScoring,
                currentQuestion.difficulty
            );

            // Submit answer to Redux (store score but don't show feedback yet)
            dispatch(submitAnswer({
                candidateId: activeCandidate.id,
                questionId: currentQuestion.id,
                answer: answerText,
                selectedAnswer: selectedOption,
                score: scoring.score,
                feedback: scoring.feedback
            }));

            // Force save to localStorage for immediate persistence
            setTimeout(() => {
                try {
                    // Backup interview data
                    backupInterviewData(activeCandidate);

                    // Trigger a Redux persist flush
                    if (window.__REDUX_PERSIST_FLUSH__) {
                        window.__REDUX_PERSIST_FLUSH__();
                    }
                } catch (error) {
                    console.log('Persist operations completed with warnings:', error);
                }
            }, 100);

            // Move directly to next question without showing feedback
            setTimeout(() => {
                handleNextQuestion();
            }, 500);

        } catch (error) {
            console.error('Error scoring answer:', error);
            // Fallback scoring
            const fallbackScore = currentQuestion.difficulty === 'Easy' ? 5 : currentQuestion.difficulty === 'Medium' ? 10 : 15;

            dispatch(submitAnswer({
                candidateId: activeCandidate.id,
                questionId: currentQuestion.id,
                answer: answerText,
                selectedAnswer: selectedOption,
                score: fallbackScore,
                feedback: 'Answer received and evaluated.'
            }));

            // Force save to localStorage for immediate persistence
            setTimeout(() => {
                try {
                    // Backup interview data
                    backupInterviewData(activeCandidate);

                    // Trigger a Redux persist flush
                    if (window.__REDUX_PERSIST_FLUSH__) {
                        window.__REDUX_PERSIST_FLUSH__();
                    }
                } catch (error) {
                    console.log('Persist operations completed with warnings:', error);
                }
            }, 100);

            setTimeout(() => {
                handleNextQuestion();
            }, 500);
        } finally {
            setCurrentAnswer('');
            setSelectedOption(null);
            clearAutoSave(); // Clear auto-save data after successful submission
            setLoading(false);
            setIsTyping(false);
        }
    };

    // Move to next question or complete interview
    const handleNextQuestion = () => {
        if (!activeCandidate) return;

        dispatch(nextQuestion({ candidateId: activeCandidate.id }));

        // Check if interview is completed
        if (activeCandidate.currentQuestionIndex >= activeCandidate.questions.length - 1) {
            handleCompleteInterview();
        }
        // No need to add chat messages for questions since they display at the top
    };

    // Complete interview with score summary first, then detailed results
    const handleCompleteInterview = async () => {
        if (!activeCandidate) return;

        setLoading(true);

        // Calculate final score
        const totalScore = activeCandidate.questions.reduce((sum, q) => sum + (q.score || 0), 0);
        const maxScore = activeCandidate.questions.reduce((sum, q) => {
            const max = q.difficulty === 'Easy' ? 10 : q.difficulty === 'Medium' ? 20 : 30;
            return sum + max;
        }, 0);

        // Add completion message with score
        dispatch(addChatMessage({
            candidateId: activeCandidate.id,
            message: {
                type: 'system',
                text: `🎉 **Interview Complete!**\n\n**Your Final Score: ${totalScore}/${maxScore}**\n\nGenerating detailed results...`,
                sender: 'assistant'
            }
        }));

        try {
            // Generate AI summary
            const summary = await generateInterviewSummary(
                {
                    name: activeCandidate.name,
                    email: activeCandidate.email,
                    phone: activeCandidate.phone
                },
                activeCandidate.questions
            );

            // Complete interview in Redux
            dispatch(completeInterview({
                candidateId: activeCandidate.id,
                summary
            }));

            // Ensure data is saved to localStorage immediately with multiple methods
            setTimeout(() => {
                try {
                    console.log("Saving completed interview data...");

                    // Method 1: Backup interview data
                    const completedCandidate = { ...activeCandidate, status: 'completed', summary };
                    backupInterviewData(completedCandidate);

                    // Method 2: Force Redux persist flush
                    if (window.__REDUX_PERSIST_FLUSH__) {
                        window.__REDUX_PERSIST_FLUSH__();
                    }

                    // Method 3: Direct localStorage save as emergency backup
                    const emergencyBackupKey = `completed-interview-${activeCandidate.id}`;
                    localStorage.setItem(emergencyBackupKey, JSON.stringify(completedCandidate));

                    console.log("All save methods completed");
                    debugLocalStorage();
                } catch (error) {
                    console.error('Error saving completed interview:', error);
                }
            }, 100);

            // Add final detailed summary message
            setTimeout(() => {
                dispatch(addChatMessage({
                    candidateId: activeCandidate.id,
                    message: {
                        type: 'summary',
                        text: `**Interview Complete!**\n\n**Final Score:** ${summary.finalScore}/${summary.maxScore}\n**Rating:** ${summary.overallRating}\n**Recommendation:** ${summary.recommendation}\n\n${summary.summary}`,
                        sender: 'assistant',
                        summary
                    }
                }));

                // Option to start new interview
                setTimeout(() => {
                    dispatch(addChatMessage({
                        candidateId: activeCandidate.id,
                        message: {
                            type: 'system',
                            text: 'Thank you for completing the interview! You can check your detailed results in the Interviewer dashboard.',
                            sender: 'assistant'
                        }
                    }));
                }, 2000);
            }, 1500);

        } catch (error) {
            console.error('Error generating summary:', error);
            // Fallback completion
            const totalScore = activeCandidate.questions.reduce((sum, q) => sum + (q.score || 0), 0);
            const maxScore = activeCandidate.questions.reduce((sum, q) => {
                const max = q.difficulty === 'Easy' ? 10 : q.difficulty === 'Medium' ? 20 : 30;
                return sum + max;
            }, 0);

            dispatch(completeInterview({
                candidateId: activeCandidate.id,
                summary: {
                    finalScore: totalScore,
                    maxScore,
                    overallRating: totalScore > maxScore * 0.7 ? 'Good' : 'Average',
                    summary: `Interview completed with score ${totalScore}/${maxScore}.`,
                    recommendation: totalScore > maxScore * 0.7 ? 'Hire' : 'Maybe'
                }
            }));
        } finally {
            setLoading(false);
        }
    };

    // Handle timer timeout
    const handleTimeUp = () => {
        const currentQuestion = activeCandidate.questions[activeCandidate.currentQuestionIndex];

        if (currentQuestion.options && currentQuestion.options.length > 0) {
            // MCQ question - check if an option is selected
            if (selectedOption !== null) {
                handleSubmitAnswer();
            } else {
                // Submit empty answer for MCQ
                dispatch(submitAnswer({
                    candidateId: activeCandidate.id,
                    questionId: currentQuestion.id,
                    answer: '',
                    selectedAnswer: null,
                    score: 0,
                    feedback: 'Time expired with no answer selected.'
                }));

                setTimeout(() => {
                    handleNextQuestion();
                }, 500);
            }
        } else {
            // Text question - check if answer is provided
            if (currentAnswer.trim()) {
                handleSubmitAnswer();
            } else {
                // Submit empty answer
                dispatch(submitAnswer({
                    candidateId: activeCandidate.id,
                    questionId: currentQuestion.id,
                    answer: '',
                    selectedAnswer: null,
                    score: 0,
                    feedback: 'Time expired with no answer provided.'
                }));

                setTimeout(() => {
                    handleNextQuestion();
                }, 500);
            }
        }
    };

    // Handle pause/resume
    const handlePause = () => {
        dispatch(pauseInterview({ candidateId: activeCandidate.id }));
    };

    const handleResume = () => {
        dispatch(resumeInterview({ candidateId: activeCandidate.id }));
    };

    // Start new interview
    const startNewInterview = () => {
        dispatch(clearActiveCandidate());
    };

    // Handle Enter key for answer submission
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !loading) {
            e.preventDefault();
            handleSubmitAnswer();
        }
    };

    if (!activeCandidate) {
        return (
            <div className="h-full flex items-center justify-center">
                <ResumeUpload onComplete={handleResumeComplete} />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Fixed Top Section - Question Area and Timer */}
            {isInterviewActive && currentQuestion && (
                <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-t-2xl">
                    <div className="grid grid-cols-1 xl:grid-cols-4 lg:grid-cols-1 gap-4 lg:gap-6 p-4 lg:p-6">
                        {/* Question Section - Takes most space */}
                        <div className="xl:col-span-3 lg:col-span-1">
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-4">
                                        <h2 className="text-lg lg:text-xl font-bold text-white">Interview Session</h2>
                                        <div className="bg-white/20 px-2 lg:px-3 py-1 rounded-full text-xs font-medium text-white">
                                            Question {activeCandidate.currentQuestionIndex + 1} / {activeCandidate.questions.length}
                                        </div>
                                    </div>
                                    <div className={`px-2 lg:px-3 py-1 rounded-full text-xs font-bold ${currentQuestion.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                                        currentQuestion.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                        {currentQuestion.difficulty}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 lg:p-6 border border-white/20 shadow-lg">
                                <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 lg:mb-6 leading-relaxed">
                                    {currentQuestion.question}
                                </h3>

                                {/* MCQ Options - Compact Design */}
                                {currentQuestion.options && currentQuestion.options.length > 0 && (
                                    <div className="space-y-2 lg:space-y-3 mb-4 lg:mb-6">
                                        {currentQuestion.options.map((option, index) => (
                                            <button
                                                key={index}
                                                onClick={() => setSelectedOption(index)}
                                                disabled={loading || isTyping}
                                                className={`w-full text-left p-2 lg:p-3 rounded-lg border transition-all duration-200 ${selectedOption === index
                                                    ? 'border-purple-500 bg-purple-50 text-purple-900 shadow-md'
                                                    : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50'
                                                    } ${loading || isTyping ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                            >
                                                <div className="flex items-center gap-2 lg:gap-3">
                                                    <div className={`w-3 lg:w-4 h-3 lg:h-4 rounded-full border-2 flex items-center justify-center ${selectedOption === index ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                                                        }`}>
                                                        {selectedOption === index && (
                                                            <div className="w-1 lg:w-1.5 h-1 lg:h-1.5 rounded-full bg-white"></div>
                                                        )}
                                                    </div>
                                                    <span className="font-medium text-xs lg:text-sm">{String.fromCharCode(65 + index)}.</span>
                                                    <span className="text-xs lg:text-sm">{option}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Text Input for open-ended questions */}
                                {(!currentQuestion.options || currentQuestion.options.length === 0) && (
                                    <div className="mb-4 lg:mb-6">
                                        <textarea
                                            ref={answerInputRef}
                                            value={currentAnswer}
                                            onChange={(e) => setCurrentAnswer(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                            placeholder="Type your answer here..."
                                            disabled={loading || isTyping}
                                            className="w-full p-3 lg:p-4 border border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 resize-none transition-colors text-sm"
                                            rows="4"
                                        />
                                    </div>
                                )}

                                {/* Submit Button */}
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleSubmitAnswer}
                                        disabled={
                                            (currentQuestion.options && currentQuestion.options.length > 0 && selectedOption === null) ||
                                            (!currentQuestion.options && !currentAnswer.trim()) ||
                                            loading || isTyping
                                        }
                                        className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 lg:px-8 py-2 lg:py-3 rounded-xl font-semibold transition-colors text-sm lg:text-base"
                                    >
                                        {loading ? 'Submitting...' : 'Submit Answer'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Timer Section - Compact on right, below on mobile */}
                        <div className="xl:col-span-1 lg:col-span-1">
                            <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg h-full min-h-[200px] xl:min-h-[300px]">
                                <Timer
                                    key={`timer-${activeCandidate.id}-${activeCandidate.currentQuestionIndex}`}
                                    duration={currentQuestion.time}
                                    onTimeUp={handleTimeUp}
                                    isRunning={isInterviewActive && !loading}
                                    isPaused={isInterviewPaused}
                                    onPause={handlePause}
                                    onResume={handleResume}
                                    question={currentQuestion}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Area - Below the question */}
            <div className="flex-1 bg-white/95 backdrop-blur-sm rounded-b-2xl border border-white/20 shadow-2xl overflow-hidden flex flex-col">
                {/* Header for non-interview states */}
                {(!isInterviewActive || !currentQuestion) && (
                    <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-6 py-5 text-white rounded-t-2xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold">Interview Session</h2>
                                <p className="text-white/90 text-sm mt-1">
                                    Candidate: {activeCandidate.name}
                                </p>
                            </div>

                            <div className="flex items-center gap-4">
                                {isInterviewCompleted && (
                                    <button
                                        onClick={startNewInterview}
                                        className="bg-white text-purple-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors"
                                    >
                                        New Interview
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Chat Messages - Only system messages and final results */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Show welcome messages and final results only */}
                    {activeCandidate.chatHistory?.filter(message =>
                        message.type === 'system' || message.type === 'summary'
                    ).map((message) => (
                        <Message
                            key={message.id}
                            message={message}
                            isUser={message.sender === 'user'}
                        />
                    ))}

                    {/* Show progress indicator during interview */}
                    {isInterviewActive && (
                        <div className="text-center py-8">
                            <div className="bg-gradient-to-r from-purple-100 to-indigo-100 rounded-2xl p-6">
                                <div className="text-gray-600 mb-2">Interview in Progress</div>
                                <div className="text-lg font-semibold text-gray-900">
                                    Question {activeCandidate.currentQuestionIndex + 1} of {activeCandidate.questions.length}
                                </div>
                                <div className="mt-4 bg-white rounded-full h-2">
                                    <div
                                        className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                                        style={{
                                            width: `${((activeCandidate.currentQuestionIndex + 1) / activeCandidate.questions.length) * 100}%`
                                        }}
                                    ></div>
                                </div>
                                <div className="text-sm text-gray-500 mt-2">
                                    {Math.round(((activeCandidate.currentQuestionIndex + 1) / activeCandidate.questions.length) * 100)}% Complete
                                </div>
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div className="flex items-center gap-3 justify-center py-6">
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-500 border-t-transparent"></div>
                            <span className="text-gray-600">AI is processing...</span>
                        </div>
                    )}

                    <div ref={chatEndRef} />
                </div>

                {/* Start Interview Button */}
                {showStartButton && !isInterviewActive && !isInterviewCompleted && (
                    <div className="p-6 bg-gray-50 border-t">
                        <button
                            onClick={startInterviewProcess}
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-400 text-white py-4 rounded-xl font-bold text-lg transition-all duration-300"
                        >
                            {loading ? 'Generating Questions...' : 'Start Interview'}
                        </button>
                    </div>
                )}

                {/* Paused State */}
                {isInterviewPaused && (
                    <div className="p-6 bg-yellow-50 border-t border-yellow-200">
                        <div className="text-center text-yellow-800 font-medium">
                            Interview is paused. Click Resume to continue.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatWindow;
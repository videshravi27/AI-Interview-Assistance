import React, { useState, useEffect, useRef } from "react";

const Timer = ({
    duration,
    onTimeUp,
    isRunning = false,
    isPaused = false,
    onPause,
    onResume,
    question = {}
}) => {
    const [timeLeft, setTimeLeft] = useState(duration);
    const [isActive, setIsActive] = useState(isRunning);
    const intervalRef = useRef(null);
    const warningShownRef = useRef(false);

    useEffect(() => {
        setTimeLeft(duration);
        setIsActive(isRunning);
        warningShownRef.current = false;

        // Clear any existing interval when resetting
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, [duration, isRunning]);

    useEffect(() => {
        setIsActive(!isPaused && isRunning);
    }, [isPaused, isRunning]);

    useEffect(() => {
        if (isActive && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        setIsActive(false);
                        if (onTimeUp) onTimeUp();
                        return 0;
                    }

                    // Show warning at 10 seconds for medium/hard, 5 seconds for easy
                    const warningTime = duration > 60 ? 10 : 5;
                    if (prev === warningTime && !warningShownRef.current) {
                        warningShownRef.current = true;
                        // Could add a warning sound or visual indication here
                    }

                    return prev - 1;
                });
            }, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isActive, timeLeft, onTimeUp, duration]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getTimerColor = () => {
        const percentage = (timeLeft / duration) * 100;
        if (percentage <= 10) return 'text-gray-800';
        if (percentage <= 25) return 'text-gray-700';
        return 'text-gray-900';
    };

    const getProgressColor = () => {
        const percentage = (timeLeft / duration) * 100;
        if (percentage <= 10) return 'text-gray-800';
        if (percentage <= 25) return 'text-gray-700';
        return 'text-gray-900';
    };

    const progressPercentage = ((duration - timeLeft) / duration) * 100;

    if (!isRunning && timeLeft === duration) {
        return null; // Don't show timer until interview starts
    }

    return (
        <div className="h-full p-4">
            <div className="mb-4">
                <div className="text-center mb-3">
                    <div className="text-sm font-semibold text-gray-600 mb-1">Time Remaining</div>
                    <div className={`text-2xl font-mono font-bold ${getTimerColor()}`}>
                        {formatTime(timeLeft)}
                    </div>
                    <div className="text-xs text-gray-500">
                        of {formatTime(duration)}
                    </div>
                </div>

                {/* Compact Progress circle */}
                <div className="relative w-24 h-24 mx-auto mb-4">
                    <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 96 96">
                        <circle
                            cx="48"
                            cy="48"
                            r="42"
                            stroke="currentColor"
                            strokeWidth="6"
                            fill="transparent"
                            className="text-gray-200"
                        />
                        <circle
                            cx="48"
                            cy="48"
                            r="42"
                            stroke="currentColor"
                            strokeWidth="6"
                            fill="transparent"
                            strokeDasharray={263.89}
                            strokeDashoffset={263.89 - (progressPercentage / 100) * 263.89}
                            className={`transition-all duration-1000 ease-linear ${getProgressColor()}`}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-green-400' : isPaused ? 'bg-yellow-400' : 'bg-red-400'
                            }`}></div>
                    </div>
                </div>

                {/* Difficulty badge */}
                {question.difficulty && (
                    <div className="flex justify-center mb-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${question.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                            question.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                            }`}>
                            {question.difficulty}
                        </span>
                    </div>
                )}
            </div>

            {/* Control buttons */}
            <div className="space-y-2">
                {isActive && onPause && (
                    <button
                        onClick={onPause}
                        className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors font-medium text-xs"
                    >
                        ⏸ Pause
                    </button>
                )}

                {isPaused && onResume && (
                    <button
                        onClick={onResume}
                        className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors font-medium text-xs"
                    >
                        ▶ Resume
                    </button>
                )}
            </div>

            {/* Warning messages */}
            {timeLeft <= 10 && timeLeft > 0 && duration > 60 && (
                <div className="mt-3 text-xs text-gray-800 font-semibold bg-gray-100 px-2 py-1 rounded-md border border-gray-300">
                    ⚠️ 10s left!
                </div>
            )}

            {timeLeft <= 5 && timeLeft > 0 && duration <= 60 && (
                <div className="mt-3 text-xs text-gray-900 font-semibold animate-pulse bg-gray-200 px-2 py-1 rounded-md border border-gray-400">
                    ⚠️ 5s left!
                </div>
            )}

            {timeLeft === 0 && (
                <div className="mt-3 text-xs text-gray-900 font-semibold bg-gray-200 px-2 py-1 rounded-md border border-gray-400">
                    ⏰ Time's up!
                </div>
            )}
        </div>
    );
};

export default Timer;
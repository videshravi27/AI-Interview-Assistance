import React from "react";

const Message = ({ message, isUser = false }) => {
    const { type, text, timestamp, score, difficulty, summary } = message;

    const formatText = (text) => {
        // Handle markdown-style formatting
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br />');
    };

    const getMessageStyle = () => {
        switch (type) {
            case 'question':
                return 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-900';
            case 'answer':
                return 'bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 text-emerald-900';
            case 'feedback':
                return 'bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 text-purple-900';
            case 'summary':
                return 'bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 text-amber-900';
            case 'error':
                return 'bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 text-red-900';
            case 'system':
                return 'bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 text-gray-700';
            default:
                return isUser ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white' : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900';
        }
    };

    const getMessageIcon = () => {
        switch (type) {
            case 'question':
                return '🤔';
            case 'answer':
                return '�';
            case 'feedback':
                return '�';
            case 'summary':
                return '🎯';
            case 'error':
                return '⚠️';
            case 'system':
                return '🤖';
            default:
                return isUser ? '👤' : '🤖';
        }
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`max-w-3xl ${isUser ? 'ml-12' : 'mr-12'}`}>
                {/* Message header */}
                <div className={`flex items-center gap-2 mb-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        {!isUser && <span className="text-base">{getMessageIcon()}</span>}
                        <span className="font-medium">
                            {isUser ? 'You' : 'AI Interviewer'}
                        </span>
                        {timestamp && (
                            <span>• {formatTimestamp(timestamp)}</span>
                        )}
                        {difficulty && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                                    difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                                }`}>
                                {difficulty}
                            </span>
                        )}
                        {isUser && <span className="text-base">{getMessageIcon()}</span>}
                    </div>
                </div>

                {/* Message content */}
                <div className={`rounded-2xl shadow-sm p-4 ${getMessageStyle()}`}>
                    <div
                        className="text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: formatText(text) }}
                    />

                    {/* Score display for feedback messages */}
                    {type === 'feedback' && score !== undefined && (
                        <div className="mt-3 p-3 bg-white/70 rounded-xl border">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Score:</span>
                                <span className="font-bold text-lg">
                                    {score}/{difficulty === 'Easy' ? 10 : difficulty === 'Medium' ? 20 : 30}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Summary details for summary messages */}
                    {type === 'summary' && summary && (
                        <div className="mt-3 space-y-3">
                            {summary.technicalStrengths && summary.technicalStrengths.length > 0 && (
                                <div className="p-3 bg-white/70 rounded-xl">
                                    <h4 className="font-medium text-sm mb-2">Technical Strengths:</h4>
                                    <ul className="list-disc list-inside text-sm space-y-1">
                                        {summary.technicalStrengths.map((strength, idx) => (
                                            <li key={idx}>{strength}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {summary.areasForImprovement && summary.areasForImprovement.length > 0 && (
                                <div className="p-3 bg-white/70 rounded-xl">
                                    <h4 className="font-medium text-sm mb-2">Areas for Improvement:</h4>
                                    <ul className="list-disc list-inside text-sm space-y-1">
                                        {summary.areasForImprovement.map((area, idx) => (
                                            <li key={idx}>{area}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Message;
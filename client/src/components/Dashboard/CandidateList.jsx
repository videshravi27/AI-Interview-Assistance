import React, { useEffect } from "react";
import { useSelector, useDispatch } from 'react-redux';
import { setSelectedCandidate, deleteCandidate, restoreCandidate } from '../../redux/slices/candidatesSlice';
import { debugLocalStorage } from '../../utils/debugLocalStorage';

const CandidateList = () => {
    const dispatch = useDispatch();
    const { candidates, selectedCandidateId, searchTerm, sortBy, sortOrder } = useSelector(state => state.candidates);

    // Restore completed interviews from localStorage on component mount
    useEffect(() => {
        console.log("CandidateList mounted, checking for completed interviews to restore...");
        debugLocalStorage();

        // Check for completed interview backups
        const keys = Object.keys(localStorage);
        const completedKeys = keys.filter(key => key.startsWith('completed-interview-'));
        const backupKeys = keys.filter(key => key.startsWith('interview-backup-'));

        [...completedKeys, ...backupKeys].forEach(key => {
            try {
                const data = localStorage.getItem(key);
                if (data) {
                    const candidateData = JSON.parse(data);

                    // Check if this candidate already exists in Redux
                    const existingCandidate = candidates.find(c => c.id === candidateData.id);

                    // Only restore if the candidate doesn't exist and was actually completed
                    // (not just deleted)
                    if (!existingCandidate && candidateData.status === 'completed' && candidateData.interviewCompletedAt) {
                        console.log(`Restoring completed interview for: ${candidateData.name}`);

                        // Add the candidate back to Redux state
                        dispatch(restoreCandidate(candidateData));
                    } else if (existingCandidate && candidateData.status === 'completed' &&
                        candidateData.interviewCompletedAt &&
                        (!existingCandidate.interviewCompletedAt ||
                            new Date(candidateData.interviewCompletedAt) > new Date(existingCandidate.interviewCompletedAt))) {
                        console.log(`Updating existing candidate with more recent completion: ${candidateData.name}`);
                        dispatch(restoreCandidate(candidateData));
                    }
                }
            } catch (error) {
                console.error(`Error restoring from ${key}:`, error);
            }
        });
    }, [dispatch, candidates]);

    // Filter candidates based on search term
    const filteredCandidates = candidates.filter(candidate => {
        if (!searchTerm) return true;

        const searchLower = searchTerm.toLowerCase();
        return (
            candidate.name?.toLowerCase().includes(searchLower) ||
            candidate.email?.toLowerCase().includes(searchLower) ||
            candidate.phone?.includes(searchTerm) ||
            candidate.interviewName?.toLowerCase().includes(searchLower) ||
            candidate.summary?.overallRating?.toLowerCase().includes(searchLower)
        );
    });

    // Sort candidates
    const sortedCandidates = [...filteredCandidates].sort((a, b) => {
        let valueA, valueB;

        switch (sortBy) {
            case 'score':
                valueA = a.totalScore || 0;
                valueB = b.totalScore || 0;
                break;
            case 'name':
                valueA = a.name?.toLowerCase() || '';
                valueB = b.name?.toLowerCase() || '';
                break;
            case 'date':
                valueA = new Date(a.createdAt || 0);
                valueB = new Date(b.createdAt || 0);
                break;
            case 'status': {
                const statusOrder = { 'completed': 3, 'interview': 2, 'paused': 1, 'info_collection': 0 };
                valueA = statusOrder[a.status] || 0;
                valueB = statusOrder[b.status] || 0;
                break;
            }
            default:
                valueA = 0;
                valueB = 0;
        }

        if (sortOrder === 'asc') {
            return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
        } else {
            return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
        }
    });

    const handleSelectCandidate = (candidateId) => {
        dispatch(setSelectedCandidate(candidateId));
    };

    const handleDeleteCandidate = (e, candidateId) => {
        e.stopPropagation();
        // Remove candidate from Redux store
        dispatch(deleteCandidate(candidateId));

        // Clean up localStorage backups for this candidate
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.includes(candidateId)) {
                localStorage.removeItem(key);
            }
        });

        // Also clear any backup keys that might restore this candidate
        localStorage.removeItem(`interview-backup-${candidateId}`);
        localStorage.removeItem(`completed-interview-${candidateId}`);
        localStorage.removeItem(`candidate-${candidateId}`);

        // Force persist flush to save the deletion immediately
        setTimeout(() => {
            if (window.__REDUX_PERSIST_FLUSH__) {
                window.__REDUX_PERSIST_FLUSH__();
            }
        }, 100);
    };

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

    const getRatingColor = (rating) => {
        switch (rating?.toLowerCase()) {
            case 'excellent':
                return 'text-gray-900';
            case 'good':
                return 'text-gray-800';
            case 'average':
                return 'text-gray-700';
            case 'below average':
                return 'text-gray-600';
            case 'poor':
                return 'text-gray-500';
            default:
                return 'text-gray-600';
        }
    };

    if (candidates.length === 0) {
        return (
            <div className="candidate-list bg-white rounded-xl shadow-sm border border-gray-200 p-10">
                <div className="text-center text-gray-500">
                    <div className="text-6xl mb-4">📋</div>
                    <h3 className="text-2xl font-semibold mb-3">No Candidates Yet</h3>
                    <p className="text-lg">Start interviewing candidates to see them appear here.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="candidate-list bg-white rounded-xl shadow-sm border border-gray-200 p-10">
            <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800">
                    Candidates ({filteredCandidates.length})
                </h2>
                {searchTerm && (
                    <p className="text-base text-gray-600 mt-2">
                        Showing results for "{searchTerm}"
                    </p>
                )}
            </div>

            <div className="divide-y-2 divide-gray-200 max-h-[600px] overflow-y-auto">
                {sortedCandidates.map((candidate) => (
                    <div
                        key={candidate.id}
                        onClick={() => handleSelectCandidate(candidate.id)}
                        className={`p-6 cursor-pointer hover:bg-gray-50 transition-colors ${selectedCandidateId === candidate.id ? 'bg-blue-50 border-r-4 border-r-blue-500' : ''
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900">
                                            {candidate.name || 'Unnamed Candidate'}
                                        </h3>
                                        {candidate.interviewName && (
                                            <p className="text-sm font-medium text-gray-600 mt-1">
                                                📝 {candidate.interviewName}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => handleDeleteCandidate(e, candidate.id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors text-xl"
                                        title="Delete candidate"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div className="flex items-center gap-3 mb-3">
                                    <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(candidate.status)}`}>
                                        {getStatusText(candidate.status)}
                                    </span>

                                    {candidate.summary?.overallRating && (
                                        <span className={`text-sm font-semibold ${getRatingColor(candidate.summary.overallRating)}`}>
                                            {candidate.summary.overallRating}
                                        </span>
                                    )}
                                </div>

                                <div className="text-base text-gray-600 mb-3 space-y-1">
                                    {candidate.email && <div>📧 {candidate.email}</div>}
                                    {candidate.phone && <div>📞 {candidate.phone}</div>}
                                </div>

                                <div className="flex items-center justify-between text-base">
                                    <div className="text-gray-500">
                                        {candidate.interviewCompletedAt ? (
                                            `Completed - ${new Date(candidate.interviewCompletedAt).toLocaleDateString()}`
                                        ) : candidate.interviewStartedAt ? (
                                            `Attended - ${new Date(candidate.interviewStartedAt).toLocaleDateString()}`
                                        ) : (
                                            `Created - ${new Date(candidate.createdAt).toLocaleDateString()}`
                                        )}
                                    </div>

                                    {candidate.status === 'completed' && (
                                        <div className="font-bold text-gray-800 text-lg">
                                            Score: {candidate.totalScore || 0}/{candidate.maxScore || 0}
                                        </div>
                                    )}
                                </div>

                                {candidate.status === 'interview' && (
                                    <div className="mt-3">
                                        <div className="text-sm text-gray-500 mb-2">
                                            Progress: {candidate.currentQuestionIndex + 1}/{candidate.questions?.length || 0} questions
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-3">
                                            <div
                                                className="bg-gray-800 h-3 rounded-full transition-all duration-300"
                                                style={{
                                                    width: `${((candidate.currentQuestionIndex + 1) / (candidate.questions?.length || 1)) * 100}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredCandidates.length === 0 && searchTerm && (
                <div className="p-10 text-center text-gray-500">
                    <div className="text-4xl mb-4">🔍</div>
                    <p className="text-lg">No candidates found matching "{searchTerm}"</p>
                </div>
            )}
        </div>
    );
};

export default CandidateList;
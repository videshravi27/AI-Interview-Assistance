import React, { useState } from "react";
import { useDispatch } from 'react-redux';
import { parsePDF, parseDOCX } from "../../utils/resumeParser";
import { createCandidate, addChatMessage } from '../../redux/slices/candidatesSlice';
import { store } from '../../redux/store';

const ResumeUpload = ({ onComplete }) => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [missingFields, setMissingFields] = useState([]);
    const [candidateInfo, setCandidateInfo] = useState(null);
    const [collectingInfo, setCollectingInfo] = useState(false);
    const [currentField, setCurrentField] = useState('');
    const [userInput, setUserInput] = useState('');

    const dispatch = useDispatch();

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
        setError('');

        if (selectedFile) {
            // Validate file type
            const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!validTypes.includes(selectedFile.type)) {
                setError('Please upload a PDF or DOCX file.');
                setFile(null);
                return;
            }

            // Validate file size (max 10MB)
            if (selectedFile.size > 10 * 1024 * 1024) {
                setError('File size must be less than 10MB.');
                setFile(null);
                return;
            }
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Please select a file.');
            return;
        }

        setUploading(true);
        setError('');

        try {
            let parsed;
            if (file.type === "application/pdf") {
                parsed = await parsePDF(file);
            } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
                parsed = await parseDOCX(file);
            }

            // Check for missing required fields
            const missing = [];
            if (!parsed.name || parsed.name.trim() === '') missing.push('name');
            if (!parsed.email || parsed.email.trim() === '') missing.push('email');
            if (!parsed.phone || parsed.phone.trim() === '') missing.push('phone');

            if (missing.length > 0) {
                setMissingFields(missing);
                setCandidateInfo(parsed);
                setCollectingInfo(true);
                setCurrentField(missing[0]);
            } else {
                // All fields present, create candidate and complete
                completeResumeProcess(parsed);
            }
        } catch (err) {
            console.error('Resume parsing error:', err);
            setError('Failed to parse resume. Please ensure the file is not corrupted and contains readable text.');
        } finally {
            setUploading(false);
        }
    };

    const handleFieldInput = (e) => {
        if (e.key === 'Enter') {
            submitFieldInput();
        }
    };

    const submitFieldInput = () => {
        if (!userInput.trim()) {
            setError(`Please enter your ${currentField}.`);
            return;
        }

        // Validate email format if collecting email
        if (currentField === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(userInput.trim())) {
                setError('Please enter a valid email address.');
                return;
            }
        }

        // Validate phone format if collecting phone
        if (currentField === 'phone') {
            const phoneRegex = /^[+]?[\d\s\-()]{10,}$/;
            if (!phoneRegex.test(userInput.trim())) {
                setError('Please enter a valid phone number (at least 10 digits).');
                return;
            }
        }

        // Update candidate info
        const updatedInfo = {
            ...candidateInfo,
            [currentField]: userInput.trim()
        };
        setCandidateInfo(updatedInfo);

        // Remove current field from missing list
        const remainingFields = missingFields.filter(field => field !== currentField);
        setMissingFields(remainingFields);

        if (remainingFields.length > 0) {
            // Move to next missing field
            setCurrentField(remainingFields[0]);
            setUserInput('');
            setError('');
        } else {
            // All fields collected, complete the process
            completeResumeProcess(updatedInfo);
        }
    };

    const completeResumeProcess = (info) => {
        // Create candidate in Redux store
        const candidateData = {
            name: info.name,
            email: info.email,
            phone: info.phone,
            resumeText: info.resumeText || '',
            fileName: file?.name || ''
        };

        dispatch(createCandidate(candidateData));

        // Get the newly created candidate ID from the store after dispatch
        // This is a bit of a workaround since we can't get the ID directly from createCandidate
        setTimeout(() => {
            const state = store.getState();
            const newCandidate = state.candidates.activeCandidate;

            if (newCandidate) {
                // Add welcome message to chat
                dispatch(addChatMessage({
                    candidateId: newCandidate.id,
                    message: {
                        type: 'system',
                        text: `Welcome ${info.name}! I've successfully processed your resume. Let's begin your full-stack developer interview. You'll have 6 questions: 2 Easy (20s each), 2 Medium (60s each), and 2 Hard (120s each). Are you ready to start?`,
                        sender: 'assistant'
                    }
                }));
            }
        }, 100);

        onComplete(info);
    };

    const getFieldLabel = (field) => {
        switch (field) {
            case 'name': return 'Full Name';
            case 'email': return 'Email Address';
            case 'phone': return 'Phone Number';
            default: return field;
        }
    };

    const getFieldPlaceholder = (field) => {
        switch (field) {
            case 'name': return 'Enter your full name';
            case 'email': return 'Enter your email address';
            case 'phone': return 'Enter your phone number';
            default: return `Enter your ${field}`;
        }
    };

    if (collectingInfo) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl p-8 max-w-lg w-full mx-6">
                    <div className="mb-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">
                            Complete Your Profile
                        </h3>
                        <p className="text-gray-600">
                            I need some additional information to complete your profile.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                {getFieldLabel(currentField)} *
                            </label>
                            <input
                                type={currentField === 'email' ? 'email' : 'text'}
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                onKeyPress={handleFieldInput}
                                placeholder={getFieldPlaceholder(currentField)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                                autoFocus
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <button
                                onClick={submitFieldInput}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
                            >
                                Continue
                            </button>

                            <div className="text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded-lg">
                                {missingFields.length - missingFields.indexOf(currentField)} of {missingFields.length} remaining
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex items-center justify-center">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl overflow-hidden max-w-6xl w-full mx-6">
                <div className="text-center p-8 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 text-white">
                    <h2 className="text-3xl font-bold mb-4">
                        Welcome to Your AI Interview
                    </h2>
                    <p className="text-xl text-purple-100 max-w-3xl mx-auto">
                        Upload your resume to begin your full-stack developer interview.
                        I'll ask you 6 multiple choice questions covering React and Node.js concepts.
                    </p>
                </div>

                <div className="p-8">
                    <div className="grid lg:grid-cols-2 gap-8 items-start">
                        {/* Upload Section */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-lg font-semibold text-gray-700 mb-3">
                                    Upload Resume *
                                </label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".pdf,.docx"
                                        onChange={handleFileChange}
                                        className="w-full px-4 py-4 border-2 border-dashed border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                                    />
                                    <div className="mt-2 text-sm text-gray-500">
                                        Supported formats: PDF, DOCX (Max size: 10MB)
                                    </div>
                                </div>
                            </div>

                            {file && (
                                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
                                    ✓ File selected: {file.name}
                                </div>
                            )}

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleUpload}
                                disabled={!file || uploading}
                                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white px-6 py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3"
                            >
                                {uploading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                        Processing Resume...
                                    </>
                                ) : (
                                    'Start Interview'
                                )}
                            </button>
                        </div>

                        {/* Info Section */}
                        <div className="space-y-4">
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
                                <h4 className="font-bold text-lg mb-3 text-blue-900">Interview Format:</h4>
                                <ul className="space-y-2 text-sm text-blue-800">
                                    <li className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        2 Easy MCQ questions (20 seconds each)
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                        2 Medium MCQ questions (60 seconds each)
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                        2 Hard MCQ questions (120 seconds each)
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                        AI-powered scoring and feedback
                                    </li>
                                </ul>
                            </div>

                            <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-5">
                                <h4 className="font-bold text-lg mb-3 text-emerald-900">What We'll Extract:</h4>
                                <ul className="space-y-2 text-sm text-emerald-800">
                                    <li className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        Your full name
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        Email address
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        Phone number
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        Skills and experience
                                    </li>
                                </ul>
                            </div>

                            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-5">
                                <h4 className="font-bold text-lg mb-3 text-purple-900">Assessment Criteria:</h4>
                                <ul className="space-y-2 text-sm text-purple-800">
                                    <li className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                        Technical accuracy
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                        Problem-solving approach
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                        Communication clarity
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                        Depth of understanding
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResumeUpload;
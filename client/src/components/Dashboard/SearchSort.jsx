import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { setSearchTerm, setSortBy, setSortOrder } from "../../redux/slices/candidatesSlice";

const SearchSort = () => {
    const dispatch = useDispatch();
    const { searchTerm, sortBy, sortOrder, candidates } = useSelector(state => state.candidates);

    const handleSearchChange = (e) => {
        dispatch(setSearchTerm(e.target.value));
    };

    const handleSortChange = (newSortBy) => {
        if (sortBy === newSortBy) {
            // Toggle sort order if same field
            dispatch(setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'));
        } else {
            // Set new sort field with descending as default
            dispatch(setSortBy(newSortBy));
            dispatch(setSortOrder('desc'));
        }
    };

    const clearSearch = () => {
        dispatch(setSearchTerm(''));
    };

    const getSortIcon = (field) => {
        if (sortBy !== field) return '↕️';
        return sortOrder === 'asc' ? '↑' : '↓';
    };

    return (
        <div className="search-sort bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
            {/* Search */}
            <div className="mb-6">
                <label className="block text-lg font-semibold text-gray-700 mb-3">
                    Search Candidates
                </label>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search by name, email, phone, or rating..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="w-full px-4 py-4 pr-12 border border-gray-300 rounded-xl text-lg focus:outline-none focus:ring-1 focus:ring-gray-600 focus:border-gray-600"
                    />
                    {searchTerm && (
                        <button
                            onClick={clearSearch}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl"
                            title="Clear search"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Sort Options */}
            <div className="mb-6">
                <label className="block text-lg font-semibold text-gray-700 mb-3">
                    Sort By
                </label>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => handleSortChange('score')}
                        className={`px-6 py-3 text-base rounded-lg border transition-colors font-medium ${sortBy === 'score'
                            ? 'bg-gray-100 border-gray-300 text-gray-800'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        Score {getSortIcon('score')}
                    </button>

                    <button
                        onClick={() => handleSortChange('name')}
                        className={`px-6 py-3 text-base rounded-lg border transition-colors font-medium ${sortBy === 'name'
                            ? 'bg-gray-100 border-gray-300 text-gray-800'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        Name {getSortIcon('name')}
                    </button>

                    <button
                        onClick={() => handleSortChange('date')}
                        className={`px-6 py-3 text-base rounded-lg border transition-colors font-medium ${sortBy === 'date'
                            ? 'bg-gray-100 border-gray-300 text-gray-800'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        Date {getSortIcon('date')}
                    </button>

                    <button
                        onClick={() => handleSortChange('status')}
                        className={`px-6 py-3 text-base rounded-lg border transition-colors font-medium ${sortBy === 'status'
                            ? 'bg-gray-100 border-gray-300 text-gray-800'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        Status {getSortIcon('status')}
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {/** Card Template - Total Candidates */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col justify-center items-center text-center min-h-[80px]">
                    <div className="text-gray-600 text-xs font-medium leading-tight mb-1">
                        Total<br />Candidates
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{candidates.length}</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col justify-center items-center text-center min-h-[80px]">
                    <div className="text-gray-600 text-xs font-medium leading-tight mb-1">
                        Completed
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                        {candidates.filter(c => c.status === 'completed').length}
                    </div>
                </div>

                <div className="bg-gray-100 p-4 rounded-xl border border-gray-200 flex flex-col justify-center items-center text-center min-h-[80px]">
                    <div className="text-gray-600 text-xs font-medium leading-tight mb-1">
                        In<br />Progress
                    </div>
                    <div className="text-2xl font-bold text-gray-800">
                        {candidates.filter(c => c.status === 'interview').length}
                    </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col justify-center items-center text-center min-h-[80px]">
                    <div className="text-gray-600 text-xs font-medium leading-tight mb-1">
                        Paused
                    </div>
                    <div className="text-2xl font-bold text-gray-700">
                        {candidates.filter(c => c.status === 'paused').length}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SearchSort;
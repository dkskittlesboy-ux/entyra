const { useState, useEffect } = React;

window.HomeView = ({ loadArticle, bookmarks, searchQuery, handleSearch, searchResults, loadRandom }) => {
    // Start voice recognition and forward transcript to handleSearch
    const startVoiceSearch = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Voice search not supported in this browser.');
            return;
        }
        const rec = new SpeechRecognition();
        rec.lang = 'en-US';
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        rec.onresult = (e) => {
            const transcript = e.results[0][0].transcript;
            handleSearch(transcript);
        };
        rec.onerror = (e) => {
            console.error('Speech recognition error', e);
        };
        rec.start();
    };



    return (
        <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-20 sm:-mt-32 animate-in fade-in duration-700">
            <header className="mb-8 text-center">
                <h1 className="serif text-4xl sm:text-6xl font-bold mb-2 tracking-tight text-gray-900">
                    <span className="brand">Entyra</span>
                </h1>
            </header>

            <div className="w-full max-w-xl relative mb-8">
                <div className="home-search-container flex items-center bg-white border border-gray-200 rounded-full px-4 py-3 transition-all hover:shadow-lg">
                    <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input 
                        type="text"
                        placeholder="Search Entyra..."
                        className="w-full outline-none bg-transparent text-lg"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        autoFocus
                    />
                    <button onClick={startVoiceSearch} title="Search by voice" className="ml-3 p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 1v11m0 0a3 3 0 003-3V4a3 3 0 10-6 0v5a3 3 0 003 3zM5 10a7 7 0 0014 0M12 22v-4" />
                        </svg>
                    </button>


                </div>

                {(searchResults.length > 0 || (searchQuery && searchQuery.length > 1)) && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        {searchResults.length > 0 ? (
                            searchResults.map(result => (
                                <button
                                    key={result.pageid}
                                    onClick={() => loadArticle(result.title)}
                                    className="w-full text-left px-5 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-none flex flex-col"
                                >
                                    <span className="font-medium text-gray-800">{result.title}</span>
                                    <span className="text-xs text-gray-400 truncate" dangerouslySetInnerHTML={{ __html: result.snippet }}></span>
                                </button>
                            ))
                        ) : (
                            <div className="px-5 py-3 text-sm text-gray-500">
                                Your search - <span className="font-medium">{searchQuery}</span> - did not match any documents.
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex gap-3 mb-12">
                <button 
                    onClick={() => searchQuery ? loadArticle(searchQuery) : null}
                    className="px-6 py-2 bg-white rounded-lg border border-gray-200 text-sm text-gray-700 shadow-sm hover:shadow-md transition-all"
                >
                    Search
                </button>
                <button 
                    onClick={loadRandom}
                    className="px-6 py-2 bg-white rounded-lg border border-gray-200 text-sm text-gray-700 shadow-sm hover:shadow-md transition-all"
                >
                    I'm Feeling Lucky
                </button>
            </div>

            {bookmarks && bookmarks.length > 0 && (
                <div className="w-full max-w-2xl">
                    <div className="flex flex-wrap justify-center gap-6">
                        {bookmarks.slice(0, 4).map(b => (
                            <button
                                key={b.id}
                                onClick={() => loadArticle(b.page_title)}
                                className="group flex flex-col items-center gap-2 w-20"
                            >
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-gray-200 transition-colors overflow-hidden">
                                    {b.thumbnail ? (
                                        <img src={b.thumbnail} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xl serif font-bold">{b.page_title[0]}</span>
                                    )}
                                </div>
                                <span className="text-[11px] text-gray-600 truncate w-full text-center">{b.page_title}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}


        </div>
    );
};
const { useState, useEffect } = React;

window.Navbar = ({ view, setView, searchQuery, handleSearch, searchResults, loadArticle, loadRandom }) => {
    // local user state for profile avatar
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const u = await window.websim.getCurrentUser();
                setCurrentUser(u);
            } catch (e) {
                setCurrentUser(null);
            }
        })();
    }, []);

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



    const openGmail = () => {
        window.open('https://mail.google.com/', '_blank', 'noopener');
    };

    const openYouTube = () => {
        window.open('https://www.youtube.com/@DevNamedFranz3x', '_blank', 'noopener');
    };

    const avatarUrl = currentUser ? `https://images.websim.com/avatar/${currentUser.username}` : null;

    return (
        <>
            <nav className={`glass-nav sticky top-0 z-50 px-4 py-3 transition-opacity duration-300 ${view === 'home' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <div className="max-w-3xl mx-auto flex items-center gap-3">
                    <button 
                        onClick={() => setView('home')}
                        className="text-lg font-bold serif tracking-tight text-gray-800"
                    >
                        <span className="brand">Entyra</span>
                    </button>
                    
                    <div className="relative flex-1 flex items-center gap-2">
                        <input 
                            type="text"
                            placeholder="Search Entyra..."
                            className="w-full bg-gray-100 border-none rounded-full py-2 px-4 focus:ring-2 focus:ring-gray-200 outline-none transition-all text-sm"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                        <button onClick={startVoiceSearch} title="Search by voice" className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 1v11m0 0a3 3 0 003-3V4a3 3 0 10-6 0v5a3 3 0 003 3zM5 10a7 7 0 0014 0M12 22v-4" />
                            </svg>
                        </button>


                        {(searchResults.length > 0 || (searchQuery && searchQuery.length > 1)) && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                {searchResults.length > 0 ? (
                                    searchResults.map(result => (
                                        <button
                                            key={result.pageid}
                                            onClick={() => loadArticle(result.title)}
                                            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-none flex flex-col"
                                        >
                                            <span className="font-medium text-gray-800">{result.title}</span>
                                            <span className="text-xs text-gray-400 truncate" dangerouslySetInnerHTML={{ __html: result.snippet }}></span>
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-4 py-3 text-sm text-gray-500">
                                        Your search - <span className="font-medium">{searchQuery}</span> - did not match any documents.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Gmail quick-launch button */}
                    <button onClick={openGmail} title="Open Gmail" className="p-2 ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M3 8.5v7A2.5 2.5 0 0 0 5.5 18h13A2.5 2.5 0 0 0 21 15.5v-7A2.5 2.5 0 0 0 18.5 6h-13A2.5 2.5 0 0 0 3 8.5z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
                            <path d="M3.5 8.5L12 13l8.5-4.5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
                        </svg>
                    </button>



                    <button 
                        onClick={loadRandom}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        title="隨機條目"
                    >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </nav>


        </>
    );
};
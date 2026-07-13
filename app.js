const { useState, useEffect, useRef, useSyncExternalStore } = React;

// Initialize Websim Socket for Bookmarks (exposed globally for collaboration features)
window.room = new WebsimSocket();

const App = () => {
    const [view, setView] = useState('home'); // 'home', 'article'
    const [currentArticle, setCurrentArticle] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Bookmarks from Websim DB
    const bookmarks = useSyncExternalStore(
        room.collection('bookmark_v1').subscribe,
        room.collection('bookmark_v1').getList
    );

    const handleSearch = async (val) => {
        setSearchQuery(val);
        if (val.length > 1) {
            const results = await window.WikiAPI.search(val);
            setSearchResults(results);
        } else {
            setSearchResults([]);
        }
    };

    const loadArticle = async (title) => {
        if (!title) return;
        const cleanTitle = title.replace(/_/g, ' ');
        setIsLoading(true);
        setView('article');
        setSearchResults([]);
        setSearchQuery('');
        
        try {
            // Fetch summary for meta data and full content for the actual article
            const [summary, fullContent] = await Promise.all([
                window.WikiAPI.getPageSummary(cleanTitle),
                window.WikiAPI.getPageFull(cleanTitle)
            ]);
            
            const combinedArticle = { 
                ...summary, 
                ...fullContent,
                // Ensure we have a title if summary fails but fullContent succeeds
                title: fullContent?.title || summary?.title || cleanTitle
            };
            
            setCurrentArticle(combinedArticle);
            setIsLoading(false);
            window.scrollTo(0, 0);
        } catch (error) {
            console.error("Failed to load article", error);
            setIsLoading(false);
        }
    };

    const loadRandom = async () => {
        setIsLoading(true);
        setView('article');
        setSearchResults([]);
        setSearchQuery('');

        try {
            const summary = await window.WikiAPI.getRandomPage();
            const fullContent = await window.WikiAPI.getPageFull(summary.title);
            
            const combinedArticle = { 
                ...summary, 
                ...fullContent,
                title: fullContent?.title || summary?.title
            };
            
            setCurrentArticle(combinedArticle);
            setIsLoading(false);
            window.scrollTo(0, 0);
        } catch (error) {
            console.error("Failed to load random article", error);
            setIsLoading(false);
        }
    };

    const toggleBookmark = async () => {
        const existing = bookmarks.find(b => b.page_title === currentArticle.title);
        if (existing) {
            await room.collection('bookmark_v1').delete(existing.id);
        } else {
            await room.collection('bookmark_v1').create({
                page_title: currentArticle.title,
                thumbnail: currentArticle.thumbnail?.source || null
            });
        }
    };

    const isBookmarked = currentArticle && bookmarks.some(b => b.page_title === currentArticle.title);

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar 
                view={view} 
                setView={setView} 
                searchQuery={searchQuery} 
                handleSearch={handleSearch} 
                searchResults={searchResults} 
                loadArticle={loadArticle} 
                loadRandom={loadRandom} 
            />

            <main className="flex-1 flex flex-col">
                {view === 'home' ? (
                    <HomeView 
                        loadArticle={loadArticle} 
                        bookmarks={bookmarks} 
                        searchQuery={searchQuery}
                        handleSearch={handleSearch}
                        searchResults={searchResults}
                        loadRandom={loadRandom}
                    />
                ) : (
                    <ArticleView 
                        article={currentArticle} 
                        isLoading={isLoading} 
                        toggleBookmark={toggleBookmark}
                        isBookmarked={isBookmarked}
                        loadArticle={loadArticle}
                    />
                )}
            </main>

            {/* Bottom Nav for Mobile convenience */}
            <div className="sm:hidden glass-nav border-t border-gray-100 py-3 px-6 flex justify-around items-center">
                 <button onClick={() => setView('home')} className={`flex flex-col items-center ${view === 'home' ? 'text-blue-600' : 'text-gray-400'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                    <span className="text-[10px] mt-1">Home</span>
                 </button>
                 <button onClick={loadRandom} className="flex flex-col items-center text-gray-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18 18.246 18.477 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    <span className="text-[10px] mt-1">Explore</span>
                 </button>
            </div>
        </div>
    );
};

// Tombstones:
// removed function HomeView() {} - moved to HomeView.js
// removed function ArticleView() {} - moved to ArticleView.js

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
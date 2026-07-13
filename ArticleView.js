const { useState, useEffect, useRef, useSyncExternalStore } = React;

const LoadingShimmer = () => (
    <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="h-10 w-2/3 loading-shimmer rounded mb-4"></div>
        <div className="h-64 w-full loading-shimmer rounded-2xl mb-6"></div>
        <div className="space-y-3">
            <div className="h-4 w-full loading-shimmer rounded"></div>
            <div className="h-4 w-full loading-shimmer rounded"></div>
            <div className="h-4 w-3/4 loading-shimmer rounded"></div>
        </div>
    </div>
);

window.ArticleView = ({ article, isLoading, toggleBookmark, isBookmarked, loadArticle }) => {
    const contentRef = useRef(null);
    const [showTOC, setShowTOC] = useState(false);
    const [desktopTOCVisible, setDesktopTOCVisible] = useState(true);
    const [activeId, setActiveId] = useState('');
    const [isAiVisible, setIsAiVisible] = useState(false);

    // Collaboration: comments state
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        // load current user for upvote/checks (optional)
        (async () => {
            try {
                const u = await window.websim.getCurrentUser();
                setCurrentUser(u);
            } catch (e) {
                setCurrentUser(null);
            }
        })();
    }, []);

    // subscribe to comments for this article
    useEffect(() => {
        if (!article?.title || !window.room) {
            setComments([]);
            return;
        }
        const filter = window.room.collection('comment_v1').filter({ page_title: article.title });
        const unsubscribe = filter.subscribe((list) => {
            setComments(list || []);
        });

        // fetch initial list (subscribe triggers immediately but ensure)
        try {
            const list = filter.getList();
            setComments(list || []);
        } catch (e) {
            // ignore if unavailable synchronously
        }

        return () => {
            try { unsubscribe(); } catch (e) {}
        };
    }, [article?.title]);

    const postComment = async (e) => {
        e?.preventDefault();
        if (!newComment.trim() || !article?.title) return;
        try {
            await window.room.collection('comment_v1').create({
                page_title: article.title,
                content: newComment.trim()
            });
            setNewComment('');
        } catch (err) {
            console.error("Failed to post comment", err);
        }
    };

    const upvoteComment = async (commentId) => {
        if (!commentId) return;
        try {
            await window.room.collection('upvote_v1').create({
                comment_id: commentId
            });
        } catch (err) {
            console.error("Failed to upvote", err);
        }
    };

    // helper to count upvotes for a comment (non-reactive snapshot)
    const countUpvotes = (commentId) => {
        try {
            const upvotes = window.room.collection('upvote_v1').filter({ comment_id: commentId }).getList();
            return (upvotes && upvotes.length) || 0;
        } catch (e) {
            return 0;
        }
    };

    useEffect(() => {
        if (!article || isLoading) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                    }
                });
            },
            { rootMargin: '-10% 0px -80% 0px', threshold: 0 }
        );

        const headings = contentRef.current?.querySelectorAll('h1, h2, h3, h4, h5, h6, [id]');
        const trackedIds = new Set((article.sections || []).map(s => s.anchor));
        
        headings?.forEach((el) => {
            if (trackedIds.has(el.id)) {
                observer.observe(el);
            }
        });

        const handleLinkClick = (e) => {
            const anchor = e.target.closest('a');
            if (!anchor) return;
            const href = anchor.getAttribute('href');
            if (!href) return;

            // Handle internal Wikipedia links (relative or absolute)
            const isWikiLink = href.startsWith('/wiki/') || 
                              href.startsWith('./') || 
                              href.includes('en.wikipedia.org/wiki/') ||
                              href.includes('en.m.wikipedia.org/wiki/');

            if (isWikiLink) {
                e.preventDefault();
                try {
                    // Extract title part regardless of absolute or relative URL
                    const url = new URL(href, 'https://en.wikipedia.org');
                    const pathParts = url.pathname.split('/wiki/');
                    if (pathParts.length > 1) {
                        const titlePart = pathParts[1].split('#')[0];
                        loadArticle(decodeURIComponent(titlePart));
                    } else if (href.startsWith('./')) {
                        const titlePart = href.replace('./', '').split('#')[0];
                        loadArticle(decodeURIComponent(titlePart));
                    }
                } catch (err) {
                    const titlePart = href.split('/wiki/').pop()?.split('#')[0];
                    if (titlePart) loadArticle(decodeURIComponent(titlePart));
                }
                return;
            }

            if (href.startsWith('#')) {
                e.preventDefault();
                const id = href.substring(1);
                const target = document.getElementById(id);
                if (target) {
                    // Compute navbar height dynamically to fix Y offset
                    const navEl = document.querySelector('nav') || document.querySelector('.glass-nav');
                    const navHeight = (navEl && navEl.offsetHeight) ? navEl.offsetHeight : 80;
                    window.scrollTo({
                        top: target.getBoundingClientRect().top + window.pageYOffset - navHeight,
                        behavior: 'smooth'
                    });
                }
                return;
            }

            if (href.startsWith('http')) {
                anchor.setAttribute('target', '_blank');
                anchor.setAttribute('rel', 'noopener noreferrer');
            }
        };

        const currentRef = contentRef.current;
        if (currentRef) currentRef.addEventListener('click', handleLinkClick);
        return () => {
            if (currentRef) currentRef.removeEventListener('click', handleLinkClick);
            observer.disconnect();
        };
    }, [article, isLoading, loadArticle]);

    if (isLoading) return <LoadingShimmer />;
    if (!article) return <div className="p-8 text-center text-gray-500">No content found</div>;

    const toc = (article.sections || [])
        .map((s) => ({ 
            id: s.anchor, 
            text: s.line, 
            level: parseInt(s.toclevel) || 1 
        }));

    const scrollToSection = (id) => {
        const el = document.getElementById(id);
        if (el) {
            // Compute navbar height dynamically to fix Y offset on various viewports
            const navEl = document.querySelector('nav') || document.querySelector('.glass-nav');
            const navHeight = (navEl && navEl.offsetHeight) ? navEl.offsetHeight : 80;
            const elementPosition = el.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - navHeight;
            window.scrollTo({ top: offsetPosition, behavior: "smooth" });
            setActiveId(id);
            setShowTOC(false);
        }
    };

    const processContent = (html) => {
        if (!html) return '';
        let processed = html;
        
        // 1. Clean up Wikipedia specific styles/scripts that interfere
        processed = processed.replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, '');

        // 2. Robust Fix for Images & Lazy Loading:
        // First, handle noscript images which often contain the "real" image when lazy loading is active
        processed = processed.replace(/<noscript>([\s\S]*?)<\/noscript>/gi, '$1');

        processed = processed.replace(/<img [^>]*>/gi, (imgTag) => {
            const attrs = {};
            // Updated regex to handle more attribute variations (including single quotes or no quotes)
            const attrRegex = /([a-z-]+)\s*=\s*(?:(['"])(.*?)\2|([^\s>]+))/gi;
            let match;
            while ((match = attrRegex.exec(imgTag)) !== null) {
                const key = match[1].toLowerCase();
                const value = match[3] || match[4];
                attrs[key] = value;
            }

            // Determine the best source, checking all possible lazy loading attributes used by Wikipedia
            let finalSrc = attrs['data-src'] || attrs['src'];
            let finalSrcset = attrs['data-srcset'] || attrs['srcset'];

            // If src is a placeholder (base64, clear.gif, etc), try to find a better one
            const isPlaceholder = (url) => !url || url.includes('data:image') || url.includes('transparent.gif') || url.includes('clear.gif') || url.includes('pixel.gif');
            
            if (isPlaceholder(finalSrc)) {
                // Look for alternative attributes
                finalSrc = attrs['data-lazy-src'] || attrs['original-src'] || attrs['data-file-width'] ? attrs['src'] : finalSrc;
            }

            // Build new tag
            let newTag = '<img';
            newTag += ` loading="eager"`;
            
            const fixUrl = (url) => {
                if (!url) return '';
                if (url.startsWith('//')) return 'https:' + url;
                if (url.startsWith('/') && !url.startsWith('http')) return 'https://en.wikipedia.org' + url;
                return url;
            };

            if (finalSrc) {
                newTag += ` src="${fixUrl(finalSrc)}"`;
            }

            if (finalSrcset) {
                const fixedSrcset = finalSrcset.split(',').map(part => {
                    let p = part.trim();
                    const subParts = p.split(/\s+/);
                    let url = subParts[0];
                    const descriptor = subParts.slice(1).join(' ');
                    url = fixUrl(url);
                    return descriptor ? `${url} ${descriptor}` : url;
                }).join(', ');
                newTag += ` srcset="${fixedSrcset}"`;
            }

            if (attrs['alt']) newTag += ` alt="${attrs['alt']}"`;
            if (attrs['title']) newTag += ` title="${attrs['title']}"`;

            // Clean classes and force visibility
            const oldClass = attrs['class'] || '';
            const newClass = (oldClass.replace(/lazy-image-placeholder|mw-lazy-loaded|mw-no-invert/g, '') + ' mw-file-element').trim();
            newTag += ` class="${newClass}"`;
            newTag += ` style="display:block !important; height:auto !important; max-width:100% !important; min-height:20px !important; opacity:1 !important; visibility:visible !important;"`;
            
            newTag += ' />';
            return newTag;
        });

        // 3. Fix all other URLs (mostly hrefs for links)
        processed = processed.replace(/(href)=(['"])([^'"]+)(['"])/gi, (match, attr, q1, val, q2) => {
            if (val.startsWith('http') || val.startsWith('data:') || val.startsWith('#')) {
                return match;
            }
            
            let newVal = val;
            if (val.startsWith('//')) {
                newVal = 'https:' + val;
            } else if (val.startsWith('/') && !val.startsWith('http')) {
                newVal = 'https://en.wikipedia.org' + val;
            }
            
            return `${attr}=${q1}${newVal}${q2}`;
        });

        // 4. Cross-reference plain text terms inside the article body safely.
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(processed, 'text/html');
            const TERMS = [
                "History","Culture","Geography","Economy","Politics","Science","Technology",
                "Biology","Physics","Chemistry","Education","Demographics","Climate","Transport",
                "Literature","Philosophy","Mathematics","Religion","Architecture","Art"
            ];
            const termRegex = new RegExp('\\b(' + TERMS.join('|') + ')\\b', 'gi');

            const walk = (node) => {
                node.childNodes.forEach(child => {
                    if (child.nodeType === Node.TEXT_NODE) {
                        const text = child.textContent;
                        if (termRegex.test(text)) {
                            const frag = document.createDocumentFragment();
                            let lastIndex = 0;
                            text.replace(termRegex, (match, p1, offset) => {
                                if (offset > lastIndex) {
                                    frag.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
                                }
                                const link = document.createElement('a');
                                const normalized = match.trim().replace(/\s+/g, '_');
                                link.setAttribute('href', `https://en.wikipedia.org/wiki/${encodeURIComponent(normalized)}`);
                                link.setAttribute('target', '_blank');
                                link.setAttribute('rel', 'noopener noreferrer');
                                link.className = 'cross-ref-link';
                                link.textContent = match;
                                frag.appendChild(link);
                                lastIndex = offset + match.length;
                            });
                            if (lastIndex < text.length) {
                                frag.appendChild(document.createTextNode(text.slice(lastIndex)));
                            }
                            child.parentNode.replaceChild(frag, child);
                        }
                    } else if (child.nodeType === Node.ELEMENT_NODE) {
                        const tag = child.tagName.toLowerCase();
                        if (tag === 'a' || tag === 'script' || tag === 'style' || tag === 'img') return;
                        walk(child);
                    }
                });
            };

            walk(doc.body);

            const styleEl = doc.createElement('style');
            styleEl.textContent = `.cross-ref-link{color:inherit;text-decoration:underline dotted;text-underline-offset:3px;font-weight:500}`;
            doc.head.appendChild(styleEl);

            processed = doc.body.innerHTML;
        } catch (e) {
            console.warn('Cross-referencing failed', e);
        }
        
        return processed;
    };

    return (
        <div className="flex justify-center items-start max-w-7xl mx-auto w-full relative min-h-screen">
            <DesktopTOC 
                toc={toc} 
                activeId={activeId} 
                scrollToSection={scrollToSection} 
                desktopTOCVisible={desktopTOCVisible} 
                setDesktopTOCVisible={setDesktopTOCVisible} 
            />

            <article className="flex-1 max-w-3xl px-4 py-8 animate-in slide-in-from-bottom-4 duration-500 relative min-w-0">
                <header className="mb-6 flex justify-between items-start">
                    <div className="flex-1 mr-4">
                        <h1 className="serif text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-2">{article.title}</h1>
                        <p className="text-gray-500 italic text-sm">{article.description}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button 
                            onClick={() => setIsAiVisible(!isAiVisible)}
                            className={`p-3 rounded-full transition-all ${isAiVisible ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400 hover:text-purple-500'}`}
                            title="AI Summary"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </button>
                        <button onClick={toggleBookmark} className={`p-3 rounded-full transition-all ${isBookmarked ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400'}`}>
                            <svg className="w-5 h-5" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                        </button>
                    </div>
                </header>

                <AISummary article={article} isVisible={isAiVisible} setIsVisible={setIsAiVisible} />

                <MobileTOC 
                    toc={toc} 
                    activeId={activeId} 
                    scrollToSection={scrollToSection} 
                    isOpen={showTOC} 
                    setIsOpen={setShowTOC} 
                />

                <div ref={contentRef} className="article-content text-gray-700 serif">
                    {article.text?.['*'] ? (
                        <div className="prose prose-sm sm:prose-base max-w-none prose-img:rounded-lg" dangerouslySetInnerHTML={{ __html: window.WikiUtils.processContent(article.text['*']) }} />
                    ) : (
                        <div className="prose prose-sm sm:prose-base max-w-none" dangerouslySetInnerHTML={{ __html: window.WikiUtils.processContent(article.extract_html || article.extract || 'No content') }} />
                    )}
                </div>

                {/* Collaborative Comments */}
                <section className="mt-8 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <h3 className="font-semibold mb-3">Community discussion</h3>

                    <form onSubmit={postComment} className="flex gap-2 mb-4">
                        <input
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a comment..."
                            className="flex-1 bg-gray-50 border border-gray-100 rounded-full px-4 py-2 text-sm outline-none"
                        />
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm">Post</button>
                    </form>

                    <div className="space-y-3">
                        {comments.length === 0 && <div className="text-sm text-gray-400">No comments yet — be the first to contribute.</div>}
                        {comments.map(c => (
                            <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-50">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm text-gray-600 overflow-hidden">
                                    <img src={`https://images.websim.com/avatar/${c.username}`} alt={c.username} className="w-full h-full object-cover" onError={(e)=>{e.currentTarget.style.display='none'}} />
                                    {!c.thumbnail && (!c.username) ? <span className="serif font-bold">{(c.username || 'U')[0]}</span> : null}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-medium text-gray-800">{c.username || 'Anonymous'}</div>
                                        <div className="text-xs text-gray-400">{new Date(c.created_at).toLocaleString()}</div>
                                    </div>
                                    <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{c.content}</div>
                                    <div className="mt-2 flex items-center gap-3">
                                        <button onClick={() => upvoteComment(c.id)} className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" /></svg>
                                            <span>{countUpvotes(c.id)}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <footer className="mt-12 pt-6 border-t border-gray-100 flex flex-col items-center w-full">
                    <div className="w-full max-w-3xl px-4">
                        <a href={article.content_urls?.desktop?.page} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline flex items-center gap-1">
                            Read on Entyra
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>

                        {/* Further reading & sources / bibliography */}
                        {(() => {
                            const refs = article?.references || article?.parse?.references || [];
                            if (refs && refs.length > 0) {
                                return (
                                    <div className="mt-6">
                                        <h4 className="font-semibold mb-2">Further reading & sources</h4>
                                        <ol className="reflist bg-white p-4 rounded-lg border border-gray-100">
                                            {refs.map((r, i) => (
                                                <li key={i} className="mb-2 text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: r }} />
                                            ))}
                                        </ol>
                                    </div>
                                );
                            }
                            return (
                                <div className="mt-4 text-sm text-gray-500">
                                    Original source: <a href={article.content_urls?.desktop?.page} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Wikipedia — {article.title}</a>
                                </div>
                            );
                        })()}
                    </div>
                </footer>
                
                {toc.length > 0 && (
                    <button onClick={() => setShowTOC(true)} className="lg:hidden fixed bottom-20 right-6 p-3 bg-white shadow-lg border border-gray-100 rounded-full text-gray-400 hover:text-blue-500 transition-all z-40">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                )}

                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-6 right-6 p-3 bg-white shadow-lg border border-gray-100 rounded-full text-gray-400 hover:text-blue-500 transition-all z-40">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                </button>
            </article>
        </div>
    );
};
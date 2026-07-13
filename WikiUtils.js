window.WikiUtils = {
    renderMarkdown: (text) => {
        if (!text) return { __html: '' };
        if (window.marked) {
            return { __html: window.marked.parse(text) };
        }
        return { __html: text };
    },

    processContent: (html) => {
        if (!html) return '';
        let processed = html;
        
        // 1. Clean up Wikipedia specific styles/scripts
        processed = processed.replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, '');

        // 2. Fix Images & Lazy Loading
        processed = processed.replace(/<noscript>([\s\S]*?)<\/noscript>/gi, '$1');

        processed = processed.replace(/<img [^>]*>/gi, (imgTag) => {
            const attrs = {};
            const attrRegex = /([a-z-]+)\s*=\s*(?:(['"])(.*?)\2|([^\s>]+))/gi;
            let match;
            while ((match = attrRegex.exec(imgTag)) !== null) {
                const key = match[1].toLowerCase();
                const value = match[3] || match[4];
                attrs[key] = value;
            }

            let finalSrc = attrs['data-src'] || attrs['src'];
            let finalSrcset = attrs['data-srcset'] || attrs['srcset'];
            const isPlaceholder = (url) => !url || url.includes('data:image') || url.includes('transparent.gif') || url.includes('clear.gif') || url.includes('pixel.gif');
            
            if (isPlaceholder(finalSrc)) {
                finalSrc = attrs['data-lazy-src'] || attrs['original-src'] || attrs['data-file-width'] ? attrs['src'] : finalSrc;
            }

            let newTag = '<img loading="eager"';
            
            const fixUrl = (url) => {
                if (!url) return '';
                if (url.startsWith('//')) return 'https:' + url;
                if (url.startsWith('/') && !url.startsWith('http')) return 'https://en.wikipedia.org' + url;
                return url;
            };

            if (finalSrc) newTag += ` src="${fixUrl(finalSrc)}"`;
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

            const oldClass = attrs['class'] || '';
            const newClass = (oldClass.replace(/lazy-image-placeholder|mw-lazy-loaded|mw-no-invert/g, '') + ' mw-file-element').trim();
            newTag += ` class="${newClass}" style="display:block !important; height:auto !important; max-width:100% !important; min-height:20px !important; opacity:1 !important; visibility:visible !important;" />`;
            
            return newTag;
        });

        // 3. Fix all other URLs
        processed = processed.replace(/(href)=(['"])([^'"]+)(['"])/gi, (match, attr, q1, val, q2) => {
            if (val.startsWith('http') || val.startsWith('data:') || val.startsWith('#')) return match;
            let newVal = val.startsWith('//') ? 'https:' + val : (val.startsWith('/') ? 'https://en.wikipedia.org' + val : val);
            return `${attr}=${q1}${newVal}${q2}`;
        });

        // 4. Cross-reference plain text terms to related wiki pages.
        // Use DOM parsing to avoid injecting links inside tags or existing anchors.
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(processed, 'text/html');
            const TERMS = [
                "History","Culture","Geography","Economy","Politics","Science","Technology",
                "Biology","Physics","Chemistry","Education","Demographics","Climate","Transport",
                "Literature","Philosophy","Mathematics","Religion","Architecture","Art"
            ];
            // Build regex for whole-word, case-insensitive
            const termRegex = new RegExp('\\b(' + TERMS.join('|') + ')\\b', 'gi');

            const walk = (node) => {
                node.childNodes.forEach(child => {
                    if (child.nodeType === Node.TEXT_NODE) {
                        const text = child.textContent;
                        if (termRegex.test(text)) {
                            const frag = document.createDocumentFragment();
                            let lastIndex = 0;
                            text.replace(termRegex, (match, p1, offset) => {
                                // append text before
                                if (offset > lastIndex) {
                                    frag.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
                                }
                                // create safe link
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
                            // append remaining
                            if (lastIndex < text.length) {
                                frag.appendChild(document.createTextNode(text.slice(lastIndex)));
                            }
                            child.parentNode.replaceChild(frag, child);
                        }
                    } else if (child.nodeType === Node.ELEMENT_NODE) {
                        // don't traverse anchors or script/style
                        const tag = child.tagName.toLowerCase();
                        if (tag === 'a' || tag === 'script' || tag === 'style' || tag === 'img') return;
                        walk(child);
                    }
                });
            };

            walk(doc.body);

            // Add a minimal style for cross-ref links to match design
            const styleEl = doc.createElement('style');
            styleEl.textContent = `.cross-ref-link{color:inherit;text-decoration:underline dotted;text-underline-offset:3px;font-weight:500}`;
            doc.head.appendChild(styleEl);

            processed = doc.body.innerHTML;
        } catch (e) {
            // If DOM parsing fails, leave processed as-is
            console.warn('Cross-referencing failed', e);
        }
        
        return processed;
    }
};
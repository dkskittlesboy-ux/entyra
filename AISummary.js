const { useState, useEffect } = React;

window.AISummary = ({ article, isVisible, setIsVisible }) => {
    const [aiSummary, setAiSummary] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    const generateAiSummary = async () => {
        if (!article || aiSummary || isAiLoading) return;
        
        setIsAiLoading(true);
        try {
            const extract = article.extract || (article.text?.['*']?.replace(/<[^>]*>/g, '').slice(0, 1000));
            const systemPrompt = "You are a knowledgeable encyclopedia editor. Summarize the provided Lexica content for the user in clear, concise English. Use Markdown where helpful and focus on core definitions and key facts.";
            const initialUserMessage = `Article title: ${article.title}\nContent excerpt: ${extract}`;
            
            const completion = await websim.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: initialUserMessage }
                ]
            });
            
            setAiSummary(completion.content);
            setChatHistory([]); 
        } catch (error) {
            console.error("AI Summary generation failed", error);
            setAiSummary("Unable to generate AI summary at the moment. Please try again later.");
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleFollowUp = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || isAiLoading) return;

        const userMsg = chatInput.trim();
        setChatInput('');
        const newHistory = [...chatHistory, { role: "user", content: userMsg }];
        setChatHistory(newHistory);
        setIsAiLoading(true);

        try {
            const systemPrompt = "You are a knowledgeable encyclopedia editor discussing the article with the user. Use clear, professional English and you may respond using Markdown.";
            const contextMessages = [
                { role: "system", content: systemPrompt },
                { role: "assistant", content: `Summary recap: ${aiSummary}` },
                ...newHistory.slice(-10)
            ];

            const completion = await websim.chat.completions.create({
                messages: contextMessages
            });
            setChatHistory([...newHistory, completion]);
        } catch (error) {
            console.error("AI Follow-up failed", error);
            setChatHistory([...newHistory, { role: "assistant", content: "Sorry, I can't answer that right now." }]);
        } finally {
            setIsAiLoading(false);
        }
    };

    useEffect(() => {
        if (isVisible && !aiSummary) {
            generateAiSummary();
        }
    }, [isVisible]);

    useEffect(() => {
        setAiSummary('');
        setChatHistory([]);
        setChatInput('');
    }, [article?.title]);

    if (!isVisible) return null;

    return (
        <div className="mb-8 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-5 border border-purple-100 shadow-sm animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-purple-700 font-semibold">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13.657 15.657a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM19.143 12.857a1 1 0 01-1.286.643l-1.071-.429a1 1 0 11.714-1.857l1.071.429a1 1 0 01.572 1.214z"></path></svg>
                    <span>AI Assistant</span>
                </div>
                <button onClick={() => setIsVisible(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </button>
            </div>
            
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 toc-scrollbar">
                {aiSummary && (
                    <div className="bg-white/40 rounded-2xl p-4 border border-purple-100 text-gray-800">
                        <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-2">AI Summary</div>
                        <div className="prose-sm prose-purple prose-p:leading-relaxed" dangerouslySetInnerHTML={window.WikiUtils.renderMarkdown(aiSummary)} />
                    </div>
                )}

                {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-[0.925rem] leading-relaxed ${
                            msg.role === 'user' 
                                ? 'bg-purple-600 text-white rounded-tr-none' 
                                : 'bg-white/60 text-gray-800 rounded-tl-none border border-purple-50'
                        }`} dangerouslySetInnerHTML={msg.role === 'assistant' ? window.WikiUtils.renderMarkdown(msg.content) : null}>
                            {msg.role === 'user' ? msg.content : null}
                        </div>
                    </div>
                ))}
                
                {isAiLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white/60 rounded-2xl rounded-tl-none px-4 py-3 border border-purple-50 w-2/3">
                            <div className="flex gap-1">
                                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <form onSubmit={handleFollowUp} className="mt-4 flex gap-2">
                <input 
                    type="text"
                    placeholder="Ask a follow-up question about this article..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 bg-white/80 border border-purple-100 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-purple-200 outline-none"
                />
                <button 
                    type="submit"
                    disabled={isAiLoading || !chatInput.trim()}
                    className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                </button>
            </form>
            
            <div className="mt-4 text-[10px] text-purple-400 flex items-center gap-1">
                <span>Powered by Websim AI</span>
            </div>
        </div>
    );
};
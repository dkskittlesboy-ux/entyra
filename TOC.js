const { useRef, useEffect } = React;

window.DesktopTOC = ({ toc, activeId, scrollToSection, desktopTOCVisible, setDesktopTOCVisible }) => {
    const tocContainerRef = useRef(null);

    useEffect(() => {
        if (activeId && tocContainerRef.current) {
            const activeElement = tocContainerRef.current.querySelector(`[data-id="${activeId}"]`);
            if (activeElement) {
                activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [activeId]);

    return (
        <aside className={`hidden lg:block sticky top-[80px] self-start h-[calc(100vh-100px)] transition-all duration-300 z-30 ${desktopTOCVisible ? 'w-64' : 'w-12'}`}>
            <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-4 pr-4">
                     {desktopTOCVisible && <h3 className="serif font-bold text-lg text-gray-900 border-b-2 border-gray-100 pb-1 flex-1">Table of contents</h3>}
                     <button type="button" onClick={() => setDesktopTOCVisible(!desktopTOCVisible)} className={`p-2 rounded-lg transition-all hover:bg-gray-100 text-gray-500 ${!desktopTOCVisible ? 'rotate-180 ml-0' : 'ml-2'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={desktopTOCVisible ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M13 5l7 7-7 7M5 5l7 7-7 7"} /></svg>
                    </button>
                </div>
                <div 
                    ref={tocContainerRef}
                    className={`overflow-y-auto overflow-x-hidden toc-scrollbar flex-1 transition-opacity duration-300 ${desktopTOCVisible ? 'opacity-100 pr-2' : 'opacity-0 pointer-events-none'}`}
                >
                    <div className="space-y-1 border-l border-gray-100">
                        {toc.map((item, idx) => (
                            <button 
                                type="button"
                                key={idx} 
                                data-id={item.id}
                                onClick={() => scrollToSection(item.id)} 
                                className={`w-full text-left py-1.5 px-3 hover:text-blue-600 text-sm transition-all text-gray-500 border-l-2 border-transparent -ml-[1px] ${item.level > 1 ? 'pl-6 text-xs opacity-80' : 'font-medium'} ${activeId === item.id ? 'toc-item-active' : ''}`}
                            >
                                {item.text}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </aside>
    );
};

window.MobileTOC = ({ toc, activeId, scrollToSection, isOpen, setIsOpen }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-x-4 top-20 bottom-20 bg-white/95 backdrop-blur-md z-[60] shadow-2xl rounded-3xl border border-gray-100 p-6 overflow-y-auto animate-in fade-in zoom-in-95 duration-200 lg:hidden">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">Table of contents</h3>
                <button type="button" onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            <div className="space-y-1">
                {toc.map((item, idx) => (
                    <button type="button" key={idx} onClick={() => scrollToSection(item.id)} className={`w-full text-left py-3 px-4 hover:bg-gray-50 rounded-xl text-sm transition-all border-l-4 border-transparent ${item.level > 1 ? 'ml-4 text-xs opacity-80' : 'font-medium'} ${activeId === item.id ? 'bg-blue-50 text-blue-600 border-blue-600' : 'text-gray-600'}`}>
                        {item.text}
                    </button>
                ))}
            </div>
        </div>
    );
};
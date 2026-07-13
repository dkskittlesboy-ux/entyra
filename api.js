const WIKI_API_BASE = 'https://en.wikipedia.org/w/api.php';
const WIKI_REST_BASE = 'https://en.wikipedia.org/api/rest_v1';

window.WikiAPI = {
    async search(query) {
        const params = new URLSearchParams({
            action: 'query',
            list: 'search',
            srsearch: query,
            format: 'json',
            origin: '*'
        });
        const response = await fetch(`${WIKI_API_BASE}?${params}`);
        const data = await response.json();
        return data.query?.search || [];
    },

    async getPageSummary(title) {
        try {
            const response = await fetch(`${WIKI_REST_BASE}/page/summary/${encodeURIComponent(title)}`);
            if (!response.ok) throw new Error('Page not found');
            return await response.json();
        } catch (e) {
            console.error(e);
            return null;
        }
    },

    async getPageFull(title) {
        try {
            const params = new URLSearchParams({
                action: 'parse',
                page: title,
                prop: 'text|sections|displaytitle',
                format: 'json',
                origin: '*',
                disableeditsection: 1,
                redirects: 1
            });
            const response = await fetch(`${WIKI_API_BASE}?${params}`);
            const data = await response.json();
            if (data.error) throw new Error(data.error.info);
            return data.parse;
        } catch (e) {
            console.error(e);
            return null;
        }
    },

    async getRandomPage() {
        const response = await fetch(`${WIKI_REST_BASE}/page/random/summary`);
        return await response.json();
    }
};
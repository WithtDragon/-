/**
 * 管理后台 API 封装（自动附加 JWT Token）
 */
const api = {
    getToken() {
        return localStorage.getItem('admin_token');
    },

    async fetch(url, options = {}) {
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers,
        };

        const res = await fetch(url, { ...options, headers });

        if (res.status === 401) {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');
            window.location.href = '/admin';
            return null;
        }

        return res;
    },

    async get(url) {
        const res = await this.fetch(url);
        return res ? res.json() : null;
    },

    async post(url, body) {
        const res = await this.fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
        });
        return res ? res.json() : null;
    },

    async put(url, body) {
        const res = await this.fetch(url, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
        return res ? res.json() : null;
    },

    async del(url) {
        const res = await this.fetch(url, { method: 'DELETE' });
        return res ? res.json() : null;
    },
};

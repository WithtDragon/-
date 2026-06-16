/**
 * 管理后台 - 登录逻辑
 */
document.addEventListener('DOMContentLoaded', () => {
    // 如果已经登录，直接跳转
    if (localStorage.getItem('admin_token')) {
        window.location.href = '/admin/dashboard.html';
        return;
    }

    const form = document.getElementById('loginForm');
    const errorEl = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        if (!username || !password) {
            errorEl.textContent = '请输入用户名和密码';
            errorEl.style.display = 'block';
            return;
        }

        btn.disabled = true;
        btn.textContent = '登录中...';
        errorEl.style.display = 'none';

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (res.ok && data.token) {
                localStorage.setItem('admin_token', data.token);
                localStorage.setItem('admin_user', JSON.stringify(data.user));
                window.location.href = '/admin/dashboard.html';
            } else {
                errorEl.textContent = data.error || '登录失败';
                errorEl.style.display = 'block';
            }
        } catch (err) {
            errorEl.textContent = '网络错误，请稍后重试';
            errorEl.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.textContent = '登 录';
        }
    });
});

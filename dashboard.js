/**
 * 管理面板 - 路由和初始化
 */

// 检查登录状态
if (!localStorage.getItem('admin_token')) {
    window.location.href = '/admin';
}

// 显示当前用户
const user = JSON.parse(localStorage.getItem('admin_user') || '{}');
document.getElementById('sidebarUser').textContent =
    `👤 ${user.username || 'admin'}`;

// 退出登录
function logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    window.location.href = '/admin';
}

// Tab 切换
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        // 激活样式
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        // 显示对应内容
        const tabId = item.dataset.tab;
        document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
        document.getElementById(`tab-${tabId}`).style.display = 'block';
    });
});

// Toast
function showToast(msg, type = '') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast ' + type + ' show';
    clearTimeout(t._timeout);
    t._timeout = setTimeout(() => t.classList.remove('show'), 2500);
}

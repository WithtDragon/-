/**
 * AI配置 + 敏感词 + 密码管理模块
 */
const configModule = {
    async loadConfig() {
        const data = await api.get('/api/admin/config');
        if (!data) return;

        // 加载提示词
        const prompt = data.config.system_prompt || '';
        document.getElementById('cfgSystemPrompt').value = prompt;

        // 加载回复风格
        const style = data.config.reply_style || '热情幽默';
        document.getElementById('cfgReplyStyle').value = style;
    },

    async saveConfig() {
        const config = {
            system_prompt: document.getElementById('cfgSystemPrompt').value,
            reply_style: document.getElementById('cfgReplyStyle').value,
        };

        const result = await api.put('/api/admin/config', { config });
        if (result && result.success) {
            showToast('配置已保存 ✅ AI回复将立即生效', 'success');
        } else {
            showToast(result?.error || '保存失败', 'error');
        }
    },

    // 敏感词
    async loadWords() {
        const data = await api.get('/api/admin/sensitive-words');
        if (!data) return;

        const tbody = document.getElementById('sensitiveWordsTableBody');
        if (data.words.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3"><div class="empty-state"><p>暂无敏感词</p></div></td></tr>';
            return;
        }

        tbody.innerHTML = data.words.map(w => `
            <tr>
                <td><code>${this._escape(w.word)}</code></td>
                <td><span class="badge-status ${w.is_active ? 'badge-active' : 'badge-inactive'}">${w.is_active ? '生效中' : '已禁用'}</span></td>
                <td class="actions-cell">
                    <button class="btn btn-outline btn-sm" onclick="configModule.toggleWord(${w.id}, ${w.is_active})">
                        ${w.is_active ? '禁用' : '启用'}
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="configModule.deleteWord(${w.id})">删除</button>
                </td>
            </tr>
        `).join('');
    },

    async addWord() {
        const input = document.getElementById('newSensitiveWord');
        const word = input.value.trim();
        if (!word) return showToast('请输入敏感词', 'error');

        const result = await api.post('/api/admin/sensitive-words', { word, is_active: 1 });
        if (result && !result.error) {
            showToast('敏感词已添加 ✅', 'success');
            input.value = '';
            this.loadWords();
        } else {
            showToast(result?.error || '添加失败', 'error');
        }
    },

    async toggleWord(id, currentActive) {
        const result = await api.put(`/api/admin/sensitive-words/${id}`, {
            is_active: currentActive ? 0 : 1,
        });
        if (result && result.success) {
            showToast(currentActive ? '已禁用' : '已启用', 'success');
            this.loadWords();
        }
    },

    async deleteWord(id) {
        if (!confirm('确定删除这个敏感词吗？')) return;
        await api.del(`/api/admin/sensitive-words/${id}`);
        showToast('已删除', 'success');
        this.loadWords();
    },

    _escape(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },
};

// 修改密码
document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const current = document.getElementById('pwdCurrent').value;
    const newPwd = document.getElementById('pwdNew').value;
    const confirm = document.getElementById('pwdConfirm').value;
    const errorEl = document.getElementById('pwdError');

    errorEl.style.display = 'none';

    if (newPwd !== confirm) {
        errorEl.textContent = '两次输入的新密码不一致';
        errorEl.style.display = 'block';
        return;
    }

    if (newPwd.length < 6) {
        errorEl.textContent = '新密码至少6位';
        errorEl.style.display = 'block';
        return;
    }

    const result = await api.put('/api/admin/password', {
        current_password: current,
        new_password: newPwd,
    });

    if (result && result.success) {
        showToast('密码修改成功 ✅', 'success');
        document.getElementById('passwordForm').reset();
    } else {
        errorEl.textContent = result?.error || '修改失败';
        errorEl.style.display = 'block';
    }
});

// 回车添加敏感词
document.getElementById('newSensitiveWord').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        configModule.addWord();
    }
});

// 初始加载
configModule.loadConfig();
configModule.loadWords();

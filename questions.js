/**
 * 快捷问题管理模块
 */
const questionsModule = {
    editingId: null,

    async loadList() {
        const [qData, sData] = await Promise.all([
            api.get('/api/admin/questions'),
            api.get('/api/admin/scenes'),
        ]);

        const tbody = document.getElementById('questionsTableBody');
        if (!qData || qData.questions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">💬</div><p>暂无快捷问题</p></div></td></tr>';
            return;
        }

        // 缓存景区列表供弹窗使用
        this._scenes = sData?.scenes || [];

        tbody.innerHTML = qData.questions.map(q => `
            <tr>
                <td>${q.sort_order}</td>
                <td>${q.question}</td>
                <td>${q.scene_name || '<span class="text-muted">全局</span>'}</td>
                <td><span class="badge-status ${q.is_active ? 'badge-active' : 'badge-inactive'}">${q.is_active ? '启用' : '禁用'}</span></td>
                <td class="actions-cell">
                    <button class="btn btn-outline btn-sm" onclick="questionsModule.openEditModal(${q.id})">编辑</button>
                    <button class="btn btn-danger btn-sm" onclick="questionsModule.deleteQuestion(${q.id})">删除</button>
                </td>
            </tr>
        `).join('');
    },

    openAddModal() {
        this.editingId = null;
        document.getElementById('questionModalTitle').textContent = '新增问题';
        document.getElementById('qfId').value = '';
        document.getElementById('qfQuestion').value = '';
        document.getElementById('qfSort').value = '0';
        document.getElementById('qfActive').checked = true;
        this._populateSceneSelect('');
        document.getElementById('questionModal').classList.add('show');
    },

    async openEditModal(id) {
        const data = await api.get('/api/admin/questions');
        if (!data) return;
        const q = data.questions.find(q => q.id === id);
        if (!q) return;

        this.editingId = id;
        document.getElementById('questionModalTitle').textContent = '编辑问题';
        document.getElementById('qfId').value = q.id;
        document.getElementById('qfQuestion').value = q.question;
        document.getElementById('qfSort').value = q.sort_order;
        document.getElementById('qfActive').checked = !!q.is_active;
        this._populateSceneSelect(q.scene_id || '');
        document.getElementById('questionModal').classList.add('show');
    },

    _populateSceneSelect(selected) {
        const sel = document.getElementById('qfSceneId');
        sel.innerHTML = '<option value="">全局（所有景区）</option>';
        (this._scenes || []).forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = `${s.emoji} ${s.name}`;
            if (s.id === selected) opt.selected = true;
            sel.appendChild(opt);
        });
    },

    closeModal() {
        document.getElementById('questionModal').classList.remove('show');
    },

    async saveQuestion() {
        const body = {
            question: document.getElementById('qfQuestion').value.trim(),
            scene_id: document.getElementById('qfSceneId').value || null,
            sort_order: parseInt(document.getElementById('qfSort').value) || 0,
            is_active: document.getElementById('qfActive').checked ? 1 : 0,
        };

        if (!body.question) {
            return showToast('问题内容不能为空', 'error');
        }

        let result;
        if (this.editingId) {
            result = await api.put(`/api/admin/questions/${this.editingId}`, body);
        } else {
            result = await api.post('/api/admin/questions', body);
        }

        if (result && !result.error) {
            showToast('问题已保存 ✅', 'success');
            this.closeModal();
            this.loadList();
        } else {
            showToast(result?.error || '操作失败', 'error');
        }
    },

    async deleteQuestion(id) {
        if (!confirm('确定要删除这个问题吗？')) return;
        const result = await api.del(`/api/admin/questions/${id}`);
        if (result && result.success) {
            showToast('问题已删除', 'success');
            this.loadList();
        }
    },
};

document.getElementById('questionModal').addEventListener('click', function(e) {
    if (e.target === this) questionsModule.closeModal();
});

questionsModule.loadList();

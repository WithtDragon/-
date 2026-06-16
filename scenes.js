/**
 * 景区管理模块
 */
const scenesModule = {
    editingId: null,

    async loadList() {
        const data = await api.get('/api/admin/scenes');
        if (!data) return;

        const tbody = document.getElementById('scenesTableBody');
        if (data.scenes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">🏔️</div><p>暂无景区数据</p></div></td></tr>';
            return;
        }

        tbody.innerHTML = data.scenes.map(s => `
            <tr>
                <td>${s.sort_order}</td>
                <td><strong>${s.emoji} ${s.name}</strong><br><span class="text-muted">${s.badge}</span></td>
                <td><div class="tag-cell">${(s.tags || []).map(t => `<span class="tag-sm">${t}</span>`).join('')}</div></td>
                <td>${(s.tags || []).length}</td>
                <td class="actions-cell">
                    <button class="btn btn-outline btn-sm" onclick="scenesModule.openEditModal('${s.id}')">编辑</button>
                    <button class="btn btn-danger btn-sm" onclick="scenesModule.deleteScene('${s.id}','${s.name}')">删除</button>
                </td>
            </tr>
        `).join('');
    },

    openAddModal() {
        this.editingId = null;
        document.getElementById('sceneModalTitle').textContent = '新增景区';
        document.getElementById('sfId').value = '';
        document.getElementById('sfSlug').value = '';
        document.getElementById('sfSlug').disabled = false;
        document.getElementById('sfName').value = '';
        document.getElementById('sfBadge').value = '';
        document.getElementById('sfEmoji').value = '🏔️';
        document.getElementById('sfIntro').value = '';
        document.getElementById('sfTags').value = '';
        document.getElementById('sfSort').value = '0';
        document.getElementById('sceneModal').classList.add('show');
    },

    async openEditModal(id) {
        const data = await api.get(`/api/admin/scenes/${id}`);
        if (!data || !data.scene) return;

        const s = data.scene;
        this.editingId = id;
        document.getElementById('sceneModalTitle').textContent = '编辑景区';
        document.getElementById('sfId').value = s.id;
        document.getElementById('sfSlug').value = s.id;
        document.getElementById('sfSlug').disabled = true;
        document.getElementById('sfName').value = s.name;
        document.getElementById('sfBadge').value = s.badge;
        document.getElementById('sfEmoji').value = s.emoji;
        document.getElementById('sfIntro').value = s.intro;
        document.getElementById('sfTags').value = (s.tags || []).join(', ');
        document.getElementById('sfSort').value = s.sort_order;
        document.getElementById('sceneModal').classList.add('show');
    },

    closeModal() {
        document.getElementById('sceneModal').classList.remove('show');
    },

    async saveScene() {
        const body = {
            id: document.getElementById('sfSlug').value.trim(),
            name: document.getElementById('sfName').value.trim(),
            badge: document.getElementById('sfBadge').value.trim(),
            emoji: document.getElementById('sfEmoji').value.trim(),
            intro: document.getElementById('sfIntro').value.trim(),
            tags: document.getElementById('sfTags').value.split(',').map(t => t.trim()).filter(Boolean),
            sort_order: parseInt(document.getElementById('sfSort').value) || 0,
        };

        if (!body.id || !body.name) {
            return showToast('ID和名称不能为空', 'error');
        }

        let result;
        if (this.editingId) {
            result = await api.put(`/api/admin/scenes/${this.editingId}`, body);
        } else {
            result = await api.post('/api/admin/scenes', body);
        }

        if (result && !result.error) {
            showToast(this.editingId ? '景区已更新 ✅' : '景区已创建 ✅', 'success');
            this.closeModal();
            this.loadList();
        } else {
            showToast(result?.error || '操作失败', 'error');
        }
    },

    async deleteScene(id, name) {
        if (!confirm(`确定要删除 "${name}" 吗？\n\n此操作不可撤销！`)) return;
        const result = await api.del(`/api/admin/scenes/${id}`);
        if (result && result.success) {
            showToast(`"${name}" 已删除`, 'success');
            this.loadList();
        } else {
            showToast(result?.error || '删除失败', 'error');
        }
    },
};

// 点击遮罩关闭弹窗
document.getElementById('sceneModal').addEventListener('click', function(e) {
    if (e.target === this) scenesModule.closeModal();
});

// 初始加载
scenesModule.loadList();

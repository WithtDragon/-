/**
 * 管理后台 API 路由（全部需要 JWT 认证）
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');
const { generateToken, authMiddleware } = require('../middleware/auth');

// ============================================================
// 登录（无需认证）
// ============================================================
router.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: '请输入用户名和密码' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
    if (!user) {
        return res.status(401).json({ error: '用户名或密码错误' });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
        return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = generateToken(user);
    res.json({
        token,
        user: { id: user.id, username: user.username },
    });
});

// ============================================================
// 以下所有路由都需要认证
// ============================================================

// 获取当前用户信息
router.get('/admin/me', authMiddleware, (req, res) => {
    res.json({ user: req.user });
});

// ============================================================
// 景区管理 CRUD
// ============================================================

// 获取所有景区
router.get('/admin/scenes', authMiddleware, (req, res) => {
    const db = getDb();
    const scenes = db.prepare('SELECT * FROM scenes ORDER BY sort_order').all();
    scenes.forEach(s => {
        try { s.tags = JSON.parse(s.tags); } catch { s.tags = []; }
    });
    res.json({ scenes });
});

// 获取单个景区
router.get('/admin/scenes/:id', authMiddleware, (req, res) => {
    const db = getDb();
    const scene = db.prepare('SELECT * FROM scenes WHERE id = ?').get(req.params.id);
    if (!scene) return res.status(404).json({ error: '景区不存在' });
    try { scene.tags = JSON.parse(scene.tags); } catch { scene.tags = []; }
    res.json({ scene });
});

// 创建景区
router.post('/admin/scenes', authMiddleware, (req, res) => {
    const { id, name, badge, emoji, intro, tags, sort_order } = req.body;
    if (!id || !name) {
        return res.status(400).json({ error: '景区ID和名称不能为空' });
    }

    const db = getDb();
    const exists = db.prepare('SELECT id FROM scenes WHERE id = ?').get(id);
    if (exists) {
        return res.status(400).json({ error: '景区ID已存在' });
    }

    db.prepare(
        'INSERT INTO scenes (id, name, badge, emoji, intro, tags, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, name, badge || '', emoji || '🏔️', intro || '', JSON.stringify(tags || []), sort_order || 0);

    const scene = db.prepare('SELECT * FROM scenes WHERE id = ?').get(id);
    try { scene.tags = JSON.parse(scene.tags); } catch { scene.tags = []; }
    res.status(201).json({ scene });
});

// 更新景区
router.put('/admin/scenes/:id', authMiddleware, (req, res) => {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM scenes WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: '景区不存在' });

    const { name, badge, emoji, intro, tags, sort_order } = req.body;

    db.prepare(`
        UPDATE scenes SET
            name = ?, badge = ?, emoji = ?, intro = ?, tags = ?, sort_order = ?,
            updated_at = datetime('now','localtime')
        WHERE id = ?
    `).run(
        name ?? existing.name,
        badge ?? existing.badge,
        emoji ?? existing.emoji,
        intro ?? existing.intro,
        tags ? JSON.stringify(tags) : existing.tags,
        sort_order ?? existing.sort_order,
        req.params.id
    );

    const scene = db.prepare('SELECT * FROM scenes WHERE id = ?').get(req.params.id);
    try { scene.tags = JSON.parse(scene.tags); } catch { scene.tags = []; }
    res.json({ scene });
});

// 删除景区
router.delete('/admin/scenes/:id', authMiddleware, (req, res) => {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM scenes WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: '景区不存在' });

    db.prepare('DELETE FROM scenes WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

// ============================================================
// 快捷问题管理 CRUD
// ============================================================

router.get('/admin/questions', authMiddleware, (req, res) => {
    const db = getDb();
    const questions = db.prepare(
        'SELECT q.*, s.name as scene_name FROM quick_questions q LEFT JOIN scenes s ON q.scene_id = s.id ORDER BY q.sort_order'
    ).all();
    res.json({ questions });
});

router.post('/admin/questions', authMiddleware, (req, res) => {
    const { question, scene_id, sort_order, is_active } = req.body;
    if (!question) return res.status(400).json({ error: '问题内容不能为空' });

    const db = getDb();
    const result = db.prepare(
        'INSERT INTO quick_questions (question, scene_id, sort_order, is_active) VALUES (?, ?, ?, ?)'
    ).run(question, scene_id || null, sort_order || 0, is_active ?? 1);

    res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/admin/questions/:id', authMiddleware, (req, res) => {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM quick_questions WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: '问题不存在' });

    const { question, scene_id, sort_order, is_active } = req.body;
    db.prepare(
        'UPDATE quick_questions SET question = ?, scene_id = ?, sort_order = ?, is_active = ? WHERE id = ?'
    ).run(
        question ?? existing.question,
        scene_id !== undefined ? scene_id : existing.scene_id,
        sort_order ?? existing.sort_order,
        is_active ?? existing.is_active,
        req.params.id
    );
    res.json({ success: true });
});

router.delete('/admin/questions/:id', authMiddleware, (req, res) => {
    const db = getDb();
    db.prepare('DELETE FROM quick_questions WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

// ============================================================
// 网站配置管理
// ============================================================

router.get('/admin/config', authMiddleware, (req, res) => {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM site_config').all();
    const config = {};
    rows.forEach(r => { config[r.key] = r.value; });
    res.json({ config });
});

router.put('/admin/config', authMiddleware, (req, res) => {
    const { config } = req.body;
    if (!config || typeof config !== 'object') {
        return res.status(400).json({ error: '请提供有效的配置数据' });
    }

    const db = getDb();
    const upsert = db.prepare(
        "INSERT OR REPLACE INTO site_config (key, value, updated_at) VALUES (?, ?, datetime('now','localtime'))"
    );

    const tx = db.transaction(() => {
        for (const [key, value] of Object.entries(config)) {
            upsert.run(key, String(value));
        }
    });
    tx();

    res.json({ success: true });
});

// ============================================================
// 敏感词管理
// ============================================================

router.get('/admin/sensitive-words', authMiddleware, (req, res) => {
    const db = getDb();
    const words = db.prepare('SELECT * FROM sensitive_words ORDER BY id').all();
    res.json({ words });
});

router.post('/admin/sensitive-words', authMiddleware, (req, res) => {
    const { word, is_active } = req.body;
    if (!word) return res.status(400).json({ error: '敏感词不能为空' });

    const db = getDb();
    try {
        db.prepare('INSERT INTO sensitive_words (word, is_active) VALUES (?, ?)').run(word, is_active ?? 1);
        res.status(201).json({ success: true });
    } catch (e) {
        res.status(400).json({ error: '该敏感词已存在' });
    }
});

router.put('/admin/sensitive-words/:id', authMiddleware, (req, res) => {
    const db = getDb();
    const { word, is_active } = req.body;
    db.prepare('UPDATE sensitive_words SET word = ?, is_active = ? WHERE id = ?')
        .run(word, is_active ?? 1, req.params.id);
    res.json({ success: true });
});

router.delete('/admin/sensitive-words/:id', authMiddleware, (req, res) => {
    const db = getDb();
    db.prepare('DELETE FROM sensitive_words WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

// ============================================================
// 修改密码
// ============================================================

router.put('/admin/password', authMiddleware, (req, res) => {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
        return res.status(400).json({ error: '请填写当前密码和新密码' });
    }
    if (new_password.length < 6) {
        return res.status(400).json({ error: '新密码至少6位' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(req.user.id);
    if (!bcrypt.compareSync(current_password, user.password)) {
        return res.status(400).json({ error: '当前密码不正确' });
    }

    const hash = bcrypt.hashSync(new_password, 10);
    db.prepare('UPDATE admin_users SET password = ? WHERE id = ?').run(hash, req.user.id);
    res.json({ success: true, message: '密码修改成功' });
});

module.exports = router;

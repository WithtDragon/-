/**
 * 公开 API 路由（无需登录）
 */
const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// 健康检查
router.get('/health', (req, res) => {
    const db = getDb();
    const sceneCount = db.prepare('SELECT COUNT(*) as count FROM scenes').get().count;
    res.json({
        status: 'ok',
        scenes: sceneCount,
        hasApiKey: !!process.env.AI_API_KEY,
    });
});

// 获取所有景区
router.get('/scenes', (req, res) => {
    const db = getDb();
    const scenes = db.prepare('SELECT * FROM scenes ORDER BY sort_order').all();
    // 解析 tags JSON
    scenes.forEach(s => {
        try { s.tags = JSON.parse(s.tags); } catch { s.tags = []; }
    });
    res.json({ scenes });
});

// 获取单个景区
router.get('/scenes/:id', (req, res) => {
    const db = getDb();
    const scene = db.prepare('SELECT * FROM scenes WHERE id = ?').get(req.params.id);
    if (!scene) {
        return res.status(404).json({ error: '景区不存在' });
    }
    try { scene.tags = JSON.parse(scene.tags); } catch { scene.tags = []; }
    res.json({ scene });
});

// 获取快捷问题
router.get('/questions', (req, res) => {
    const db = getDb();
    const { scene_id } = req.query;
    let questions;
    if (scene_id) {
        questions = db.prepare(
            'SELECT * FROM quick_questions WHERE is_active = 1 AND (scene_id = ? OR scene_id IS NULL) ORDER BY sort_order'
        ).all(scene_id);
    } else {
        questions = db.prepare(
            'SELECT * FROM quick_questions WHERE is_active = 1 ORDER BY sort_order'
        ).all();
    }
    res.json({ questions });
});

// 获取公开配置（不含敏感信息）
router.get('/config/public', (req, res) => {
    const db = getDb();
    const keys = ['site_title', 'reply_style', 'welcome_message'];
    const config = {};
    for (const key of keys) {
        const row = db.prepare('SELECT value FROM site_config WHERE key = ?').get(key);
        config[key] = row ? row.value : '';
    }
    res.json({ config });
});

module.exports = router;

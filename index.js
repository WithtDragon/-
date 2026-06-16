/**
 * AI 数字导游 - 后端服务（编排器）
 *
 * 启动: npm start
 * 公开站: http://localhost:3000
 * 管理后台: http://localhost:3000/admin
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// 全局中间件
// ============================================================
app.use(cors());
app.use(express.json());

// 请求日志
app.use((req, res, next) => {
    const ts = new Date().toLocaleTimeString('zh-CN');
    console.log(`[${ts}] ${req.method} ${req.url}`);
    next();
});

// ============================================================
// API 路由（优先匹配）
// ============================================================
app.use('/api', require('./routes/public'));
app.use('/api', require('./routes/chat'));
app.use('/api', require('./routes/admin'));

// ============================================================
// 静态文件（按路径区分公开站和管理后台）
// ============================================================

// 管理后台: /admin/* → admin/ 目录
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

// 公开站: /* → 项目根目录 (index.html, css/, js/, assets/)
app.use(express.static(path.join(__dirname, '..')));

// 管理后台 SPA 兜底: /admin/* 未匹配 → admin/index.html
app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'admin', 'index.html'));
});

// 公开站 SPA 兜底（可选，本项目是单页）
app.get('*', (req, res) => {
    // 排除 /admin 前缀
    if (req.path.startsWith('/admin')) {
        return res.status(404).send('Not Found');
    }
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ============================================================
// 启动（监听所有网络接口，允许局域网内其他设备访问）
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
    const AI_KEY = process.env.AI_API_KEY || '';
    const AI_MODEL = process.env.AI_MODEL || 'deepseek-chat';
    const AI_BASE = process.env.AI_API_BASE || 'https://api.deepseek.com';

    // 获取本机局域网IP
    const os = require('os');
    const interfaces = os.networkInterfaces();
    let localIP = '';
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                localIP = iface.address;
                break;
            }
        }
        if (localIP) break;
    }

    console.log('');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║   🏔️  AI 数字导游 - 后端服务             ║');
    console.log('╠════════════════════════════════════════════╣');
    console.log(`║   本机访问:  http://localhost:${PORT}           ║`);
    if (localIP) {
        console.log(`║   局域网访问: http://${localIP}:${PORT}       ║`);
    }
    console.log(`║   管理后台:  /admin                          ║`);
    console.log(`║   模型:      ${AI_MODEL.padEnd(26)} ║`);
    console.log(`║   API Key:   ${(AI_KEY ? '✅ 已配置' : '⚠️  未配置').padEnd(24)} ║`);
    console.log('╚════════════════════════════════════════════╝');
    console.log('');

    if (!AI_KEY) {
        console.log('⚠️  请先配置 API Key：');
        console.log('   1. 复制 server/.env.example 为 server/.env');
        console.log('   2. 填入你的 AI_API_KEY');
        console.log('   3. 重启服务\n');
    }

    console.log('🔑 默认管理员: admin / admin123');
    if (localIP) {
        console.log(`📱 手机/其他设备访问: http://${localIP}:${PORT}\n`);
    } else {
        console.log('');
    }
});

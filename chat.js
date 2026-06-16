/**
 * AI 对话路由（从原 index.js 抽出，加入敏感词过滤和DB提示词）
 */
const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// AI 配置
const AI_CONFIG = {
    get apiKey() { return process.env.AI_API_KEY || ''; },
    get apiBase() { return process.env.AI_API_BASE || 'https://api.deepseek.com'; },
    get model() { return process.env.AI_MODEL || 'deepseek-chat'; },
    get maxTokens() { return parseInt(process.env.AI_MAX_TOKENS || '800'); },
    get temperature() { return parseFloat(process.env.AI_TEMPERATURE || '0.8'); },
};

/**
 * 从数据库获取系统提示词模板，注入景区信息
 */
function buildSystemPrompt(sceneId) {
    const db = getDb();

    // 读取提示词模板
    const promptRow = db.prepare("SELECT value FROM site_config WHERE key = 'system_prompt'").get();
    const template = promptRow ? promptRow.value : getFallbackPrompt();

    // 读取回复风格
    const styleRow = db.prepare("SELECT value FROM site_config WHERE key = 'reply_style'").get();
    const style = styleRow ? styleRow.value : '热情幽默';

    // 读取景区信息
    let sceneName = '景区';
    let sceneInfo = '';
    if (sceneId) {
        const scene = db.prepare('SELECT * FROM scenes WHERE id = ?').get(sceneId);
        if (scene) {
            sceneName = scene.name;
            let tags = [];
            try { tags = JSON.parse(scene.tags); } catch {}
            sceneInfo = `${scene.name}\n${scene.intro}\n\n特色标签：${tags.join('、')}`;
        }
    }

    // 替换占位符
    return template
        .replace(/\{scene_name\}/g, sceneName)
        .replace(/\{scene_info\}/g, sceneInfo || `${sceneName}是一个风景优美的景区`)
        .replace(/\{reply_style\}/g, style);
}

function getFallbackPrompt() {
    return `你是一个专业的景区AI数字导游，名叫"小游"。你正在为用户介绍{scene_name}。

## 你的角色
- 热情、博学、幽默的导游
- 回答简洁有条理，控制在200字以内
- 适当使用emoji表情

## 景区信息
{scene_info}

## 回答规则
1. 以导游身份回答，语气亲切友好
2. 问题与景区无关时，礼貌引导回景区话题
3. 推荐相关景点、路线、美食
4. 安全问题给出负责任建议`;
}

/**
 * 敏感词检查
 */
function checkSensitiveWords(text) {
    const db = getDb();
    const words = db.prepare('SELECT word FROM sensitive_words WHERE is_active = 1').all();
    const lowerText = text.toLowerCase();
    for (const { word } of words) {
        if (lowerText.includes(word.toLowerCase())) {
            return word;
        }
    }
    return null;
}

/**
 * 调用 AI API（非流式）
 */
async function callAI(messages) {
    const url = `${AI_CONFIG.apiBase}/v1/chat/completions`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
        },
        body: JSON.stringify({
            model: AI_CONFIG.model,
            messages,
            max_tokens: AI_CONFIG.maxTokens,
            temperature: AI_CONFIG.temperature,
            stream: false,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI API 错误 (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '（AI 未返回有效回答）';
}

// POST /api/chat - 非流式对话
router.post('/chat', async (req, res) => {
    try {
        if (!AI_CONFIG.apiKey) {
            return res.status(500).json({ error: 'API Key 未配置' });
        }

        const { messages, scene } = req.body;
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: '请提供有效的对话消息' });
        }

        // 敏感词检查（检查最后一条用户消息）
        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
        if (lastUserMsg) {
            const hit = checkSensitiveWords(lastUserMsg.content);
            if (hit) {
                return res.json({
                    reply: '抱歉，你的问题中包含了不合适的内容，请重新提问 🙏\n\n作为景区AI导游，我很乐意为你解答关于景区旅游、历史文化、自然风光等方面的问题！',
                });
            }
        }

        // 构建完整消息列表（系统提示词 + 对话历史）
        const systemPrompt = buildSystemPrompt(scene);
        const fullMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.slice(-12), // 保留最近12轮
        ];

        const aiResponse = await callAI(fullMessages);
        res.json({ reply: aiResponse });

    } catch (error) {
        console.error('AI API 调用失败:', error.message);
        if (error.message.includes('401')) {
            return res.status(500).json({ error: 'API Key 无效' });
        }
        res.status(500).json({ error: 'AI 服务暂时不可用' });
    }
});

// POST /api/chat/stream - 流式对话 (SSE)
router.post('/chat/stream', async (req, res) => {
    try {
        if (!AI_CONFIG.apiKey) {
            return res.status(500).json({ error: 'API Key 未配置' });
        }

        const { messages, scene } = req.body;
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: '请提供有效的对话消息' });
        }

        // 敏感词检查
        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
        if (lastUserMsg) {
            const hit = checkSensitiveWords(lastUserMsg.content);
            if (hit) {
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.write(`data: ${JSON.stringify({ content: '抱歉，你的问题中包含了不合适的内容 🙏' })}\n\n`);
                res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
                return res.end();
            }
        }

        const systemPrompt = buildSystemPrompt(scene);
        const fullMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.slice(-12),
        ];

        // SSE 响应头
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        await callAIStream(fullMessages, res);

    } catch (error) {
        console.error('流式调用失败:', error.message);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        } else {
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
            res.end();
        }
    }
});

/**
 * 调用 AI API（流式 SSE）
 */
async function callAIStream(messages, res) {
    const url = `${AI_CONFIG.apiBase}/v1/chat/completions`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
        },
        body: JSON.stringify({
            model: AI_CONFIG.model,
            messages,
            max_tokens: AI_CONFIG.maxTokens,
            temperature: AI_CONFIG.temperature,
            stream: true,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI API 错误 (${response.status}): ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;

                const data = trimmed.slice(6);
                if (data === '[DONE]') continue;

                try {
                    const parsed = JSON.parse(data);
                    const delta = parsed.choices?.[0]?.delta?.content;
                    if (delta) {
                        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
                    }
                } catch { /* skip unparseable lines */ }
            }
        }
    } finally {
        reader.releaseLock();
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
}

module.exports = router;

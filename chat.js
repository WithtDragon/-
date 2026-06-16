/**
 * AI 对话管理器
 * 处理与后端AI的实时交互
 */
class ChatManager {
    constructor() {
        // DOM 元素
        this.messagesContainer = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.clearBtn = document.getElementById('clearChatBtn');
        this.typingHint = document.getElementById('typingHint');
        this.quickChips = document.getElementById('quickChips');

        // 状态
        this.isProcessing = false;
        this.conversationHistory = [];
        this.currentScene = 'huangshan';

        // API 配置
        this.apiBase = '/api/chat';  // 后端代理地址

        // 初始化
        this.initEventListeners();
    }

    /**
     * 初始化事件监听
     */
    initEventListeners() {
        // 发送按钮
        this.sendBtn.addEventListener('click', () => this.sendMessage());

        // 回车发送
        this.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // 清空对话
        this.clearBtn.addEventListener('click', () => this.clearChat());

        // 快捷问题点击
        this.quickChips.addEventListener('click', (e) => {
            if (e.target.classList.contains('chip')) {
                const question = e.target.textContent;
                this.chatInput.value = question;
                this.sendMessage();
            }
        });
    }

    /**
     * 发送消息
     */
    async sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message || this.isProcessing) return;

        // 清空输入框
        this.chatInput.value = '';
        this.chatInput.focus();

        // 添加用户消息
        this.addMessage('user', message);
        this.conversationHistory.push({ role: 'user', content: message });

        // 显示处理状态
        this.setProcessing(true);

        try {
            const aiResponse = await this.callAI(message);
            this.addMessage('ai', aiResponse);
            this.conversationHistory.push({ role: 'assistant', content: aiResponse });

            // 触发语音播报
            if (speechManager.isEnabled) {
                speechManager.speak(aiResponse, {
                    rate: 1.05,
                    onStart: () => avatarController.setSpeaking(true),
                    onEnd: () => avatarController.setSpeaking(false),
                });
            }
        } catch (error) {
            console.error('AI 请求失败:', error);
            this.addMessage('ai', '抱歉，我暂时无法回答你的问题 😥\n\n可能原因：\n1. API 服务未启动（请检查后端服务）\n2. 网络连接异常\n3. API Key 未配置或已过期\n\n请稍后重试，或联系管理员检查服务状态。');
        } finally {
            this.setProcessing(false);
        }
    }

    /**
     * 调用后端 AI API（提示词由服务端从数据库构建）
     */
    async callAI(message) {
        // 只发送对话历史 + 当前景区ID，服务端负责拼接系统提示词
        const messages = [
            ...this.conversationHistory.slice(-10),
            { role: 'user', content: message }
        ];

        const response = await fetch(this.apiBase, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages, scene: this.currentScene }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        return data.reply || '抱歉，我没有理解你的问题，能换个方式问吗？';
    }

    /**
     * 设置当前景区
     */
    setScene(sceneId) {
        this.currentScene = sceneId;
        // 切换景区时清空对话历史
        this.conversationHistory = [];
        this.clearChat(true);
    }

    /**
     * 添加消息到对话区
     */
    addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = role === 'ai' ? '🤖' : '👤';

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';

        // 简单的 Markdown 渲染
        bubble.innerHTML = this.renderMarkdown(content);

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(bubble);
        this.messagesContainer.appendChild(messageDiv);

        // 滚动到底部
        this.scrollToBottom();

        return messageDiv;
    }

    /**
     * 简单的 Markdown 转 HTML
     */
    renderMarkdown(text) {
        let html = text
            // 粗体
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            // 斜体
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            // 行内代码
            .replace(/`(.+?)`/g, '<code>$1</code>')
            // 换行转段落
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');

        // 包装段落
        html = '<p>' + html + '</p>';

        // 简单的列表处理
        html = html.replace(/<p>- (.+?)<\/p>/g, '<p>• $1</p>');
        html = html.replace(/<p>(\d+)\. (.+?)<\/p>/g, '<p>$1. $2</p>');

        return html;
    }

    /**
     * 设置处理状态
     */
    setProcessing(processing) {
        this.isProcessing = processing;
        this.sendBtn.disabled = processing;
        this.chatInput.disabled = processing;

        if (processing) {
            this.typingHint.classList.add('visible');
            avatarController.setThinking(true);
        } else {
            this.typingHint.classList.remove('visible');
            avatarController.setThinking(false);
        }
    }

    /**
     * 清空对话
     */
    clearChat(silent = false) {
        // 保留欢迎消息
        const welcome = this.messagesContainer.querySelector('.chat-welcome');
        this.messagesContainer.innerHTML = '';
        if (welcome && !silent) {
            this.messagesContainer.appendChild(welcome);
        } else if (!silent) {
            // 重建欢迎消息
            this.showWelcomeMessage();
        }
        this.conversationHistory = [];
    }

    /**
     * 显示欢迎消息
     */
    showWelcomeMessage(sceneName = '黄山') {
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'chat-welcome';
        welcomeDiv.innerHTML = `
            <div class="welcome-avatar">🤖</div>
            <div class="welcome-text">
                <p class="welcome-greeting">你好！我是你的AI数字导游 <strong>小游</strong> 🎉</p>
                <p>我对<strong>${sceneName}</strong>了如指掌！你可以问我任何关于景区的问题——历史文化、游览路线、特色美食、最佳时间……我随时为你解答！</p>
            </div>
        `;
        this.messagesContainer.appendChild(welcomeDiv);
    }

    /**
     * 更新欢迎消息中的景区名
     */
    updateWelcomeScene(sceneName) {
        const welcomeScene = document.getElementById('welcomeScene');
        if (welcomeScene) {
            welcomeScene.textContent = sceneName;
        }
    }

    /**
     * 滚动到底部
     */
    scrollToBottom() {
        setTimeout(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }, 50);
    }
}

// 全局实例
const chatManager = new ChatManager();

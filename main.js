/**
 * 主应用控制器
 * 管理景区数据（从API加载）、主题切换、粒子背景、应用初始化
 */
class App {
    constructor() {
        // 景区数据（异步加载）
        this.sceneData = {};
        this.sceneList = [];

        // DOM 元素
        this.sceneSelect = document.getElementById('sceneSelect');
        this.sceneName = document.getElementById('sceneName');
        this.sceneBadge = document.getElementById('sceneBadge');
        this.sceneIntro = document.getElementById('sceneIntro');
        this.sceneTags = document.getElementById('sceneTags');
        this.sceneImage = document.getElementById('sceneImage');
        this.themeToggle = document.getElementById('themeToggle');
        this.toggleVoiceBtn = document.getElementById('toggleVoiceBtn');
        this.particleCanvas = document.getElementById('particleCanvas');
        this.quickChips = document.getElementById('quickChips');

        // 粒子系统
        this.particles = [];
        this.particleCount = 80;
        this.ctx = null;

        // 初始化
        this.init();
    }

    /**
     * 应用初始化
     */
    async init() {
        this.initParticles();
        this.initTheme();
        this.initVoiceToggle();
        this.initKeyboardShortcuts();

        // 从 API 加载数据
        await this.loadScenes();
        await this.loadQuestions();
        this.initSceneSelector();

        // 加载默认景区（第一个）
        const defaultScene = this.sceneList[0]?.id || 'huangshan';
        if (this.sceneData[defaultScene]) {
            this.loadScene(defaultScene);
        }

        // 播放欢迎动画
        setTimeout(() => {
            avatarController.playWelcomeAnimation();
        }, 500);

        // 窗口尺寸变化时更新粒子画布
        window.addEventListener('resize', () => this.resizeCanvas());

        console.log('🏔️ AI 数字导游已就绪！');
        console.log(`   ${this.sceneList.length} 个景区已加载`);
    }

    /**
     * 从 API 加载景区数据
     */
    async loadScenes() {
        try {
            const res = await fetch('/api/scenes');
            const data = await res.json();
            this.sceneList = data.scenes;
            this.sceneData = {};
            data.scenes.forEach(s => {
                this.sceneData[s.id] = s;
            });
            // 动态填充下拉框
            this.populateSceneSelector();
        } catch (err) {
            console.warn('⚠️ 无法加载景区数据，使用默认数据:', err.message);
            // 降级：保留下拉框中已有的 option
        }
    }

    /**
     * 动态填充景区下拉框
     */
    populateSceneSelector() {
        // 清空现有选项
        this.sceneSelect.innerHTML = '';
        this.sceneList.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = `${s.emoji} ${s.name}`;
            this.sceneSelect.appendChild(opt);
        });
    }

    /**
     * 从 API 加载快捷问题
     */
    async loadQuestions() {
        try {
            const res = await fetch('/api/questions');
            const data = await res.json();
            if (data.questions && data.questions.length > 0) {
                this.renderQuickQuestions(data.questions);
            }
        } catch (err) {
            console.warn('⚠️ 无法加载快捷问题:', err.message);
        }
    }

    /**
     * 动态渲染快捷问题按钮
     */
    renderQuickQuestions(questions) {
        this.quickChips.innerHTML = '';
        questions.forEach(q => {
            const btn = document.createElement('button');
            btn.className = 'chip';
            btn.textContent = q.question;
            this.quickChips.appendChild(btn);
        });
    }

    /**
     * 初始化粒子背景
     */
    initParticles() {
        this.ctx = this.particleCanvas.getContext('2d');
        this.resizeCanvas();
        this.createParticles();
        this.animateParticles();
    }

    resizeCanvas() {
        this.particleCanvas.width = window.innerWidth;
        this.particleCanvas.height = window.innerHeight;
    }

    createParticles() {
        this.particles = [];
        const count = Math.floor((window.innerWidth * window.innerHeight) / 15000);
        this.particleCount = Math.min(count, 100);

        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.particleCanvas.width,
                y: Math.random() * this.particleCanvas.height,
                radius: Math.random() * 2 + 1,
                speedX: (Math.random() - 0.5) * 0.3,
                speedY: (Math.random() - 0.5) * 0.3,
                opacity: Math.random() * 0.5 + 0.2,
                pulse: Math.random() * Math.PI * 2,
                pulseSpeed: Math.random() * 0.02 + 0.01,
            });
        }
    }

    animateParticles() {
        if (!this.ctx) return;

        this.ctx.clearRect(0, 0, this.particleCanvas.width, this.particleCanvas.height);

        const isLight = document.documentElement.getAttribute('data-theme') === 'light';

        this.particles.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY;
            p.pulse += p.pulseSpeed;

            if (p.x < -10) p.x = this.particleCanvas.width + 10;
            if (p.x > this.particleCanvas.width + 10) p.x = -10;
            if (p.y < -10) p.y = this.particleCanvas.height + 10;
            if (p.y > this.particleCanvas.height + 10) p.y = -10;

            const currentOpacity = p.opacity + Math.sin(p.pulse) * 0.15;

            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

            if (isLight) {
                this.ctx.fillStyle = `rgba(100, 116, 139, ${currentOpacity * 0.6})`;
            } else {
                this.ctx.fillStyle = `rgba(148, 163, 184, ${currentOpacity})`;
            }

            this.ctx.fill();
        });

        // 绘制连线
        this.particles.forEach((p1, i) => {
            this.particles.slice(i + 1).forEach(p2 => {
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 120) {
                    const lineOpacity = (1 - dist / 120) * 0.12;
                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    if (isLight) {
                        this.ctx.strokeStyle = `rgba(100, 116, 139, ${lineOpacity * 0.6})`;
                    } else {
                        this.ctx.strokeStyle = `rgba(148, 163, 184, ${lineOpacity})`;
                    }
                    this.ctx.stroke();
                }
            });
        });

        requestAnimationFrame(() => this.animateParticles());
    }

    /**
     * 初始化主题
     */
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);

        this.themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            this.showToast(newTheme === 'light' ? '☀️ 已切换到亮色主题' : '🌙 已切换到暗色主题');
        });
    }

    /**
     * 初始化景区选择器
     */
    initSceneSelector() {
        this.sceneSelect.addEventListener('change', (e) => {
            const sceneId = e.target.value;
            this.loadScene(sceneId);
            chatManager.setScene(sceneId);

            const scene = this.sceneData[sceneId];
            if (scene) {
                chatManager.updateWelcomeScene(scene.name);
                document.getElementById('welcomeScene').textContent = scene.name;
                this.showToast(`📍 已切换到：${scene.name}`);
                // 重新加载该景区的快捷问题
                this.loadQuestionsForScene(sceneId);
            }
        });
    }

    /**
     * 加载特定景区的快捷问题
     */
    async loadQuestionsForScene(sceneId) {
        try {
            const res = await fetch(`/api/questions?scene_id=${sceneId}`);
            const data = await res.json();
            if (data.questions && data.questions.length > 0) {
                this.renderQuickQuestions(data.questions);
            }
        } catch (err) {
            // 静默失败
        }
    }

    /**
     * 加载景区数据到界面
     */
    loadScene(sceneId) {
        const scene = this.sceneData[sceneId];
        if (!scene) return;

        this.sceneName.textContent = scene.name;
        this.sceneBadge.textContent = scene.badge;
        this.sceneIntro.innerHTML = scene.intro
            .split('\n\n')
            .map(p => `<p>${p.trim()}</p>`)
            .join('');

        this.sceneTags.innerHTML = (scene.tags || [])
            .map(tag => `<span class="tag">${tag}</span>`)
            .join('');

        this.sceneImage.innerHTML = `<div class="image-placeholder">${scene.emoji}</div>`;
        document.getElementById('welcomeScene').textContent = scene.name;

        this.speakIntro(scene);
    }

    /**
     * 朗读景区介绍
     */
    speakIntro(scene) {
        if (!speechManager.isEnabled) return;

        const introText = `欢迎来到${scene.name}！${scene.intro.replace(/\n\n/g, '。').replace(/\n/g, '')}`;
        const shortIntro = introText.substring(0, 200);

        speechManager.speak(shortIntro, {
            rate: 0.95,
            onStart: () => avatarController.setSpeaking(true),
            onEnd: () => avatarController.setSpeaking(false),
        });
    }

    /**
     * 初始化语音开关
     */
    initVoiceToggle() {
        this.toggleVoiceBtn.addEventListener('click', () => {
            const enabled = speechManager.toggle();
            this.toggleVoiceBtn.querySelector('.icon').textContent = enabled ? '🔊' : '🔇';
            this.toggleVoiceBtn.title = enabled ? '语音播报（已开启）' : '语音播报（已关闭）';
            this.showToast(enabled ? '🔊 语音播报已开启' : '🔇 语音播报已关闭');
        });
    }

    /**
     * 初始化键盘快捷键
     */
    initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('chatInput').focus();
            }
            if (e.key === 'Escape') {
                speechManager.stop();
                avatarController.setSpeaking(false);
            }
        });
    }

    /**
     * 显示 Toast 提示
     */
    showToast(message, type = '') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'toast ' + type + ' show';

        clearTimeout(this._toastTimeout);
        this._toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }
}

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});

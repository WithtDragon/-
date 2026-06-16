/**
 * 语音合成管理器
 * 使用浏览器 Web Speech API 实现文字转语音
 */
class SpeechManager {
    constructor() {
        this.synth = window.speechSynthesis;
        this.utterance = null;
        this.isSpeaking = false;
        this.isEnabled = true; // 默认开启
        this.voice = null;
        this.voicesLoaded = false;

        // 初始化语音列表
        this.initVoices();
    }

    /**
     * 初始化语音列表
     */
    initVoices() {
        const voices = this.synth.getVoices();
        if (voices.length > 0) {
            this.selectBestVoice(voices);
            this.voicesLoaded = true;
        }

        // 某些浏览器异步加载voices
        this.synth.onvoiceschanged = () => {
            const voices = this.synth.getVoices();
            if (!this.voicesLoaded && voices.length > 0) {
                this.selectBestVoice(voices);
                this.voicesLoaded = true;
            }
        };
    }

    /**
     * 选择最佳中文语音
     */
    selectBestVoice(voices) {
        // 优先级：中文普通话女声 > 中文普通话 > 中文 > 默认
        const preferred = [
            'Tingting', 'Yaoyao', 'Microsoft Huihui', 'Google 普通话',
            'zh-CN', 'zh-TW', 'zh-HK', 'zh'
        ];

        for (const keyword of preferred) {
            const match = voices.find(v =>
                v.name.includes(keyword) || v.lang.includes(keyword)
            );
            if (match) {
                this.voice = match;
                return;
            }
        }

        // 尝试找任何中文语音
        const anyChinese = voices.find(v => v.lang.startsWith('zh'));
        if (anyChinese) {
            this.voice = anyChinese;
        }
    }

    /**
     * 朗读文本
     * @param {string} text - 要朗读的文本
     * @param {Object} options - 配置选项
     * @param {number} options.rate - 语速 0.1-10，默认1
     * @param {number} options.pitch - 音调 0-2，默认1
     * @param {Function} options.onStart - 开始回调
     * @param {Function} options.onEnd - 结束回调
     * @param {Function} options.onPause - 暂停回调
     */
    speak(text, options = {}) {
        if (!this.isEnabled) return;

        // 取消当前朗读
        this.stop();

        // 清理长文本（去掉markdown符号）
        const cleanText = this.cleanText(text);
        if (!cleanText.trim()) return;

        this.utterance = new SpeechSynthesisUtterance(cleanText);
        this.utterance.rate = options.rate || 1.0;
        this.utterance.pitch = options.pitch || 1.1;
        this.utterance.volume = 1;

        if (this.voice) {
            this.utterance.voice = this.voice;
        }

        // 设置语言
        this.utterance.lang = 'zh-CN';

        // 事件回调
        this.utterance.onstart = () => {
            this.isSpeaking = true;
            if (options.onStart) options.onStart();
        };

        this.utterance.onend = () => {
            this.isSpeaking = false;
            this.utterance = null;
            if (options.onEnd) options.onEnd();
        };

        this.utterance.onpause = () => {
            this.isSpeaking = false;
            if (options.onPause) options.onPause();
        };

        this.utterance.onerror = (e) => {
            // 忽略取消导致的错误
            if (e.error !== 'canceled' && e.error !== 'interrupted') {
                console.warn('语音合成错误:', e.error);
            }
            this.isSpeaking = false;
            this.utterance = null;
            if (options.onEnd) options.onEnd();
        };

        this.synth.speak(this.utterance);
    }

    /**
     * 停止朗读
     */
    stop() {
        if (this.synth.speaking || this.synth.pending) {
            this.synth.cancel();
        }
        this.isSpeaking = false;
        this.utterance = null;
    }

    /**
     * 暂停朗读
     */
    pause() {
        if (this.synth.speaking) {
            this.synth.pause();
        }
    }

    /**
     * 继续朗读
     */
    resume() {
        if (this.synth.paused) {
            this.synth.resume();
        }
    }

    /**
     * 切换语音开关
     */
    toggle() {
        this.isEnabled = !this.isEnabled;
        if (!this.isEnabled) {
            this.stop();
        }
        return this.isEnabled;
    }

    /**
     * 清理文本（移除Markdown和特殊字符）
     */
    cleanText(text) {
        return text
            .replace(/[*_~`#>\[\]()|]/g, '')  // 移除markdown符号
            .replace(/\n{2,}/g, '。')          // 多换行转句号
            .replace(/\n/g, '')                 // 单换行移除
            .replace(/\s{2,}/g, ' ')            // 多余空格
            .replace(/!\[.*?\]\(.*?\)/g, '')    // 图片链接
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 链接保留文字
            .trim();
    }
}

// 全局实例
const speechManager = new SpeechManager();

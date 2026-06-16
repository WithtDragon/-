/**
 * 数字人形象动画控制器
 * 控制虚拟导游的面部表情和动画效果
 */
class AvatarController {
    constructor() {
        // DOM 元素
        this.mouth = document.getElementById('avatarMouth');
        this.statusEl = document.getElementById('avatarStatus');
        this.voiceWaves = document.getElementById('voiceWaves');
        this.avatarWrapper = document.getElementById('avatarWrapper');
        this.pupils = document.querySelectorAll('.pupil');

        // 状态
        this.isSpeaking = false;
        this.isThinking = false;
        this.speakInterval = null;
        this.idleInterval = null;

        // 初始化
        this.initIdleBehavior();
        this.initMouseTracking();
    }

    /**
     * 设置说话状态
     */
    setSpeaking(speaking) {
        this.isSpeaking = speaking;
        if (speaking) {
            this.mouth.classList.add('speaking');
            this.voiceWaves.classList.add('active');
            this.startSpeakingAnimation();
        } else {
            this.mouth.classList.remove('speaking');
            this.voiceWaves.classList.remove('active');
            this.stopSpeakingAnimation();
        }
    }

    /**
     * 设置思考状态
     */
    setThinking(thinking) {
        this.isThinking = thinking;
        if (thinking) {
            this.statusEl.className = 'avatar-status thinking';
            this.statusEl.querySelector('.status-text').textContent = '思考中...';
        } else {
            this.statusEl.className = 'avatar-status';
            this.statusEl.querySelector('.status-text').textContent = '在线待命';
        }
    }

    /**
     * 说话时的额外动画
     */
    startSpeakingAnimation() {
        // 头部微微晃动
        if (this.avatarWrapper) {
            this.avatarWrapper.style.animation = 'headNod 0.6s ease-in-out infinite alternate';
        }
    }

    stopSpeakingAnimation() {
        if (this.avatarWrapper) {
            this.avatarWrapper.style.animation = '';
        }
    }

    /**
     * 空闲行为：随机眨眼、微动
     */
    initIdleBehavior() {
        this.idleInterval = setInterval(() => {
            if (!this.isSpeaking && !this.isThinking) {
                this.randomBlink();
            }
        }, 3000 + Math.random() * 4000);
    }

    randomBlink() {
        const eyes = document.querySelectorAll('.eye');
        eyes.forEach(eye => {
            eye.style.animation = 'none';
            eye.offsetHeight; // 触发回流
            eye.style.animation = 'blink 0.15s ease-in-out';
            setTimeout(() => {
                eye.style.animation = 'blink 4s ease-in-out infinite';
            }, 150);
        });
    }

    /**
     * 鼠标跟踪：眼睛跟随鼠标
     */
    initMouseTracking() {
        document.addEventListener('mousemove', (e) => {
            if (this.isSpeaking) return; // 说话时不跟踪

            const avatarRect = this.avatarWrapper?.getBoundingClientRect();
            if (!avatarRect) return;

            const avatarCenterX = avatarRect.left + avatarRect.width / 2;
            const avatarCenterY = avatarRect.top + avatarRect.height / 2;

            // 计算鼠标相对于头像中心的位置
            const deltaX = (e.clientX - avatarCenterX) / window.innerWidth;
            const deltaY = (e.clientY - avatarCenterY) / window.innerHeight;

            // 限制瞳孔移动范围
            const maxMove = 3;
            const moveX = Math.max(-maxMove, Math.min(maxMove, deltaX * maxMove * 8));
            const moveY = Math.max(-maxMove, Math.min(maxMove, deltaY * maxMove * 8));

            this.pupils.forEach(pupil => {
                pupil.style.transform = `translate(${moveX}px, ${moveY}px)`;
                pupil.style.transition = 'transform 0.2s ease-out';
            });
        });
    }

    /**
     * 播放欢迎动画
     */
    playWelcomeAnimation() {
        // 头像弹跳
        if (this.avatarWrapper) {
            this.avatarWrapper.style.animation = 'none';
            this.avatarWrapper.offsetHeight;
            this.avatarWrapper.style.animation = 'avatarBounce 0.8s ease-out';
            setTimeout(() => {
                this.avatarWrapper.style.animation = '';
            }, 800);
        }
    }

    /**
     * 销毁（清理定时器）
     */
    destroy() {
        if (this.idleInterval) clearInterval(this.idleInterval);
        if (this.speakInterval) clearInterval(this.speakInterval);
    }
}

// 添加头像弹跳动画的keyframes
const avatarBounceStyle = document.createElement('style');
avatarBounceStyle.textContent = `
    @keyframes avatarBounce {
        0% { transform: scale(1); }
        30% { transform: scale(1.08); }
        50% { transform: scale(0.95); }
        70% { transform: scale(1.03); }
        100% { transform: scale(1); }
    }

    @keyframes headNod {
        0% { transform: rotate(-2deg); }
        100% { transform: rotate(2deg); }
    }
`;
document.head.appendChild(avatarBounceStyle);

// 全局实例
const avatarController = new AvatarController();

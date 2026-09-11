// Music Player for YouTube
const KEY_MUSIC_HISTORY = 'musicHistory';
const MUSIC_HISTORY_MAX = 5;
const DEFAULT_MUSIC_URL = 'https://youtu.be/DAbQVE8tkOM?si=t_3O8a3IIbQzQN2o';

class MusicPlayer {
    constructor() {
        this.currentUrl = '';
        this.player = null;
        this.isLoopEnabled = false;
        this.currentTime = 0;
        this.history = []; // { url, videoId, title }

        this.init();
    }

    init() {
        this.setupYouTubeAPI();
        this.bindEvents();
        this.loadSavedMusic();
    }

    bindEvents() {
        const musicBtn = document.getElementById('music-open');
        musicBtn.addEventListener('click', () => {
            this.openModal();
        });

        const closeBtn = document.getElementById('music-close-button');
        closeBtn.addEventListener('click', () => {
            this.closeModal();
        });

        const urlInput = document.getElementById('music-url-input');
        urlInput.addEventListener('input', () => {
            this.validateUrl(urlInput.value);
            this.adjustInputWidth(urlInput);
        });

        // Add focus events to pause/resume auto-collapse timer
        urlInput.addEventListener('focus', () => {
            this.pauseAutoCollapse();
        });

        urlInput.addEventListener('blur', () => {
            this.resumeAutoCollapse();
        });

        const clearBtn = document.getElementById('music-clear-btn');
        clearBtn.addEventListener('click', () => {
            this.clearUrlInput();
            urlInput.focus();
        });

        const playBtn = document.getElementById('music-play-btn');
        playBtn.addEventListener('click', () => {
            if (!playBtn.disabled) {
                this.loadMusic();
            }
        });

        const loopBtn = document.getElementById('music-loop-btn');
        loopBtn.addEventListener('click', () => {
            this.toggleLoop();
        });

        // Add hover events for controls
        const controls = document.querySelector('.music-controls');
        controls.addEventListener('mouseenter', () => {
            this.expandControls();
        });

        controls.addEventListener('mouseleave', () => {
            this.startAutoCollapse();
        });
    }

    openModal() {
        const modal = document.getElementById('music-modal');
        modal.style.display = 'block';

        // 반투명 모드에서 할일 목록·인사말 감추기 (다른 모달과 동일)
        document.getElementById('right').style.visibility = 'hidden';
        document.getElementById('greeting').style.visibility = 'hidden';
        
        const urlInput = document.getElementById('music-url-input');
        urlInput.value = this.currentUrl;
        
        this.adjustInputWidth(urlInput);
        if (this.currentUrl) {
            this.validateUrl(this.currentUrl);
        }
        
        // Start auto-collapse timer
        this.startAutoCollapse();
    }

    closeModal() {
        const modal = document.getElementById('music-modal');
        
        // Clear timer when closing modal
        if (this.collapseTimer) {
            clearTimeout(this.collapseTimer);
        }
        
        modal.style.display = 'none';

        // 할일 목록·인사말 다시 표시
        document.getElementById('right').style.visibility = 'visible';
        document.getElementById('greeting').style.visibility = 'visible';
    }

    validateYouTubeUrl(url) {
        // YouTube URL patterns
        const patterns = [
            /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
            /^https?:\/\/(www\.)?youtube\.com\/live\/[\w-]+/,
            /^https?:\/\/(www\.)?youtube\.com\/[\w-]+/,
            /^https?:\/\/youtu\.be\/[\w-]+/
        ];

        return patterns.some(pattern => pattern.test(url));
    }

    extractVideoId(url) {
        // Extract video ID from YouTube URL formats
        const patterns = [
            /[?&]v=([^&]+)/,
            /\/live\/([^?]+)/,
            /youtu\.be\/([^?]+)/
        ];

        for (let pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }
        return null;
    }

    validateUrl(url) {
        const messageElement = document.getElementById('music-message-text');
        const playBtn = document.getElementById('music-play-btn');
        const playIcon = playBtn.querySelector('ion-icon');
        
        if (!url.trim() || !this.validateYouTubeUrl(url) || !this.extractVideoId(url)) {
            messageElement.innerHTML = '<ion-icon name="logo-youtube"></ion-icon>YouTube > [Share] > [Copy] > [Paste]';
            messageElement.className = 'music-message-text';
            playBtn.disabled = true;
            playIcon.setAttribute('name', 'link');
            return false;
        }

        messageElement.textContent = 'Only the pure in heart can make a good soup -Ludwig Van Beethoven-';
        messageElement.className = 'music-message-text success';
        playBtn.disabled = false;
        playIcon.setAttribute('name', 'play-circle-outline');
        return true;
    }

    loadMusic() {
        const urlInput = document.getElementById('music-url-input');
        const url = urlInput.value.trim();

        if (!url) {
            return;
        }

        if (!this.validateUrl(url)) {
            return;
        }

        const videoId = this.extractVideoId(url);
        
        // Save to localStorage
        this.currentUrl = url;
        localStorage.setItem('bgmusic', url);

        // 히스토리에 추가하고 목록을 다시 그린다 (제목은 onReady에서 채워진다)
        this.addToHistory(url, videoId);

        // Create or update player with current loop setting
        this.createPlayer(videoId, 0);
    }

    createPlayer(videoId, startTime = 0) {
        const container = document.getElementById('music-iframe-container');
        container.innerHTML = '';

        // Create player element
        const playerElement = document.createElement('div');
        playerElement.id = 'youtube-player';
        container.appendChild(playerElement);

        // Player configuration
        const playerConfig = {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: {
                autoplay: 1,
                controls: 1,
                modestbranding: 1,
                rel: 0,
                showinfo: 0,
                fs: 0,
                iv_load_policy: 3,
                cc_load_policy: 0,
                playsinline: 1,
                vq: 'hd1080',
                enablejsapi: 1
            },
            events: {
                onReady: (event) => {
                    console.log('Player ready');
                    if (startTime > 0) {
                        event.target.seekTo(startTime);
                    }
                    // 영상 제목이 준비되면 히스토리 항목에 채워 넣고 다시 그린다
                    if (typeof event.target.getVideoData === 'function') {
                        const data = event.target.getVideoData();
                        if (data && data.title) {
                            this.updateHistoryTitle(videoId, data.title);
                        }
                    }
                },
                onStateChange: (event) => {
                    // Update current time when state changes
                    if (event.data === 1) { // Playing
                        this.currentTime = event.target.getCurrentTime();
                    }
                }
            }
        };

        // Add loop parameters if enabled
        if (this.isLoopEnabled) {
            playerConfig.playerVars.loop = 1;
            playerConfig.playerVars.playlist = videoId;
        }

        // Create player
        this.player = new YT.Player('youtube-player', playerConfig);
    }

    adjustInputWidth(input) {
        const tempSpan = document.createElement('span');
        tempSpan.style.fontSize = window.getComputedStyle(input).fontSize;
        tempSpan.style.fontFamily = window.getComputedStyle(input).fontFamily;
        tempSpan.style.visibility = 'hidden';
        tempSpan.style.position = 'absolute';
        tempSpan.style.whiteSpace = 'pre';
        tempSpan.textContent = input.value || input.placeholder;
        
        document.body.appendChild(tempSpan);
        
        const textWidth = tempSpan.offsetWidth;
        const padding = 32;
        const minWidth = window.innerWidth * 0.24; // CSS min-width 24vw와 일치, 좁은 가로에서 넘침 방지
        const maxWidth = window.innerWidth * 0.8;
        
        let newWidth = Math.max(textWidth + padding, minWidth);
        newWidth = Math.min(newWidth, maxWidth);
        
        input.style.width = newWidth + 'px';
        
        document.body.removeChild(tempSpan);
    }

    startAutoCollapse() {
        // Clear existing timer
        if (this.collapseTimer) {
            clearTimeout(this.collapseTimer);
        }
        
        // Set new timer for 3 seconds
        this.collapseTimer = setTimeout(() => {
            this.collapseControls();
        }, 3000);
    }

    pauseAutoCollapse() {
        // Clear existing timer to pause auto-collapse
        if (this.collapseTimer) {
            clearTimeout(this.collapseTimer);
            this.collapseTimer = null;
        }
    }

    resumeAutoCollapse() {
        // Restart auto-collapse timer
        this.startAutoCollapse();
    }

    collapseControls() {
        const controls = document.querySelector('.music-controls');
        controls.classList.add('collapsed');
    }

    expandControls() {
        // Clear timer when expanding
        if (this.collapseTimer) {
            clearTimeout(this.collapseTimer);
        }
        
        const controls = document.querySelector('.music-controls');
        controls.classList.remove('collapsed');
    }

    getCurrentTime() {
        if (this.player && typeof this.player.getCurrentTime === 'function') {
            return this.player.getCurrentTime();
        }
        return this.currentTime || 0;
    }

    setupYouTubeAPI() {
        // Load YouTube IFrame API
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        
        // Set up global callback
        window.onYouTubeIframeAPIReady = () => {
            console.log('YouTube IFrame API Ready');
        };
    }

    toggleLoop() {
        // 1. 현재 재생 중인 시간을 가져온다
        const currentTime = this.getCurrentTime();
        console.log(currentTime);
        
        // 2. 루프 토글 옵션을 변경한다
        this.isLoopEnabled = !this.isLoopEnabled;
        
        const loopBtn = document.getElementById('music-loop-btn');
        if (this.isLoopEnabled) {
            loopBtn.classList.add('active');
        } else {
            loopBtn.classList.remove('active');
        }
        
        // 3. 저장된 시간과 새로운 루프 설정으로 영상을 다시 로드한다
        if (this.currentUrl && this.player) {
            const videoId = this.extractVideoId(this.currentUrl);
            if (videoId) {
                this.createPlayer(videoId, currentTime);
            }
        }
        
        // Save loop setting to localStorage
        localStorage.setItem('musicLoop', this.isLoopEnabled.toString());
    }

    loadSavedMusic() {
        const savedUrl = localStorage.getItem('bgmusic');
        if (savedUrl) {
            this.currentUrl = savedUrl;
        }

        // 저장된 히스토리 복원 (비어 있고 bgmusic만 있으면 그 URL로 한 줄 채움)
        this.loadHistory();

        // Load saved loop setting
        const savedLoop = localStorage.getItem('musicLoop');
        if (savedLoop) {
            this.isLoopEnabled = savedLoop === 'true';
            
            // Update button state
            const loopBtn = document.getElementById('music-loop-btn');
            if (this.isLoopEnabled) {
                loopBtn.classList.add('active');
            } else {
                loopBtn.classList.remove('active');
            }
        }
    }

    loadHistory() {
        const saved = localStorage.getItem(KEY_MUSIC_HISTORY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    this.history = parsed.slice(-MUSIC_HISTORY_MAX);
                }
            } catch (e) {
                this.history = [];
            }
        }

        // 처음 실행(저장된 URL·히스토리 없음)일 때 기본 YouTube 주소
        if (this.history.length === 0 && !this.currentUrl) {
            this.currentUrl = DEFAULT_MUSIC_URL;
        }

        // 히스토리가 비어 있고 URL이 있으면(저장값 또는 기본값) 목록에 한 줄을 채운다
        if (this.history.length === 0 && this.currentUrl) {
            const videoId = this.extractVideoId(this.currentUrl);
            if (videoId) {
                this.history.push({ url: this.currentUrl, videoId: videoId, title: '' });
            }
        }

        this.renderHistory();
    }

    saveHistory() {
        localStorage.setItem(KEY_MUSIC_HISTORY, JSON.stringify(this.history));
    }

    addToHistory(url, videoId) {
        // 같은 videoId는 제거해 중복하지 않고, 맨 아래(최근)로 옮긴다
        const existing = this.history.find((item) => item.videoId === videoId);
        const title = existing ? existing.title : '';
        this.history = this.history.filter((item) => item.videoId !== videoId);
        this.history.push({ url: url, videoId: videoId, title: title });
        this.history = this.history.slice(-MUSIC_HISTORY_MAX);
        this.saveHistory();
        this.renderHistory();
    }

    updateHistoryTitle(videoId, title) {
        const item = this.history.find((entry) => entry.videoId === videoId);
        if (item && item.title !== title) {
            item.title = title;
            this.saveHistory();
            this.renderHistory();
        }
    }

    renderHistory() {
        const list = document.getElementById('music-history');
        if (!list) {
            return;
        }
        list.innerHTML = '';

        // 최신(가장 최근 재생)이 맨 위, 과거 히스토리가 아래로 오도록 역순으로 그린다
        this.history.slice().reverse().forEach((item) => {
            const li = document.createElement('li');
            li.textContent = item.title || item.url;
            if (item.url === this.currentUrl) {
                li.classList.add('current');
            }
            li.addEventListener('click', () => {
                this.playFromHistory(item.url);
            });
            list.appendChild(li);
        });
    }

    playFromHistory(url) {
        const urlInput = document.getElementById('music-url-input');
        urlInput.value = url;
        this.validateUrl(url);
        this.adjustInputWidth(urlInput);
        this.loadMusic();
    }

    clearUrlInput() {
        const urlInput = document.getElementById('music-url-input');
        urlInput.value = '';
        this.validateUrl(''); // 안내 문구·재생 버튼 상태 초기화
        this.adjustInputWidth(urlInput);
    }
}

// Initialize music player when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MusicPlayer();
}); 
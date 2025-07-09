// Music Player for YouTube
class MusicPlayer {
    constructor() {
        this.currentUrl = '';
        this.player = null;
        this.isLoopEnabled = false;
        this.currentTime = 0;
        
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
            messageElement.innerHTML = 'I need some <ion-icon name="logo-youtube"></ion-icon>YouTube URL.';
            messageElement.className = 'music-message-text';
            playBtn.disabled = true;
            playIcon.setAttribute('name', 'alert-circle');
            return false;
        }

        messageElement.textContent = 'Only the pure in heart can make a good soup -Ludwig Van Beethoven-';
        messageElement.className = 'music-message-text success';
        playBtn.disabled = false;
        playIcon.setAttribute('name', 'play');
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
        const minWidth = 300;
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
}

// Initialize music player when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MusicPlayer();
}); 
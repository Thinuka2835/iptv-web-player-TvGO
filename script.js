document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;
    const channelList = document.getElementById('channel-list');
    const videoPlayer = document.getElementById('video-player');
    const currentChannelName = document.getElementById('current-channel-name');
    const currentStreamInfo = document.getElementById('current-stream-info');
    const channelSearch = document.getElementById('channel-search');
    const categoryBtns = document.querySelectorAll('.category-btn');

    let hls = null;
    let channels = [];

    // --- Theme Handling ---
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    });

    function setTheme(theme) {
        html.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        themeToggle.querySelector('.theme-icon').textContent = theme === 'light' ? '🌙' : '☀️';
    }

    // --- Category Handling ---
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            categoryBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');

            const category = btn.dataset.category;
            loadCategory(category);
        });
    });

    function loadCategory(category) {
        if (typeof PLAYLISTS !== 'undefined' && PLAYLISTS[category]) {
            parseM3U(PLAYLISTS[category]);
        } else {
            console.error('Category not found or PLAYLISTS not loaded:', category);
            channelList.innerHTML = '<div class="empty-state"><p>Category data not found.</p></div>';
        }
    }

    // --- M3U Parsing ---
    function parseM3U(content) {
        channels = [];
        const lines = content.split('\n');
        let currentChannel = {};

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.startsWith('#EXTINF:')) {
                // Parse metadata
                const info = line.substring(8);
                const commaIndex = info.lastIndexOf(',');
                const name = info.substring(commaIndex + 1).trim();
                const metadata = info.substring(0, commaIndex);

                // Extract logo if present
                const logoMatch = metadata.match(/tvg-logo="([^"]*)"/);
                const logo = logoMatch ? logoMatch[1] : null;

                currentChannel = { name, logo };
            } else if (line.startsWith('http')) {
                currentChannel.url = line;
                channels.push(currentChannel);
                currentChannel = {}; // Reset
            }
        }

        renderChannels(channels);
    }

    function renderChannels(channelData) {
        channelList.innerHTML = '';
        if (channelData.length === 0) {
            channelList.innerHTML = '<div class="empty-state"><p>No channels found.</p></div>';
            return;
        }

        channelData.forEach((channel, index) => {
            const item = document.createElement('div');
            item.className = 'channel-item';
            item.dataset.index = index;

            const logoHtml = channel.logo
                ? `<img src="${channel.logo}" class="channel-logo" onerror="this.style.display='none'">`
                : `<div class="channel-logo" style="display:flex;align-items:center;justify-content:center;">📺</div>`;

            item.innerHTML = `
                ${logoHtml}
                <span class="channel-name">${channel.name}</span>
            `;

            item.addEventListener('click', () => {
                document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                loadStream(channel.url, channel.name);
            });

            channelList.appendChild(item);
        });
    }

    // --- Search Functionality ---
    channelSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = channels.filter(ch => ch.name.toLowerCase().includes(query));
        renderChannels(filtered);
    });

    // --- Video Player (HLS.js) ---
    function loadStream(url, name) {
        currentChannelName.textContent = name;
        currentStreamInfo.textContent = "Loading stream...";

        if (Hls.isSupported()) {
            if (hls) {
                hls.destroy();
            }
            hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(videoPlayer);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                videoPlayer.play().catch(e => console.log("Auto-play prevented:", e));
                currentStreamInfo.textContent = "Live";
            });
            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    currentStreamInfo.textContent = "Error loading stream.";
                    console.error("HLS Error:", data);
                }
            });
        } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
            videoPlayer.src = url;
            videoPlayer.addEventListener('loadedmetadata', () => {
                videoPlayer.play();
                currentStreamInfo.textContent = "Live";
            });
        } else {
            currentStreamInfo.textContent = "HLS not supported in this browser.";
        }
    }

    // Load default category (Srilanka)
    // Find the button and simulate click or just load
    const defaultBtn = document.querySelector('.category-btn[data-category="srilanka"]');
    if (defaultBtn) {
        defaultBtn.click();
    }
});

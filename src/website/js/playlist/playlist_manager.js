/**
 * Playlist Manager for SpessaSynth
 * Handles MIDI folder import, playlist management, and playback control
 */

export class PlaylistManager {
    constructor() {
        this.playlist = [];
        this.currentIndex = -1;
        this.isPlaying = false;
        this.folderInput = null;
        this.playlistElement = null;
        this.manager = null;
        
        this.init();
    }
    
    /**
     * Initialize the playlist manager
     */
    init() {
        this.folderInput = document.getElementById('folder-input');
        this.playlistElement = document.getElementById('playlist');
        
        if (this.folderInput && this.playlistElement) {
            this.setupEventListeners();
            this.setupControlButtons();
        }
    }
    
    /**
     * Set up event listeners for playlist functionality
     */
    setupEventListeners() {
        // Folder input change event
        this.folderInput.addEventListener('change', (event) => {
            this.handleFolderImport(event.target.files);
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            this.handleKeyboardShortcuts(event);
        });
    }
    
    /**
     * Set up control buttons for playlist navigation
     */
    setupControlButtons() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const clearBtn = document.getElementById('clear-btn');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.playPrevious());
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.playNext());
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearPlaylist());
        }
        
        // Initial button state
        this.updateControlButtons();
    }
    
    /**
     * Handle MIDI folder import
     * @param {FileList} files - List of files from folder selection
     */
    async handleFolderImport(files) {
        if (!files || files.length === 0) return;
        
        this.playlist = [];
        this.currentIndex = -1;
        this.clearPlaylist();
        
        // Filter MIDI files
        const midiFiles = Array.from(files).filter(file => 
            file.name.toLowerCase().endsWith('.mid') || 
            file.name.toLowerCase().endsWith('.midi') ||
            file.name.toLowerCase().endsWith('.rmi') ||
            file.name.toLowerCase().endsWith('.kar') ||
            file.name.toLowerCase().endsWith('.xmf') ||
            file.name.toLowerCase().endsWith('.mxmf')
        );
        
        if (midiFiles.length === 0) {
            this.showNotification('Không tìm thấy file MIDI nào trong thư mục đã chọn.');
            return;
        }
        
        // Sort files alphabetically
        midiFiles.sort((a, b) => a.name.localeCompare(b.name));
        
        // Add files to playlist
        for (const file of midiFiles) {
            this.addToPlaylist(file);
        }
        
        this.showNotification(`Đã import ${midiFiles.length} file MIDI vào playlist.`);
        
        // Auto-play first file if available
        if (this.playlist.length > 0) {
            this.playFile(0);
        }
    }
    
    /**
     * Add a MIDI file to the playlist
     * @param {File} file - MIDI file to add
     */
    addToPlaylist(file) {
        const playlistItem = {
            file: file,
            name: file.name,
            size: file.size,
            lastModified: file.lastModified
        };
        
        this.playlist.push(playlistItem);
        this.renderPlaylistItem(playlistItem, this.playlist.length - 1);
        this.updateControlButtons();
    }
    
    /**
     * Render a playlist item in the UI
     * @param {Object} item - Playlist item object
     * @param {number} index - Index of the item
     */
    renderPlaylistItem(item, index) {
        const li = document.createElement('li');
        li.textContent = this.formatFileName(item.name);
        li.title = item.name;
        li.dataset.index = index;
        
        // Add click event
        li.addEventListener('click', () => {
            this.playFile(index);
        });
        
        // Add context menu for additional options
        li.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            this.showContextMenu(event, index);
        });
        
        this.playlistElement.appendChild(li);
    }
    
    /**
     * Format filename for display (truncate if too long)
     * @param {string} filename - Original filename
     * @returns {string} Formatted filename
     */
    formatFileName(filename) {
        if (filename.length > 30) {
            return filename.substring(0, 27) + '...';
        }
        return filename;
    }
    
    /**
     * Play a specific file from the playlist
     * @param {number} index - Index of the file to play
     */
    async playFile(index) {
        if (index < 0 || index >= this.playlist.length) return;
        
        const item = this.playlist[index];
        
        try {
            // Update UI state
            this.updatePlaylistUI(index);
            this.currentIndex = index;
            
            // Load and play the MIDI file
            if (this.manager && this.manager.seq) {
                const parsed = [{
                    binary: await item.file.arrayBuffer(),
                    altName: item.name
                }];
                
                this.manager.seq.loadNewSongList(parsed);
                this.isPlaying = true;
                
                // Update title
                if (this.manager.seq.midiData) {
                    this.manager.seq.midiData.midiName = item.name;
                }
                
                this.showNotification(`Đang phát: ${item.name}`);
            } else if (this.manager) {
                const parsed = [{
                    binary: await item.file.arrayBuffer(),
                    altName: item.name
                }];
                
                this.manager.play(parsed);
                this.isPlaying = true;
                this.showNotification(`Đang phát: ${item.name}`);
            }
            
        } catch (error) {
            console.error('Error playing file:', error);
            this.showNotification(`Lỗi khi phát file: ${item.name}`);
        }
    }
    
    /**
     * Update playlist UI to show current playing item
     * @param {number} activeIndex - Index of the currently playing item
     */
    updatePlaylistUI(activeIndex) {
        // Remove previous active states
        const allItems = this.playlistElement.querySelectorAll('li');
        allItems.forEach((item, index) => {
            item.classList.remove('active', 'playing');
        });
        
        // Add active state to current item
        if (activeIndex >= 0 && activeIndex < allItems.length) {
            allItems[activeIndex].classList.add('active');
            
            // Scroll to active item
            allItems[activeIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
        
        // Update control buttons state
        this.updateControlButtons();
    }
    
    /**
     * Play next file in playlist
     */
    playNext() {
        if (this.currentIndex < this.playlist.length - 1) {
            this.playFile(this.currentIndex + 1);
        } else if (this.playlist.length > 0) {
            // Loop to first item
            this.playFile(0);
        }
    }
    
    /**
     * Play previous file in playlist
     */
    playPrevious() {
        if (this.currentIndex > 0) {
            this.playFile(this.currentIndex - 1);
        } else if (this.playlist.length > 0) {
            // Loop to last item
            this.playFile(this.playlist.length - 1);
        }
    }
    
    /**
     * Clear the current playlist
     */
    clearPlaylist() {
        this.playlist = [];
        this.currentIndex = -1;
        this.isPlaying = false;
        this.playlistElement.innerHTML = '';
        this.updateControlButtons();
        this.showNotification('Đã xóa playlist');
    }
    
    /**
     * Update control buttons state based on playlist status
     */
    updateControlButtons() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const clearBtn = document.getElementById('clear-btn');
        
        if (prevBtn) {
            prevBtn.disabled = this.playlist.length === 0 || this.currentIndex <= 0;
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.playlist.length === 0 || this.currentIndex >= this.playlist.length - 1;
        }
        
        if (clearBtn) {
            clearBtn.disabled = this.playlist.length === 0;
        }
        
        // Update playlist info
        this.updatePlaylistInfo();
    }
    
    /**
     * Update playlist information display
     */
    updatePlaylistInfo() {
        const countElement = document.getElementById('playlist-count');
        const currentTrackElement = document.getElementById('current-track');
        
        if (countElement) {
            countElement.textContent = `${this.playlist.length} bài hát`;
        }
        
        if (currentTrackElement) {
            if (this.currentIndex >= 0 && this.currentIndex < this.playlist.length) {
                const currentItem = this.playlist[this.currentIndex];
                currentTrackElement.textContent = `Đang phát: ${currentItem.name}`;
            } else {
                currentTrackElement.textContent = 'Không có bài nào đang phát';
            }
        }
    }
    
    /**
     * Remove a specific item from playlist
     * @param {number} index - Index of item to remove
     */
    removeFromPlaylist(index) {
        if (index < 0 || index >= this.playlist.length) return;
        
        this.playlist.splice(index, 1);
        this.renderPlaylist();
        
        // Adjust current index if necessary
        if (this.currentIndex >= index) {
            this.currentIndex = Math.max(0, this.currentIndex - 1);
        }
        
        this.updateControlButtons();
        this.showNotification(`Đã xóa file khỏi playlist`);
    }
    
    /**
     * Re-render the entire playlist
     */
    renderPlaylist() {
        this.playlistElement.innerHTML = '';
        this.playlist.forEach((item, index) => {
            this.renderPlaylistItem(item, index);
        });
        this.updatePlaylistUI(this.currentIndex);
    }
    
    /**
     * Show context menu for playlist items
     * @param {Event} event - Context menu event
     * @param {number} index - Index of the item
     */
    showContextMenu(event, index) {
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.cssText = `
            position: fixed;
            top: ${event.clientY}px;
            left: ${event.clientX}px;
            background: var(--top-color);
            border: 1px solid var(--border-color);
            border-radius: var(--primary-border-radius);
            padding: 5px 0;
            z-index: 10000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        
        const menuItems = [
            { text: 'Phát', action: () => this.playFile(index) },
            { text: 'Xóa khỏi playlist', action: () => this.removeFromPlaylist(index) },
            { text: 'Thông tin file', action: () => this.showFileInfo(index) }
        ];
        
        menuItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.textContent = item.text;
            menuItem.style.cssText = `
                padding: 8px 15px;
                cursor: pointer;
                color: var(--font-color);
                transition: background 0.2s;
            `;
            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.background = 'rgba(255,255,255,0.1)';
            });
            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.background = 'transparent';
            });
            menuItem.addEventListener('click', () => {
                item.action();
                document.body.removeChild(menu);
            });
            menu.appendChild(menuItem);
        });
        
        document.body.appendChild(menu);
        
        // Remove menu when clicking elsewhere
        const removeMenu = () => {
            if (document.body.contains(menu)) {
                document.body.removeChild(menu);
            }
            document.removeEventListener('click', removeMenu);
        };
        
        setTimeout(() => {
            document.addEventListener('click', removeMenu);
        }, 100);
    }
    
    /**
     * Show file information
     * @param {number} index - Index of the item
     */
    showFileInfo(index) {
        const item = this.playlist[index];
        if (!item) return;
        
        const info = `
            Tên file: ${item.name}
            Kích thước: ${this.formatFileSize(item.size)}
            Ngày sửa đổi: ${new Date(item.lastModified).toLocaleString('vi-VN')}
        `;
        
        this.showNotification(info);
    }
    
    /**
     * Format file size for display
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyboardShortcuts(event) {
        // Only handle shortcuts when playlist is focused or no other input is focused
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        
        switch (event.key) {
            case 'ArrowRight':
                if (event.ctrlKey) {
                    event.preventDefault();
                    this.playNext();
                }
                break;
            case 'ArrowLeft':
                if (event.ctrlKey) {
                    event.preventDefault();
                    this.playPrevious();
                }
                break;
            case ' ':
                if (event.target === document.body) {
                    event.preventDefault();
                    // Toggle play/pause if manager supports it
                    if (this.manager && this.manager.seq) {
                        if (this.isPlaying) {
                            this.manager.seq.pause();
                            this.isPlaying = false;
                        } else {
                            this.manager.seq.play();
                            this.isPlaying = true;
                        }
                    }
                }
                break;
        }
    }
    
    /**
     * Show notification message
     * @param {string} message - Message to display
     */
    showNotification(message) {
        // Use existing notification system if available
        if (window.showNotification) {
            window.showNotification('Playlist', [{
                type: 'text',
                textContent: message
            }]);
        } else {
            // Fallback to console
            console.log('Playlist:', message);
        }
    }
    
    /**
     * Set the manager instance for playback control
     * @param {Object} manager - SpessaSynth manager instance
     */
    setManager(manager) {
        this.manager = manager;
    }
    
    /**
     * Get current playlist
     * @returns {Array} Current playlist items
     */
    getPlaylist() {
        return this.playlist;
    }
    
    /**
     * Get current playing index
     * @returns {number} Current playing index
     */
    getCurrentIndex() {
        return this.currentIndex;
    }
    
    /**
     * Check if playlist is playing
     * @returns {boolean} Playing state
     */
    isPlaylistPlaying() {
        return this.isPlaying;
    }
}

class VideoToGifConverter {
    constructor() {
        this.videoFile = null;
        this.gif = null;
        this.canvas = null;
        this.ctx = null;
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.videoInput = document.getElementById('videoInput');
        this.previewSection = document.getElementById('previewSection');
        this.videoPreview = document.getElementById('videoPreview');
        this.convertBtn = document.getElementById('convertBtn');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.resultSection = document.getElementById('resultSection');
        this.gifResult = document.getElementById('gifResult');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.newConversionBtn = document.getElementById('newConversionBtn');

        // Control elements
        this.startTimeInput = document.getElementById('startTime');
        this.durationInput = document.getElementById('duration');
        this.frameRateInput = document.getElementById('frameRate');
        this.qualitySelect = document.getElementById('quality');
        this.widthInput = document.getElementById('width');

        // Create canvas for video processing
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    setupEventListeners() {
        // File upload events
        this.uploadArea.addEventListener('click', () => this.videoInput.click());
        this.videoInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Drag and drop events
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));

        // Conversion events
        this.convertBtn.addEventListener('click', () => this.convertToGif());
        this.downloadBtn.addEventListener('click', () => this.downloadGif());
        this.newConversionBtn.addEventListener('click', () => this.resetConverter());

        // Video loaded event
        this.videoPreview.addEventListener('loadedmetadata', () => this.updateDurationLimit());
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('video/')) {
            this.processVideoFile(files[0]);
        } else {
            this.showError('Please drop a valid video file.');
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('video/')) {
            this.processVideoFile(file);
        } else {
            this.showError('Please select a valid video file.');
        }
    }

    processVideoFile(file) {
        this.videoFile = file;
        const url = URL.createObjectURL(file);
        this.videoPreview.src = url;
        
        // Show preview section
        this.previewSection.style.display = 'grid';
        this.previewSection.classList.add('fade-in-up');
        
        // Update max duration based on video length
        this.videoPreview.addEventListener('loadedmetadata', () => {
            const maxDuration = Math.floor(this.videoPreview.duration);
            this.durationInput.max = maxDuration;
            this.durationInput.value = Math.min(3, maxDuration);
            this.startTimeInput.max = maxDuration - 0.1;
        });

        this.showSuccess('Video loaded successfully!');
    }

    updateDurationLimit() {
        const maxDuration = Math.floor(this.videoPreview.duration);
        this.durationInput.max = maxDuration;
        this.startTimeInput.max = maxDuration - 0.1;
    }

    async convertToGif() {
        if (!this.videoFile) {
            this.showError('Please select a video file first.');
            return;
        }

        // Get conversion parameters
        const startTime = parseFloat(this.startTimeInput.value);
        const duration = parseFloat(this.durationInput.value);
        const frameRate = parseInt(this.frameRateInput.value);
        const quality = this.qualitySelect.value;
        const width = parseInt(this.widthInput.value);

        // Validate parameters
        if (startTime + duration > this.videoPreview.duration) {
            this.showError('Start time + duration exceeds video length.');
            return;
        }

        // Show progress
        this.convertBtn.disabled = true;
        this.progressContainer.style.display = 'block';
        this.progressFill.style.width = '0%';
        this.progressText.textContent = 'Initializing...';

        try {
            await this.createGif(startTime, duration, frameRate, quality, width);
        } catch (error) {
            this.showError('Conversion failed: ' + error.message);
            this.convertBtn.disabled = false;
            this.progressContainer.style.display = 'none';
        }
    }

    async createGif(startTime, duration, frameRate, quality, width) {
        return new Promise((resolve, reject) => {
            // Calculate GIF parameters based on quality
            const qualitySettings = this.getQualitySettings(quality);
            
            // Set canvas dimensions
            const aspectRatio = this.videoPreview.videoHeight / this.videoPreview.videoWidth;
            const height = Math.floor(width * aspectRatio);
            this.canvas.width = width;
            this.canvas.height = height;

            // Create GIF
            this.gif = new GIF({
                workers: 2,
                quality: qualitySettings.quality,
                width: width,
                height: height,
                workerScript: 'gif.worker.js'
            });

            // Set up video for frame extraction
            this.videoPreview.currentTime = startTime;
            
            this.videoPreview.addEventListener('seeked', () => {
                this.extractFrames(startTime, duration, frameRate, resolve, reject);
            }, { once: true });
        });
    }

    getQualitySettings(quality) {
        const settings = {
            low: { quality: 20, colors: 64 },
            medium: { quality: 10, colors: 128 },
            high: { quality: 5, colors: 256 }
        };
        return settings[quality] || settings.medium;
    }

    extractFrames(startTime, duration, frameRate, resolve, reject) {
        const totalFrames = Math.floor(duration * frameRate);
        let framesExtracted = 0;
        const frameInterval = 1000 / frameRate;

        const extractFrame = () => {
            if (framesExtracted >= totalFrames) {
                // All frames extracted, render GIF
                this.progressText.textContent = 'Rendering GIF...';
                this.gif.on('finished', (blob) => {
                    this.displayGif(blob);
                    resolve();
                });
                this.gif.render();
                return;
            }

            // Calculate current time
            const currentTime = startTime + (framesExtracted / frameRate);
            
            // Update progress
            const progress = (framesExtracted / totalFrames) * 80; // 80% for frame extraction
            this.progressFill.style.width = progress + '%';
            this.progressText.textContent = `Extracting frame ${framesExtracted + 1}/${totalFrames}`;

            // Set video time and wait for seek
            this.videoPreview.currentTime = currentTime;
            
            this.videoPreview.addEventListener('seeked', () => {
    // Use requestAnimationFrame to ensure frame is ready
    window.requestAnimationFrame(() => {
        console.log(`Extracting frame ${framesExtracted + 1}/${totalFrames} at time:`, this.videoPreview.currentTime);
        this.ctx.drawImage(this.videoPreview, 0, 0, this.canvas.width, this.canvas.height);
        // Add frame to GIF
        this.gif.addFrame(this.canvas, { delay: frameInterval, copy: true });
        framesExtracted++;
        // Continue with next frame
        setTimeout(extractFrame, 50);
    });
}, { once: true });
        };

        extractFrame();
    }

    displayGif(blob) {
        const url = URL.createObjectURL(blob);
        this.gifResult.src = url;
        
        // Show result section
        this.resultSection.style.display = 'block';
        this.resultSection.classList.add('fade-in-up');
        
        // Hide progress and enable convert button
        this.progressContainer.style.display = 'none';
        this.convertBtn.disabled = false;
        
        // Update progress to 100%
        this.progressFill.style.width = '100%';
        this.progressText.textContent = 'Conversion complete!';
        
        this.showSuccess('GIF created successfully!');
        
        // Store blob for download
        this.gifBlob = blob;
    }

    downloadGif() {
        if (!this.gifBlob) return;
        
        const url = URL.createObjectURL(this.gifBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `converted-gif-${Date.now()}.gif`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showSuccess('GIF downloaded successfully!');
    }

    resetConverter() {
        // Reset all elements
        this.videoFile = null;
        this.gifBlob = null;
        this.videoInput.value = '';
        this.videoPreview.src = '';
        
        // Hide sections
        this.previewSection.style.display = 'none';
        this.resultSection.style.display = 'none';
        this.progressContainer.style.display = 'none';
        
        // Reset form values
        this.startTimeInput.value = 0;
        this.durationInput.value = 3;
        this.frameRateInput.value = 10;
        this.qualitySelect.value = 'medium';
        this.widthInput.value = 320;
        
        // Enable convert button
        this.convertBtn.disabled = false;
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(n => n.remove());
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Style notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        `;
        
        if (type === 'success') {
            notification.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
        } else {
            notification.style.background = 'linear-gradient(135deg, #dc3545, #c82333)';
        }
        
        // Add to page
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Add CSS for notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize the converter when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VideoToGifConverter();
});

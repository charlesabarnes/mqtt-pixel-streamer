class MatrixEffect {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.width = 128;
    this.height = 64;
    this.animationId = null;
    this.isPaused = false;

    // Matrix configuration - much fewer columns for minimal density
    this.columns = 8; // Quarter the particles (32/4 = 8)
    this.columnWidth = this.width / this.columns;
    this.rows = 64; // Full resolution rows
    this.rowHeight = this.height / this.rows;

    // Drop data for each column
    this.drops = [];
    this.dropSpeeds = [];
    this.dropBrightness = [];

    // Colors for different brightness levels
    this.colors = [
      '#00FF00', // Bright green
      '#00DD00', // Medium bright
      '#00BB00', // Medium
      '#008800', // Dim
      '#004400'  // Very dim
    ];

    this.lastTime = 0;
    this.frameRate = 16; // 60fps (1000ms / 60fps ≈ 16ms)
  }

  init() {
    this.canvas = document.getElementById('matrix-canvas');
    if (!this.canvas) {
      console.error('Matrix canvas not found');
      return;
    }

    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false; // Crisp pixels

    // Initialize drops
    this.initializeDrops();

    // Start animation
    this.animate();
    console.log('Matrix Effect initialized');
  }

  initializeDrops() {
    for (let i = 0; i < this.columns; i++) {
      // Start drops at random positions
      this.drops[i] = Math.floor(Math.random() * this.rows);

      // Random speed for each column (1-3 pixels per frame)
      this.dropSpeeds[i] = Math.random() * 2 + 1;

      // Random brightness for variety
      this.dropBrightness[i] = Math.floor(Math.random() * this.colors.length);
    }
  }

  animate(currentTime = 0) {
    if (this.isPaused) return;

    // Control frame rate
    if (currentTime - this.lastTime < this.frameRate) {
      this.animationId = requestAnimationFrame((time) => this.animate(time));
      return;
    }

    this.lastTime = currentTime;
    this.update();
    this.render();

    this.animationId = requestAnimationFrame((time) => this.animate(time));
  }

  update() {
    // Update each drop position
    for (let i = 0; i < this.columns; i++) {
      // Move drop down - faster movement
      this.drops[i] += this.dropSpeeds[i] * 0.8; // Faster movement

      // Reset drop when it reaches bottom or randomly (less frequent)
      if (this.drops[i] > this.rows || Math.random() < 0.001) {
        this.drops[i] = -Math.floor(Math.random() * 30); // Start even higher above screen
        this.dropSpeeds[i] = Math.random() * 2 + 1; // Faster speeds
        this.dropBrightness[i] = Math.floor(Math.random() * this.colors.length);
      }
    }
  }

  render() {
    // Clear canvas with lighter fade effect for longer trails
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw drops
    for (let i = 0; i < this.columns; i++) {
      const x = i * this.columnWidth;
      const currentRow = Math.floor(this.drops[i]);

      // Draw longer trail behind the drop
      for (let trail = 0; trail < 12; trail++) {
        const trailRow = currentRow - trail;

        if (trailRow >= 0 && trailRow < this.rows) {
          const y = trailRow * this.rowHeight;

          // Calculate brightness based on trail position
          const brightnessIndex = Math.min(
            this.dropBrightness[i] + trail,
            this.colors.length - 1
          );

          this.ctx.fillStyle = this.colors[brightnessIndex];

          // Draw single pixel dots
          this.ctx.fillRect(
            Math.floor(x),
            Math.floor(y),
            1,
            1
          );
        }
      }

      // Draw the main drop (brightest)
      if (currentRow >= 0 && currentRow < this.rows) {
        const y = currentRow * this.rowHeight;
        this.ctx.fillStyle = this.colors[0]; // Always brightest

        // Make the head just slightly larger - 2x2 pixels
        this.ctx.fillRect(
          Math.floor(x),
          Math.floor(y),
          2,
          2
        );
      }
    }
  }

  pause() {
    this.isPaused = true;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  resume() {
    if (this.isPaused) {
      this.isPaused = false;
      this.animate();
    }
  }

  destroy() {
    this.pause();
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }
}

// Initialize global matrix effect
window.matrixEffect = new MatrixEffect();

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
  if (window.matrixEffect) {
    window.matrixEffect.destroy();
  }
});
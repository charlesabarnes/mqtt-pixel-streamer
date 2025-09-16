class FishTank {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.width = 128;
    this.height = 64;
    this.animationId = null;
    this.isPaused = false;

    // 75 fps targeting
    this.targetFPS = 75;
    this.frameTime = 1000 / this.targetFPS; // ~13.33ms per frame
    this.lastTime = 0;

    // Animation time
    this.time = 0;

    // Fish array
    this.fish = [];
    this.bubbles = [];
    this.seaweed = [];

    // Initialize fish tank elements
    this.initializeFish();
    this.initializeBubbles();
    this.initializeSeaweed();
  }

  init() {
    this.canvas = document.getElementById('fish-tank-canvas');
    if (!this.canvas) {
      console.error('Fish tank canvas not found');
      return;
    }

    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false; // Crisp pixels

    // Start animation
    this.animate();
    console.log('Fish Tank initialized with 75fps targeting');
  }

  initializeFish() {
    // Create 5 fish with different properties
    this.fish = [
      {
        x: 20, y: 15,
        size: 6,
        color: '#FF6600', // Orange
        speed: 0.8,
        direction: 1,
        waveOffset: 0,
        depth: 0.3
      },
      {
        x: 80, y: 35,
        size: 8,
        color: '#0099FF', // Blue
        speed: 0.6,
        direction: -1,
        waveOffset: Math.PI / 2,
        depth: 0.6
      },
      {
        x: 50, y: 25,
        size: 5,
        color: '#FFFF00', // Yellow
        speed: 1.2,
        direction: 1,
        waveOffset: Math.PI,
        depth: 0.2
      },
      {
        x: 100, y: 45,
        size: 7,
        color: '#FF3366', // Red
        speed: 0.7,
        direction: -1,
        waveOffset: Math.PI * 1.5,
        depth: 0.8
      },
      {
        x: 30, y: 40,
        size: 4,
        color: '#00FF66', // Green
        speed: 1.0,
        direction: 1,
        waveOffset: Math.PI / 4,
        depth: 0.4
      }
    ];
  }

  initializeBubbles() {
    this.bubbles = [];
    // Start with some initial bubbles
    for (let i = 0; i < 8; i++) {
      this.addBubble();
    }
  }

  initializeSeaweed() {
    // Create 4 seaweed plants
    this.seaweed = [
      { x: 15, height: 20, waveOffset: 0, color: '#00AA44' },
      { x: 35, height: 25, waveOffset: Math.PI / 3, color: '#00CC55' },
      { x: 85, height: 18, waveOffset: Math.PI / 2, color: '#00AA44' },
      { x: 110, height: 22, waveOffset: Math.PI, color: '#00CC55' }
    ];
  }

  addBubble() {
    this.bubbles.push({
      x: Math.random() * this.width,
      y: this.height + Math.random() * 10,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 1.5 + 0.5,
      wobble: Math.random() * 0.02 + 0.01
    });
  }

  animate(currentTime = 0) {
    if (this.isPaused) return;

    // Control frame rate to 75fps
    if (currentTime - this.lastTime < this.frameTime) {
      this.animationId = requestAnimationFrame((time) => this.animate(time));
      return;
    }

    this.lastTime = currentTime;
    this.time += 0.016; // Increment time for animations

    this.update();
    this.render();

    this.animationId = requestAnimationFrame((time) => this.animate(time));
  }

  update() {
    // Update fish
    this.fish.forEach(fish => {
      // Horizontal movement
      fish.x += fish.speed * fish.direction;

      // Vertical swimming pattern
      fish.y += Math.sin(this.time * 2 + fish.waveOffset) * 0.3;

      // Bounce off walls
      if (fish.x <= fish.size || fish.x >= this.width - fish.size) {
        fish.direction *= -1;
      }

      // Keep fish in bounds vertically
      if (fish.y < fish.size) fish.y = fish.size;
      if (fish.y > this.height - fish.size - 10) fish.y = this.height - fish.size - 10;
    });

    // Update bubbles
    this.bubbles.forEach((bubble, index) => {
      bubble.y -= bubble.speed;
      bubble.x += Math.sin(this.time * 3 + index) * bubble.wobble;

      // Remove bubbles that reach the top
      if (bubble.y < -bubble.size) {
        this.bubbles.splice(index, 1);
      }
    });

    // Add new bubbles randomly
    if (Math.random() < 0.05) {
      this.addBubble();
    }

    // Limit bubble count
    if (this.bubbles.length > 15) {
      this.bubbles.shift();
    }
  }

  render() {
    // Clear canvas with water gradient
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#004466');
    gradient.addColorStop(0.6, '#002244');
    gradient.addColorStop(1, '#001122');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw water waves (subtle)
    this.drawWaterEffects();

    // Draw castle
    this.drawCastle();

    // Draw seaweed
    this.drawSeaweed();

    // Draw bubbles
    this.drawBubbles();

    // Draw fish (on top)
    this.drawFish();
  }

  drawWaterEffects() {
    // Subtle wave lines
    this.ctx.strokeStyle = 'rgba(0, 150, 255, 0.1)';
    this.ctx.lineWidth = 1;

    for (let i = 0; i < 3; i++) {
      this.ctx.beginPath();
      for (let x = 0; x < this.width; x += 2) {
        const y = 10 + i * 15 + Math.sin(this.time * 1.5 + x * 0.1 + i * Math.PI / 3) * 2;
        if (x === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
      this.ctx.stroke();
    }
  }

  drawCastle() {
    // Simple castle in the background
    this.ctx.fillStyle = '#444444';

    // Main tower
    this.ctx.fillRect(95, 45, 12, 19);

    // Side tower
    this.ctx.fillRect(107, 50, 8, 14);

    // Castle top details
    this.ctx.fillStyle = '#666666';
    this.ctx.fillRect(94, 44, 14, 2);
    this.ctx.fillRect(106, 49, 10, 2);

    // Windows
    this.ctx.fillStyle = '#FFFF88';
    this.ctx.fillRect(98, 52, 2, 3);
    this.ctx.fillRect(103, 52, 2, 3);
    this.ctx.fillRect(109, 55, 2, 2);
  }

  drawSeaweed() {
    this.seaweed.forEach(plant => {
      this.ctx.strokeStyle = plant.color;
      this.ctx.lineWidth = 2;
      this.ctx.lineCap = 'round';

      const segments = 8;
      const segmentHeight = plant.height / segments;

      for (let i = 0; i < segments; i++) {
        const startY = this.height - i * segmentHeight;
        const endY = this.height - (i + 1) * segmentHeight;

        const sway = Math.sin(this.time * 2 + plant.waveOffset + i * 0.3) * 2;

        const startX = plant.x + (i > 0 ? Math.sin(this.time * 2 + plant.waveOffset + (i - 1) * 0.3) * 2 : 0);
        const endX = plant.x + sway;

        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();
      }
    });
  }

  drawBubbles() {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 1;

    this.bubbles.forEach(bubble => {
      this.ctx.beginPath();
      this.ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
    });
  }

  drawFish() {
    this.fish.forEach(fish => {
      this.ctx.fillStyle = fish.color;

      // Fish body (ellipse)
      this.ctx.beginPath();
      this.ctx.ellipse(fish.x, fish.y, fish.size, fish.size * 0.6, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // Fish tail
      const tailDirection = fish.direction > 0 ? -1 : 1;
      this.ctx.beginPath();
      this.ctx.moveTo(fish.x + tailDirection * fish.size, fish.y);
      this.ctx.lineTo(fish.x + tailDirection * (fish.size + 4), fish.y - 3);
      this.ctx.lineTo(fish.x + tailDirection * (fish.size + 4), fish.y + 3);
      this.ctx.closePath();
      this.ctx.fill();

      // Fish eye
      const eyeX = fish.x + fish.direction * (fish.size * 0.3);
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.arc(eyeX, fish.y - 1, 1.5, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#000000';
      this.ctx.beginPath();
      this.ctx.arc(eyeX, fish.y - 1, 0.8, 0, Math.PI * 2);
      this.ctx.fill();
    });
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

// Initialize global fish tank
window.fishTank = new FishTank();

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
  if (window.fishTank) {
    window.fishTank.destroy();
  }
});
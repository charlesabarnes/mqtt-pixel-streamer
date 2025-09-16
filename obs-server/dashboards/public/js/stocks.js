class StockTicker {
  constructor() {
    this.tickerElement = null;
    this.animationId = null;
    this.isPaused = false;
    this.scrollPosition = 0;
    this.scrollSpeed = 1; // pixels per frame
    this.tickerWidth = 0;
    this.containerWidth = 128;

    // Stock data with mock prices
    this.stocks = [
      { symbol: 'AAPL', price: 193.42, change: 2.15, changePercent: 1.13 },
      { symbol: 'GOOGL', price: 142.56, change: -0.89, changePercent: -0.62 },
      { symbol: 'MSFT', price: 418.24, change: 5.67, changePercent: 1.37 },
      { symbol: 'TSLA', price: 248.85, change: -12.34, changePercent: -4.73 },
      { symbol: 'AMZN', price: 156.78, change: 3.21, changePercent: 2.09 },
      { symbol: 'NVDA', price: 875.30, change: 15.45, changePercent: 1.80 },
      { symbol: 'META', price: 504.67, change: -2.88, changePercent: -0.57 },
      { symbol: 'NFLX', price: 591.34, change: 8.92, changePercent: 1.53 },
      { symbol: 'ADBE', price: 545.21, change: -4.56, changePercent: -0.83 },
      { symbol: 'CRM', price: 289.45, change: 6.78, changePercent: 2.40 }
    ];

    this.lastUpdate = 0;
    this.updateInterval = 10000; // Update prices every 10 seconds
    this.lastTime = 0;
    this.frameRate = 16; // 60fps (1000ms / 60fps ≈ 16ms)
  }

  init() {
    this.tickerElement = document.getElementById('ticker-content');
    if (!this.tickerElement) {
      console.error('Ticker content element not found');
      return;
    }

    // Generate initial ticker content
    this.generateTickerContent();
    this.measureTickerWidth();

    // Start animation
    this.animate();

    // Update stock prices periodically
    setInterval(() => {
      if (!this.isPaused) {
        this.updateStockPrices();
        this.generateTickerContent();
        this.measureTickerWidth();
      }
    }, this.updateInterval);

    console.log('Stock Ticker initialized');
  }

  generateTickerContent() {
    let tickerHTML = '';

    this.stocks.forEach(stock => {
      const changeDirection = stock.change >= 0 ? 'up' : 'down';
      const changeSymbol = stock.change >= 0 ? '↑' : '↓';
      const priceClass = stock.change >= 0 ? 'price-up' : 'price-down';

      tickerHTML += `
        <div class="stock-item">
          <span class="stock-symbol">${stock.symbol}</span>
          <span class="stock-price ${priceClass}">$${stock.price.toFixed(2)}</span>
          <span class="stock-change ${priceClass}">${changeSymbol}${Math.abs(stock.changePercent).toFixed(1)}%</span>
        </div>
      `;
    });

    // Duplicate the content for seamless looping
    this.tickerElement.innerHTML = tickerHTML + tickerHTML;
  }

  measureTickerWidth() {
    // Temporarily make visible to measure
    const originalDisplay = this.tickerElement.style.display;
    this.tickerElement.style.display = 'flex';
    this.tickerElement.style.position = 'absolute';
    this.tickerElement.style.left = '0px';

    // Get the width of half the content (since we duplicated it)
    const items = this.tickerElement.querySelectorAll('.stock-item');
    let totalWidth = 0;
    for (let i = 0; i < items.length / 2; i++) {
      totalWidth += items[i].offsetWidth + 40; // 40px margin-right
    }

    this.tickerWidth = totalWidth;
    console.log('Ticker width measured:', this.tickerWidth);

    // Restore display
    this.tickerElement.style.display = originalDisplay;
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

    this.animationId = requestAnimationFrame((time) => this.animate(time));
  }

  update() {
    // Move ticker to the left
    this.scrollPosition += this.scrollSpeed;

    // Reset position when first copy has completely scrolled off screen
    if (this.scrollPosition >= this.tickerWidth) {
      this.scrollPosition = 0;
    }

    // Apply the scroll position
    this.tickerElement.style.transform = `translateX(-${this.scrollPosition}px)`;
  }

  updateStockPrices() {
    // Simulate realistic stock price changes
    this.stocks.forEach(stock => {
      // Random change between -5% and +5%
      const changePercent = (Math.random() - 0.5) * 10;
      const priceChange = stock.price * (changePercent / 100);

      // Update price
      stock.price = Math.max(1, stock.price + priceChange);
      stock.change = priceChange;
      stock.changePercent = changePercent;
    });

    console.log('Stock prices updated');
  }

  // Utility methods for color coding
  getStockColor(change) {
    if (change > 0) return '#00ff00'; // Green for gains
    if (change < 0) return '#ff0000'; // Red for losses
    return '#ffff00'; // Yellow for no change
  }

  getChangeSymbol(change) {
    if (change > 0) return '↑';
    if (change < 0) return '↓';
    return '→';
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
    if (this.tickerElement) {
      this.tickerElement.innerHTML = '';
    }
  }
}

// Initialize global stock ticker
window.stockTicker = new StockTicker();

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
  if (window.stockTicker) {
    window.stockTicker.destroy();
  }
});
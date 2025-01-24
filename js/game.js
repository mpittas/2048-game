import GameStorage from "./storage.js";

// Add GSAP lag smoothing to handle CPU freezes
gsap.ticker.lagSmoothing(721, 16);

// Create a timeline for animations
const tl = gsap.timeline({
  defaults: { duration: 1, ease: "power2.out" },
});

// Add animations to the timeline
tl.to(".animated-element", {
  opacity: 1,
  y: 0,
  stagger: {
    amount: 0.5,
    from: "start",
  },
  willChange: "transform, opacity",
}).fromTo(
  ".scroll-animate",
  { opacity: 0, y: 100 },
  {
    opacity: 1,
    y: 0,
    scrollTrigger: {
      trigger: ".scroll-animate",
      start: "top center",
      toggleActions: "play none none reverse",
    },
    stagger: {
      each: 0.2,
      from: "start",
      ease: "power2.inOut",
    },
    willChange: "transform, opacity",
  }
);

class Game2048 {
  constructor() {
    // Animation speed controls
    this.animationConfig = {
      // Main movement animation
      moveSpeed: 0.15, // Back to slightly longer duration for smoothness
      moveEase: "power2.out", // Back to power2 for smoother deceleration

      // Merge animation
      mergeSpeed: 0.12, // Back to original merge speed
      mergeScale: 1.15, // Original scale for better visibility
      mergeEase: "power2.inOut", // Back to power2 for smoother merge

      // New tile and arrival animations
      arrivalSpeed: 0.15, // Back to original arrival speed
      arrivalScale: 1.08, // Original scale for better feedback
      arrivalEase: "power2.out", // Back to power2 for smoother arrival

      // Delay before adding new tile
      newTileDelay: 100, // Back to original delay for smoother sequence
    };

    // Cache DOM queries for better performance
    this.gridElement = document.querySelector(".grid");
    this.gridElement.style.willChange = "transform";

    // Pre-calculate cell dimensions
    const cell = document.createElement("div");
    cell.className = "cell";
    this.gridElement.appendChild(cell);
    this.cellDimensions = {
      width: cell.offsetWidth,
      height: cell.offsetHeight,
      gap: 10,
    };
    this.gridElement.removeChild(cell);

    this.cellCount = 4;
    this.grid = Array(4)
      .fill()
      .map(() => Array(4).fill(0));
    this.tiles = new Map();
    this.isMoving = false;
    this.score = 0;
    this.scoreElement = document.querySelector(".score-number");
    this.isGameFinished = false; // Add this new flag

    // Load saved state or start new game
    this.loadGame();

    // Update the score list
    this.updateScoreList();

    this.setupControls();

    // Add reset button handler with confirmation
    document.querySelector(".reset-button").addEventListener("click", () => {
      this.showConfirmation();
    });

    // Add modal button handlers
    document
      .querySelector(".modal-button.confirm")
      .addEventListener("click", () => {
        this.hideConfirmation();
        this.resetSpeed();
      });

    document
      .querySelector(".modal-button.cancel")
      .addEventListener("click", () => {
        this.hideConfirmation();
      });

    // Add window resize handler to manage collapse state
    window.addEventListener("resize", () => {
      const scoreList = document.querySelector(".score-list");
      if (window.innerWidth <= 768) {
        scoreList.classList.add("collapsed");
        // Simpler animations for mobile
        this.animationConfig.mergeScale = 1.0;
        this.animationConfig.arrivalScale = 1.0;
        this.animationConfig.newTileDelay = 50;
      } else {
        scoreList.classList.remove("collapsed");
        // Reset to desktop animations
        this.animationConfig.mergeScale = 1.15;
        this.animationConfig.arrivalScale = 1.08;
        this.animationConfig.newTileDelay = 100;
      }
    });

    // Detect mobile and set simpler animations
    if (window.innerWidth <= 768) {
      this.animationConfig = {
        moveSpeed: 0.12,
        moveEase: "power2.out",
        mergeSpeed: 0.1,
        mergeScale: 1.0, // No scaling on mobile
        mergeEase: "power2.out",
        arrivalSpeed: 0.12,
        arrivalScale: 1.0, // No scaling on mobile
        arrivalEase: "power2.out",
        newTileDelay: 50, // Faster delay for mobile
      };
    }
  }

  initBoard() {
    const grid = document.querySelector(".grid");
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.x = x;
        cell.dataset.y = y;
        grid.appendChild(cell);
      }
    }
  }

  addNewTile() {
    const emptyCells = [];
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        if (this.grid[y][x] === 0) emptyCells.push({ x, y });
      }
    }
    if (emptyCells.length === 0) return;

    const { x, y } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const value = Math.random() < 0.9 ? 2 : 4;
    this.grid[y][x] = value;
    this.createTile(x, y, value);
  }

  createTile(x, y, value) {
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.textContent = value;
    tile.dataset.value = value;

    // Optimize GPU hints but keep it simpler
    tile.style.willChange = "transform";
    tile.style.backfaceVisibility = "hidden";

    const cell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
    cell.appendChild(tile);
    this.tiles.set(`${x},${y}`, tile);

    if (window.innerWidth <= 768) {
      // Simple fade in for mobile
      gsap.from(tile, {
        opacity: 0,
        duration: this.animationConfig.arrivalSpeed,
        ease: this.animationConfig.arrivalEase,
        force3D: true,
      });
    } else {
      // Keep original animation for desktop
      gsap.from(tile, {
        scale: 0,
        duration: 0.3,
        ease: "back.out(1.5)",
        force3D: true,
        onComplete: () => {
          gsap.to(tile, {
            scale: 1.05,
            yoyo: true,
            duration: 0.1,
            repeat: 1,
            ease: "power2.inOut",
            force3D: true,
          });
        },
      });
    }
  }

  updateTilePosition(tile, x, y) {
    const newCell = document.querySelector(
      `.cell[data-x="${x}"][data-y="${y}"]`
    );
    newCell.appendChild(tile);
  }

  setupControls() {
    // Keyboard controls
    document.addEventListener("keydown", (e) => {
      if (this.isMoving) return;
      const directions = {
        37: "left",
        38: "up",
        39: "right",
        40: "down",
      };
      if (directions[e.keyCode]) this.move(directions[e.keyCode]);
    });

    // Touch controls
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    let minSwipeDistance = 20; // Reduced from 30 to make it more responsive
    let touchStartTime = 0;

    document.addEventListener(
      "touchstart",
      (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      },
      { passive: true }
    );

    document.addEventListener(
      "touchend",
      (e) => {
        if (this.isMoving) return;

        touchEndX = e.changedTouches[0].clientX;
        touchEndY = e.changedTouches[0].clientY;
        const touchDuration = Date.now() - touchStartTime;

        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        // Ignore if touch duration is too long (prevents accidental moves)
        if (touchDuration > 500) return;

        // Calculate swipe velocity
        const velocity =
          Math.sqrt(deltaX * deltaX + deltaY * deltaY) / touchDuration;

        // More responsive movement detection
        if (
          velocity > 0.2 ||
          Math.abs(deltaX) > minSwipeDistance ||
          Math.abs(deltaY) > minSwipeDistance
        ) {
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal swipe
            this.move(deltaX > 0 ? "right" : "left");
          } else {
            // Vertical swipe
            this.move(deltaY > 0 ? "down" : "up");
          }
        }
      },
      { passive: true }
    );

    // Remove touchmove handler since we're not using it
    document.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
      },
      { passive: false }
    );
  }

  move(direction) {
    // Don't allow moves if game is finished
    if (this.isGameFinished) return;

    this.isMoving = true;
    let moved = false;
    const newGrid = Array(4)
      .fill()
      .map(() => Array(4).fill(0));
    const vectors = {
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
    };
    const vector = vectors[direction];
    const positions = this.getTraversalOrder(vector);

    for (const { x, y } of positions) {
      if (this.grid[y][x] === 0) continue;

      let newX = x;
      let newY = y;
      let currentValue = this.grid[y][x];
      let nextX = x + vector.x;
      let nextY = y + vector.y;

      while (this.withinBounds(nextX, nextY)) {
        const nextValue = this.grid[nextY][nextX];

        if (nextValue === 0) {
          newX = nextX;
          newY = nextY;
        } else if (nextValue === currentValue) {
          newX = nextX;
          newY = nextY;
          currentValue *= 2;
          break;
        } else {
          break;
        }

        nextX += vector.x;
        nextY += vector.y;
      }

      if (x !== newX || y !== newY) {
        moved = true;
        this.moveTile(x, y, newX, newY, currentValue);
      }
    }

    if (moved) {
      setTimeout(() => {
        this.cleanupTiles();
        this.addNewTile();
        this.isMoving = false;
        this.saveGame();

        // Check if the game is over
        this.checkGameOver();
      }, this.animationConfig.newTileDelay);
    } else {
      this.isMoving = false;

      // Check if the game is over
      this.checkGameOver();
    }
  }

  getTraversalOrder(vector) {
    const positions = [];
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        positions.push({
          x: vector.x === 1 ? 3 - x : x,
          y: vector.y === 1 ? 3 - y : y,
        });
      }
    }
    return positions;
    //   s
  }

  withinBounds(x, y) {
    return x >= 0 && x < 4 && y >= 0 && y < 4;
  }

  moveTile(fromX, fromY, toX, toY, value) {
    const key = `${fromX},${fromY}`;
    const tile = this.tiles.get(key);
    this.tiles.delete(key);
    this.grid[fromY][fromX] = 0;

    const moveX =
      (toX - fromX) * (this.cellDimensions.width + this.cellDimensions.gap);
    const moveY =
      (toY - fromY) * (this.cellDimensions.height + this.cellDimensions.gap);

    if (this.grid[toY][toX] > 0) {
      const mergedTile = this.tiles.get(`${toX},${toY}`);

      // Transform-based merge animation
      gsap.to(mergedTile, {
        scale: this.animationConfig.mergeScale,
        duration: this.animationConfig.mergeSpeed,
        delay: 0.05,
        ease: this.animationConfig.mergeEase,
        force3D: true,
        onComplete: () => mergedTile.remove(),
      });

      setTimeout(() => {
        this.updateScore(value);
      }, 50);
    }

    this.grid[toY][toX] = value;
    tile.textContent = value;
    tile.dataset.value = value;
    this.tiles.set(`${toX},${toY}`, tile);

    const newCell = document.querySelector(
      `.cell[data-x="${toX}"][data-y="${toY}"]`
    );

    // Movement animation
    gsap.to(tile, {
      x: moveX,
      y: moveY,
      duration: this.animationConfig.moveSpeed,
      delay: 0.03,
      ease: this.animationConfig.moveEase,
      force3D: true,
      onComplete: () => {
        gsap.set(tile, { x: 0, y: 0, clearProps: "transform" });
        newCell.appendChild(tile);

        // Scale-based arrival animation
        gsap.from(tile, {
          scale: this.animationConfig.arrivalScale,
          duration: this.animationConfig.arrivalSpeed,
          delay: 0.05,
          ease: this.animationConfig.arrivalEase,
          force3D: true,
        });
      },
    });
  }

  cleanupTiles() {
    this.tiles.forEach((tile, key) => {
      const [x, y] = key.split(",").map(Number);
      if (this.grid[y][x] !== parseInt(tile.dataset.value)) {
        tile.remove();
        this.tiles.delete(key);
      }
    });
  }

  // Add these methods to the Game2048 class
  setSpeed(multiplier) {
    this.animationConfig.moveSpeed *= multiplier;
    this.animationConfig.mergeSpeed *= multiplier;
    this.animationConfig.arrivalSpeed *= multiplier;
    this.animationConfig.newTileDelay *= multiplier;
  }

  // Reset to default speeds
  resetSpeed() {
    this.animationConfig = {
      moveSpeed: 0.15,
      moveEase: "power2.out",
      mergeSpeed: 0.12,
      mergeScale: 1.15,
      mergeEase: "power2.inOut",
      arrivalSpeed: 0.15,
      arrivalScale: 1.08,
      arrivalEase: "power2.out",
      newTileDelay: 100,
    };
    this.resetGame(); // Call new reset method instead
  }

  // New method to handle game reset
  resetGame() {
    // Save current score if it's not zero and game isn't already finished
    if (this.score > 0 && !this.isGameFinished) {
      GameStorage.saveScore(this.score);
    }

    // Reset the game finished flag
    this.isGameFinished = false;

    // Clear saved state
    GameStorage.clearSavedGame();

    // Clear existing tiles
    this.tiles.forEach((tile) => tile.remove());
    this.tiles.clear();

    // Reset score
    this.score = 0;
    this.scoreElement.textContent = "0";

    // Reset grid
    this.grid = Array(4)
      .fill()
      .map(() => Array(4).fill(0));

    // Add initial tiles
    this.addNewTile();
    this.addNewTile();

    // Update the score list
    this.updateScoreList();
  }

  initNewGame() {
    // Clear any existing tiles and grid
    this.tiles.forEach((tile) => tile.remove());
    this.tiles.clear();
    document.querySelector(".grid").innerHTML = "";

    // Initialize the board once
    this.initBoard();

    // Reset game state
    this.grid = Array(4)
      .fill()
      .map(() => Array(4).fill(0));
    this.score = 0;
    this.scoreElement.textContent = "0";

    // Add initial tiles
    this.addNewTile();
    this.addNewTile();
  }

  // Add this new method
  updateScore(addition) {
    this.score += addition;
    this.scoreElement.textContent = this.score;

    // Show score addition animation
    if (addition > 0) {
      const scoreAddition = document.createElement("div");
      scoreAddition.className = "score-addition";
      scoreAddition.textContent = "+" + addition;
      document.querySelector(".score-container").appendChild(scoreAddition);

      // Remove the element after animation
      setTimeout(() => {
        scoreAddition.remove();
      }, 600);
    }
  }

  // Add these new methods for save/load functionality
  saveGame() {
    GameStorage.saveGame(this.grid, this.score);
  }

  loadGame() {
    const savedState = GameStorage.loadGame();

    if (savedState) {
      // Clear existing tiles and grid first
      this.tiles.forEach((tile) => tile.remove());
      this.tiles.clear();
      document.querySelector(".grid").innerHTML = "";

      // Initialize the board
      this.initBoard();

      // Restore the state
      this.grid = savedState.grid;
      this.score = savedState.score;
      this.scoreElement.textContent = this.score;

      // Recreate tiles from saved grid
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          if (this.grid[y][x] !== 0) {
            this.createTile(x, y, this.grid[y][x]);
          }
        }
      }
    } else {
      // Start new game if no valid saved state
      this.initNewGame();
    }
  }

  // Add these methods to handle the confirmation modal
  showConfirmation() {
    document.querySelector(".modal-overlay").classList.add("active");
  }

  hideConfirmation() {
    document.querySelector(".modal-overlay").classList.remove("active");
  }

  saveScore() {
    GameStorage.saveScore(this.score);
    this.updateScoreList();
  }

  getStoredScores() {
    return GameStorage.getStoredScores();
  }

  updateScoreList() {
    const scoreListElement = document.querySelector(".score-list");
    const scores = GameStorage.getStoredScores();
    const bestScore = GameStorage.getBestScore();

    // Create header with arrow
    const headerHtml = `
        <div class="score-list-header">
          <strong>Recent Scores</strong>
          <span class="arrow">▼</span>
        </div>`;

    // Create content
    const contentHtml = `
        <div class="score-list-content">
          <div class="best-score">Best: ${bestScore}</div>
          ${scores
            .map((item) => {
              if (typeof item === "object" && item.score !== undefined) {
                return `<div class="score-entry">
                          <span style="font-size: 14px; font-weight: bold; color: #776e65;">
                              ${item.score} <span style="font-weight: normal; font-size: 12px;">points</span>
                          </span>
                          <br><span style="color: #a9a9a9; font-size: 11px;">${item.timestamp}</span>
                      </div>`;
              }
              return `<div class="score-entry">${item} (old format)</div>`;
            })
            .join("")}
        </div>`;

    scoreListElement.innerHTML = headerHtml + contentHtml;

    // Add click handler for header
    const header = scoreListElement.querySelector(".score-list-header");
    header.addEventListener("click", () => {
      scoreListElement.classList.toggle("collapsed");
    });

    // On mobile, start collapsed
    if (window.innerWidth <= 768) {
      scoreListElement.classList.add("collapsed");
    }
  }

  checkGameOver() {
    if (this.isGameOver()) {
      // Only save score if game just ended
      if (!this.isGameFinished && this.score > 0) {
        this.saveScore();
        this.isGameFinished = true;
      }
    }
  }

  isGameOver() {
    // Check for any empty cells
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        if (this.grid[y][x] === 0) return false;
      }
    }

    // Check for possible merges
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const value = this.grid[y][x];
        // Check right
        if (x < 3 && this.grid[y][x + 1] === value) return false;
        // Check down
        if (y < 3 && this.grid[y + 1][x] === value) return false;
      }
    }

    // If we get here, game is over - show the modal
    this.showGameOverModal();
    return true;
  }

  showGameOverModal() {
    const modalOverlay = document.querySelector(".modal-overlay");
    const modalContent = modalOverlay.querySelector(".modal-content");
    modalContent.innerHTML = `
        <div class="modal-title">Game Over!</div>
        <div class="modal-score">Final Score: ${this.score}</div>
        <div class="modal-buttons">
            <button class="modal-button confirm">New Game</button>
        </div>
      `;

    modalOverlay.classList.add("active");

    // Add click handler for the new game button
    const newGameButton = modalContent.querySelector(".modal-button.confirm");
    newGameButton.addEventListener("click", () => {
      modalOverlay.classList.remove("active");
      this.resetSpeed();
    });
  }
}

new Game2048();

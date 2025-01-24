import {
  saveGameState,
  loadGameState,
  saveScore,
  getStoredScores,
} from "./storage.js";

class Game2048 {
  constructor() {
    // Ultra-optimized animation config
    this.animationConfig = {
      moveSpeed: 0.06, // Even shorter duration
      moveEase: "linear", // Most performant ease
      newTileDelay: 20, // Minimal delay
    };

    // Cache all cell elements for better performance
    this.cellElements = new Map();

    // Pre-calculate positions for all possible moves
    this.positionCache = new Map();

    this.initializeCache();

    // Batch DOM operations
    this.pendingUpdates = new Set();

    // Force GPU acceleration for the game board
    this.gridElement = document.querySelector(".grid");
    gsap.set(this.gridElement, {
      willChange: "transform",
      force3D: true,
      backfaceVisibility: "hidden",
    });

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
  }

  initializeCache() {
    // Cache cell elements
    const cells = document.querySelectorAll(".cell");
    cells.forEach((cell) => {
      const x = parseInt(cell.dataset.x);
      const y = parseInt(cell.dataset.y);
      this.cellElements.set(`${x},${y}`, cell);
    });

    // Pre-calculate all possible positions
    for (let fromX = 0; fromX < 4; fromX++) {
      for (let fromY = 0; fromY < 4; fromY++) {
        for (let toX = 0; toX < 4; toX++) {
          for (let toY = 0; toY < 4; toY++) {
            const key = `${fromX},${fromY}-${toX},${toY}`;
            const moveX =
              (toX - fromX) *
              (this.cellDimensions.width + this.cellDimensions.gap);
            const moveY =
              (toY - fromY) *
              (this.cellDimensions.height + this.cellDimensions.gap);
            this.positionCache.set(key, { moveX, moveY });
          }
        }
      }
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

    // Apply hardware acceleration
    gsap.set(tile, {
      force3D: true,
      z: 0,
      scale: 0,
      rotationZ: 0.01, // Force GPU rendering
    });

    const cell = this.cellElements.get(`${x},${y}`);
    cell.appendChild(tile);
    this.tiles.set(`${x},${y}`, tile);

    // Instant appear with minimal animation
    gsap.to(tile, {
      scale: 1,
      duration: 0.06,
      ease: "linear",
      force3D: true,
    });
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
    if (this.isGameFinished || this.isMoving) return;

    this.isMoving = true;
    let moved = false;

    // Batch DOM operations
    requestAnimationFrame(() => {
      // Movement logic...

      if (moved) {
        setTimeout(() => {
          requestAnimationFrame(() => {
            this.cleanupTiles();
            this.addNewTile();
            this.isMoving = false;
            this.saveGame();
            this.checkGameOver();
          });
        }, this.animationConfig.newTileDelay);
      } else {
        this.isMoving = false;
      }
    });
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

    // Get pre-calculated position
    const positionKey = `${fromX},${fromY}-${toX},${toY}`;
    const { moveX, moveY } = this.positionCache.get(positionKey);

    if (this.grid[toY][toX] > 0) {
      const mergedTile = this.tiles.get(`${toX},${toY}`);
      mergedTile.remove();
      this.updateScore(value);
    }

    this.grid[toY][toX] = value;
    tile.textContent = value;
    tile.dataset.value = value;
    this.tiles.set(`${toX},${toY}`, tile);

    const newCell = this.cellElements.get(`${toX},${toY}`);

    // Ultra-optimized movement
    gsap.to(tile, {
      x: moveX,
      y: moveY,
      duration: this.animationConfig.moveSpeed,
      ease: "linear",
      force3D: true,
      overwrite: true, // Prevent animation conflicts
      clearProps: "transform",
      onComplete: () => {
        newCell.appendChild(tile);
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
    this.animationConfig.newTileDelay *= multiplier;
  }

  // Reset to default speeds
  resetSpeed() {
    this.animationConfig = {
      moveSpeed: 0.06,
      moveEase: "linear",
      newTileDelay: 20,
    };
    this.resetGame(); // Call new reset method instead
  }

  // New method to handle game reset
  resetGame() {
    // Save current score if it's not zero and game isn't already finished
    if (this.score > 0 && !this.isGameFinished) {
      this.saveScore();
    }

    // Reset the game finished flag
    this.isGameFinished = false;

    // Clear saved state
    localStorage.removeItem("game2048");

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
    saveGameState(this.grid, this.score);
  }

  loadGame() {
    const gameState = loadGameState();
    if (gameState) {
      // Clear existing tiles and grid first
      this.tiles.forEach((tile) => tile.remove());
      this.tiles.clear();
      document.querySelector(".grid").innerHTML = "";

      // Initialize the board
      this.initBoard();

      // Restore the state
      this.grid = gameState.grid;
      this.score = gameState.score;
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
    if (this.score > 0 && !this.isGameFinished) {
      saveScore(this.score);
      this.updateScoreList();
    }
  }

  updateScoreList() {
    const scoreListElement = document.querySelector(".score-list");
    const scores = getStoredScores();

    // Calculate best score
    const bestScore = scores.reduce((max, item) => {
      const score = typeof item === "object" ? item.score : item;
      return Math.max(max, score);
    }, 0);

    scoreListElement.innerHTML =
      "<strong>Recent Scores</strong>" +
      `<div class="best-score">Best: ${bestScore}</div>` +
      scores
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
        .join("");
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

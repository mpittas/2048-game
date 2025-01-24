import {
  saveGameState,
  loadGameState,
  saveScore,
  getStoredScores,
} from "./storage.js";

class Game2048 {
  constructor() {
    // Optimize animation config for better performance
    this.animationConfig = {
      // Reduce animation durations for better performance
      moveSpeed: 0.12, // Slightly faster movement
      moveEase: "power1.out", // Simpler easing function

      // Simplified merge animation
      mergeSpeed: 0.1,
      mergeScale: 1.1, // Reduced scale for better performance
      mergeEase: "power1.out",

      // Simplified arrival animation
      arrivalSpeed: 0.1,
      arrivalScale: 1.05,
      arrivalEase: "power1.out",

      // Reduced delay
      newTileDelay: 50, // Faster tile spawn
    };

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
    this.scoreElement = document.querySelector(".score-number");

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

  initBoard() {
    const grid = this.gridElement; // Use cached gridElement
    const fragment = document.createDocumentFragment(); // Use DocumentFragment for batch DOM operations

    for (let y = 0; y < this.cellCount; y++) {
      for (let x = 0; x < this.cellCount; x++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.x = x;
        cell.dataset.y = y;
        fragment.appendChild(cell);
      }
    }

    grid.appendChild(fragment); // Append all cells at once
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

    // Set initial styles before appending to DOM
    tile.style.transform = "scale(0)";
    tile.style.backfaceVisibility = "hidden";
    tile.style.willChange = "transform";

    const cell = this.gridElement.querySelector(
      `.cell[data-x="${x}"][data-y="${y}"]`
    );
    cell.appendChild(tile);
    this.tiles.set(`${x},${y}`, tile);

    // Use GSAP timeline for smoother animations
    gsap.fromTo(
      tile,
      { scale: 0 },
      {
        scale: this.animationConfig.arrivalScale,
        duration: this.animationConfig.arrivalSpeed,
        ease: this.animationConfig.arrivalEase,
        force3D: true,
        onComplete: () => {
          gsap.to(tile, {
            scale: 1,
            duration: 0.1,
            ease: "power2.out",
            force3D: true,
          });
        },
      }
    );
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

    // Touch controls with swipe detection
    let touchStartX = 0;
    let touchStartY = 0;
    const swipeThreshold = 50; // Minimum distance for a swipe

    document.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length > 1 || this.isMoving) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      },
      { passive: true }
    );

    document.addEventListener(
      "touchend",
      (e) => {
        if (this.isMoving) return;
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        if (
          Math.abs(deltaX) < swipeThreshold &&
          Math.abs(deltaY) < swipeThreshold
        ) {
          return; // Not a valid swipe
        }

        let direction = null;
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          direction = deltaX > 0 ? "right" : "left";
        } else {
          direction = deltaY > 0 ? "down" : "up";
        }

        if (direction) {
          this.move(direction);
        }
      },
      { passive: true }
    );

    // Remove or comment out the touchmove handler
    /*
    document.addEventListener(
        "touchmove",
        (e) => {
            e.preventDefault();
        },
        { passive: false }
    );
    */
  }

  move(direction) {
    if (this.isGameFinished || this.isMoving) return;

    this.isMoving = true;
    let moved = false;
    const movements = [];
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
        movements.push({
          fromX: x,
          fromY: y,
          toX: newX,
          toY: newY,
          value: currentValue,
        });
      }
    }

    if (moved) {
      requestAnimationFrame(() => {
        movements.forEach(({ fromX, fromY, toX, toY, value }) => {
          this.moveTile(fromX, fromY, toX, toY, value);
        });

        setTimeout(() => {
          this.cleanupTiles();
          this.addNewTile();
          this.isMoving = false;
          this.saveGame();
          this.checkGameOver();
        }, this.animationConfig.newTileDelay);
      });
    } else {
      this.isMoving = false;
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

    // Calculate movement delta
    const deltaX =
      (toX - fromX) * (this.cellDimensions.width + this.cellDimensions.gap);
    const deltaY =
      (toY - fromY) * (this.cellDimensions.height + this.cellDimensions.gap);

    if (this.grid[toY][toX] > 0) {
      const mergedTile = this.tiles.get(`${toX},${toY}`);

      // Merge animation using timeline
      const mergeTimeline = gsap.timeline({
        onComplete: () => {
          mergedTile.remove();
        },
      });

      mergeTimeline.to(mergedTile, {
        scale: 1.2,
        duration: 0.15,
        ease: "power1.out",
        force3D: true,
      });

      this.updateScore(value);
    }

    this.grid[toY][toX] = value;
    tile.textContent = value;
    tile.dataset.value = value;
    this.tiles.set(`${toX},${toY}`, tile);

    // Ensure the tile is positioned absolutely for smooth transforms
    tile.style.position = "absolute";

    // Use transforms for movement with timeline
    const moveTimeline = gsap.timeline({
      onComplete: () => {
        // Reset transforms after animation
        tile.style.transform = "";
        const newCell = this.gridElement.querySelector(
          `.cell[data-x="${toX}"][data-y="${toY}"]`
        );
        newCell.appendChild(tile);
      },
    });

    moveTimeline.to(tile, {
      x: deltaX,
      y: deltaY,
      duration: this.animationConfig.moveSpeed,
      ease: this.animationConfig.moveEase,
      force3D: true,
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
      moveSpeed: 0.12,
      moveEase: "power1.out",
      mergeSpeed: 0.1,
      mergeScale: 1.1,
      mergeEase: "power1.out",
      arrivalSpeed: 0.1,
      arrivalScale: 1.05,
      arrivalEase: "power1.out",
      newTileDelay: 50,
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

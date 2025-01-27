class Game2048 {
  constructor() {
    this.animations = new GameAnimations();
    this.gridElement = document.querySelector(".grid");
    this.scoreElement = document.querySelector(".score-number");

    this.initializeDimensions();
    this.initializeState();

    this.ui = new GameUI(this);
    this.loadGame();
    this.ui.updateScoreList();
  }

  initializeDimensions() {
    this.gridElement.style.willChange = "transform";
    const cell = document.createElement("div");
    cell.className = "cell";
    this.gridElement.appendChild(cell);
    this.cellDimensions = {
      width: cell.offsetWidth,
      height: cell.offsetHeight,
      gap: 10,
    };
    this.gridElement.removeChild(cell);
  }

  initializeState() {
    this.grid = Array(4)
      .fill()
      .map(() => Array(4).fill(0));
    this.tiles = new Map();
    this.isMoving = false;
    this.score = 0;
    this.isGameFinished = false;
  }

  loadGame() {
    const savedState = GameStorage.loadGame();

    if (savedState) {
      // Clear existing tiles and grid first
      this.tiles.forEach((tile) => tile.remove());
      this.tiles.clear();
      this.gridElement.innerHTML = "";

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
      this.initNewGame();
    }
  }

  initBoard() {
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.x = x;
        cell.dataset.y = y;
        this.gridElement.appendChild(cell);
      }
    }
  }

  initNewGame() {
    // Clear any existing tiles and grid
    this.tiles.forEach((tile) => tile.remove());
    this.tiles.clear();
    this.gridElement.innerHTML = "";

    // Initialize the board
    this.initBoard();

    // Reset game state
    this.grid = Array(4)
      .fill()
      .map(() => Array(4).fill(0));
    this.score = 0;
    this.scoreElement.textContent = "0";
    this.isGameFinished = false;

    // Add initial tiles
    this.addNewTile();
    this.addNewTile();
  }

  createTile(x, y, value) {
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.textContent = value;
    tile.dataset.value = value;

    tile.style.willChange = "transform";
    tile.style.backfaceVisibility = "hidden";

    const cell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
    cell.appendChild(tile);
    this.tiles.set(`${x},${y}`, tile);

    this.animations.animateNewTile(tile);
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

  resetGame() {
    // Save current score if it's not zero and game isn't already finished
    if (this.score > 0 && !this.isGameFinished) {
      GameStorage.saveScore(this.score);
    }

    // Clear the grid
    this.grid = Array(4)
      .fill()
      .map(() => Array(4).fill(0));
    this.score = 0;
    this.isGameFinished = false;
    this.isMoving = false;
    this.scoreElement.textContent = "0";

    // Clear all existing tiles
    this.tiles.forEach((tile) => tile.remove());
    this.tiles.clear();

    // Add two initial tiles
    this.addNewTile();
    this.addNewTile();

    // Save the initial state
    GameStorage.saveGame(this.grid, this.score);

    this.ui.updateScoreList();
  }

  move(direction) {
    // Don't allow moves if game is finished or currently moving
    if (this.isGameFinished || this.isMoving) return;

    this.isMoving = true;
    let moved = false;
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
        GameStorage.saveGame(this.grid, this.score);
        this.checkGameOver();
      }, this.animations.config.newTileDelay);
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
      this.animations.animateMerge(mergedTile);
      this.updateScore(value);
    }

    this.grid[toY][toX] = value;
    tile.textContent = value;
    tile.dataset.value = value;
    this.tiles.set(`${toX},${toY}`, tile);

    const newCell = document.querySelector(
      `.cell[data-x="${toX}"][data-y="${toY}"]`
    );
    this.animations.animateMove(tile, moveX, moveY, newCell);
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

  checkGameOver() {
    if (this.isGameOver()) {
      if (!this.isGameFinished && this.score > 0) {
        GameStorage.saveScore(this.score);
        this.isGameFinished = true;
      }
      this.ui.showGameOverModal();
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

    return true;
  }
}

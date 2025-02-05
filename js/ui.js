class GameUI {
  constructor(game) {
    this.game = game;
    this.setupModal();
    this.setupControls();
  }

  setupModal() {
    const resetButton = document.querySelector(".reset-button");
    const confirmButton = document.querySelector(".modal-button.confirm");
    const cancelButton = document.querySelector(".modal-button.cancel");
    const modalOverlay = document.querySelector(".modal-overlay");

    resetButton.addEventListener("click", () => this.showConfirmation());

    // Handle button clicks
    confirmButton.addEventListener("click", () => {
      this.hideConfirmation();
      this.game.resetGame();
    });

    cancelButton.addEventListener("click", () => this.hideConfirmation());

    // Add keyboard support
    document.addEventListener("keydown", (e) => {
      if (!modalOverlay.classList.contains("active")) return;

      if (e.key === "Escape") {
        e.preventDefault();
        this.hideConfirmation();
      } else if (e.key === "Enter") {
        e.preventDefault();
        this.hideConfirmation();
        this.game.resetGame();
      }
    });

    // Add focus management
    modalOverlay.addEventListener("show", () => {
      confirmButton.focus();
    });
  }

  setupControls() {
    this.setupKeyboardControls();
    this.setupTouchControls();
  }

  setupKeyboardControls() {
    document.addEventListener("keydown", (e) => {
      if (this.game.isMoving) return;
      const directions = {
        37: "left",
        38: "up",
        39: "right",
        40: "down",
      };
      if (directions[e.keyCode]) this.game.move(directions[e.keyCode]);
    });
  }

  setupTouchControls() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    const minSwipeDistance = 20;
    const gameBoard = document.getElementById("game-board");
    let isSwiping = false;

    gameBoard.addEventListener(
      "touchstart",
      (e) => {
        if (e.target !== gameBoard) return; // Only handle touches directly on game board
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
        isSwiping = true;
        e.preventDefault();
      },
      { passive: false }
    );

    gameBoard.addEventListener(
      "touchmove",
      (e) => {
        if (!isSwiping) return;
        e.preventDefault();
      },
      { passive: false }
    );

    gameBoard.addEventListener(
      "touchend",
      (e) => {
        if (!isSwiping) return;
        isSwiping = false;

        if (this.game.isMoving) return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const touchDuration = Date.now() - touchStartTime;

        if (touchDuration > 500) return;

        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const velocity =
          Math.sqrt(deltaX * deltaX + deltaY * deltaY) / touchDuration;

        if (
          velocity > 0.2 ||
          Math.abs(deltaX) > minSwipeDistance ||
          Math.abs(deltaY) > minSwipeDistance
        ) {
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            this.game.move(deltaX > 0 ? "right" : "left");
          } else {
            this.game.move(deltaY > 0 ? "down" : "up");
          }
        }
      },
      { passive: true }
    );
  }

  showConfirmation() {
    document.querySelector(".modal-overlay").classList.add("active");
  }

  hideConfirmation() {
    document.querySelector(".modal-overlay").classList.remove("active");
  }

  showGameOverModal() {
    const modalOverlay = document.querySelector(".modal-overlay");
    const modalContent = modalOverlay.querySelector(".modal-content");
    modalContent.innerHTML = `
    <div class="modal-title">Game Over!</div>
    <div class="modal-score">Final Score: ${this.game.score}</div>
    <div class="modal-buttons">
      <button class="modal-button confirm" autofocus>New Game</button>
    </div>
  `;

    modalOverlay.classList.add("active");

    // Focus the new game button
    const newGameButton = modalContent.querySelector(".modal-button.confirm");
    newGameButton.focus();

    // Add keyboard listener for game over modal
    const handleGameOverKeydown = (e) => {
      if (!modalOverlay.classList.contains("active")) {
        document.removeEventListener("keydown", handleGameOverKeydown);
        return;
      }

      if (e.key === "Enter" || e.key === "Escape") {
        e.preventDefault();
        modalOverlay.classList.remove("active");
        this.game.resetGame();
        document.removeEventListener("keydown", handleGameOverKeydown);
      }
    };

    document.addEventListener("keydown", handleGameOverKeydown);
    newGameButton.addEventListener("click", () => {
      modalOverlay.classList.remove("active");
      this.game.resetGame();
    });
  }

  updateScoreList() {
    const scoreListElement = document.querySelector(".score-list");
    const scoreListContent = scoreListElement.querySelector(
      ".score-list-content"
    );
    const scores = GameStorage.getStoredScores();
    const bestScore = scores.reduce((max, item) => {
      const score = typeof item === "object" ? item.score : item;
      return Math.max(max, score);
    }, 0);

    scoreListContent.innerHTML = `
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
    `;

    // Add click handler if not already added
    if (!scoreListElement.dataset.handlerAdded) {
      const header = scoreListElement.querySelector(".score-list-header");
      header.addEventListener("click", () => {
        if (window.innerWidth <= 1024) {
          // For mobile and tablet
          scoreListElement.classList.toggle("expanded");
          scoreListElement.classList.remove("collapsed");
        } else {
          // For desktop
          scoreListElement.classList.toggle("collapsed");
          scoreListElement.classList.remove("expanded");
        }
      });
      scoreListElement.dataset.handlerAdded = "true";
    }
  }
}

class GameStorage {
  static saveGame(grid, score) {
    const gameState = {
      grid,
      score,
      timestamp: Date.now(),
    };
    localStorage.setItem("game2048", JSON.stringify(gameState));
  }

  static loadGame() {
    const savedState = localStorage.getItem("game2048");
    if (savedState) {
      try {
        const gameState = JSON.parse(savedState);
        if (Date.now() - gameState.timestamp < 24 * 60 * 60 * 1000) {
          return gameState;
        }
      } catch (e) {
        console.error("Error loading saved game:", e);
      }
    }
    return null;
  }

  static saveScore(score) {
    const scores = this.getStoredScores();
    scores.unshift({
      score,
      timestamp: new Date().toLocaleString(),
    });
    const recentScores = scores.slice(0, 10);
    localStorage.setItem("game2048Scores", JSON.stringify(recentScores));
  }

  static getStoredScores() {
    const scores = localStorage.getItem("game2048Scores");
    return scores ? JSON.parse(scores) : [];
  }
}

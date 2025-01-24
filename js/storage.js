class GameStorage {
  static saveGame(grid, score) {
    const gameState = {
      grid: grid,
      score: score,
      timestamp: Date.now(),
    };
    localStorage.setItem("game2048", JSON.stringify(gameState));
  }

  static loadGame() {
    const savedState = localStorage.getItem("game2048");
    if (!savedState) return null;

    try {
      const gameState = JSON.parse(savedState);
      // Only restore if saved within last 24 hours
      if (Date.now() - gameState.timestamp < 24 * 60 * 60 * 1000) {
        return gameState;
      }
    } catch (e) {
      console.error("Error loading saved game:", e);
    }
    return null;
  }

  static clearSavedGame() {
    localStorage.removeItem("game2048");
  }

  static saveScore(score) {
    const scores = this.getStoredScores();
    // Add new score at the beginning of the array
    scores.unshift({
      score: score,
      timestamp: new Date().toLocaleString(),
    });
    // Keep only the last 10 scores
    const recentScores = scores.slice(0, 10);
    localStorage.setItem("game2048Scores", JSON.stringify(recentScores));
  }

  static getStoredScores() {
    const scores = localStorage.getItem("game2048Scores");
    return scores ? JSON.parse(scores) : [];
  }

  static getBestScore() {
    const scores = this.getStoredScores();
    return scores.reduce((max, item) => {
      const score = typeof item === "object" ? item.score : item;
      return Math.max(max, score);
    }, 0);
  }
}

export default GameStorage;

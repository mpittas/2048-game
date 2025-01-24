// Function to save the current game state
function saveGameState(grid, score) {
  const gameState = {
    grid: grid,
    score: score,
    timestamp: Date.now(),
  };
  localStorage.setItem("game2048", JSON.stringify(gameState));
}

// Function to load the saved game state
function loadGameState() {
  const savedState = localStorage.getItem("game2048");
  if (savedState) {
    try {
      const gameState = JSON.parse(savedState);
      // Only restore if saved within the last 24 hours
      if (Date.now() - gameState.timestamp < 24 * 60 * 60 * 1000) {
        return gameState;
      }
    } catch (e) {
      console.error("Error loading saved game:", e);
    }
  }
  return null;
}

// Function to save the score
function saveScore(score) {
  const scores = getStoredScores();
  scores.unshift({
    score: score,
    timestamp: new Date().toLocaleString(),
  });
  const recentScores = scores.slice(0, 10);
  localStorage.setItem("game2048Scores", JSON.stringify(recentScores));
}

// Function to get stored scores
function getStoredScores() {
  const scores = localStorage.getItem("game2048Scores");
  return scores ? JSON.parse(scores) : [];
}

export { saveGameState, loadGameState, saveScore, getStoredScores };

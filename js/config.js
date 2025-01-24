export const ANIMATION_CONFIG = {
  desktop: {
    moveSpeed: 0.15,
    moveEase: "power2.out",
    mergeSpeed: 0.12,
    mergeScale: 1.15,
    mergeEase: "power2.inOut",
    arrivalSpeed: 0.15,
    arrivalScale: 1.08,
    arrivalEase: "power2.out",
    newTileDelay: 100,
  },
  mobile: {
    moveSpeed: 0.12,
    moveEase: "power2.out",
    mergeSpeed: 0.1,
    mergeScale: 1.0,
    mergeEase: "power2.out",
    arrivalSpeed: 0.12,
    arrivalScale: 1.0,
    arrivalEase: "power2.out",
    newTileDelay: 50,
  },
};

export const GRID_SIZE = 4;
export const INITIAL_TILES = 2;
export const NEW_TILE_PROBABILITY = 0.9; // 90% chance for 2, 10% for 4

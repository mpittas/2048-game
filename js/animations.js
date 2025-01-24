export function setupGSAP() {
  gsap.ticker.lagSmoothing(721, 16);
  return gsap.timeline({
    defaults: { duration: 1, ease: "power2.out" },
  });
}

export function animateTile(tile, config) {
  gsap.from(tile, {
    opacity: 0,
    duration: config.arrivalSpeed,
    ease: config.arrivalEase,
    force3D: true,
  });
}

export function animateMerge(tile, config, onComplete) {
  gsap.to(tile, {
    scale: config.mergeScale,
    duration: config.mergeSpeed,
    delay: 0.05,
    ease: config.mergeEase,
    force3D: true,
    onComplete,
  });
}

export function animateMove(tile, moveX, moveY, config, onComplete) {
  gsap.to(tile, {
    x: moveX,
    y: moveY,
    duration: config.moveSpeed,
    delay: 0.03,
    ease: config.moveEase,
    force3D: true,
    onComplete,
  });
}

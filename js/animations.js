class GameAnimations {
  constructor() {
    this.config = {
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
  }

  animateNewTile(tile) {
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

  animateMove(tile, moveX, moveY, newCell) {
    gsap.to(tile, {
      x: moveX,
      y: moveY,
      duration: this.config.moveSpeed,
      ease: this.config.moveEase,
      force3D: true,
      onComplete: () => {
        gsap.set(tile, {
          x: 0,
          y: 0,
          clearProps: "transform",
        });
        newCell.appendChild(tile);

        gsap.from(tile, {
          scale: this.config.arrivalScale,
          duration: this.config.arrivalSpeed,
          ease: this.config.arrivalEase,
          force3D: true,
        });
      },
    });
  }

  animateMerge(tile) {
    gsap.to(tile, {
      scale: this.config.mergeScale,
      duration: this.config.mergeSpeed,
      yoyo: true,
      repeat: 1,
      ease: this.config.mergeEase,
      force3D: true,
      onComplete: () => {
        tile.remove();
      },
    });
  }

  resetSpeed() {
    this.config = {
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
  }
}

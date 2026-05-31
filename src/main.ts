const Phaser = (window as any).Phaser;
import { getResponsiveDimensions } from "./config/GameSettings";
import HelixScene from "./scenes/HelixScene";

// SDK mock is automatically initialized by the framework (dev-init.ts)

// Calculate responsive dimensions based on viewport aspect ratio
// Width stays at 720, height adjusts for tall screens (9:16, 9:19.5, etc.)
const dimensions = getResponsiveDimensions();

// Game configuration
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: dimensions.width,
  height: dimensions.height,
  scale: {
    mode: Phaser.Scale.FIT,
    parent: document.body,
    width: dimensions.width,
    height: dimensions.height,
  },
  transparent: true, // Make Phaser canvas transparent
  scene: [HelixScene],
  physics: {
    default: "arcade",
  },
  fps: {
    target: 60,
  },
  pixelArt: false,
  antialias: true,
};

// Create the game instance
const game = new Phaser.Game(config);

// Store globally for performance monitoring and HMR cleanup
(window as any).game = game;

// NOTE: We intentionally do NOT call game.scale.resize() on window resize.
// Phaser's Scale.FIT mode already handles display scaling automatically.
// Changing the logical game resolution at runtime would break scenes
// that don't have resize handlers (PreloadScene, StartScene).
// The initial getResponsiveDimensions() call above sets the correct
// game resolution for the viewport at startup time.

// No additional initialization needed - SDK integration is handled in HelixScene

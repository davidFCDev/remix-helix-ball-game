import * as THREE from "three";

const Phaser = (window as any).Phaser;

export default class HelixScene extends Phaser.Scene {
  private threeScene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private threeRenderer!: THREE.WebGLRenderer;
  private tower!: THREE.Group;
  private ball!: THREE.Mesh;
  private ballAura!: THREE.Sprite;

  // Power Ups
  private powerUps: THREE.Object3D[] = [];
  private isSuperSmash: boolean = false;
  private platformsToSmash: number = 0;
  private normalMaterial!: THREE.MeshBasicMaterial;
  private superMaterial!: THREE.MeshBasicMaterial;
  private remixerMaterial!: THREE.MeshBasicMaterial;
  private legendMaterial!: THREE.MeshBasicMaterial;
  private masterMaterial!: THREE.MeshBasicMaterial;
  private proMaterial!: THREE.MeshBasicMaterial; // New Pro Material
  private noobMaterial!: THREE.MeshBasicMaterial; // New Noob Material
  private stripedMaterial!: THREE.MeshBasicMaterial;
  private blinkingMaterial!: THREE.MeshBasicMaterial;
  private originalMaterial!: THREE.Material; // Store material before power-up

  // Game State & Physics
  private platforms: THREE.Mesh[] = [];
  private ballVelocity: number = 0;
  private gravity: number = -0.015;
  private jumpStrength: number = 0.35;
  private isGameActive: boolean = true;
  private isGameStarting: boolean = true;
  private isTapToStart: boolean = false;
  private assetsReady: boolean = false;
  private pendingStart: boolean = false;
  private startTimer: number = 0;
  private startText!: Phaser.GameObjects.Text;
  private startOverlay!: Phaser.GameObjects.Graphics;
  private tapToStartOverlay!: Phaser.GameObjects.Graphics;
  private tapToStartText!: Phaser.GameObjects.Text;
  private score: number = 0;
  private comboCount: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  // Particles
  private particles: {
    mesh: THREE.Object3D;
    velocity: THREE.Vector3;
    life: number;
  }[] = [];
  private electricSparks: THREE.Line[] = []; // Electric sparks for Remixer
  private platformThickness: number = 0.8;
  private lowestPlatformY: number = 0;
  private platformIdCounter: number = 0;

  private keys!: { a: Phaser.Input.Keyboard.Key; d: Phaser.Input.Keyboard.Key };
  private scoreContainer!: Phaser.GameObjects.Container;
  private gameOverContainer!: Phaser.GameObjects.Container;

  // Audio
  private beepSound!: Phaser.Sound.BaseSound;
  private jumpSound!: Phaser.Sound.BaseSound;
  private currentMusic!: Phaser.Sound.BaseSound;
  private musicTracks: string[] = ["chaos1"];
  private premiumMusicTracks: string[] = [];
  private chaosMusicTracks: string[] = ["chaos1"]; // Single track for faster loading
  private isFirstGame: boolean = true; // First game uses guaranteed tracks
  private extraMusicLoaded: boolean = false; // Track if extra music has been loaded
  private playerHighScore: number = 0; // Player's high score for premium content
  private threeCanvas!: HTMLCanvasElement;
  private isMuted: boolean = false;
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null; // Master gain for procedural audio mute control
  private testRank: string = "Remixer"; // For development testing
  private selectedBallStyle: string = "unranked"; // User selected ball style
  private isChaosMode: boolean = false; // Chaos mode flag
  private cyberpunkGrid: THREE.Group | null = null; // Cyberpunk background grid
  private sunsetBackground: THREE.Group | null = null; // Sunset background
  private oceanBackground: THREE.Group | null = null; // Ocean background with light rays
  private chaosGravity: number = -0.015; // Progressive gravity for Chaos Mode
  private chaosGravityMax: number = -0.025; // Maximum gravity in Chaos Mode
  private chaosJumpStrength: number = 0.35; // Progressive jump strength for Chaos Mode
  private chaosJumpStrengthMax: number = 0.58; // Maximum jump strength (proportional to gravity)
  private hasShield: boolean = false; // Shield power-up active
  private shieldTimer: number = 0; // Timer for shield duration
  private shieldMesh: THREE.Mesh | null = null; // Visual shield bubble around ball

  // Game Over UI elements to clean up on restart
  private gameOverUIElements: Phaser.GameObjects.GameObject[] = [];
  // Live combo streak display
  private comboStreakText: Phaser.GameObjects.Text | null = null;

  // Trail effect particles (kept for future use)
  private trailParticles: THREE.Mesh[] = [];

  // Performance: Cached geometries and textures (reused instead of creating new ones)
  private cachedTrailGeometry!: THREE.BoxGeometry;
  private cachedGlowTexture!: THREE.CanvasTexture;
  private cachedSparkGeometry!: THREE.BufferGeometry;
  private lastScoreUpdate: number = 0; // Throttle score UI updates
  private lastTrailTime: number = 0; // Throttle trail creation
  private lastSparkTime: number = 0; // Throttle spark creation
  private lastFireTime: number = 0; // Throttle fire trail creation
  private trailColorIndex: number = 0; // Cycles through neon palette

  // Ball Selector UI
  private ballSelectorBtn!: Phaser.GameObjects.Container;
  private ballSelectorClicked: boolean = false;
  private ballPreviewGraphics!: Phaser.GameObjects.Graphics;

  // Ball styles configuration
  private static readonly BALL_STYLES: {
    [key: string]: {
      name: string;
      colors: { base: number; aura?: number };
    };
  } = {
    unranked: { name: "Basic", colors: { base: 0x2ecc71 } },
    noob: { name: "Noob", colors: { base: 0x00d2d3, aura: 0x00d2d3 } },
    pro: { name: "Pro", colors: { base: 0xffffff, aura: 0xff2222 } },
    master: { name: "Master", colors: { base: 0xff6b35, aura: 0xff6b35 } },
    legend: { name: "Legend", colors: { base: 0xff9f43, aura: 0xff9f43 } },
    remixer: { name: "Remixer", colors: { base: 0xb7ff00, aura: 0xb7ff00 } },
  };

  // Level Palettes (for chaos mode colors)
  private static readonly LEVEL_PALETTES: {
    [key: string]: {
      name: string;
      color1: number; // Primary platform color
      color2: number; // Secondary platform color
      color3: number; // Tertiary platform color
      dangerZone: number; // Color for actual danger zones (red areas)
    };
  } = {
    classic: {
      name: "Classic",
      color1: 0x2ecc71, // Green
      color2: 0x3498db, // Blue
      color3: 0x9b59b6, // Purple
      dangerZone: 0xff2222, // Bright red for danger zones
    },
    cyberpunk: {
      name: "Cyberpunk",
      color1: 0x00ff00, // Neon green
      color2: 0xff00ff, // Magenta
      color3: 0xffff00, // Yellow
      dangerZone: 0xff0044, // Neon red for danger zones
    },
    ocean: {
      name: "Ocean",
      color1: 0x0077be, // Ocean blue
      color2: 0x00cec9, // Teal
      color3: 0x81ecec, // Aqua
      dangerZone: 0xff6b6b, // Coral red for danger zones
    },
    sunset: {
      name: "Sunset",
      color1: 0xff7675, // Salmon
      color2: 0xfdcb6e, // Golden
      color3: 0xe17055, // Orange
      dangerZone: 0xd63031, // Dark red for danger zones
    },
  };

  // Level Backgrounds (separate from palettes)
  private static readonly LEVEL_BACKGROUNDS: {
    [key: string]: { name: string; color: number };
  } = {
    classic: { name: "Classic", color: 0xf5d89a }, // Warm yellow/cream
    cyberpunk: { name: "Cyberpunk", color: 0x0a0a0a }, // Near black
    ocean: { name: "Ocean", color: 0x1a1a2e }, // Dark blue
    sunset: { name: "Sunset", color: 0xffeaa7 }, // Warm yellow/orange
  };

  // Trail colors
  private static readonly TRAIL_COLORS: { [key: string]: number[] } = {
    none: [],
    fire: [0xff4500, 0xff6600, 0xff8800, 0xffaa00],
    neon: [0xb7ff00, 0xccff00, 0xffff00, 0x88ff00], // Verde/amarillo neón
    frost: [0xffffff, 0xeeeeff, 0xaaddff, 0xccddff], // Blanco/azul hielo
    rainbow: [0xff0000, 0xff7f00, 0xffff00, 0x00ff00, 0x0000ff, 0x8b00ff],
  };

  constructor() {
    super("HelixScene");
  }

  init(data?: {
    testRank?: string;
    ballStyle?: string;
    highScore?: number;
    chaosMode?: boolean;
  }) {
    // Reset chaos mode first (important for scene restarts)
    this.isChaosMode = true; // Default to chaos mode
    this.trailParticles = []; // Reset trail particles

    if (data?.testRank) {
      this.testRank = data.testRank;
    }
    if (data?.ballStyle) {
      this.selectedBallStyle = data.ballStyle;
    }
    if (typeof data?.highScore === "number") {
      this.playerHighScore = data.highScore;
    }
    if (data?.chaosMode === true) {
      this.isChaosMode = true;
    }
    console.log(
      "🎮 HelixScene init - chaosMode:",
      this.isChaosMode,
      "data:",
      data,
    );
    // Get the Phaser canvas position and size
    const phaserCanvas = this.game.canvas;
    const rect = phaserCanvas.getBoundingClientRect();

    // Setup ThreeJS Layer - match Phaser canvas exactly
    this.threeCanvas = document.createElement("canvas");
    this.threeCanvas.style.zIndex = "0";
    this.threeCanvas.style.position = "absolute";
    this.threeCanvas.style.top = `${rect.top}px`;
    this.threeCanvas.style.left = `${rect.left}px`;
    this.threeCanvas.style.width = `${rect.width}px`;
    this.threeCanvas.style.height = `${rect.height}px`;
    this.threeCanvas.style.pointerEvents = "none";
    document.body.appendChild(this.threeCanvas);

    phaserCanvas.style.position = "relative";
    phaserCanvas.style.zIndex = "1";
    phaserCanvas.style.background = "transparent";

    this.threeScene = new THREE.Scene();
    // Background color - black for Chaos mode, warm yellow/cream for normal
    if (this.isChaosMode) {
      this.threeScene.background = new THREE.Color(0x0a0a0a); // Near black
    } else {
      this.threeScene.background = new THREE.Color(0xf5d89a); // Warm yellow/cream
    }

    const width = rect.width;
    const height = rect.height;
    // Wider FOV on portrait/mobile screens so the scene feels more open
    const isPortrait = height > width;
    const fov = isPortrait ? 80 : 68;
    this.camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 1000);
    this.camera.position.set(0, 5, 11);
    this.camera.lookAt(0, -1, 0);

    this.threeRenderer = new THREE.WebGLRenderer({
      canvas: this.threeCanvas,
      antialias: false, // Disabled for mobile performance
    });
    this.threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio
    this.threeRenderer.setSize(rect.width, rect.height);
  }

  preload() {
    // Intentionally empty — all assets load in background via loadAllAssets()
  }

  create() {
    // No lights needed - using MeshBasicMaterial for flat shading

    // Initialize tower group (platforms will be added in createPlatforms)
    this.tower = new THREE.Group();
    this.threeScene.add(this.tower);

    // Performance: Pre-cache reusable geometries and textures
    this.cachedTrailGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    this.cachedGlowTexture = this.createGlowTexture();

    // Materials - Vibrant colors
    this.normalMaterial = new THREE.MeshBasicMaterial({
      color: 0x2ecc71, // Bright green
    });

    this.remixerMaterial = new THREE.MeshBasicMaterial({
      color: 0xb7ff00, // Neon Green (Remixer)
    });

    // Legend Material - Multicolor Waves
    const legendTexture = this.createLegendTexture();
    this.legendMaterial = new THREE.MeshBasicMaterial({
      map: legendTexture,
    });

    // Gravity Master Material - Two-tone fire (red-orange/yellow)
    const masterTexture = this.createGravityMasterTexture();
    this.masterMaterial = new THREE.MeshBasicMaterial({
      map: masterTexture,
    });

    // Pro Material - Polka Dots
    const proTexture = this.createProTexture();
    this.proMaterial = new THREE.MeshBasicMaterial({
      map: proTexture,
    });

    // Noob Material - Cyan color
    this.noobMaterial = new THREE.MeshBasicMaterial({
      color: 0x00d2d3, // Cyan (Noob)
    });

    this.superMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd93d, // Golden yellow (stars)
    });

    // Striped Material for Moving Platforms - Flat
    const stripedTexture = this.createStripedTexture();
    this.stripedMaterial = new THREE.MeshBasicMaterial({
      map: stripedTexture,
    });

    // Dots Material for Blinking Platforms - Flat with transparency
    const dotsTexture = this.createDotsTexture();
    this.blinkingMaterial = new THREE.MeshBasicMaterial({
      map: dotsTexture,
      transparent: true,
      opacity: 1.0,
    });

    // Create Platforms
    this.createPlatforms();

    // Create Ball - Reduced segments for mobile
    const ballGeo = new THREE.SphereGeometry(0.4, 16, 16);
    this.ball = new THREE.Mesh(ballGeo, this.remixerMaterial); // Use Remixer material by default for testing
    this.ball.position.set(0, 20, 2.5); // Start high up
    this.ball.scale.set(0.1, 0.1, 0.1); // Start tiny

    // Add black outline to ball
    const ballOutlineGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const ballOutlineMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.BackSide,
    });
    const ballOutline = new THREE.Mesh(ballOutlineGeo, ballOutlineMat);
    ballOutline.scale.set(1.15, 1.15, 1.15);
    this.ball.add(ballOutline);

    // Add Aura (Glow)
    const auraTexture = this.createGlowTexture();
    const auraMaterial = new THREE.SpriteMaterial({
      map: auraTexture,
      color: 0xb7ff00, // Remixer neon green
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.ballAura = new THREE.Sprite(auraMaterial);
    this.ballAura.scale.set(2.5, 2.5, 1);
    this.ball.add(this.ballAura);
    this.ballAura.visible = true; // Enable Aura for Remixer testing

    this.threeScene.add(this.ball);

    // Apply ball style based on test rank
    this.applyBallStyle(this.testRank);

    // No point light on ball - flat shading

    // Camera Start - Balanced angle
    this.camera.position.set(0, 5, 11);
    this.camera.lookAt(0, -1, 0);

    // Cyberpunk grid background for Chaos Mode
    if (this.isChaosMode) {
      this.createCyberpunkGrid();
    }

    // Sounds initialized in loadAllAssets() once('complete') callback

    // UI Setup
    this.createUI();

    // Input handling
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys({
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
    }) as any;

    // Touch controls: tap left half = rotate left, tap right half = rotate right
    // No drag needed - just hold to rotate continuously
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      // Ignore if clicking on ball selector button
      if (this.ballSelectorClicked) return;

      (this as any).touchSide =
        pointer.x < this.scale.width / 2 ? "left" : "right";

      // Initialize and unlock AudioContext on first touch (mobile requirement)
      this.unlockAudioContext();
    });

    this.input.on("pointerup", () => {
      (this as any).touchSide = null;
    });

    this.scale.on("resize", this.resize, this);
    this.resize(this.scale.gameSize);

    // SDK Event Listeners
    this.setupSDKListeners();

    // Load all assets in background (non-blocking)
    this.loadAllAssets();

    // Start the game logic (shows TAP TO START immediately)
    this.restartGame();
  }

  private loadAllAssets(): void {
    // Essential audio
    this.load.audio(
      "beep",
      "https://remix.gg/blob/13e738d9-e135-454e-9d2a-e456476a0c5e/beep-aZS0fjcqYMF02tbEaXNicU1ZINgbFv.mp3?mLta",
    );
    this.load.audio(
      "jump",
      "https://remix.gg/blob/13e738d9-e135-454e-9d2a-e456476a0c5e/jump-dl6fQQe9R850MJre81hlFTMQeSeEdt.mp3?x2xm",
    );
    // Single music track only — faster load
    this.load.audio(
      "chaos1",
      "https://remix.gg/blob/13e738d9-e135-454e-9d2a-e456476a0c5e/chaos1-XUTPuodX90SvcqBFbUEoVmRPrnvekZ.mp3?SItV",
    );

    this.load.once("complete", () => {
      // Initialize sounds now that assets are ready
      this.beepSound = this.sound.add("beep", { volume: 0.3 });
      this.jumpSound = this.sound.add("jump", { volume: 0.3 });
      this.extraMusicLoaded = true;
      this.assetsReady = true;

      // If user already tapped, start the countdown now
      if (this.pendingStart) {
        this.pendingStart = false;
        this.tapToStartText.setText("TAP TO START");
        this.beginCountdown();
      }
    });

    this.load.on("loaderror", (file: any) => {
      console.warn("⚠️ Error cargando audio:", file.key);
    });

    this.load.start();
  }

  private loadExtraMusic(): void {
    if (this.extraMusicLoaded) return;
    // Extra music is now loaded upfront in loadAllAssets()
    this.extraMusicLoaded = true;
  }

  createStripedTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d")!;

    // White background (will be tinted by material color)
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 64, 64);

    // Dark stripes
    context.fillStyle = "rgba(0, 0, 0, 0.3)";
    context.beginPath();
    context.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 1);
    return texture;
  }

  createDotsTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d")!;

    // White background (will be tinted by material color)
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 64, 64);

    // Dark dots pattern
    context.fillStyle = "rgba(0, 0, 0, 0.35)";
    const dotRadius = 5;
    const spacing = 14;

    for (let x = spacing / 2; x < 64; x += spacing) {
      for (let y = spacing / 2; y < 64; y += spacing) {
        context.beginPath();
        context.arc(x, y, dotRadius, 0, Math.PI * 2);
        context.fill();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3);
    return texture;
  }

  createGridTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d")!;

    // Background (Black)
    context.fillStyle = "#000000";
    context.fillRect(0, 0, 64, 64);

    // Grid lines (Bright Green)
    context.strokeStyle = "#00FF41";
    context.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x < 64; x += 8) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, 64);
      context.stroke();
    }

    // Horizontal lines
    for (let y = 0; y < 64; y += 8) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(64, y);
      context.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
  }

  createBarberPoleTexture() {
    const canvas = document.createElement("canvas");
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d")!;

    // Dark 2-color scheme
    const color1 = "#2a2a2a";
    const color2 = "#1a1a1a";

    // Fill background
    context.fillStyle = color1;
    context.fillRect(0, 0, size, size);

    // Draw diagonal stripes - tileable pattern
    context.fillStyle = color2;
    const stripeWidth = size / 2;

    // Draw stripes that tile seamlessly
    for (let i = -size; i < size * 2; i += stripeWidth * 2) {
      context.beginPath();
      context.moveTo(i, 0);
      context.lineTo(i + stripeWidth, 0);
      context.lineTo(i + stripeWidth + size, size);
      context.lineTo(i + size, size);
      context.closePath();
      context.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 50);
    return texture;
  }

  createUI() {
    const width = this.scale.width;
    const height = this.scale.height;

    // Score position: on tall/fullscreen screens push down to avoid camera/notch
    const isTallScreen = height > 1100;
    const scoreY = isTallScreen
      ? Math.round(height * 0.12)
      : Math.round(height * 0.074);
    this.scoreContainer = this.add.container(width / 2, scoreY);

    this.scoreText = this.add
      .text(0, 0, "0", {
        fontSize: "100px",
        color: "#FFFFFF",
        fontFamily: "Fredoka",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 12,
      })
      .setOrigin(0.5);

    this.scoreContainer.add(this.scoreText);

    this.scoreContainer.add(this.scoreText);
    this.scoreContainer.setVisible(false); // Hide initially

    // Tap to Start overlay
    this.tapToStartOverlay = this.add.graphics();
    this.tapToStartOverlay.fillStyle(0x000000, 0.85);
    this.tapToStartOverlay.fillRect(0, 0, width, height);
    this.tapToStartOverlay.setDepth(199);
    this.tapToStartOverlay.setVisible(false);

    this.tapToStartText = this.add
      .text(width / 2, height / 2, "TAP TO START", {
        fontSize: "38px",
        color: "#FFFFFF",
        fontFamily: "'Fredoka One', 'Arial Black', Arial, sans-serif",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 6,
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(200)
      .setVisible(false);

    // Pulsating animation for tap text
    this.tweens.add({
      targets: this.tapToStartText,
      alpha: 0.4,
      duration: 700,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    });

    // Start Overlay
    this.startOverlay = this.add.graphics();
    this.startOverlay.fillStyle(0x000000, 0.8);
    this.startOverlay.fillRect(0, 0, width, height);
    this.startOverlay.setDepth(199);

    this.startText = this.add
      .text(width / 2, height / 2 - 180, "READY", {
        fontSize: "120px",
        color: "#FFFFFF",
        fontFamily: "Fredoka",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 12,
      })
      .setOrigin(0.5)
      .setDepth(200);

    this.gameOverContainer = this.add.container(width / 2, height / 2);
    this.gameOverContainer.setVisible(false);
    this.gameOverContainer.setDepth(100);

    // Ball Selector Button — only shown if user has purchased 'ball-styles'
    this.createBallSelectorButton(width, height);
  }

  createBallSelectorButton(width: number, height: number) {
    const btnSize = 70;
    const margin = 14;

    // Position at right side, upper-middle area
    this.ballSelectorBtn = this.add.container(
      width - margin - btnSize / 2,
      height * 0.35,
    );
    this.ballSelectorBtn.setDepth(150);
    this.ballSelectorBtn.setAlpha(0.9);

    // Start hidden — will be revealed once SDK confirms 'ball-styles' purchase
    this.ballSelectorBtn.setVisible(false);

    // Button background - clean dark style with border
    const btnBg = this.add.graphics();
    // Outer glow/border effect
    btnBg.fillStyle(0x000000, 1);
    btnBg.fillRoundedRect(
      -btnSize / 2 - 3,
      -btnSize / 2 - 3,
      btnSize + 6,
      btnSize + 6,
      16,
    );
    // Inner dark background
    btnBg.fillStyle(0x1a1a2e, 1);
    btnBg.fillRoundedRect(-btnSize / 2, -btnSize / 2, btnSize, btnSize, 14);
    // Subtle inner highlight
    btnBg.lineStyle(2, 0x4a4a6a, 0.8);
    btnBg.strokeRoundedRect(
      -btnSize / 2 + 2,
      -btnSize / 2 + 2,
      btnSize - 4,
      btnSize - 4,
      12,
    );
    this.ballSelectorBtn.add(btnBg);

    // Ball icon border (black circle behind)
    const ballBorder = this.add.graphics();
    ballBorder.fillStyle(0x000000, 1);
    ballBorder.fillCircle(0, 0, 25);
    this.ballSelectorBtn.add(ballBorder);

    // Ball icon (preview of current ball)
    this.ballPreviewGraphics = this.add.graphics();
    this.drawBallPreview(this.ballPreviewGraphics, this.selectedBallStyle, 21);
    this.ballSelectorBtn.add(this.ballPreviewGraphics);

    // Interactive zone - prevent click from affecting tower rotation
    const zone = this.add
      .zone(0, 0, btnSize + 16, btnSize + 16)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        // Mark that this click is on the button, not for tower rotation
        this.ballSelectorClicked = true;
        pointer.event.stopPropagation();
        if (this.isGameActive) {
          this.cycleToNextBall();
        }
      })
      .on("pointerup", () => {
        // Reset flag after a short delay
        this.time.delayedCall(50, () => {
          this.ballSelectorClicked = false;
        });
      })
      .on("pointerover", () => {
        this.ballSelectorBtn.setAlpha(1);
        this.tweens.add({
          targets: this.ballSelectorBtn,
          scale: 1.1,
          duration: 100,
        });
      })
      .on("pointerout", () => {
        this.ballSelectorBtn.setAlpha(0.9);
        this.ballSelectorClicked = false;
        this.tweens.add({
          targets: this.ballSelectorBtn,
          scale: 1,
          duration: 100,
        });
      });
    this.ballSelectorBtn.add(zone);

    // Check SDK for 'ball-styles' purchase
    this.checkBallStylesPurchase();
  }

  /**
   * Wait for SDK ready, then check if user has purchased 'ball-styles'.
   * Also listens for onPurchaseComplete so the button appears if bought mid-session.
   */
  private async checkBallStylesPurchase() {
    const sdk = (window as any).FarcadeSDK;
    if (!sdk) return;

    // Wait for SDK to be ready (loads player data including purchasedItems)
    try {
      await sdk.ready();
    } catch {
      // SDK ready failed — leave button hidden
      return;
    }

    // Check if user already owns 'ball-styles'
    if (sdk.hasItem("ball-styles")) {
      this.revealBallSelectorBtn();
    }

    // Listen for purchases completed mid-session
    sdk.onPurchaseComplete(() => {
      if (
        sdk.hasItem("ball-styles") &&
        this.ballSelectorBtn &&
        !this.ballSelectorBtn.visible
      ) {
        this.revealBallSelectorBtn();
      }
    });
  }

  /** Fade-in the ball selector button */
  private revealBallSelectorBtn() {
    if (!this.ballSelectorBtn) return;
    this.ballSelectorBtn.setVisible(true);
    this.ballSelectorBtn.setAlpha(0);
    this.tweens.add({
      targets: this.ballSelectorBtn,
      alpha: 0.9,
      duration: 300,
      ease: "Quad.easeOut",
    });
  }

  cycleToNextBall() {
    const allStyles = Object.keys(HelixScene.BALL_STYLES);
    const currentIndex = allStyles.indexOf(this.selectedBallStyle);
    const nextIndex = (currentIndex + 1) % allStyles.length;
    const nextStyle = allStyles[nextIndex];

    this.selectedBallStyle = nextStyle;

    // Apply the new ball style immediately
    this.applyBallStyle(this.testRank);

    // Update the button preview
    if (this.ballPreviewGraphics) {
      this.drawBallPreview(this.ballPreviewGraphics, nextStyle, 18);
    }

    // Small bounce animation on the button
    this.tweens.add({
      targets: this.ballSelectorBtn,
      scale: 1.25,
      duration: 80,
      yoyo: true,
      ease: "Quad.easeOut",
    });

    // Ball style kept in memory only (this.selectedBallStyle)
  }

  drawBallPreview(
    graphics: Phaser.GameObjects.Graphics,
    styleKey: string,
    radius: number,
  ) {
    graphics.clear();
    const style =
      HelixScene.BALL_STYLES[styleKey] || HelixScene.BALL_STYLES.unranked;

    // Draw ball based on style
    switch (styleKey) {
      case "remixer":
        graphics.fillStyle(0xb7ff00, 1);
        graphics.fillCircle(0, 0, radius);
        break;
      case "legend":
        // Multi-color segments
        const legendColors = [0xff9f43, 0xe91e8c, 0x00d2d3, 0xfeca57];
        const segments = 8;
        const segmentAngle = (Math.PI * 2) / segments;
        for (let i = 0; i < segments; i++) {
          const color = legendColors[i % legendColors.length];
          graphics.fillStyle(color, 1);
          graphics.slice(
            0,
            0,
            radius,
            i * segmentAngle,
            (i + 1) * segmentAngle,
            false,
          );
          graphics.fillPath();
        }
        break;
      case "master":
        // Two-tone: orange/yellow
        graphics.fillStyle(0xff6b35, 1);
        graphics.slice(0, 0, radius, Math.PI, Math.PI * 2, false);
        graphics.fillPath();
        graphics.fillStyle(0xffd93d, 1);
        graphics.slice(0, 0, radius, 0, Math.PI, false);
        graphics.fillPath();
        break;
      case "pro":
        // White with red dots
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(0, 0, radius);
        graphics.fillStyle(0xff2222, 1);
        graphics.fillCircle(-radius * 0.4, -radius * 0.3, radius * 0.25);
        graphics.fillCircle(radius * 0.3, radius * 0.2, radius * 0.2);
        break;
      case "noob":
        graphics.fillStyle(0x00d2d3, 1);
        graphics.fillCircle(0, 0, radius);
        break;
      default:
        graphics.fillStyle(0x2ecc71, 1);
        graphics.fillCircle(0, 0, radius);
        break;
    }
  }

  resize(gameSize: Phaser.Structs.Size) {
    const width = gameSize.width;
    const height = gameSize.height;

    this.threeRenderer.setSize(width, height);
    this.camera.aspect = width / height;
    // Keep FOV in sync with orientation
    this.camera.fov = height > width ? 80 : 68;
    this.camera.updateProjectionMatrix();

    const threeCanvas = this.threeRenderer.domElement;
    const phaserCanvas = this.game.canvas;

    const rect = phaserCanvas.getBoundingClientRect();

    threeCanvas.style.position = "absolute";
    threeCanvas.style.left = rect.left + "px";
    threeCanvas.style.top = rect.top + "px";
    threeCanvas.style.width = rect.width + "px";
    threeCanvas.style.height = rect.height + "px";
    threeCanvas.style.zIndex = "0";

    // Adjust UI elements for current aspect ratio
    this.adjustUIForAspectRatio(width, height);
  }

  /**
   * Adjust UI element positions based on current aspect ratio.
   * On tall screens (9:16, 9:19.5) elements are pushed down slightly
   * to avoid notch/status bar overlap and maintain visual balance.
   */
  private adjustUIForAspectRatio(width: number, height: number): void {
    // Score container — on standard 2:3 (1080) keep at ~7.4% from top.
    // On fullscreen tall screens (height > 1080) push it down further
    // to avoid being covered by the device camera/notch.
    if (this.scoreContainer) {
      const isTallScreen = height > 1100;
      const scoreY = isTallScreen
        ? Math.round(height * 0.12) // ~12% from top on tall screens
        : Math.round(height * 0.074); // ~7.4% on standard 2:3
      this.scoreContainer.setPosition(width / 2, scoreY);
    }

    // Ball selector button — reposition to match new height
    if (this.ballSelectorBtn) {
      const btnSize = 70;
      const margin = 14;
      this.ballSelectorBtn.setPosition(
        width - margin - btnSize / 2,
        height * 0.35,
      );
    }

    // Start overlay — redraw to cover full area
    if (this.startOverlay && this.startOverlay.visible) {
      this.startOverlay.clear();
      this.startOverlay.fillStyle(0x000000, 0.8);
      this.startOverlay.fillRect(0, 0, width, height);
    }

    // Start text — keep centered with offset
    if (this.startText) {
      this.startText.setPosition(width / 2, height / 2 - 180);
    }
  }

  createPlatforms() {
    const platformCount = 80; // Reduced for mobile performance

    console.log("🏗️ createPlatforms - isChaosMode:", this.isChaosMode);

    // Determine colors based on mode
    let colors: number[];

    if (this.isChaosMode) {
      // Cyberpunk palette for Chaos mode (green, purple, yellow)
      colors = [0x00ff00, 0xff00ff, 0xffff00]; // Neon Green, Purple, Yellow
    } else {
      // Classic mode - use all 3 colors from classic palette
      const classicPalette = HelixScene.LEVEL_PALETTES.classic;
      colors = [
        classicPalette.color1,
        classicPalette.color2,
        classicPalette.color3,
      ];
    }

    this.platforms = [];
    this.powerUps = [];
    this.lowestPlatformY = 0; // Reset lowest platform tracker
    this.platformIdCounter = 0; // Reset ID counter
    this.tower.clear();

    // Tower style - dark for Chaos, barber pole for normal
    let towerMesh;
    if (this.isChaosMode) {
      // Dark purple/black tower for Chaos mode
      towerMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(2, 2, 10000, 16),
        new THREE.MeshBasicMaterial({ color: 0x1a0a2e }), // Dark purple
      );
    } else {
      // Barber pole style tower
      const barberTexture = this.createBarberPoleTexture();
      towerMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(2, 2, 10000, 16),
        new THREE.MeshBasicMaterial({ map: barberTexture }),
      );
    }
    towerMesh.position.y = -4500; // Offset down so most is below Y=0
    this.tower.add(towerMesh);

    for (let i = 0; i < platformCount; i++) {
      const yPos = -2 - i * 4;

      // Boss Platform — challenge platform (no gap, hit all target gems to destroy)
      if (i >= 30 && Math.random() < 0.12) {
        // Remove any power-ups floating too close above this boss (from the previous platform)
        for (let j = this.powerUps.length - 1; j >= 0; j--) {
          const pu = this.powerUps[j];
          if (pu.position.y > yPos && pu.position.y < yPos + 5) {
            this.tower.remove(pu);
            this.powerUps.splice(j, 1);
          }
        }
        const boss = this.createBossPlatformMesh(yPos);
        this.tower.add(boss);
        this.platforms.push(boss);
        if (yPos < this.lowestPlatformY) this.lowestPlatformY = yPos;
        continue;
      }

      // 1. Generate Gaps
      const numGaps = i > 10 && Math.random() > 0.7 ? 2 : 1;
      const gaps: {
        start: number;
        end: number;
        size: number;
        center: number;
      }[] = [];
      const solidSegments: { start: number; end: number }[] = [];

      const isOverlapping = (start: number, size: number) => {
        for (const g of gaps) {
          const center = start + size / 2;
          const dist = Math.abs(g.center - center);
          const minDist = (g.size + size) / 2 + 0.5;
          if (dist < minDist) return true;
          if (Math.abs(dist - Math.PI * 2) < minDist) return true;
        }
        return false;
      };

      for (let g = 0; g < numGaps; g++) {
        let valid = false;
        let attempts = 0;
        while (!valid && attempts < 20) {
          const size = Math.PI / 4 + Math.random() * (Math.PI / 2.5);
          const start = Math.random() * Math.PI * 2;
          if (!isOverlapping(start, size)) {
            gaps.push({
              start,
              end: start + size,
              size,
              center: start + size / 2,
            });
            valid = true;
          }
          attempts++;
        }
      }
      if (gaps.length === 0) {
        const size = Math.PI / 4;
        const start = 0;
        gaps.push({ start, end: start + size, size, center: start + size / 2 });
      }
      gaps.sort((a, b) => a.start - b.start);

      if (gaps.length === 1) {
        const g = gaps[0];
        solidSegments.push({ start: g.end, end: g.start + Math.PI * 2 });
      } else {
        for (let j = 0; j < gaps.length; j++) {
          const currentGap = gaps[j];
          const nextGap = gaps[(j + 1) % gaps.length];
          let start = currentGap.end;
          let end = nextGap.start;
          if (end < start) end += Math.PI * 2;
          solidSegments.push({ start, end });
        }
      }

      // Construct Shape
      const innerRadius = 2;
      const outerRadius = 4;
      const shape = new THREE.Shape();
      for (const seg of solidSegments) {
        shape.moveTo(
          innerRadius * Math.cos(seg.start),
          innerRadius * Math.sin(seg.start),
        );
        shape.lineTo(
          outerRadius * Math.cos(seg.start),
          outerRadius * Math.sin(seg.start),
        );
        shape.absarc(0, 0, outerRadius, seg.start, seg.end, false);
        shape.lineTo(
          innerRadius * Math.cos(seg.end),
          innerRadius * Math.sin(seg.end),
        );
        shape.absarc(0, 0, innerRadius, seg.end, seg.start, true);
      }

      const extrudeSettings = {
        depth: this.platformThickness,
        bevelEnabled: false,
      };
      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

      // Determine Platform Type (mutually exclusive)
      let isMoving = false;
      let isBlinking = false;
      let moveSpeed = 0;

      if (i > 20 && Math.random() < 0.2) {
        // Blinking platforms (20% chance after level 20)
        isBlinking = true;
      } else if (i > 10 && Math.random() < 0.3) {
        // Rotating platforms (30% chance after level 10) - Faster in Chaos Mode
        isMoving = true;
        const baseSpeed = this.isChaosMode ? 0.01 : 0.005;
        const randomSpeed = this.isChaosMode ? 0.02 : 0.01;
        moveSpeed =
          (Math.random() > 0.5 ? 1 : -1) *
          (baseSpeed + Math.random() * randomSpeed);
      }

      // Select Material - use colors array defined at top (neon for Chaos, normal otherwise)
      const baseColor = colors[i % colors.length];

      let material;
      if (isBlinking) {
        // Blinking: base color + dots overlay texture
        material = new THREE.MeshBasicMaterial({
          color: baseColor,
          map: this.blinkingMaterial.map,
          transparent: true,
          opacity: 1.0,
        });
      } else if (isMoving) {
        // Moving: base color + stripes overlay texture
        material = new THREE.MeshBasicMaterial({
          color: baseColor,
          map: this.stripedMaterial.map,
        });
      } else {
        // Normal: just base color
        material = new THREE.MeshBasicMaterial({ color: baseColor });
      }

      const platform = new THREE.Mesh(geometry, material);
      platform.rotation.x = -Math.PI / 2;
      platform.position.y = yPos;
      const rotationZ = Math.random() * Math.PI * 2;
      platform.rotation.z = rotationZ;

      // Add black outline using a slightly larger mesh behind
      const outlineGeo = geometry.clone();
      const outlineMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        side: THREE.BackSide,
      });
      const outline = new THREE.Mesh(outlineGeo, outlineMat);
      outline.scale.set(1.03, 1.03, 1.15);
      platform.add(outline);

      // Danger Zones
      const dangerZones: { start: number; size: number }[] = [];
      if (i > 0) {
        let minZones = 0;
        let maxZones = 1;
        if (i > 10) {
          minZones = 0;
          maxZones = 2;
        }
        if (i > 25) {
          minZones = 1;
          maxZones = 2;
        }
        if (i > 50) {
          minZones = 1;
          maxZones = 3;
        }
        if (i > 75) {
          minZones = 2;
          maxZones = 3;
        }
        const numZones =
          minZones + Math.floor(Math.random() * (maxZones - minZones + 1));
        const zoneSize = Math.PI / 5;

        for (let z = 0; z < numZones; z++) {
          if (solidSegments.length === 0) continue;
          const segIndex = Math.floor(Math.random() * solidSegments.length);
          const seg = solidSegments[segIndex];
          const segLength = seg.end - seg.start;
          if (segLength > zoneSize + 0.2) {
            const offset = Math.random() * (segLength - zoneSize);
            const zoneStart = seg.start + offset;
            let overlap = false;
            for (const dz of dangerZones) {
              if (Math.abs(dz.start - zoneStart) < zoneSize + 0.1)
                overlap = true;
            }

            if (!overlap) {
              dangerZones.push({ start: zoneStart, size: zoneSize });
              const dangerShape = new THREE.Shape();
              const dEnd = zoneStart + zoneSize;
              dangerShape.moveTo(
                innerRadius * Math.cos(zoneStart),
                innerRadius * Math.sin(zoneStart),
              );
              dangerShape.lineTo(
                outerRadius * Math.cos(zoneStart),
                outerRadius * Math.sin(zoneStart),
              );
              dangerShape.absarc(0, 0, outerRadius, zoneStart, dEnd, false);
              dangerShape.absarc(0, 0, innerRadius, dEnd, zoneStart, true);
              const dangerGeo = new THREE.ExtrudeGeometry(dangerShape, {
                depth: this.platformThickness + 0.05,
                bevelEnabled: false,
              });
              // Danger color: Chaos mode neon red or default red
              let dangerColor: number;
              if (this.isChaosMode) {
                dangerColor = 0xff0044;
              } else {
                dangerColor = HelixScene.LEVEL_PALETTES.classic.dangerZone;
              }
              const dangerMat = new THREE.MeshBasicMaterial({
                color: dangerColor,
              });
              const dangerMesh = new THREE.Mesh(dangerGeo, dangerMat);
              platform.add(dangerMesh);
            }
          }
        }
      }

      // Power Ups - Chaos mode has 4x more power-ups
      const powerUpChance = this.isChaosMode ? 0.2 : 0.05;
      if (i > 5 && i < platformCount - 1 && Math.random() < powerUpChance) {
        if (solidSegments.length > 0) {
          const seg =
            solidSegments[Math.floor(Math.random() * solidSegments.length)];
          const angle = seg.start + Math.random() * (seg.end - seg.start);
          const radius = 3;

          const worldAngle = angle + rotationZ;
          const betweenY = yPos - 2;

          // In Chaos Mode, 35% chance for Shield, 65% for Super Smash
          const isShieldPowerUp = this.isChaosMode && Math.random() < 0.35;

          const group = new THREE.Group();

          if (isShieldPowerUp) {
            // Shield power-up - Cyan bubble/sphere
            const shieldMat = new THREE.MeshBasicMaterial({
              color: 0x00ffff, // Cyan
              transparent: true,
              opacity: 0.7,
            });
            const outlineMat = new THREE.MeshBasicMaterial({
              color: 0x000000,
              side: THREE.BackSide,
            });

            // Outer sphere
            const sphereGeo = new THREE.SphereGeometry(0.5, 16, 16);
            const sphere = new THREE.Mesh(sphereGeo, shieldMat);
            const sphereOutline = new THREE.Mesh(sphereGeo, outlineMat);
            sphereOutline.scale.set(1.15, 1.15, 1.15);
            sphere.add(sphereOutline);
            group.add(sphere);

            // Inner ring for visual effect
            const ringGeo = new THREE.TorusGeometry(0.35, 0.08, 8, 16);
            const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2;
            group.add(ring);

            group.userData = {
              isPowerUp: true,
              isShield: true,
              rotationSpeed: 0.06,
              bobSpeed: 0.04,
              time: Math.random() * 100,
              baseY: betweenY,
            };
          } else {
            // Original Super Smash power-up (cone + cylinder)
            const coneGeo = new THREE.ConeGeometry(0.4, 0.8, 8);
            const mat = new THREE.MeshBasicMaterial({
              color: 0xffd93d, // Yellow gold
            });
            const cone = new THREE.Mesh(coneGeo, mat);
            cone.rotation.x = Math.PI;
            cone.position.y = -0.4;

            const coneOutlineGeo = new THREE.ConeGeometry(0.4, 0.8, 8);
            const outlineMat = new THREE.MeshBasicMaterial({
              color: 0x000000,
              side: THREE.BackSide,
            });
            const coneOutline = new THREE.Mesh(coneOutlineGeo, outlineMat);
            coneOutline.scale.set(1.15, 1.1, 1.15);
            cone.add(coneOutline);
            group.add(cone);

            const cylGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 8);
            const cyl = new THREE.Mesh(cylGeo, mat);
            cyl.position.y = 0.4;
            const cylOutlineGeo = new THREE.CylinderGeometry(
              0.15,
              0.15,
              0.8,
              8,
            );
            const cylOutline = new THREE.Mesh(cylOutlineGeo, outlineMat);
            cylOutline.scale.set(1.2, 1.1, 1.2);
            cyl.add(cylOutline);
            group.add(cyl);

            group.userData = {
              isPowerUp: true,
              isShield: false,
              rotationSpeed: 0.05,
              bobSpeed: 0.05,
              time: Math.random() * 100,
              baseY: betweenY,
            };
          }

          group.position.set(
            Math.cos(worldAngle) * radius,
            betweenY,
            Math.sin(worldAngle) * radius,
          );

          group.scale.set(1.2, 1.2, 1.2);

          this.tower.add(group);
          this.powerUps.push(group);
        }
      }

      platform.userData = {
        isBase: false,
        gaps: gaps,
        rotationOffset: rotationZ,
        id: i,
        dangerZones: dangerZones,
        isMoving: isMoving,
        moveSpeed: moveSpeed,
        isBlinking: isBlinking,
        blinkTime: Math.random() * 100, // Random start offset for blink cycle
        blinkChildren: null as THREE.MeshBasicMaterial[] | null, // Cached for performance
      };

      // Pre-cache child materials for blinking platforms (performance optimization)
      if (isBlinking) {
        const childMaterials: THREE.MeshBasicMaterial[] = [];
        platform.traverse((child) => {
          if (child !== platform && (child as THREE.Mesh).material) {
            const childMat = (child as THREE.Mesh)
              .material as THREE.MeshBasicMaterial;
            if (childMat.opacity !== undefined) {
              childMat.transparent = true;
              childMaterials.push(childMat);
            }
          }
        });
        platform.userData.blinkChildren = childMaterials;
      }

      this.tower.add(platform);
      this.platforms.push(platform);

      // Track lowest platform position
      if (yPos < this.lowestPlatformY) {
        this.lowestPlatformY = yPos;
      }
    }

    this.platformIdCounter = platformCount;
  }

  // Generate a single new platform at a specific Y position
  spawnNewPlatform(yPos: number) {
    // Boss Platform — challenge platform
    if (this.platformIdCounter >= 30 && Math.random() < 0.12) {
      // Remove any power-ups floating too close above this boss (from the previous spawn)
      for (let j = this.powerUps.length - 1; j >= 0; j--) {
        const pu = this.powerUps[j];
        if (pu.position.y > yPos && pu.position.y < yPos + 5) {
          this.tower.remove(pu);
          this.powerUps.splice(j, 1);
        }
      }
      const boss = this.createBossPlatformMesh(yPos);
      this.tower.add(boss);
      this.platforms.push(boss);
      this.platformIdCounter++;
      this.lowestPlatformY = yPos;
      return;
    }

    // Platform colors - based on mode (Chaos or Classic)
    let platformColors: number[];
    if (this.isChaosMode) {
      platformColors = [0x00ff00, 0xff00ff, 0xffff00]; // Neon Green, Purple, Yellow
    } else {
      // Classic mode - use all 3 colors from classic palette
      const classicPalette = HelixScene.LEVEL_PALETTES.classic;
      platformColors = [
        classicPalette.color1,
        classicPalette.color2,
        classicPalette.color3,
      ];
    }
    const innerRadius = 2;
    const outerRadius = 4;

    // Use a virtual "level" based on platformIdCounter to maintain consistent difficulty
    // This simulates the same i-based difficulty as createPlatforms
    // Cap at level 80 (same as initial platformCount) for consistent max difficulty
    const level = Math.min(this.platformIdCounter, 80);

    // 1. Generate Gaps - same logic as createPlatforms
    const numGaps = level > 10 && Math.random() > 0.7 ? 2 : 1;
    const gaps: { start: number; end: number; size: number; center: number }[] =
      [];

    const isOverlapping = (start: number, size: number) => {
      for (const g of gaps) {
        const center = start + size / 2;
        const dist = Math.abs(g.center - center);
        const minDist = (g.size + size) / 2 + 0.5;
        if (dist < minDist) return true;
        if (Math.abs(dist - Math.PI * 2) < minDist) return true;
      }
      return false;
    };

    for (let g = 0; g < numGaps; g++) {
      let valid = false;
      let attempts = 0;
      while (!valid && attempts < 20) {
        const size = Math.PI / 4 + Math.random() * (Math.PI / 2.5);
        const start = Math.random() * Math.PI * 2;
        if (!isOverlapping(start, size)) {
          gaps.push({
            start,
            end: start + size,
            size,
            center: start + size / 2,
          });
          valid = true;
        }
        attempts++;
      }
    }
    if (gaps.length === 0) {
      const size = Math.PI / 4;
      const start = 0;
      gaps.push({ start, end: start + size, size, center: start + size / 2 });
    }
    gaps.sort((a, b) => a.start - b.start);

    // Build solid segments
    const solidSegments: { start: number; end: number }[] = [];
    if (gaps.length === 1) {
      const g = gaps[0];
      solidSegments.push({ start: g.end, end: g.start + Math.PI * 2 });
    } else {
      for (let j = 0; j < gaps.length; j++) {
        const currentGap = gaps[j];
        const nextGap = gaps[(j + 1) % gaps.length];
        let start = currentGap.end;
        let end = nextGap.start;
        if (end < start) end += Math.PI * 2;
        solidSegments.push({ start, end });
      }
    }

    // Construct Shape
    const shape = new THREE.Shape();
    for (const seg of solidSegments) {
      shape.moveTo(
        innerRadius * Math.cos(seg.start),
        innerRadius * Math.sin(seg.start),
      );
      shape.lineTo(
        outerRadius * Math.cos(seg.start),
        outerRadius * Math.sin(seg.start),
      );
      shape.absarc(0, 0, outerRadius, seg.start, seg.end, false);
      shape.lineTo(
        innerRadius * Math.cos(seg.end),
        innerRadius * Math.sin(seg.end),
      );
      shape.absarc(0, 0, innerRadius, seg.end, seg.start, true);
    }

    const extrudeSettings = {
      depth: this.platformThickness,
      bevelEnabled: false,
    };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // Determine Platform Type (mutually exclusive) - SAME logic as createPlatforms
    let isMoving = false;
    let isBlinking = false;
    let moveSpeed = 0;

    if (level > 20 && Math.random() < 0.2) {
      // Blinking platforms (20% chance after level 20)
      isBlinking = true;
    } else if (level > 10 && Math.random() < 0.3) {
      // Rotating platforms (30% chance after level 10) - Faster in Chaos Mode
      isMoving = true;
      const baseSpeed = this.isChaosMode ? 0.01 : 0.005;
      const randomSpeed = this.isChaosMode ? 0.02 : 0.01;
      moveSpeed =
        (Math.random() > 0.5 ? 1 : -1) *
        (baseSpeed + Math.random() * randomSpeed);
    }

    // Select Material - All platforms use same color palette
    const baseColor =
      platformColors[this.platformIdCounter % platformColors.length];

    let material;
    if (isBlinking) {
      material = new THREE.MeshBasicMaterial({
        color: baseColor,
        map: this.blinkingMaterial.map,
        transparent: true,
        opacity: 1.0,
      });
    } else if (isMoving) {
      material = new THREE.MeshBasicMaterial({
        color: baseColor,
        map: this.stripedMaterial.map,
      });
    } else {
      material = new THREE.MeshBasicMaterial({ color: baseColor });
    }

    const platform = new THREE.Mesh(geometry, material);
    // Use same rotation system as createPlatforms: rotation.x for laying flat, rotation.z for orientation
    platform.rotation.x = -Math.PI / 2;
    const rotationZ = Math.random() * Math.PI * 2;
    platform.rotation.z = rotationZ;
    platform.position.y = yPos;

    // Add black outline using a slightly larger mesh behind
    const outlineGeo = geometry.clone();
    const outlineMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.BackSide,
    });
    const outline = new THREE.Mesh(outlineGeo, outlineMat);
    outline.scale.set(1.03, 1.03, 1.15);
    platform.add(outline);

    // Danger Zones - SAME logic as createPlatforms
    const dangerZones: { start: number; size: number }[] = [];
    if (level > 0) {
      let minZones = 0;
      let maxZones = 1;
      if (level > 10) {
        minZones = 0;
        maxZones = 2;
      }
      if (level > 25) {
        minZones = 1;
        maxZones = 2;
      }
      if (level > 50) {
        minZones = 1;
        maxZones = 3;
      }
      if (level > 75) {
        minZones = 2;
        maxZones = 3;
      }
      const numZones =
        minZones + Math.floor(Math.random() * (maxZones - minZones + 1));
      const zoneSize = Math.PI / 5;

      for (let z = 0; z < numZones; z++) {
        if (solidSegments.length === 0) continue;
        const segIndex = Math.floor(Math.random() * solidSegments.length);
        const seg = solidSegments[segIndex];
        const segLength = seg.end - seg.start;
        if (segLength > zoneSize + 0.2) {
          const offset = Math.random() * (segLength - zoneSize);
          const zoneStart = seg.start + offset;
          let overlap = false;
          for (const dz of dangerZones) {
            if (Math.abs(dz.start - zoneStart) < zoneSize + 0.1) overlap = true;
          }

          if (!overlap) {
            dangerZones.push({ start: zoneStart, size: zoneSize });
            const dangerShape = new THREE.Shape();
            const dEnd = zoneStart + zoneSize;
            dangerShape.moveTo(
              innerRadius * Math.cos(zoneStart),
              innerRadius * Math.sin(zoneStart),
            );
            dangerShape.lineTo(
              outerRadius * Math.cos(zoneStart),
              outerRadius * Math.sin(zoneStart),
            );
            dangerShape.absarc(0, 0, outerRadius, zoneStart, dEnd, false);
            dangerShape.absarc(0, 0, innerRadius, dEnd, zoneStart, true);
            const dangerGeo = new THREE.ExtrudeGeometry(dangerShape, {
              depth: this.platformThickness + 0.05,
              bevelEnabled: false,
            });
            // Danger color: Chaos mode neon red or default red
            let dangerColor: number;
            if (this.isChaosMode) {
              dangerColor = 0xff0044;
            } else {
              dangerColor = HelixScene.LEVEL_PALETTES.classic.dangerZone;
            }
            const dangerMat = new THREE.MeshBasicMaterial({
              color: dangerColor,
            });
            const dangerMesh = new THREE.Mesh(dangerGeo, dangerMat);
            platform.add(dangerMesh);
          }
        }
      }
    }

    // Power Ups - SAME logic as createPlatforms, Chaos mode has 4x more power-ups
    const powerUpChance = this.isChaosMode ? 0.2 : 0.05;
    if (level > 5 && Math.random() < powerUpChance) {
      if (solidSegments.length > 0) {
        const seg =
          solidSegments[Math.floor(Math.random() * solidSegments.length)];
        const angle = seg.start + Math.random() * (seg.end - seg.start);
        const radius = 3;

        const worldAngle = angle + rotationZ;
        const betweenY = yPos - 2;

        // In Chaos Mode: 35% chance for Shield, 65% for Super Smash
        const isShieldPowerUp = this.isChaosMode && Math.random() < 0.35;

        const group = new THREE.Group();

        if (isShieldPowerUp) {
          // Shield power-up - cyan torus
          const torusGeo = new THREE.TorusGeometry(0.4, 0.15, 8, 16);
          const shieldMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff, // Cyan
            transparent: true,
            opacity: 0.9,
          });
          const torus = new THREE.Mesh(torusGeo, shieldMat);

          // Add glow effect
          const glowGeo = new THREE.TorusGeometry(0.45, 0.2, 8, 16);
          const glowMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.3,
          });
          const glow = new THREE.Mesh(glowGeo, glowMat);
          group.add(glow);
          group.add(torus);

          group.position.set(
            Math.cos(worldAngle) * radius,
            betweenY,
            Math.sin(worldAngle) * radius,
          );

          group.scale.set(1.2, 1.2, 1.2);

          group.userData = {
            isPowerUp: true,
            isShield: true,
            rotationSpeed: 0.08, // Faster rotation
            bobSpeed: 0.05,
            time: Math.random() * 100,
            baseY: betweenY,
          };
        } else {
          // Super Smash power-up - yellow cone
          const coneGeo = new THREE.ConeGeometry(0.4, 0.8, 8);
          const mat = new THREE.MeshBasicMaterial({
            color: 0xffd93d, // Yellow gold
          });
          const cone = new THREE.Mesh(coneGeo, mat);
          cone.rotation.x = Math.PI;
          cone.position.y = -0.4;

          // Add black outline to cone
          const coneOutlineGeo = new THREE.ConeGeometry(0.4, 0.8, 8);
          const outlineMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            side: THREE.BackSide,
          });
          const coneOutline = new THREE.Mesh(coneOutlineGeo, outlineMat);
          coneOutline.scale.set(1.15, 1.1, 1.15);
          cone.add(coneOutline);

          group.add(cone);

          const cylGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 8);
          const cyl = new THREE.Mesh(cylGeo, mat);
          cyl.position.y = 0.4;

          // Add black outline to cylinder
          const cylOutlineGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 8);
          const cylOutline = new THREE.Mesh(cylOutlineGeo, outlineMat);
          cylOutline.scale.set(1.2, 1.1, 1.2);
          cyl.add(cylOutline);

          group.add(cyl);

          group.position.set(
            Math.cos(worldAngle) * radius,
            betweenY,
            Math.sin(worldAngle) * radius,
          );

          group.scale.set(1.2, 1.2, 1.2);

          group.userData = {
            isPowerUp: true,
            rotationSpeed: 0.05,
            bobSpeed: 0.05,
            time: Math.random() * 100,
            baseY: betweenY,
          };
        }

        this.tower.add(group);
        this.powerUps.push(group);
      }
    }

    platform.userData = {
      isBase: false,
      gaps: gaps,
      rotationOffset: rotationZ,
      id: this.platformIdCounter,
      dangerZones: dangerZones,
      isMoving: isMoving,
      moveSpeed: moveSpeed,
      isBlinking: isBlinking,
      blinkTime: Math.random() * 100,
      blinkChildren: null as THREE.MeshBasicMaterial[] | null, // Cached for performance
    };

    // Pre-cache child materials for blinking platforms (performance optimization)
    if (isBlinking) {
      const childMaterials: THREE.MeshBasicMaterial[] = [];
      platform.traverse((child) => {
        if (child !== platform && (child as THREE.Mesh).material) {
          const childMat = (child as THREE.Mesh)
            .material as THREE.MeshBasicMaterial;
          if (childMat.opacity !== undefined) {
            childMat.transparent = true;
            childMaterials.push(childMat);
          }
        }
      });
      platform.userData.blinkChildren = childMaterials;
    }

    this.tower.add(platform);
    this.platforms.push(platform);
    this.platformIdCounter++;
    this.lowestPlatformY = yPos;
  }

  restartGame() {
    // Clean up Game Over UI elements
    this.gameOverUIElements.forEach((element) => {
      if (element && element.destroy) {
        element.destroy();
      }
    });
    this.gameOverUIElements = [];

    // Audio Reset
    if (this.currentMusic) {
      this.currentMusic.stop();
      this.currentMusic = null;
    }

    // Show "Tap to Start" — actual countdown begins on tap
    this.isGameActive = false;
    this.isGameStarting = false;
    this.isTapToStart = true;
    this.startText.setVisible(false);
    this.startOverlay.setVisible(false);
    this.tapToStartOverlay.setVisible(true);
    this.tapToStartText.setVisible(true);
    this.tapToStartText.setAlpha(1);

    this.input.once("pointerdown", () => {
      if (!this.isTapToStart) return;
      this.isTapToStart = false;
      this.tapToStartOverlay.setVisible(false);
      this.tapToStartText.setVisible(false);
      this.unlockAudioContext();
      // Unlock Phaser's WebAudio context explicitly (critical for mobile/WebView)
      try {
        const phaserCtx = (this.sound as any).context;
        if (phaserCtx && phaserCtx.state === "suspended") {
          phaserCtx.resume().catch(() => {});
        }
      } catch (_) {}

      if (this.assetsReady) {
        this.beginCountdown();
      } else {
        // Assets still loading — show feedback and start when ready
        this.pendingStart = true;
        this.tapToStartText.setText("Loading...");
        this.tapToStartText.setVisible(true);
        this.tapToStartOverlay.setVisible(true);
      }
    });

    this.score = 0;
    this.comboCount = 0;
    this.scoreText.setText("0");
    this.scoreContainer.setVisible(false); // Hide during start
    this.gameOverContainer.setVisible(false);
    this.isSuperSmash = false;
    this.platformsToSmash = 0;

    // Reset Shield power-up
    this.isShieldActive = false;
    this.shieldTimer = 0;
    if (this.shieldVisual) {
      this.threeScene.remove(this.shieldVisual);
      this.shieldVisual = null;
    }

    // Reset Chaos Mode gravity and jump strength
    this.chaosGravity = -0.015;
    this.chaosJumpStrength = 0.35;

    // Apply ball style based on test rank
    this.applyBallStyle(this.testRank);

    this.ballVelocity = 0;
    this.ball.position.set(0, 20, 2.5);
    this.ball.scale.set(0.1, 0.1, 0.1);
    this.camera.position.set(0, 5, 11);
    this.camera.lookAt(0, -1, 0);

    for (const p of this.particles) {
      this.threeScene.remove(p.mesh);
    }
    this.particles = [];

    this.createPlatforms();
  }

  private beginCountdown() {
    this.tapToStartOverlay.setVisible(false);
    this.tapToStartText.setVisible(false);

    // Start music now that assets are guaranteed loaded
    if (this.currentMusic) {
      this.currentMusic.stop();
      this.currentMusic = null;
    }
    const selectedTrack = this.isChaosMode
      ? this.isFirstGame
        ? "chaos1"
        : this.getAvailableMusicTracks()[
            Math.floor(Math.random() * this.getAvailableMusicTracks().length)
          ]
      : this.isFirstGame
        ? "music1"
        : this.getAvailableMusicTracks()[
            Math.floor(Math.random() * this.getAvailableMusicTracks().length)
          ];
    this.isFirstGame = false;
    this.currentMusic = this.sound.add(selectedTrack, {
      volume: 0,
      loop: true,
    });
    // Ensure Phaser's AudioContext is running before playing (mobile fix)
    const pCtx = (this.sound as any).context;
    if (pCtx && pCtx.state === "suspended") {
      pCtx
        .resume()
        .then(() => {
          if (this.currentMusic && !(this.currentMusic as any).isPlaying) {
            this.currentMusic.play();
          }
        })
        .catch(() => {
          this.currentMusic?.play();
        });
    } else {
      this.currentMusic.play();
    }

    this.isGameActive = true;
    this.isGameStarting = true;
    this.startTimer = 0;
    this.startText.setVisible(true);
    this.startText.setText("");
    this.startOverlay.setVisible(true);
    this.startOverlay.setAlpha(1);
  }

  update(time: number, delta: number) {
    if (!this.isGameActive) return;

    // Pause game logic when ball selector is open
    if (this.isBallSelectorOpen) {
      // Still render the scene but don't update physics
      this.threeRenderer.render(this.threeScene, this.camera);
      return;
    }

    // Frame-independent delta multiplier (normalized to 60 FPS)
    // At 60 FPS: delta ≈ 16.67ms, so deltaMultiplier ≈ 1.0
    // At 30 FPS: delta ≈ 33.33ms, so deltaMultiplier ≈ 2.0
    const targetDelta = 1000 / 60; // 16.67ms for 60 FPS
    const deltaMultiplier = Math.min(delta / targetDelta, 3); // Cap at 3x to prevent huge jumps

    if (this.isGameStarting) {
      this.startTimer += delta / 1000;

      const initialDelay = 1.0;
      const stepTime = 1.0; // Adjusted time between texts
      const totalTime = initialDelay + stepTime * 3;

      if (this.startTimer < totalTime) {
        const progress = this.startTimer / totalTime;

        // Fade in music volume (0 to 1)
        if (this.currentMusic) {
          (this.currentMusic as any).setVolume(progress);
        }

        // Animate Ball
        this.ball.position.y = 20 - 18 * progress;
        const scale = 0.1 + 0.9 * progress;
        this.ball.scale.set(scale, scale, scale);

        // Update Text & Play Beep
        if (this.startTimer < initialDelay) {
          if (this.startText.text !== "") {
            this.startText.setText("");
          }
        } else if (this.startTimer < initialDelay + stepTime) {
          if (this.startText.text !== "READY") {
            this.startText.setText("READY");
            this.beepSound?.play();
          }
        } else if (this.startTimer < initialDelay + stepTime * 2) {
          if (this.startText.text !== "STEADY") {
            this.startText.setText("STEADY");
            this.beepSound?.play();
          }
        } else {
          if (this.startText.text !== "GO!") {
            this.startText.setText("GO!");
            this.beepSound?.play();
          }
          // Fade out overlay in the last step
          const timeInGo = this.startTimer - (initialDelay + stepTime * 2);
          this.startOverlay.setAlpha(1 - timeInGo / stepTime);
        }

        // Camera Follow - Balanced view
        const targetY = this.ball.position.y + 4;
        this.camera.position.y += (targetY - this.camera.position.y) * 0.1;
        this.camera.lookAt(0, this.camera.position.y - 6, 0);

        // Keep cyberpunk grid following camera during countdown (Chaos mode)
        if (this.cyberpunkGrid && this.isChaosMode) {
          this.cyberpunkGrid.position.y = this.camera.position.y;
        }

        this.threeRenderer.render(this.threeScene, this.camera);
        return;
      } else {
        // End Start Sequence
        this.isGameStarting = false;
        this.startText.setVisible(false);
        this.startOverlay.setVisible(false);
        this.scoreContainer.setVisible(true); // Show score
        this.ball.position.y = 2;
        this.ball.scale.set(1, 1, 1);
        this.ballVelocity = 0; // Reset velocity
      }
    }

    // Keyboard Rotation (frame-independent)
    const rotationSpeed = 0.05 * deltaMultiplier;
    if (this.cursors.left.isDown || this.keys.a.isDown) {
      this.tower.rotation.y -= rotationSpeed;
    } else if (this.cursors.right.isDown || this.keys.d.isDown) {
      this.tower.rotation.y += rotationSpeed;
    }

    // Touch Rotation - tap and hold left/right side of screen (frame-independent)
    const touchSide = (this as any).touchSide;
    if (touchSide === "left") {
      this.tower.rotation.y -= rotationSpeed;
    } else if (touchSide === "right") {
      this.tower.rotation.y += rotationSpeed;
    }

    // Update Platforms (Movement & Blinking) - frame-independent
    for (let i = 0, len = this.platforms.length; i < len; i++) {
      const platform = this.platforms[i];

      if (platform.userData.isMoving) {
        platform.rotation.z += platform.userData.moveSpeed * deltaMultiplier;
        // Keep rotationOffset in sync [0, 2PI]
        let rot = platform.rotation.z % (Math.PI * 2);
        if (rot < 0) rot += Math.PI * 2;
        platform.userData.rotationOffset = rot;
      }

      if (platform.userData.isBlinking) {
        // Update blink time (frame-independent) - Faster in Chaos Mode
        const blinkSpeed = this.isChaosMode ? 0.05 : 0.03;
        platform.userData.blinkTime += blinkSpeed * deltaMultiplier;

        // Smooth fade in/out using sine wave - Faster frequency in Chaos Mode
        const blinkFrequency = this.isChaosMode ? 0.8 : 0.5;
        const opacity =
          (Math.sin(platform.userData.blinkTime * blinkFrequency) + 1) / 2;
        const finalOpacity = 0.1 + opacity * 0.9;

        // Set material opacity for platform
        const material = platform.material as THREE.MeshBasicMaterial;
        material.opacity = finalOpacity;
        material.transparent = true;

        // Apply opacity to cached children (danger zones, outline) - avoid traverse
        const blinkChildren = platform.userData.blinkChildren;
        if (blinkChildren) {
          for (let j = 0, cLen = blinkChildren.length; j < cLen; j++) {
            const childMat = blinkChildren[j];
            childMat.opacity = finalOpacity;
          }
        }

        // Track visibility state for collision
        platform.userData.isCurrentlyVisible = opacity > 0.4;
      }

      // Boss platform: animate target gems and outer glow ring
      if (platform.userData.isBossPlatform) {
        platform.userData.bossTime += 0.05 * deltaMultiplier;
        const bt = platform.userData.bossTime;
        for (const target of platform.userData.bossTargets) {
          if (target.destroyed) continue;
          if (target.arcMesh) {
            const mat = target.arcMesh.material as THREE.MeshBasicMaterial;
            mat.opacity = 0.55 + 0.45 * Math.sin(bt * 4 + target.phaseOffset);
          }
          if (target.indicatorMesh) {
            target.indicatorMesh.position.z =
              this.platformThickness +
              0.7 +
              0.18 * Math.sin(bt * 5 + target.phaseOffset);
            target.indicatorMesh.rotation.z += 0.03 * deltaMultiplier;
          }
        }
        if (platform.userData.glowRingMesh) {
          const glowMat = platform.userData.glowRingMesh
            .material as THREE.MeshBasicMaterial;
          glowMat.opacity = 0.3 + 0.3 * Math.sin(bt * 2.5);
        }
      }
    }

    // Update Power Ups (frame-independent)
    for (const pu of this.powerUps) {
      pu.rotation.y += 0.05 * deltaMultiplier; // Rotate around Y
      pu.userData.time += 0.1 * deltaMultiplier;
      pu.position.y = pu.userData.baseY + Math.sin(pu.userData.time) * 0.2;
    }

    // Update Particles (frame-independent)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i] as any;
      p.life -= 0.02 * deltaMultiplier;

      if (p.isShockwave) {
        // Expand ring (frame-independent)
        const expandFactor = 1 + 0.05 * deltaMultiplier;
        p.mesh.scale.multiplyScalar(expandFactor);
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = p.life;
      } else {
        // Normal particle (frame-independent)
        const scaledVelocity = p.velocity
          .clone()
          .multiplyScalar(deltaMultiplier);
        p.mesh.position.add(scaledVelocity);
        // Fade out
        if (p.mesh.material.opacity !== undefined) {
          p.mesh.material.opacity = p.life;
        }
        // Shrink slightly (frame-independent)
        const shrinkFactor = Math.pow(0.98, deltaMultiplier);
        p.mesh.scale.multiplyScalar(shrinkFactor);
      }

      if (p.life <= 0) {
        this.threeScene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }

    // Ball trail effect — layered multicolor neon glow (throttled)
    if (this.isGameActive && !this.isGameStarting) {
      const now = time;
      if (now - this.lastTrailTime > 32 && this.particles.length < 80) {
        this.lastTrailTime = now;

        // Cycle through 4 cyberpunk neon colors deterministically (no random)
        const neonPalette = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff88];
        const trailColor = neonPalette[this.trailColorIndex % 4];
        this.trailColorIndex++;

        // Outer glow — neon color, large halo
        const outerMat = new THREE.SpriteMaterial({
          map: this.cachedGlowTexture,
          color: trailColor,
          transparent: true,
          opacity: 0.28,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const outer = new THREE.Sprite(outerMat);
        outer.scale.set(1.4, 1.4, 1);
        outer.position.copy(this.ball.position);
        this.threeScene.add(outer);
        this.particles.push({
          mesh: outer,
          velocity: new THREE.Vector3(0, 0, 0),
          life: 0.7,
        });

        // Core glow — white hot centre
        const coreMat = new THREE.SpriteMaterial({
          map: this.cachedGlowTexture,
          color: 0xffffff,
          transparent: true,
          opacity: 0.5,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const core = new THREE.Sprite(coreMat);
        core.scale.set(0.55, 0.55, 1);
        core.position.copy(this.ball.position);
        this.threeScene.add(core);
        this.particles.push({
          mesh: core,
          velocity: new THREE.Vector3(0, 0, 0),
          life: 0.45,
        });
      }
    }

    // Physics (frame-independent)
    if (this.isSuperSmash) {
      this.ballVelocity = -0.8; // Fixed velocity for super smash (not affected by delta)

      // Trail Effect - Throttled for performance (use cached geometry)
      const now = time;
      if (now - this.lastTrailTime > 40 && this.particles.length < 60) {
        // ~25 trails per second max, limit total
        this.lastTrailTime = now;

        // Get color based on current ball material
        const materialToCheck = this.ball.material;
        let trailColor = 0x2ecc71; // Default green

        if (materialToCheck === this.remixerMaterial) {
          trailColor = 0xb7ff00; // Remixer neon green
        } else if (materialToCheck === this.masterMaterial) {
          // Random color from Gravity Master palette (two-tone)
          const masterColors = [0xff6b35, 0xffd93d]; // Red-Orange, Yellow
          trailColor =
            masterColors[Math.floor(Math.random() * masterColors.length)];
        } else if (materialToCheck === this.legendMaterial) {
          // Random color from Legend palette
          const legendColors = [0xff9f43, 0xe91e8c, 0x00d2d3, 0xfeca57];
          trailColor =
            legendColors[Math.floor(Math.random() * legendColors.length)];
        } else if (materialToCheck === this.proMaterial) {
          // Pro colors - white and red
          const proColors = [0xffffff, 0xff2222];
          trailColor = proColors[Math.floor(Math.random() * proColors.length)];
        } else if (materialToCheck === this.noobMaterial) {
          trailColor = 0x00d2d3; // Noob cyan
        }

        const trailMat = new THREE.MeshBasicMaterial({ color: trailColor });
        const trail = new THREE.Mesh(this.cachedTrailGeometry, trailMat);
        trail.position.copy(this.ball.position);
        trail.position.y += 0.5;
        this.threeScene.add(trail);
        this.particles.push({
          mesh: trail,
          velocity: new THREE.Vector3(0, 0.1, 0),
          life: 0.5,
        });
      }
    } else {
      // In Chaos Mode, use progressive gravity
      const currentGravity = this.isChaosMode
        ? this.chaosGravity
        : this.gravity;
      this.ballVelocity += currentGravity * deltaMultiplier;

      // Gradually increase chaos gravity and jump strength up to max
      if (this.isChaosMode && this.chaosGravity > this.chaosGravityMax) {
        this.chaosGravity -= 0.00001 * deltaMultiplier; // Slow increase
        // Increase jump strength proportionally to maintain same jump height
        this.chaosJumpStrength = 0.35 * (this.chaosGravity / -0.015);
      }
    }

    const nextY = this.ball.position.y + this.ballVelocity * deltaMultiplier;

    // Collision Detection
    let collided = false;

    // Check Power Up Collection
    let ballAngleInTower =
      (Math.PI / 2 - this.tower.rotation.y + Math.PI) % (Math.PI * 2);
    if (ballAngleInTower < 0) ballAngleInTower += Math.PI * 2;

    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];
      const puWorldPos = new THREE.Vector3();
      pu.getWorldPosition(puWorldPos);

      const dx = this.ball.position.x - puWorldPos.x;
      const dy = this.ball.position.y - puWorldPos.y;
      const dz = this.ball.position.z - puWorldPos.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance < 1.2) {
        // Check if it's a Shield power-up
        if (pu.userData.isShield) {
          this.activateShield();
        } else {
          this.activateSuperSmash();
        }
        this.tower.remove(pu);
        this.powerUps.splice(i, 1);

        // Add explosion with shockwave for power-up - match ball color
        let explosionColor = pu.userData.isShield ? 0x00ffff : 0x2ecc71; // Cyan for shield, green default

        if (this.ball.material === this.remixerMaterial) {
          explosionColor = 0xb7ff00; // Remixer neon green
        } else if (this.ball.material === this.masterMaterial) {
          // Random color from Gravity Master palette (two-tone)
          const masterColors = [0xff6b35, 0xffd93d]; // Red-Orange, Yellow
          explosionColor =
            masterColors[Math.floor(Math.random() * masterColors.length)];
        } else if (this.ball.material === this.legendMaterial) {
          // Random color from Legend palette
          const legendColors = [0xff9f43, 0xe91e8c, 0x00d2d3, 0xfeca57];
          explosionColor =
            legendColors[Math.floor(Math.random() * legendColors.length)];
        } else if (this.ball.material === this.proMaterial) {
          // Pro colors - white and red
          const proColors = [0xffffff, 0xff2222];
          explosionColor =
            proColors[Math.floor(Math.random() * proColors.length)];
        } else if (this.ball.material === this.noobMaterial) {
          explosionColor = 0x00d2d3; // Noob cyan
        }

        this.createExplosion(puWorldPos.y, explosionColor, 15, true);
      }
    }

    for (let i = this.platforms.length - 1; i >= 0; i--) {
      const platform = this.platforms[i];

      if (Math.abs(platform.position.y - this.ball.position.y) > 5) continue;

      // Check blinking platforms - pass through when invisible
      if (platform.userData.isBlinking) {
        if (!platform.userData.isCurrentlyVisible) {
          // Platform is invisible - ball passes through
          const platformY = platform.position.y;
          const topSurfaceY = platformY + this.platformThickness;

          if (
            this.ballVelocity < 0 &&
            this.ball.position.y >= topSurfaceY &&
            nextY <= topSurfaceY
          ) {
            // Ball passed through invisible platform - destroy it
            this.destroyPlatform(platform, i);
            const pointsPerPlatform = this.isChaosMode ? 2 : 1;
            this.score += pointsPerPlatform;
            this.scoreText.setText(this.score.toString());
          }
          continue; // Skip normal collision check
        }
      }

      const platformY = platform.position.y;
      const topSurfaceY = platformY + this.platformThickness;

      if (this.ballVelocity < 0) {
        if (this.ball.position.y >= topSurfaceY && nextY <= topSurfaceY) {
          if (this.isSuperSmash && !platform.userData.isBossPlatform) {
            this.destroyPlatform(platform, i);
            const pointsPerPlatform = this.isChaosMode ? 2 : 1;
            this.score += pointsPerPlatform;
            this.comboCount++;
            this.scoreText.setText(this.score.toString());
            this.createExplosion(platform.position.y, 0xffd93d, 18); // Yellow explosion for smash
            this.playSmashSound(); // Play smash sound

            this.platformsToSmash--;
            if (this.platformsToSmash <= 0) {
              this.isSuperSmash = false;
              this.ballVelocity = this.isChaosMode
                ? this.chaosJumpStrength
                : this.jumpStrength;
              this.resolveCombo();
            }
            collided = true;
          } else if (platform.userData.isBossPlatform) {
            // Boss Platform neutralises super smash — cancel it so ball gets a normal bounce
            if (this.isSuperSmash) {
              this.isSuperSmash = false;
              this.platformsToSmash = 0;
            }
            // Boss Platform — multi-hit mechanic: must hit all target gems to break
            const bossResult = this.checkBossCollision(platform);
            if (bossResult.type === "danger") {
              if (this.isShieldActive) {
                this.isShieldActive = false;
                this.shieldTimer = 0;
                if (this.shieldVisual) {
                  const mat = this.shieldVisual
                    .material as THREE.MeshBasicMaterial;
                  mat.opacity = 1.0;
                  this.createExplosion(
                    this.ball.position.y,
                    0x00ffff,
                    12,
                    true,
                  );
                  this.threeScene.remove(this.shieldVisual);
                  this.shieldVisual = null;
                }
                this.ballVelocity = this.isChaosMode
                  ? this.chaosJumpStrength
                  : this.jumpStrength;
                this.ball.position.y = topSurfaceY;
              } else {
                this.gameOverSplatter(topSurfaceY);
                return;
              }
            } else if (bossResult.type === "target") {
              this.hitBossTarget(
                platform,
                bossResult.targetIndex,
                i,
                topSurfaceY,
              );
            } else {
              // Safe zone — bounce without scoring
              this.ballVelocity = this.isChaosMode
                ? this.chaosJumpStrength
                : this.jumpStrength;
              this.ball.position.y = topSurfaceY;
              this.jumpSound?.play();
            }
            collided = true;
          } else {
            const collisionResult = this.checkCollision(platform);

            if (collisionResult === "hit") {
              this.ballVelocity = this.isChaosMode
                ? this.chaosJumpStrength
                : this.jumpStrength;
              this.ball.position.y = topSurfaceY;
              this.jumpSound?.play();
              this.resolveCombo();
              collided = true;
            } else if (collisionResult === "danger") {
              // Shield protects from danger zones but gets consumed
              if (this.isShieldActive) {
                // Destroy platform instead of dying
                this.destroyPlatform(platform, i);
                const pointsPerPlatform = this.isChaosMode ? 2 : 1;
                this.score += pointsPerPlatform;
                this.comboCount++;
                this.scoreText.setText(this.score.toString());

                // Consume shield - deactivate it
                this.isShieldActive = false;
                this.shieldTimer = 0;

                // Create shield break effect
                if (this.shieldVisual) {
                  // Flash bright before removing
                  const mat = this.shieldVisual
                    .material as THREE.MeshBasicMaterial;
                  mat.opacity = 1.0;

                  // Create cyan explosion effect
                  this.createExplosion(
                    this.ball.position.y,
                    0x00ffff,
                    12,
                    true,
                  );

                  // Remove shield visual
                  this.threeScene.remove(this.shieldVisual);
                  this.shieldVisual = null;
                }
              } else {
                this.gameOverSplatter(topSurfaceY);
                return;
              }
            } else {
              this.destroyPlatform(platform, i);
              const pointsPerPlatform = this.isChaosMode ? 2 : 1;
              this.score += pointsPerPlatform;
              this.comboCount++;
              this.scoreText.setText(this.score.toString());
              this.updateComboStreak(this.comboCount);
            }
          }
        }
      }
    }

    if (!collided) {
      this.ball.position.y += this.ballVelocity * deltaMultiplier;
    }

    // Rotate ball to show off texture
    this.ball.rotation.x -= 0.05 * deltaMultiplier;
    this.ball.rotation.y += 0.02 * deltaMultiplier;

    // Camera follow - Balanced view (frame-independent)
    const targetY = this.ball.position.y + 4;
    const cameraLerp = 1 - Math.pow(0.9, deltaMultiplier); // Smooth interpolation
    this.camera.position.y += (targetY - this.camera.position.y) * cameraLerp;
    this.camera.lookAt(0, this.camera.position.y - 6, 0);

    // Aura Pulse Animation
    if (this.ballAura) {
      const scale = 2.5 + Math.sin(time / 200) * 0.3;
      this.ballAura.scale.set(scale, scale, 1);
    }

    // Electric Sparks for Remixer (throttled for performance)
    if (this.ball.material === this.remixerMaterial) {
      if (time - this.lastSparkTime > 100 && this.electricSparks.length < 15) {
        // Max 10 sparks per second, max 15 total
        this.lastSparkTime = time;
        this.createElectricSpark();
      }
    }

    // Fire Trail for Gravity Master (throttled for performance)
    if (this.ball.material === this.masterMaterial) {
      if (time - this.lastFireTime > 80 && this.particles.length < 60) {
        // Max ~12 fire particles per second
        this.lastFireTime = time;
        this.createFireTrail();
      }
    }

    // Update and remove old sparks (batch removal)
    for (let i = this.electricSparks.length - 1; i >= 0; i--) {
      const spark = this.electricSparks[i];
      const material = spark.material as THREE.LineBasicMaterial;
      material.opacity -= 0.05 * deltaMultiplier;

      if (material.opacity <= 0) {
        this.threeScene.remove(spark);
        this.electricSparks.splice(i, 1);
      }
    }

    // Keep backgrounds following camera Y position (only after game starts, not during countdown)
    if (!this.isGameStarting) {
      // Keep cyberpunk grid following camera Y position (Chaos mode only)
      if (this.cyberpunkGrid && this.isChaosMode) {
        this.cyberpunkGrid.position.y = this.camera.position.y;
      }
    }

    // Update Shield power-up
    if (this.isShieldActive) {
      // Update timer
      this.shieldTimer -= delta;

      // Update shield visual position to follow ball
      if (this.shieldVisual) {
        this.shieldVisual.position.copy(this.ball.position);
        this.shieldVisual.rotation.x += 0.02 * deltaMultiplier;
        this.shieldVisual.rotation.y += 0.03 * deltaMultiplier;

        // Pulse effect - fade opacity based on remaining time
        const mat = this.shieldVisual.material as THREE.MeshBasicMaterial;
        const pulseOpacity = 0.2 + Math.sin(time / 100) * 0.1;

        // Flash faster when about to expire (last 1.5 seconds)
        if (this.shieldTimer < 1500) {
          const flashSpeed = 50;
          mat.opacity = 0.15 + Math.sin(time / flashSpeed) * 0.15;
        } else {
          mat.opacity = pulseOpacity;
        }
      }

      // Shield expired
      if (this.shieldTimer <= 0) {
        this.isShieldActive = false;
        if (this.shieldVisual) {
          this.threeScene.remove(this.shieldVisual);
          this.shieldVisual = null;
        }
      }
    }

    this.threeRenderer.render(this.threeScene, this.camera);
  }

  applyBallStyle(rank: string) {
    // Use selected ball style if available, otherwise fall back to rank
    const styleToApply =
      this.selectedBallStyle || this.getBallStyleFromRank(rank);

    // Set material based on ball style
    switch (styleToApply) {
      case "remixer":
        this.ball.material = this.remixerMaterial;
        this.ballAura.visible = true;
        (this.ballAura.material as THREE.SpriteMaterial).color.setHex(0xb7ff00);
        break;
      case "legend":
        this.ball.material = this.legendMaterial;
        this.ballAura.visible = true;
        (this.ballAura.material as THREE.SpriteMaterial).color.setHex(0xff9f43);
        break;
      case "master":
        this.ball.material = this.masterMaterial;
        this.ballAura.visible = true;
        (this.ballAura.material as THREE.SpriteMaterial).color.setHex(0xff6b35);
        break;
      case "pro":
        this.ball.material = this.proMaterial;
        this.ballAura.visible = true;
        (this.ballAura.material as THREE.SpriteMaterial).color.setHex(0xff2222);
        break;
      case "noob":
        this.ball.material = this.noobMaterial;
        this.ballAura.visible = true;
        (this.ballAura.material as THREE.SpriteMaterial).color.setHex(0x00d2d3);
        break;
      case "unranked":
      default:
        this.ball.material = this.normalMaterial;
        this.ballAura.visible = false;
        break;
    }
  }

  getBallStyleFromRank(rank: string): string {
    // Map rank names to ball style keys
    const rankToStyle: { [key: string]: string } = {
      Remixer: "remixer",
      Legend: "legend",
      "Gravity Master": "master",
      Pro: "pro",
      Noob: "noob",
      Unranked: "unranked",
    };
    return rankToStyle[rank] || "unranked";
  }

  getAvailableMusicTracks(): string[] {
    // Only return tracks that are actually loaded
    const checkLoaded = (tracks: string[]) =>
      tracks.filter((track) => this.cache.audio.exists(track));

    // Chaos Mode uses exclusive music tracks
    if (this.isChaosMode) {
      const loadedChaos = checkLoaded(this.chaosMusicTracks);
      return loadedChaos.length > 0 ? loadedChaos : ["chaos1"]; // Fallback to guaranteed track
    }
    // Premium tracks are unlocked at score >= 500 (Gravity Master rank)
    if (this.playerHighScore >= 500) {
      // Combine base tracks with premium tracks
      const allTracks = [...this.musicTracks, ...this.premiumMusicTracks];
      const loaded = checkLoaded(allTracks);
      return loaded.length > 0 ? loaded : ["music1"]; // Fallback to guaranteed track
    }
    // Only base tracks
    const loadedBase = checkLoaded(this.musicTracks);
    return loadedBase.length > 0 ? loadedBase : ["music1"]; // Fallback to guaranteed track
  }

  activateSuperSmash() {
    this.isSuperSmash = true;
    this.platformsToSmash = 5;

    // Play power-up sound
    this.playPowerUpSound();

    // Haptic feedback on power-up collection
    this.triggerHapticFeedback();
  }

  activateShield() {
    this.isShieldActive = true;
    this.shieldTimer = 8000; // 8 seconds of immunity

    // Play power-up sound
    this.playPowerUpSound();

    // Haptic feedback on power-up collection
    this.triggerHapticFeedback();

    // Create visual shield bubble around ball
    if (this.shieldVisual) {
      this.threeScene.remove(this.shieldVisual);
    }

    const shieldGeo = new THREE.SphereGeometry(0.7, 16, 16);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    this.shieldVisual = new THREE.Mesh(shieldGeo, shieldMat);
    this.threeScene.add(this.shieldVisual);
  }

  // Unlock AudioContext on first user interaction (required for mobile)
  private unlockAudioContext() {
    if (!this.audioContext) {
      try {
        this.audioContext = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
      } catch (e) {
        return;
      }
    }

    // Resume if suspended (mobile browsers suspend AudioContext until user gesture)
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
  }

  // Procedural sound for collecting power-up (cyberpunk dimensional portal)
  playPowerUpSound() {
    if (this.isMuted) return;

    if (!this.audioContext) {
      try {
        this.audioContext = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
      } catch (e) {
        return;
      }
    }

    // Resume if suspended
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }

    const ctx = this.audioContext;
    if (!ctx || !this.masterGain) return;

    const masterOut = this.masterGain!;
    const now = ctx.currentTime;

    // 1. Dimensional sweep - descending then ascending frequency
    const sweepOsc = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweepOsc.type = "sawtooth";
    sweepOsc.frequency.setValueAtTime(2000, now);
    sweepOsc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
    sweepOsc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
    sweepGain.gain.setValueAtTime(0.12, now);
    sweepGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    sweepOsc.connect(sweepGain);
    sweepGain.connect(masterOut);
    sweepOsc.start(now);
    sweepOsc.stop(now + 0.4);

    // 2. Sub bass thump (portal opening)
    const bassOsc = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bassOsc.type = "sine";
    bassOsc.frequency.setValueAtTime(80, now);
    bassOsc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
    bassGain.gain.setValueAtTime(0.25, now);
    bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    bassOsc.connect(bassGain);
    bassGain.connect(masterOut);
    bassOsc.start(now);
    bassOsc.stop(now + 0.3);

    // 3. High shimmer (dimensional sparkle)
    const shimmerOsc = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmerOsc.type = "sine";
    shimmerOsc.frequency.setValueAtTime(1200, now + 0.05);
    shimmerOsc.frequency.setValueAtTime(1800, now + 0.1);
    shimmerOsc.frequency.setValueAtTime(2400, now + 0.15);
    shimmerGain.gain.setValueAtTime(0, now);
    shimmerGain.gain.linearRampToValueAtTime(0.08, now + 0.05);
    shimmerGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    shimmerOsc.connect(shimmerGain);
    shimmerGain.connect(masterOut);
    shimmerOsc.start(now);
    shimmerOsc.stop(now + 0.35);

    // 4. Noise burst (dimensional distortion)
    const bufferSize = ctx.sampleRate * 0.15;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      noiseData[i] =
        (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const noiseSource = ctx.createBufferSource();
    const noiseFilter = ctx.createBiquadFilter();
    const noiseGain = ctx.createGain();
    noiseSource.buffer = noiseBuffer;
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(3000, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(500, now + 0.15);
    noiseFilter.Q.value = 5;
    noiseGain.gain.setValueAtTime(0.15, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterOut);
    noiseSource.start(now);
  }

  // Procedural sound for smashing platforms (impact sound)
  playSmashSound() {
    if (this.isMuted) return;

    if (!this.audioContext) {
      try {
        this.audioContext = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
      } catch (e) {
        return;
      }
    }

    // Resume if suspended
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }

    const ctx = this.audioContext;
    if (!ctx || !this.masterGain) return;

    const masterOut = this.masterGain!;
    const now = ctx.currentTime;

    // Low frequency impact
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(masterOut);

    osc.start(now);
    osc.stop(now + 0.2);

    // Add noise burst for impact texture
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }

    const noise = ctx.createBufferSource();
    const noiseGain = ctx.createGain();
    noise.buffer = buffer;
    noiseGain.gain.setValueAtTime(0.1, now);

    noise.connect(noiseGain);
    noiseGain.connect(masterOut);
    noise.start(now);
  }

  createCyberpunkGrid() {
    this.cyberpunkGrid = new THREE.Group();

    // Create horizontal lines (floor grid extending to horizon)
    const gridMaterial = new THREE.LineBasicMaterial({
      color: 0xff00ff, // Magenta
      transparent: true,
      opacity: 0.3,
    });

    const gridMaterial2 = new THREE.LineBasicMaterial({
      color: 0x00ffff, // Cyan
      transparent: true,
      opacity: 0.2,
    });

    // Horizontal lines on floor plane
    const floorY = -50;
    const gridSize = 100;
    const lineSpacing = 4;

    for (let i = -gridSize; i <= gridSize; i += lineSpacing) {
      // Lines along Z axis
      const points1 = [
        new THREE.Vector3(i, floorY, -gridSize),
        new THREE.Vector3(i, floorY, gridSize),
      ];
      const geometry1 = new THREE.BufferGeometry().setFromPoints(points1);
      const line1 = new THREE.Line(
        geometry1,
        i % 8 === 0 ? gridMaterial : gridMaterial2,
      );
      this.cyberpunkGrid.add(line1);

      // Lines along X axis
      const points2 = [
        new THREE.Vector3(-gridSize, floorY, i),
        new THREE.Vector3(gridSize, floorY, i),
      ];
      const geometry2 = new THREE.BufferGeometry().setFromPoints(points2);
      const line2 = new THREE.Line(
        geometry2,
        i % 8 === 0 ? gridMaterial : gridMaterial2,
      );
      this.cyberpunkGrid.add(line2);
    }

    // Add vertical accent lines in the background
    const verticalMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff00, // Green
      transparent: true,
      opacity: 0.15,
    });

    for (let i = -40; i <= 40; i += 10) {
      const points = [
        new THREE.Vector3(i, floorY, -60),
        new THREE.Vector3(i, floorY + 200, -60), // Tall lines
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, verticalMaterial);
      this.cyberpunkGrid.add(line);
    }

    // Add floating horizontal scan lines
    const scanMaterial = new THREE.LineBasicMaterial({
      color: 0xffff00, // Yellow
      transparent: true,
      opacity: 0.1,
    });

    for (let y = floorY; y <= floorY + 200; y += 5) {
      const points = [
        new THREE.Vector3(-50, y, -50),
        new THREE.Vector3(50, y, -50),
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, scanMaterial);
      this.cyberpunkGrid.add(line);
    }

    // Add to scene with fixed initial position (will follow camera after countdown)
    this.threeScene.add(this.cyberpunkGrid);
    // Set initial position to final countdown camera position (y ≈ 6)
    this.cyberpunkGrid.position.y = 6;
  }

  createSunsetBackground() {
    this.sunsetBackground = new THREE.Group();

    // Create horizontal gradient bands covering the entire horizon
    // Colors from top to bottom: purple -> red -> orange -> yellow
    const gradientColors = [
      { color: 0x4a1942, y: 80, height: 40 }, // Dark purple (top)
      { color: 0x6b2d5c, y: 50, height: 30 }, // Purple
      { color: 0x8b3a62, y: 25, height: 25 }, // Mauve
      { color: 0xc0392b, y: 5, height: 20 }, // Deep red
      { color: 0xe74c3c, y: -10, height: 15 }, // Red
      { color: 0xff6b35, y: -22, height: 12 }, // Orange-red
      { color: 0xff8c42, y: -32, height: 10 }, // Orange
      { color: 0xffa64d, y: -40, height: 8 }, // Light orange
      { color: 0xffbe5c, y: -47, height: 7 }, // Golden orange
      { color: 0xffd166, y: -53, height: 6 }, // Golden yellow
      { color: 0xffdd80, y: -58, height: 5 }, // Light yellow
      { color: 0xffeaa7, y: -62, height: 4 }, // Pale yellow (matches background)
    ];

    const bandWidth = 200; // Wide enough to cover the view
    const bandZ = -80;

    gradientColors.forEach((band) => {
      const geometry = new THREE.PlaneGeometry(bandWidth, band.height);
      const material = new THREE.MeshBasicMaterial({
        color: band.color,
        transparent: true,
        opacity: 0.85,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(0, band.y, bandZ);
      this.sunsetBackground!.add(mesh);
    });

    // Add subtle horizontal lines for that synthwave feel
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.08,
    });

    for (let y = -60; y <= 80; y += 8) {
      const points = [
        new THREE.Vector3(-100, y, bandZ + 1),
        new THREE.Vector3(100, y, bandZ + 1),
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, lineMaterial);
      this.sunsetBackground!.add(line);
    }

    // Add to scene with fixed initial position (will follow camera after countdown)
    this.threeScene.add(this.sunsetBackground);
    this.sunsetBackground.position.y = 6;
  }

  createOceanBackground() {
    this.oceanBackground = new THREE.Group();

    // Create underwater gradient - covers entire visible area
    // Extended to cover from very top to very bottom, ending in white
    const gradientColors = [
      { color: 0x0a1628, y: 150, height: 80 }, // Very dark blue (deep ocean) - extended up
      { color: 0x0d2137, y: 80, height: 60 }, // Dark blue
      { color: 0x0f2847, y: 35, height: 45 }, // Deep blue
      { color: 0x123a5c, y: 0, height: 35 }, // Ocean blue
      { color: 0x1a5276, y: -25, height: 25 }, // Medium blue
      { color: 0x2171a3, y: -45, height: 20 }, // Lighter blue
      { color: 0x2e86ab, y: -60, height: 15 }, // Teal blue
      { color: 0x3498db, y: -72, height: 12 }, // Bright blue
      { color: 0x5dade2, y: -82, height: 10 }, // Light blue
      { color: 0x74b9ff, y: -90, height: 8 }, // Lighter blue
      { color: 0xa9cce3, y: -96, height: 6 }, // Pale blue
      { color: 0xd4e6f1, y: -102, height: 8 }, // Very pale blue
      { color: 0xecf0f1, y: -110, height: 10 }, // Almost white
      { color: 0xffffff, y: -150, height: 80 }, // White - extended down
    ];

    const bandWidth = 250; // Wider to cover more
    const bandZ = -80;

    gradientColors.forEach((band) => {
      const geometry = new THREE.PlaneGeometry(bandWidth, band.height);
      const material = new THREE.MeshBasicMaterial({
        color: band.color,
        transparent: true,
        opacity: 0.95,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(0, band.y, bandZ);
      this.oceanBackground!.add(mesh);
    });

    // Light rays coming from above (god rays effect) - extended
    const rayMaterial = new THREE.MeshBasicMaterial({
      color: 0x87ceeb, // Light sky blue
      transparent: true,
      opacity: 0.08,
    });

    // Create several angled light rays - taller to reach bottom
    const rays = [
      { x: -30, width: 8, angle: 0.15 },
      { x: -15, width: 12, angle: 0.1 },
      { x: 5, width: 15, angle: -0.05 },
      { x: 25, width: 10, angle: -0.12 },
      { x: 40, width: 6, angle: -0.18 },
    ];

    rays.forEach((ray) => {
      const rayGeometry = new THREE.PlaneGeometry(ray.width, 300); // Taller rays
      const rayMesh = new THREE.Mesh(rayGeometry, rayMaterial.clone());
      rayMesh.position.set(ray.x, 0, bandZ + 5); // Centered vertically
      rayMesh.rotation.z = ray.angle;
      this.oceanBackground!.add(rayMesh);
    });

    // Add floating bubbles (small circles)
    const bubbleMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15,
    });

    // Create bubbles at various positions - more spread out
    const bubblePositions = [
      { x: -35, y: -20, size: 0.8 },
      { x: -28, y: 10, size: 0.5 },
      { x: -20, y: -50, size: 1.0 },
      { x: -12, y: 25, size: 0.6 },
      { x: -5, y: -10, size: 0.7 },
      { x: 8, y: 40, size: 0.4 },
      { x: 15, y: -40, size: 0.9 },
      { x: 22, y: 5, size: 0.5 },
      { x: 30, y: -60, size: 0.8 },
      { x: 38, y: 15, size: 0.6 },
      { x: -40, y: 50, size: 0.5 },
      { x: 0, y: 60, size: 0.7 },
      { x: 35, y: 45, size: 0.4 },
      { x: -25, y: -70, size: 0.6 },
      { x: 10, y: -80, size: 0.5 },
    ];

    bubblePositions.forEach((bubble) => {
      const bubbleGeometry = new THREE.CircleGeometry(bubble.size, 16);
      const bubbleMesh = new THREE.Mesh(bubbleGeometry, bubbleMaterial.clone());
      bubbleMesh.position.set(bubble.x, bubble.y, bandZ + 10);
      this.oceanBackground!.add(bubbleMesh);
    });

    // Add wavy horizontal lines for water texture - extended range
    const waveMaterial = new THREE.LineBasicMaterial({
      color: 0x5dade2,
      transparent: true,
      opacity: 0.1,
    });

    for (let y = -120; y <= 120; y += 12) {
      // Extended range
      const points: THREE.Vector3[] = [];
      for (let x = -120; x <= 120; x += 5) {
        // Wider coverage
        // Create a subtle wave pattern
        const waveY = y + Math.sin(x * 0.1) * 1.5;
        points.push(new THREE.Vector3(x, waveY, bandZ + 2));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, waveMaterial);
      this.oceanBackground!.add(line);
    }

    // Add to scene with fixed initial position (will follow camera after countdown)
    this.threeScene.add(this.oceanBackground);
    this.oceanBackground.position.y = 6;
  }

  createGlowTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext("2d")!;
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.2, "rgba(255, 255, 255, 0.8)");
    gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.2)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  createElectricSpark() {
    // Create a jagged line from ball surface to nearby point
    const points: THREE.Vector3[] = [];
    const numSegments = 3 + Math.floor(Math.random() * 3);

    // Random starting point on ball surface
    const angle1 = Math.random() * Math.PI * 2;
    const angle2 = Math.random() * Math.PI;
    const startRadius = 0.5;

    const startX =
      this.ball.position.x + Math.sin(angle2) * Math.cos(angle1) * startRadius;
    const startY = this.ball.position.y + Math.cos(angle2) * startRadius;
    const startZ =
      this.ball.position.z + Math.sin(angle2) * Math.sin(angle1) * startRadius;

    points.push(new THREE.Vector3(startX, startY, startZ));

    // Create jagged path
    let currentX = startX;
    let currentY = startY;
    let currentZ = startZ;

    for (let i = 0; i < numSegments; i++) {
      currentX += (Math.random() - 0.5) * 0.3;
      currentY += (Math.random() - 0.5) * 0.3;
      currentZ += (Math.random() - 0.5) * 0.3;
      points.push(new THREE.Vector3(currentX, currentY, currentZ));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xb7ff00,
      transparent: true,
      opacity: 0.8,
      linewidth: 2,
    });

    const spark = new THREE.Line(geometry, material);
    this.threeScene.add(spark);
    this.electricSparks.push(spark);
  }

  createFireTrail() {
    // Create small fire particles behind the ball - use cached texture
    const colors = [0xff6b35, 0xffd93d, 0xff4500]; // Red-orange, Yellow, Orange-red
    const color = colors[Math.floor(Math.random() * colors.length)];

    const material = new THREE.SpriteMaterial({
      map: this.cachedGlowTexture,
      color: color,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const sprite = new THREE.Sprite(material);
    sprite.position.copy(this.ball.position);
    sprite.position.y += (Math.random() - 0.5) * 0.3;
    sprite.position.x += (Math.random() - 0.5) * 0.3;
    sprite.position.z += (Math.random() - 0.5) * 0.3;

    const scale = 0.3 + Math.random() * 0.2;
    sprite.scale.set(scale, scale, 1);

    this.threeScene.add(sprite);
    this.particles.push({
      mesh: sprite,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.05,
        0.1 + Math.random() * 0.1,
        (Math.random() - 0.5) * 0.05,
      ),
      life: 0.6,
    });
  }

  createGravityMasterTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d")!;

    // Split in half - top and bottom
    // Top half - Red-Orange
    context.fillStyle = "#ff6b35";
    context.fillRect(0, 0, 512, 256);

    // Bottom half - Yellow
    context.fillStyle = "#ffd93d";
    context.fillRect(0, 256, 512, 256);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  createProTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d")!;

    // Background - White
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 512, 512);

    // Polka dots - Red only
    const dotColor = "#ff2222";
    const dotRadius = 30;
    const spacing = 85;

    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 7; col++) {
        const x = col * spacing + (row % 2) * (spacing / 2);
        const y = row * spacing;

        context.beginPath();
        context.fillStyle = dotColor;
        context.arc(x, y, dotRadius, 0, Math.PI * 2);
        context.fill();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  createLegendTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d")!;

    // Create horizontal bands (like latitude lines on a globe)
    const baseColors = ["#ff9f43", "#e91e8c", "#00d2d3", "#feca57"];
    const numBands = 12; // More bands = thinner lines
    const bandHeight = 512 / numBands;

    for (let i = 0; i < numBands; i++) {
      const color = baseColors[i % baseColors.length];
      context.fillStyle = color;
      context.fillRect(0, i * bandHeight, 512, bandHeight);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  createExplosion(
    yPos: number,
    color: number,
    count: number,
    hasShockwave: boolean = true,
  ) {
    // Reuse cached texture — avoids creating a new canvas per call
    const material = new THREE.SpriteMaterial({
      map: this.cachedGlowTexture,
      color: color,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    for (let i = 0; i < count; i++) {
      const sprite = new THREE.Sprite(material);
      const angle = Math.random() * Math.PI * 2;
      const radius = 2 + Math.random() * 2;
      const worldAngle = angle + this.tower.rotation.y;

      sprite.position.set(
        Math.cos(worldAngle) * radius,
        yPos,
        Math.sin(worldAngle) * radius,
      );

      const scale = 0.5 + Math.random() * 0.5;
      sprite.scale.set(scale, scale, 1);

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
      );

      this.threeScene.add(sprite);
      this.particles.push({ mesh: sprite, velocity, life: 1.0 });
    }

    if (hasShockwave) {
      const ringGeo = new THREE.RingGeometry(1.8, 2.2, 16);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = yPos;
      ring.rotation.x = -Math.PI / 2;
      this.threeScene.add(ring);
      this.particles.push({
        mesh: ring,
        velocity: new THREE.Vector3(0, 0, 0),
        life: 0.8,
        isShockwave: true,
      } as any);
    }
  }

  gameOverSplatter(yPos: number) {
    this.isGameActive = false;
    this.ball.position.y = yPos + 0.1;
    this.ball.scale.set(1.5, 0.1, 1.5);

    this.scoreContainer.setVisible(false);

    // Big Explosion - match ball color
    let explosionColor = 0x2ecc71; // Default green

    if (this.ball.material === this.remixerMaterial) {
      explosionColor = 0xb7ff00; // Remixer neon green
    } else if (this.ball.material === this.masterMaterial) {
      // Random color from Gravity Master palette (two-tone)
      const masterColors = [0xff6b35, 0xffd93d]; // Red-Orange, Yellow
      explosionColor =
        masterColors[Math.floor(Math.random() * masterColors.length)];
    } else if (this.ball.material === this.legendMaterial) {
      // Random color from Legend palette
      const legendColors = [0xff9f43, 0xe91e8c, 0x00d2d3, 0xfeca57];
      explosionColor =
        legendColors[Math.floor(Math.random() * legendColors.length)];
    } else if (this.ball.material === this.proMaterial) {
      // Pro colors - white and red
      const proColors = [0xffffff, 0xff2222];
      explosionColor = proColors[Math.floor(Math.random() * proColors.length)];
    } else if (this.ball.material === this.noobMaterial) {
      explosionColor = 0x2ecc71; // Noob green
    }

    this.createExplosion(yPos, explosionColor, 12, true);

    // Haptic feedback on death
    this.triggerHapticFeedback();

    this.saveHighScoreAndGameOver();
  }

  async saveHighScoreAndGameOver() {
    const finalScore = this.score;

    // Report score to SDK
    try {
      const sdk = (window as any).FarcadeSDK;
      if (sdk) {
        sdk.singlePlayer.actions.gameOver({ score: finalScore });
      }
    } catch (e) {
      console.log("SDK gameOver failed:", e);
    }

    // High score tracked by SDK (gameOver above) — no local persistence
  }

  destroyPlatform(platform: THREE.Mesh, index: number) {
    const yPos = platform.position.y;

    // Shockwave ring
    const ringGeo = new THREE.RingGeometry(1.8, 2.2, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = yPos;
    ring.rotation.x = -Math.PI / 2;
    this.threeScene.add(ring);
    this.particles.push({
      mesh: ring,
      velocity: new THREE.Vector3(0, 0, 0),
      life: 0.5,
      isShockwave: true,
    } as any);

    // Remove any power-up on this platform
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];
      // Check if power-up is roughly at the same height as the platform
      if (Math.abs(pu.userData.baseY - yPos) < 0.5) {
        this.tower.remove(pu);
        this.powerUps.splice(i, 1);
      }
    }

    this.tower.remove(platform);
    this.platforms.splice(index, 1);

    // Spawn a new platform below the lowest one to keep infinite gameplay
    const newY = this.lowestPlatformY - 4;
    this.spawnNewPlatform(newY);
  }

  checkCollision(platform: THREE.Mesh): "hit" | "gap" | "danger" {
    if (platform.userData.isBase) return "hit";

    let ballAngleInTower =
      (Math.PI / 2 - this.tower.rotation.y + Math.PI) % (Math.PI * 2);
    if (ballAngleInTower < 0) ballAngleInTower += Math.PI * 2;

    const platformRotation = platform.userData.rotationOffset;

    // 1. Check Danger Zones
    const dangerZones = platform.userData.dangerZones;
    if (dangerZones && dangerZones.length > 0) {
      for (const zone of dangerZones) {
        let zoneCenter =
          (zone.start + zone.size / 2 + platformRotation) % (Math.PI * 2);
        if (zoneCenter < 0) zoneCenter += Math.PI * 2;

        let diff = Math.abs(ballAngleInTower - zoneCenter);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;

        if (diff < zone.size / 2) {
          return "danger";
        }
      }
    }

    // 2. Check Gaps (Multiple)
    const gaps = platform.userData.gaps;
    if (gaps) {
      for (const gap of gaps) {
        let gapCenter = (gap.center + platformRotation) % (Math.PI * 2);
        if (gapCenter < 0) gapCenter += Math.PI * 2;

        let diff = Math.abs(ballAngleInTower - gapCenter);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;

        const halfGap = gap.size / 2;
        const ballRadiusAngle = 0.4 / 2;

        if (diff < halfGap - ballRadiusAngle) {
          return "gap";
        }
      }
    }

    return "hit";
  }

  resolveCombo(suppressText = false) {
    if (this.comboCount > 1) {
      // Quadratic scoring: combo of 5 = +25pts, combo of 10 = +100pts
      const bonus = this.comboCount * this.comboCount;
      this.score += bonus;
      this.scoreText.setText(this.score.toString());
      if (!suppressText) this.showComboText(this.comboCount);
    }
    this.comboCount = 0;
    // Hide live streak display
    if (this.comboStreakText) {
      this.tweens.killTweensOf(this.comboStreakText);
      this.comboStreakText.setVisible(false);
    }
  }

  showComboText(count: number) {
    // Cyberpunk neon palette — each tier has a distinct neon hue
    let word: string;
    let mainColor: string;
    let subColor: string;
    let fontSize: string;

    if (count >= 10) {
      word = "GODLIKE!";
      mainColor = "#00ffff"; // Electric cyan
      subColor = "#88ffff";
      fontSize = "96px";
    } else if (count >= 7) {
      word = "LEGENDARY!";
      mainColor = "#ff00ff"; // Neon magenta
      subColor = "#ff88ff";
      fontSize = "88px";
    } else if (count >= 5) {
      word = "INSANE!";
      mainColor = "#ff0066"; // Hot pink
      subColor = "#ff66aa";
      fontSize = "84px";
    } else if (count >= 4) {
      word = "SAVAGE!";
      mainColor = "#ffff00"; // Electric yellow
      subColor = "#ffffaa";
      fontSize = "80px";
    } else if (count >= 3) {
      word = "WICKED!";
      mainColor = "#ff6600"; // Neon orange
      subColor = "#ffaa66";
      fontSize = "76px";
    } else {
      word = "NICE!";
      mainColor = "#00ff99"; // Neon mint
      subColor = "#88ffcc";
      fontSize = "68px";
    }

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2 - 90;

    // Main word
    const mainText = this.add
      .text(cx, cy, word, {
        fontSize,
        color: mainColor,
        fontFamily: "Fredoka",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 12,
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: mainColor,
          blur: 18,
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setDepth(151)
      .setAlpha(0)
      .setScale(0.4);

    // Sub-label: ×N COMBO
    const subText = this.add
      .text(cx, cy + 72, `×${count} COMBO`, {
        fontSize: "46px",
        color: subColor,
        fontFamily: "Fredoka",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(151)
      .setAlpha(0);

    // Pop-in
    this.tweens.add({
      targets: mainText,
      alpha: 1,
      scale: count >= 7 ? 1.1 : 1.0,
      duration: 200,
      ease: "Back.easeOut",
      onComplete: () => {
        if (count >= 7) {
          this.tweens.add({
            targets: mainText,
            x: { from: cx - 10, to: cx + 10 },
            duration: 50,
            yoyo: true,
            repeat: 3,
          });
        }
        this.time.delayedCall(700, () => {
          this.tweens.add({
            targets: mainText,
            y: cy - 80,
            alpha: 0,
            duration: 450,
            ease: "Power2",
            onComplete: () => mainText.destroy(),
          });
        });
      },
    });

    this.tweens.add({
      targets: subText,
      alpha: 1,
      duration: 180,
      delay: 100,
      ease: "Power2",
    });
    this.time.delayedCall(820, () => {
      this.tweens.add({
        targets: subText,
        alpha: 0,
        y: `-=${50}`,
        duration: 380,
        ease: "Power2",
        onComplete: () => subText.destroy(),
      });
    });

    this.triggerHapticFeedback();
  }

  setupSDKListeners() {
    const sdk = (window as any).FarcadeSDK;
    if (!sdk) return;

    // Handle play again requests from the platform
    sdk.on("play_again", () => {
      this.restartGame();
    });

    // Handle mute/unmute from the platform
    sdk.on("toggle_mute", (data: { isMuted: boolean }) => {
      this.sound.mute = data.isMuted;
    });
  }

  triggerHapticFeedback() {
    // Use SDK haptic feedback
    try {
      const sdk = (window as any).FarcadeSDK;
      if (sdk) {
        sdk.singlePlayer.actions.hapticFeedback();
      }
    } catch (e) {
      // Fallback to native vibration API
    }
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }

  // ─────────────────────────────────────────────
  // BOSS PLATFORM
  // ─────────────────────────────────────────────

  /** Creates a full-ring challenge platform with target gems and danger arcs. */
  private createBossPlatformMesh(yPos: number): THREE.Mesh {
    const innerRadius = 2;
    const outerRadius = 4;
    const pt = this.platformThickness;

    // Near-complete arc (0.001 rad gap = ~0.057°, visually invisible)
    const shape = new THREE.Shape();
    const start = 0.001;
    const end = Math.PI * 2;
    shape.moveTo(innerRadius * Math.cos(start), innerRadius * Math.sin(start));
    shape.lineTo(outerRadius * Math.cos(start), outerRadius * Math.sin(start));
    shape.absarc(0, 0, outerRadius, start, end, false);
    shape.lineTo(innerRadius * Math.cos(end), innerRadius * Math.sin(end));
    shape.absarc(0, 0, innerRadius, end, start, true);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: pt,
      bevelEnabled: false,
    });
    const baseMat = new THREE.MeshBasicMaterial({ color: 0x0d0d2a }); // Dark navy
    const platform = new THREE.Mesh(geo, baseMat);
    platform.rotation.x = -Math.PI / 2;
    const rotZ = Math.random() * Math.PI * 2;
    platform.rotation.z = rotZ;
    platform.position.y = yPos;

    // Black outline
    const outlineGeo = geo.clone();
    const outlineMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.BackSide,
    });
    const outline = new THREE.Mesh(outlineGeo, outlineMat);
    outline.scale.set(1.03, 1.03, 1.15);
    platform.add(outline);

    // ── Zone layout per sector: [safe | danger | safe | target] ──
    const numTargets = Math.random() < 0.5 ? 3 : 4;
    const sectorSize = (Math.PI * 2) / numTargets;
    const targetArcSize = Math.PI / 5; // 36°
    const dangerArcSize = Math.PI / 6; // 30°
    const safeHalf = (sectorSize - targetArcSize - dangerArcSize) / 2;
    const baseOffset = Math.random() * sectorSize;

    const bossTargets: Array<{
      start: number;
      size: number;
      destroyed: boolean;
      arcMesh: THREE.Mesh | null;
      indicatorMesh: THREE.Mesh | null;
      phaseOffset: number;
    }> = [];
    const bossDangerZones: Array<{ start: number; size: number }> = [];

    for (let t = 0; t < numTargets; t++) {
      const sectorStart = baseOffset + t * sectorSize;

      // ── Danger zone ──
      const dangerStart = sectorStart + safeHalf;
      const dEnd = dangerStart + dangerArcSize;
      const dangerShape = new THREE.Shape();
      dangerShape.moveTo(
        innerRadius * Math.cos(dangerStart),
        innerRadius * Math.sin(dangerStart),
      );
      dangerShape.lineTo(
        outerRadius * Math.cos(dangerStart),
        outerRadius * Math.sin(dangerStart),
      );
      dangerShape.absarc(0, 0, outerRadius, dangerStart, dEnd, false);
      dangerShape.lineTo(
        innerRadius * Math.cos(dEnd),
        innerRadius * Math.sin(dEnd),
      );
      dangerShape.absarc(0, 0, innerRadius, dEnd, dangerStart, true);
      const dangerGeo = new THREE.ExtrudeGeometry(dangerShape, {
        depth: pt + 0.08,
        bevelEnabled: false,
      });
      platform.add(
        new THREE.Mesh(
          dangerGeo,
          new THREE.MeshBasicMaterial({ color: 0xff0033 }),
        ),
      );
      bossDangerZones.push({ start: dangerStart, size: dangerArcSize });

      // ── Target zone ──
      const targetStart = dangerStart + dangerArcSize + safeHalf;
      const tEnd = targetStart + targetArcSize;
      const targetShape = new THREE.Shape();
      targetShape.moveTo(
        innerRadius * Math.cos(targetStart),
        innerRadius * Math.sin(targetStart),
      );
      targetShape.lineTo(
        outerRadius * Math.cos(targetStart),
        outerRadius * Math.sin(targetStart),
      );
      targetShape.absarc(0, 0, outerRadius, targetStart, tEnd, false);
      targetShape.lineTo(
        innerRadius * Math.cos(tEnd),
        innerRadius * Math.sin(tEnd),
      );
      targetShape.absarc(0, 0, innerRadius, tEnd, targetStart, true);
      const targetGeo = new THREE.ExtrudeGeometry(targetShape, {
        depth: pt + 0.12,
        bevelEnabled: false,
      });
      const targetMat = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.9,
      });
      const targetMesh = new THREE.Mesh(targetGeo, targetMat);
      platform.add(targetMesh);

      // ── Gem indicator floating above target center ──
      const gemAngle = targetStart + targetArcSize / 2;
      const gemRadius = (innerRadius + outerRadius) / 2; // = 3
      const gemGeo = new THREE.OctahedronGeometry(0.32);
      const gemMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
      const gem = new THREE.Mesh(gemGeo, gemMat);
      gem.position.set(
        Math.cos(gemAngle) * gemRadius,
        Math.sin(gemAngle) * gemRadius,
        pt + 0.7,
      );
      const gemOutline = new THREE.Mesh(
        gemGeo,
        new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide }),
      );
      gemOutline.scale.set(1.25, 1.25, 1.25);
      gem.add(gemOutline);
      platform.add(gem);

      bossTargets.push({
        start: targetStart,
        size: targetArcSize,
        destroyed: false,
        arcMesh: targetMesh,
        indicatorMesh: gem,
        phaseOffset: (t / numTargets) * Math.PI * 2,
      });
    }

    // ── Golden outer glow ring ──
    const glowRingGeo = new THREE.TorusGeometry(
      outerRadius + 0.15,
      0.12,
      4,
      32,
    );
    const glowRingMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.5,
    });
    const glowRing = new THREE.Mesh(glowRingGeo, glowRingMat);
    glowRing.position.z = pt / 2;
    platform.add(glowRing);

    platform.userData = {
      isBase: false,
      isBossPlatform: true,
      gaps: [{ start: 0, end: 0.001, size: 0.001, center: 0.0005 }],
      dangerZones: [],
      rotationOffset: rotZ,
      id: this.platformIdCounter,
      isMoving: false,
      moveSpeed: 0,
      isBlinking: false,
      bossTargets,
      bossDangerZones,
      remainingTargets: numTargets,
      totalTargets: numTargets,
      bossTime: 0,
      glowRingMesh: glowRing,
    };

    return platform;
  }

  /** Returns whether ball angle hits a target, danger zone, or safe area on a boss platform. */
  private checkBossCollision(platform: THREE.Mesh): {
    type: "target" | "danger" | "safe";
    targetIndex: number;
  } {
    let ballAngle =
      (Math.PI / 2 - this.tower.rotation.y + Math.PI) % (Math.PI * 2);
    if (ballAngle < 0) ballAngle += Math.PI * 2;
    const rot = platform.userData.rotationOffset;

    // Check targets first (priority over danger)
    const targets = platform.userData.bossTargets;
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      if (t.destroyed) continue;
      let center = (t.start + t.size / 2 + rot) % (Math.PI * 2);
      if (center < 0) center += Math.PI * 2;
      let diff = Math.abs(ballAngle - center);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff < t.size / 2) return { type: "target", targetIndex: i };
    }

    // Check danger zones
    for (const d of platform.userData.bossDangerZones) {
      let center = (d.start + d.size / 2 + rot) % (Math.PI * 2);
      if (center < 0) center += Math.PI * 2;
      let diff = Math.abs(ballAngle - center);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff < d.size / 2) return { type: "danger", targetIndex: -1 };
    }

    return { type: "safe", targetIndex: -1 };
  }

  /** Called when the ball successfully hits a target gem on a boss platform. */
  private hitBossTarget(
    platform: THREE.Mesh,
    targetIndex: number,
    platformIndex: number,
    topSurfaceY: number,
  ) {
    const bossData = platform.userData;
    const target = bossData.bossTargets[targetIndex];

    target.destroyed = true;
    bossData.remainingTargets--;

    // Remove visuals for this target
    if (target.arcMesh) platform.remove(target.arcMesh);
    if (target.indicatorMesh) platform.remove(target.indicatorMesh);

    this.createExplosion(platform.position.y + 0.5, 0xffd700, 8);
    this.playSmashSound();
    this.comboCount++;
    this.updateComboStreak(this.comboCount);

    if (bossData.remainingTargets <= 0) {
      // All gems hit — destroy platform with big reward
      const bonus = bossData.totalTargets * 15;
      this.score += bonus;
      this.scoreText.setText(this.score.toString());
      this.createExplosion(platform.position.y, 0xffd700, 18, true);
      this.createExplosion(platform.position.y, 0xffffff, 10, true);
      this.destroyPlatform(platform, platformIndex);
      this.showBossDestroyedText();
      this.resolveCombo(true); // suppress combo text — BOSS SMASHED! already shown
      this.triggerHapticFeedback();
      // Always bounce after boss destroy so ball doesn't get stuck
      this.ballVelocity = this.isChaosMode
        ? this.chaosJumpStrength
        : this.jumpStrength;
      this.ball.position.y = topSurfaceY;
    } else {
      // Still gems remaining — just bounce
      this.ballVelocity = this.isChaosMode
        ? this.chaosJumpStrength
        : this.jumpStrength;
      this.ball.position.y = topSurfaceY;
      this.jumpSound?.play();
    }
  }

  /** Full-screen "BOSS SMASHED!" celebration message. */
  private showBossDestroyedText() {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2 - 60;

    const line1 = this.add
      .text(cx, cy, "BOSS", {
        fontSize: "112px",
        color: "#ffd700",
        fontFamily: "Fredoka",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 14,
      })
      .setOrigin(0.5)
      .setDepth(155)
      .setAlpha(0)
      .setScale(0.3);

    const line2 = this.add
      .text(cx, cy + 100, "SMASHED!", {
        fontSize: "80px",
        color: "#ff8800",
        fontFamily: "Fredoka",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 12,
      })
      .setOrigin(0.5)
      .setDepth(155)
      .setAlpha(0)
      .setScale(0.3);

    this.tweens.add({
      targets: [line1, line2],
      alpha: 1,
      scale: 1.05,
      duration: 200,
      ease: "Back.easeOut",
      onComplete: () => {
        // Shake the top line
        this.tweens.add({
          targets: line1,
          x: { from: cx - 12, to: cx + 12 },
          duration: 60,
          yoyo: true,
          repeat: 4,
        });
        this.time.delayedCall(650, () => {
          this.tweens.add({
            targets: [line1, line2],
            y: "-=80",
            alpha: 0,
            duration: 500,
            ease: "Power2",
            onComplete: () => {
              line1.destroy();
              line2.destroy();
            },
          });
        });
      },
    });
  }

  // ─────────────────────────────────────────────
  // COMBO STREAK
  // ─────────────────────────────────────────────

  /** Shows/updates the live combo streak counter while the streak is building. */
  private updateComboStreak(count: number) {
    if (count < 2) return;

    if (!this.comboStreakText) {
      this.comboStreakText = this.add
        .text(this.scale.width / 2, this.scale.height * 0.72, "", {
          fontSize: "52px",
          color: "#ffd700",
          fontFamily: "Fredoka",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 8,
        })
        .setOrigin(0.5)
        .setDepth(145);
    }

    // Pick colour based on streak size
    const streakColor =
      count >= 10
        ? "#ff00ff"
        : count >= 7
          ? "#ff6600"
          : count >= 5
            ? "#ff3300"
            : count >= 3
              ? "#ffd700"
              : "#2ecc71";

    this.comboStreakText.setColor(streakColor);
    this.comboStreakText.setText(`STREAK ×${count}`);
    this.comboStreakText.setVisible(true);
    this.comboStreakText.setAlpha(1);

    this.tweens.killTweensOf(this.comboStreakText);
    this.tweens.add({
      targets: this.comboStreakText,
      scale: { from: 1.35, to: 1.0 },
      duration: 200,
      ease: "Back.easeOut",
    });
  }

  createStars() {
    const starCount = 400; // Further reduced for mobile performance
    const geometry = new THREE.BufferGeometry();
    const positions = [];

    for (let i = 0; i < starCount; i++) {
      let x, y, z, dist;
      do {
        x = (Math.random() - 0.5) * 400;
        y = (Math.random() - 0.5) * 1000 - 200;
        z = (Math.random() - 0.5) * 400;
        dist = Math.sqrt(x * x + z * z);
      } while (dist < 50); // Keep stars away from the immediate play area
      positions.push(x, y, z);
    }

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.8, // Slightly larger to compensate for fewer stars
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
    });

    const stars = new THREE.Points(geometry, material);
    this.threeScene.add(stars);
  }
}

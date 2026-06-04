import Phaser from 'phaser';

// Color palette
const P: Record<string, number | null> = {
  '.': null,           // transparent
  'K': 0x0f0f0f,      // black outline
  'O': 0x4a7c59,      // olive body
  'o': 0x2d5a3d,      // dark olive accent
  'W': 0x111111,      // wheel/tire
  'G': 0x888888,      // gun metal
  'g': 0x555555,      // gun dark
  'B': 0x005bbb,      // UA flag blue
  'Y': 0xffd700,      // UA flag yellow
  'w': 0x7ab8d8,      // window glass
  'L': 0xffee44,      // headlight
  'A': 0x3d6b4f,      // ally olive
  'a': 0x294d37,      // ally dark
  'R': 0x8b2020,      // enemy red
  'r': 0x5c1212,      // enemy dark red
  'E': 0xff3333,      // enemy eye
  'e': 0xffaa00,      // enemy glow
  'D': 0x6a6a6a,      // concrete
  'd': 0x444444,      // concrete dark
  'C': 0x8b5e1a,      // crate brown
  'c': 0x5a3d0f,      // crate dark
  'F': 0x00ccff,      // bonus cyan
  'f': 0x0055aa,      // bonus dark
  'H': 0xffffff,      // highlight
  'X': 0xffaa00,      // explosion/detail orange
  'P': 0xaa00ff,      // runner purple
  'p': 0x660099,      // runner dark purple
  'N': 0xdd6600,      // bomber orange
  'n': 0x994400,      // bomber dark orange
  'Z': 0xffdd00,      // bomber warning yellow
  'V': 0x22aa44,      // repair green
  'v': 0x116622,      // repair dark green
  'S': 0x5b8aa8,      // scout blue-grey
  's': 0x3a607a,      // scout dark
  'Q': 0x778899,      // scout gun grey
  'T': 0x8b7340,      // APC tan/desert
  't': 0x5e4d2a,      // APC dark tan
  'q': 0x4a3d20,      // APC gun dark
  'к': 0x6e5c30,      // APC accent (cyrillic к used as unique key)
};

function drawPixelArt(
  scene: Phaser.Scene,
  key: string,
  rows: string[],
  scale: number
) {
  const cols = rows[0].length;
  const h = rows.length;
  const gfx = scene.make.graphics({ x: 0, y: 0 });

  for (let r = 0; r < h; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = rows[r][c];
      const color = P[ch];
      if (color === null || color === undefined) continue;
      gfx.fillStyle(color, 1);
      gfx.fillRect(c * scale, r * scale, scale, scale);
    }
  }
  gfx.generateTexture(key, cols * scale, h * scale);
  gfx.destroy();
}

// ─── Sprites ──────────────────────────────────────────────────────────────────

// Player truck — top-down view, 14×22 pixels, scale=3 → 42×66
const PLAYER_PIX = [
  '......GG......',
  '......GG......',
  '......GG......',
  '.....GGGG.....',
  '.KKKKKgKKKKK.',
  'KOOBBBOwwOOOK',
  'KOOYYYOwwOOOK',
  'KoooooooooooK',
  'KOOOOOOOOooOK',
  'WWOOOOOOOOOOWW',  // front wheels – intentionally 15 chars but let's fix
  'WWOOOOOOOOOOWW',
  'KOOOOOOOOooOK',
  'KOOLOOOOOLooK',
  'KOOOOOOOOooOK',
  'WWOOOOOOOOOOWW',
  'WWOOOOOOOOOOWW',
  'KOOOOOOOOooOK',
  'KoOoOooOoOooK',
  '.KOOOOOOOOoK.',
  '..KYYYYYYkK..',
  '..............',
  '..............',
];

// Fix: ensure all rows same width. Width = 14.
const PLAYER_ROWS = [
  '......GG......',
  '......GG......',
  '......GG......',
  '.....GGGG.....',
  '.KKKKKgKKKKK.',
  'KOBBBBOwwOOOK',
  'KOYYYYOwwOOOK',
  'KoooooooooooK',
  'KOOOOOOooOOOK',
  'WWOOOOOOOOOWW.',
  'WWOOOOOOOOOWW.',
  'KOOOOOOooOOOK',
  'KOLOOOOOOLOoK',
  'KOOOOOOooOOOK',
  'WWOOOOOOOOOWW.',
  'WWOOOOOOOOOWW.',
  'KOOOOOOooOOOK',
  'KoOoooooooooK',
  '.KOOOOOOOOoK.',
  '..KYYYYYYkK..',
  '..............',
  '..............',
];

// Ally truck — same shape, different color
const ALLY_ROWS = [
  '......GG......',
  '......GG......',
  '......GG......',
  '.....GGGG.....',
  '.KKKKKgKKKKK.',
  'KABBBBAaaAAAAK',
  'KAYYYYAaaAAAAK',
  'KaaaaaaaaaaK.',
  'KAAAAAAAAaAAK.',
  'WWAAAAAAAAAAWw',
  'WWAAAAAAAAAAWw',
  'KAAAAAAAAaAAK.',
  'KALAAAAAAAAaK.',
  'KAAAAAAAAaAAK.',
  'WWAAAAAAAAAAWw',
  'WWAAAAAAAAAAWw',
  'KAAAAAAAAaAAK.',
  'KaAaaaaaaaAaK.',
  '.KAAAAAAAAK..',
  '..KYYYYYYkK..',
  '..............',
  '..............',
];

// Walker enemy — 10×16, scale=3 → 30×48
const WALKER_ROWS = [
  '.KRRRRRRK.',
  'KRRrRRrRRK',
  'KRRERRERKK',
  'KRRrRRrRRK',
  '.KRRRRRRK.',
  'KRRRRRRRrK',
  'KrRRRRRRrK',
  'KRRRRRRRrK',
  '.KRRRRRRK.',
  'KRrR..RrRK',
  'KRrR..RrRK',
  '.KR....RK.',
  '.KR....RK.',
  '.Kr....rK.',
  '.KrR..RrK.',
  '.KRRKKRRK.',
];

// Heavy enemy — 14×18, scale=3 → 42×54
const HEAVY_ROWS = [
  '..KRRRRRRRK...',
  '.KRRrRRrRRRK..',
  'KRRRERRRERRrK.',
  'KRRRrRRRrRRrK.',
  '.KRRRRRRRRrK..',
  'KrRRRRRRRRrRrK',
  'KRRrrRRRRRrRRK',
  'KRRRRRRRRRrRRK',
  'KrRRRRRRRRrRrK',
  '.KRRRRRRRRRRK.',
  'KRrRR....RRrRK',
  'KRrRR....RRrRK',
  '.KRR......RRK.',
  '.KRR......RRK.',
  '.KRrR....RrRK.',
  '.KRrR....RrRK.',
  '.KRrrRKKRrrK..',
  '..KRRRrrRRRK..',
];

// Bullet — player, 2×5, scale=3 → 6×15
const BULLET_P_ROWS = [
  'YY',
  'YY',
  'YY',
  'LL',
  'LL',
];

// Bullet — ally, 2×5, scale=3 → 6×15
const BULLET_A_ROWS = [
  'FF',
  'FF',
  'FF',
  'ww',
  'ww',
];

// Ally bonus pickup — 12×14, scale=3 → 36×42
const BONUS_ROWS = [
  '..KFFFFFFkK..',
  '.KFFFFFFFFkK.',
  'KFFfFFFFFffFK',
  'KFFFHFFFHFFfK',
  'KFFFHFFFHFFfK',
  'KFF.FFFFF.FfK',
  'KFFfFFFFFfFFK',
  'KFFFFFfFFFFFK',
  'KFFFFfFFFFFFK',
  '.KFFF.F.FFFK.',
  '..KFfFFFfFK..',
  '...KFFFFFK...',
  '....KFFFK....',
  '.....KFK.....',
];

// Concrete obstacle — 16×10, scale=3 → 48×30
const OBSTACLE_BLOCK_ROWS = [
  'KDDDDDDDDDDDDDDDK',
  'KDDdDDDdDDDdDDDDK',
  'KDDdDDDdDDDdDDDDK',
  'KddddddddddddddDK',
  'KDDDDDDDDDDDDDdDK',
  'KDDdDDDdDDDdDDdDK',
  'KDDdDDDdDDDdDDdDK',
  'KddddddddddddddDK',
  'KDDDDDDDDDDDDDdDK',
  'KDDDDDDDDDDDDDDDK',
];

// Crate obstacle — 12×10, scale=3 → 36×30
const OBSTACLE_CRATE_ROWS = [
  'KCCCCCCCCCCCK',
  'KCYCCCCCCYCcK',
  'KCCcCCCCcCCcK',
  'KCCCcCCcCCCcK',
  'KYCCCcCcCCCYK',
  'KYCCCcCcCCCYK',
  'KCCCcCCcCCCcK',
  'KCCcCCCCcCCcK',
  'KCYCCCCCCYCcK',
  'KCCCCCCCCCCCK',
];

// Barricade — 14×8, scale=3 → 42×24
const OBSTACLE_BARR_ROWS = [
  '.WWWWWWWWWWWW.',
  'WwWWWWWWWWWwW.',
  'WwXXXXXXXXwW.',
  'WXXXXXXXXXWWW',
  'WXXXXXXXXXWWW',
  'WwXXXXXXXXwW.',
  'WwWWWWWWWWWwW.',
  '.WWWWWWWWWWWW.',
];

// Runner enemy — fast, thin, 8×14, scale=3 → 24×42
const RUNNER_ROWS = [
  '.KPPPPK.',
  'KPpPPpPK',
  'KPEPPEpK',
  'KPpPPpPK',
  '.KPPPPK.',
  'KPPPPpPK',
  '.KPPPpK.',
  '.KpPPpK.',
  '..KPpK..',
  '..KPpK..',
  '.KP..pK.',
  '.KP..pK.',
  'KPP..pPK',
  'KPP..pPK',
];

// Bomber enemy — round, explosive, 12×12, scale=3 → 36×36
const BOMBER_ROWS = [
  '...KNNNNK...',
  '..KNNnNNnNK.',
  '.KNNnNNNNnNK',
  'KNNNZNNNZNnK',
  'KNnNNNNNNNnK',
  'KNNNNNNNNNnK',
  'KNnNNNNNNNnK',
  'KNNNZNNNZNnK',
  '.KNNnNNNNnNK',
  '..KNNnNNnNK.',
  '...KNNNNnK..',
  '....KNNK....',
];

// Repair bonus — green cross, 12×12, scale=3 → 36×36
const BONUS_REPAIR_ROWS = [
  '..KVVVVVVK..',
  '.KVVVvVVVVK.',
  'KVVVHHHVVvK.',
  'KVVVHHHVVvK.',
  'KVHHHHHHHvK.',
  'KVHHHHHHHvK.',
  'KVHHHHHHHvK.',
  'KVVVHHHVVvK.',
  'KVVVHHHVVvK.',
  '.KVVVvVVVVK.',
  '..KVVVVVvK..',
  '...KVVVVK...',
];

// Scout vehicle — narrow, fast, 10×20, scale=3 → 30×60
// Sleek blue-grey recon vehicle, smaller silhouette
const SCOUT_ROWS = [
  '....SS....',
  '....SS....',
  '....SS....',
  '...SSSS...',
  '.KKKsKKK..',
  'KSwBBSwwsK',
  'KSwYYSwwsK',
  'Kssssssssк',
  'KSSSSSSssK',
  'WSSSSSSssW',
  'WSSSSSSssW',
  'KSSSSSSssK',
  'KSLSSSSLsK',
  'KSSSSSSssK',
  'WSSSSSSssW',
  'WSSSSSSssW',
  'KSSSSSSssK',
  'KsSSsssssk',
  '.KSSSSSsK.',
  '..KSSSSK..',
];

// APC vehicle — wide heavy armored, 16×22, scale=3 → 48×66
const APC_ROWS = [
  '......QQ.......',
  '......QQ.......',
  '......QQ.......',
  '.....QQQQ......',
  '.KKKKKqKKKKKK..',
  'KTTBBBTTTwwTTK.',
  'KTTYYYTTTwwTTK.',
  'KqqqqqqqqqqqTK.',
  'KTTTTTTTTTTTTкK',
  'WTTTtTTTTTtTTWW',
  'WTTTtTTTTTtTTWW',
  'KTTTTTTTTTTTTкK',
  'KTLTTTTTTLTTtK.',
  'KTTTTTTTTTTTtK.',
  'WTTTtTTTTTtTTWW',
  'WTTTtTTTTTtTTWW',
  'KTTTTTTTTTTTtK.',
  'KtTtTtttTtTttK.',
  '.KTTTTTTTTTtK..',
  '..KTYYYYYYtK...',
  '...............',
  '...............',
];

// ─── Exported creator ──────────────────────────────────────────────────────
export function createPixelTextures(scene: Phaser.Scene) {
  const S = 3; // pixel scale

  // Normalize rows to same width within each sprite
  function norm(rows: string[]): string[] {
    const maxW = Math.max(...rows.map(r => r.length));
    return rows.map(r => r.padEnd(maxW, '.'));
  }

  drawPixelArt(scene, 'player', norm(PLAYER_ROWS), S);
  drawPixelArt(scene, 'ally', norm(ALLY_ROWS), S);
  drawPixelArt(scene, 'walker', norm(WALKER_ROWS), S);
  drawPixelArt(scene, 'heavy', norm(HEAVY_ROWS), S);
  drawPixelArt(scene, 'bullet_p', norm(BULLET_P_ROWS), S);
  drawPixelArt(scene, 'bullet_a', norm(BULLET_A_ROWS), S);
  drawPixelArt(scene, 'bonus_ally', norm(BONUS_ROWS), S);
  drawPixelArt(scene, 'obs_block', norm(OBSTACLE_BLOCK_ROWS), S);
  drawPixelArt(scene, 'obs_crate', norm(OBSTACLE_CRATE_ROWS), S);
  drawPixelArt(scene, 'obs_barr', norm(OBSTACLE_BARR_ROWS), S);
  drawPixelArt(scene, 'runner', norm(RUNNER_ROWS), S);
  drawPixelArt(scene, 'bomber', norm(BOMBER_ROWS), S);
  drawPixelArt(scene, 'bonus_repair', norm(BONUS_REPAIR_ROWS), S);
  drawPixelArt(scene, 'vehicle_scout', norm(SCOUT_ROWS), S);
  drawPixelArt(scene, 'vehicle_apc', norm(APC_ROWS), S);

  // Tiny explosion particle
  const gfx = scene.make.graphics({ x: 0, y: 0 });
  gfx.fillStyle(0xff6600, 1); gfx.fillRect(0, 0, 6, 6);
  gfx.fillStyle(0xffcc00, 1); gfx.fillRect(2, 2, 2, 2);
  gfx.generateTexture('particle_exp', 6, 6);
  gfx.clear();
  gfx.fillStyle(0x00ccff, 1); gfx.fillRect(0, 0, 5, 5);
  gfx.generateTexture('particle_bonus', 5, 5);
  gfx.destroy();
}

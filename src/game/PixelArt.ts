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
  'Z': 0xffdd00,      // warning yellow / Z marking
  'V': 0x22aa44,      // repair green
  'v': 0x116622,      // repair dark green
  'S': 0x5b8aa8,      // scout blue-grey
  's': 0x3a607a,      // scout dark
  'Q': 0x778899,      // scout gun grey
  'T': 0x8b7340,      // APC tan/desert
  't': 0x5e4d2a,      // APC dark tan
  'q': 0x4a3d20,      // APC gun dark
  'к': 0x6e5c30,      // APC accent (cyrillic к used as unique key)
  'M': 0x3d7a2d,      // orc military green - bright
  'I': 0x1e5014,      // orc dark military green
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

// Orc enemy (Walker) — basic green soldier with Z marking, 10×16, scale=3 → 30×48
const ORC_ROWS = [
  '.KMMMMMMK.',
  'KMMIMMIMmK',
  'KMMEMMMEmK',
  'KMMIMMMImK',
  '.KMMMMmmK.',
  'KMZMMMMMmK',
  'KIMMMMMImK',
  'KMMMMMMMmK',
  '.KMMZMMmK.',
  'KMmM..MmMK',
  'KMmM..MmMK',
  '.KM....MK.',
  '.KM....MK.',
  '.Km....mK.',
  '.KmMKKMmK.',
  '.KMMKKMMK.',
];

// Broneorc enemy (Heavy) — heavy armored orc, 14×18, scale=3 → 42×54
const BRONEORC_ROWS = [
  '..KMMMMMMMMK..',
  '.KMIMMMIMMMmK.',
  'KMMMEMMMEMMMmK',
  'KMMMIMMMIMmmMK',
  '.KMMMMMMMMImK.',
  'KIMMMMMMMMMImIK',
  'KMMIZMMMZMmMMK',
  'KMMMMMMMMMmMMK',
  'KIMMMMMMMMMImIK',
  '.KMMMMMMMMMMK.',
  'KMIMm....mMIMK',
  'KMIMm....mMIMK',
  '.KMM......MMK.',
  '.KMM......MMK.',
  '.KMmM....MmmK.',
  '.KMmM....MmmK.',
  '.KMMmMKKMmMmK.',
  '..KMMMmmMMMmK.',
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

// Ally car bonus pickup — small car inside green aura, 12×10, scale=3 → 36×30
const BONUS_ROWS = [
  '..VVVVVVVVVV..',
  '.VVVoooooooVV.',
  'VVVooOOOOoooVV',
  'VVoWwwwwwwWoVV',
  'VVoOOOOOOOoVV.',
  'VVoOOOOOOOoVV.',
  'VVoWwwwwwwWoVV',
  'VVVooOOOOoooVV',
  '.VVVoooooooVV.',
  '..VVVVVVVVVV..',
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

// Z-Orc enemy (Runner) — fast slim orc with Z chevrons, 8×14, scale=3 → 24×42
const ZORC_ROWS = [
  '.KMMMMK.',
  'KMIMMImK',
  'KMMEMEmK',
  'KMIMmImK',
  '.KMMMMK.',
  'KMZMMmMK',
  '.KMMMmK.',
  '.KIMmIK.',
  '..KMmK..',
  '..KMmK..',
  '.KM..mK.',
  '.KM..mK.',
  'KMM..mMK',
  'KMM..mMK',
];

// Chmobit enemy (Bomber) — fat round orc soldier, 12×12, scale=3 → 36×36
const CHMOBIT_ROWS = [
  '...KMMMMK...',
  '..KMMmMMmMK.',
  '.KMMmMMMmMMK',
  'KMMMZMMMZMmK',
  'KMmMMMMMMMMK',
  'KMMMMMMMMMmK',
  'KMmMMMMMMMMK',
  'KMMMZMMMZMmK',
  '.KMMmMMMmMMK',
  '..KMMmMMmMK.',
  '...KMMMMmK..',
  '....KMMK....',
];

// Repair bonus — wrench on green background, 12×12, scale=3 → 36×36
const BONUS_REPAIR_ROWS = [
  '..KVVVVVVK..',
  '.KVVVVVVVvK.',
  'KVVKKGGKVvVK',
  'KVVKGGGKVvVK',
  'KVVVKGKVVvVK',
  'KVVVVGVVVvVK',
  'KVVVGKVVVvVK',
  'KVVKGGGKVvVK',
  'KVVKKGGKVvVK',
  '.KVVVVVVVvK.',
  '..KVVVVVvK..',
  '...KVVVVK...',
];

// Scout vehicle — narrow, fast, 10×20, scale=3 → 30×60
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

// Mine hazard — 7×7, scale=3 → 21×21
const MINE_ROWS = [
  '.KDDDDK.',
  'KDdddDDK',
  'KDdZdDDK',
  'KDdddDDK',
  'KDdZdDDK',
  'KDdddDDK',
  '.KDDDDK.',
];

// Bomb obstacle (big, high damage) — 10×12, scale=3 → 30×36
const BOMB_ROWS = [
  '....KNNK....',
  '...KNNnNK...',
  '..KNNNNnNK..',
  '.KNNNnNNNnK.',
  'KNNNNNNNNnNK',
  'KNNnNNNNNnNK',
  'KNNNNNNNNnNK',
  'KNNnNNNNNnNK',
  '.KNNNNNNNnK.',
  '..KNNNNNnK..',
  '...KNNNnK...',
  '....KZZK....',
];

// Anti-tank hedgehog — X-shaped metal obstacle, 13×13, scale=3 → 39×39
const HEDGEHOG_ROWS = [
  'GG.........GG',
  'GgG.......GgG',
  '.GgGG...GGgG.',
  '..GgGGGGGgG..',
  '...GgGGGgG...',
  '....GgGgG....',
  '....GgGgG....',
  '...GgGGGgG...',
  '..GgGGGGGgG..',
  '.GgGG...GGgG.',
  'GgG.......GgG',
  'GG.........GG',
  '.............',
];

// Dragon tooth obstacle — triangle shape, 10×12, scale=3 → 30×36
const DRAGON_TOOTH_ROWS = [
  '....DD....',
  '...DdDD...',
  '...DdDdD..',
  '..DDdDdD..',
  '..DdDdDdD.',
  '.DDdDdDdDD',
  '.DdDdDdDdD',
  'DDDdDdDdDDD',
  'DdDdDdDdDdD',
  'DDDDDDDDDDD',
  'DdddddddddD',
  'DDDDDDDDDDD',
];

// General Divan boss enemy — 14×18, scale=3 → 42×54
const GENERAL_ROWS = [
  '....KDDDDDDK....',
  '...KDDDdDDdDK...',
  '...KDDDdDDdDK...',
  '....KDDDDDDK....',
  '.....KNNNNNNK...',
  '....KNNnNNNnNK..',
  '....KNNENNENnK..',
  '....KNNnNNNnNK..',
  '.....KNNNNNNK...',
  '...KRRRRRRRRRRK.',
  '..KRRYRRRRRYRRKk',
  '..KRRRRRRRRRRK..',
  '..KRRYRRRRRYRRKk',
  '..KRRRRRRRRRRK..',
  '...KRRrRRrRRKk..',
  '...KRrR..RrRKk..',
  '...KRrR..RrRKk..',
  '....KRK..KRKk...',
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
  drawPixelArt(scene, 'walker', norm(ORC_ROWS), S);
  drawPixelArt(scene, 'heavy', norm(BRONEORC_ROWS), S);
  drawPixelArt(scene, 'bullet_p', norm(BULLET_P_ROWS), S);
  drawPixelArt(scene, 'bullet_a', norm(BULLET_A_ROWS), S);
  drawPixelArt(scene, 'bonus_ally', norm(BONUS_ROWS), S);
  drawPixelArt(scene, 'obs_block', norm(OBSTACLE_BLOCK_ROWS), S);
  drawPixelArt(scene, 'obs_crate', norm(OBSTACLE_CRATE_ROWS), S);
  drawPixelArt(scene, 'obs_barr', norm(OBSTACLE_BARR_ROWS), S);
  drawPixelArt(scene, 'runner', norm(ZORC_ROWS), S);
  drawPixelArt(scene, 'bomber', norm(CHMOBIT_ROWS), S);
  drawPixelArt(scene, 'bonus_repair', norm(BONUS_REPAIR_ROWS), S);
  drawPixelArt(scene, 'vehicle_scout', norm(SCOUT_ROWS), S);
  drawPixelArt(scene, 'vehicle_apc', norm(APC_ROWS), S);
  drawPixelArt(scene, 'obs_mine', norm(MINE_ROWS), S);
  drawPixelArt(scene, 'obs_bomb', norm(BOMB_ROWS), S);
  drawPixelArt(scene, 'obs_hedgehog', norm(HEDGEHOG_ROWS), S);
  drawPixelArt(scene, 'obs_dragon', norm(DRAGON_TOOTH_ROWS), S);
  drawPixelArt(scene, 'general', norm(GENERAL_ROWS), S);

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

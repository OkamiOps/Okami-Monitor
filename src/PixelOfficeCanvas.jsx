import React, { useEffect, useRef } from "react";

// ──────────────────────────────────────────────────────────────────
// OKAMI Pixel Office — paleta alinhada com Design System v0.2.0
// Tokens canônicos:
//   --ok-orange  oklch(72% .19 45)
//   --ok-magenta oklch(70% .27 340)
//   --ok-cyan    oklch(82% .14 200)
//   --ok-success oklch(78% .16 150)
//   --ok-warning oklch(82% .16 85)
// Hexes abaixo = conversão fiel pra Phaser (não usa OKLCH nativo).
// Quem desenha sprite/marker/bubble deve referenciar OKAMI_PALETTE,
// não literais 0x... espalhados pelo código.
// ──────────────────────────────────────────────────────────────────
const OKAMI_PALETTE = {
  orange:  0xf08b3a,  // heat orange (DS)
  magenta: 0xf548bd,  // neon magenta (DS)
  cyan:    0x5bc5e8,  // volt cyan (DS)
  success: 0x6dd2a0,  // success — envelope L≈72 C≈0.16 (DS)
  warning: 0xf4c863,  // warning (DS)
  danger:  0xe85a3a,  // danger (DS)
  fg:      0xf4f4f8,  // bone
  fgSoft:  0xb9bac8,
  fgMute:  0x6c6d80,
  fgDim:   0x3d3e50,
  bg0:     0x060609,  // onyx
  bg1:     0x0b0b12,
  bg2:     0x11111b,
  bg3:     0x1a1a26,
};

// Alias retrocompat — referência única pra ID/cor de cada agente.
const agentColors = {
  orange:  OKAMI_PALETTE.orange,
  magenta: OKAMI_PALETTE.magenta,
  success: OKAMI_PALETTE.success,
  cyan:    OKAMI_PALETTE.cyan,
  warning: OKAMI_PALETTE.warning,
};

const pixelAssetBase = "/pixel-agents/assets";
const characterAssetBase = "/pixel-characters/opengameart";
const rpgCharacterAssetBase = "/rpg-characters";
const modernOfficeAssetBase = "/modern-office";
const characterScale = 2.2;
const furnitureScale = 2.45;
const modernSingleIds = Array.from({ length: 339 }, (_, index) => index + 1);
const openGameArtAgents = [
  { key: "sp-girl-1", frames: [0, 1, 2, 3, 4, 5], scale: 0.62, tint: 0xffffff, accent: OKAMI_PALETTE.cyan },
  { key: "sp-girl-2", frames: [0, 1, 2, 3, 4, 5], scale: 0.68, tint: 0xffffff, accent: OKAMI_PALETTE.magenta },
  { key: "sp-girl-1", frames: [5, 4, 3, 2, 1, 0], scale: 0.62, tint: 0xd8fff4, accent: OKAMI_PALETTE.success },
  { key: "sp-girl-2", frames: [5, 4, 3, 2, 1, 0], scale: 0.68, tint: 0xffe1bf, accent: OKAMI_PALETTE.orange },
  { key: "oga-girl", frames: [0, 1, 2, 1], scale: 1, tint: 0xd9ecff, accent: OKAMI_PALETTE.cyan },
  { key: "oga-girl", frames: [3, 4, 5, 4], scale: 1, tint: 0xfff0c6, accent: OKAMI_PALETTE.warning },
];
const rpgAgentProfiles = [
  { id: "diana", key: "rpg-blue-haired-woman", file: "blue-haired-woman.png", accent: OKAMI_PALETTE.cyan },
  { id: "morgana", key: "rpg-punk-woman", file: "punk-woman.png", accent: OKAMI_PALETTE.magenta },
  { id: "leona", key: "rpg-viking-woman", file: "viking-woman.png", accent: OKAMI_PALETTE.success },
  { id: "zelda", key: "rpg-bride", file: "bride.png", accent: 0xffc5e3 },
  { id: "astride", key: "rpg-blonde-woman", file: "blonde-woman.png", accent: 0xbfd95d },
  { id: "persefone", key: "rpg-blue-haired-kid-girl", file: "blue-haired-kid-girl.png", accent: OKAMI_PALETTE.orange },
  { id: "hermes", key: "rpg-nun", file: "nun.png", accent: 0x9aa4ff },
  { id: "operator-a", key: "rpg-blonde-kid-girl", file: "blonde-kid-girl.png", accent: OKAMI_PALETTE.cyan },
  { id: "operator-b", key: "rpg-blue-haired-kid-girl", file: "blue-haired-kid-girl.png", accent: OKAMI_PALETTE.magenta },
  { id: "bride", key: "rpg-bride", file: "bride.png", accent: 0xffc5e3 },
  { id: "farmer", key: "rpg-farmer", file: "farmer.png", accent: 0xbfd95d },
  { id: "old-woman", key: "rpg-old-woman", file: "old-woman.png", accent: 0xdfdfdf },
];
const mainAgentVisualProfiles = [
  "rpg-blue-haired-woman",
  "rpg-punk-woman",
  "rpg-viking-woman",
  "rpg-farmer",
  "rpg-blue-haired-kid-girl",
  "rpg-blonde-kid-girl",
  "rpg-farmer",
  "rpg-farmer",
  "rpg-old-woman",
];
const agentBadgeMap = new Map([
  ["diana", { color: OKAMI_PALETTE.cyan, glyph: "D" }],
  ["morgana", { color: OKAMI_PALETTE.magenta, glyph: "M" }],
  ["leona", { color: OKAMI_PALETTE.success, glyph: "L" }],
  ["zelda", { color: OKAMI_PALETTE.warning, glyph: "Z" }],
  ["astride", { color: 0xbfd95d, glyph: "A" }],
  ["persefone", { color: OKAMI_PALETTE.orange, glyph: "P" }],
  ["hermes", { color: OKAMI_PALETTE.orange, glyph: "H" }],
]);

function hashString(value = "") {
  return String(value).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function drawRoom(scene, x, y, width, height, fill, options = {}) {
  const g = scene.add.graphics();
  g.fillStyle(fill, 1);
  g.fillRect(x, y, width, height);
  g.lineStyle(4, 0x080a10, 1);
  g.strokeRect(x, y, width, height);
  g.fillStyle(0x000000, 0.14);
  for (let tx = x; tx < x + width; tx += options.tile ?? 32) {
    g.fillRect(tx, y, 2, height);
  }
  for (let ty = y; ty < y + height; ty += options.tile ?? 32) {
    g.fillRect(x, ty, width, 2);
  }
  if (options.label) {
    scene.add.text(x + 14, y + 10, options.label, {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#d8d8e6",
    }).setDepth(20);
  }
}

function drawDesk(scene, x, y, width = 112) {
  const g = scene.add.graphics();
  g.fillStyle(0x8a6238, 1);
  g.fillRect(x, y, width, 44);
  g.fillStyle(0x5b3a22, 1);
  g.fillRect(x, y + 34, width, 10);
  g.lineStyle(3, 0x24170f, 1);
  g.strokeRect(x, y, width, 44);
  g.fillStyle(0x1c2a3a, 1);
  g.fillRect(x + 20, y - 30, 38, 26);
  g.fillStyle(0x5bbcff, 1);
  g.fillRect(x + 24, y - 26, 30, 16);
  g.fillStyle(0x2b2e37, 1);
  g.fillRect(x + 33, y - 4, 12, 8);
  g.fillStyle(0xe5e8f2, 1);
  g.fillRect(x + 68, y + 12, 24, 9);
}

function drawChair(scene, x, y, color = 0x38404d) {
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.fillRect(x, y, 24, 24);
  g.fillStyle(0x151820, 1);
  g.fillRect(x + 4, y + 22, 4, 18);
  g.fillRect(x + 16, y + 22, 4, 18);
}

function drawPlant(scene, x, y) {
  const g = scene.add.graphics();
  g.fillStyle(0x7a5433, 1);
  g.fillRect(x + 8, y + 22, 18, 18);
  g.fillStyle(0x2e9b68, 1);
  g.fillRect(x + 8, y + 8, 8, 18);
  g.fillRect(x + 18, y, 8, 28);
  g.fillRect(x, y + 14, 34, 8);
}

function drawServerRack(scene, x, y) {
  // Use a beautiful tech/server stack single (alternating between mo-172 and mo-173)
  const rackId = 172 + (hashString(`${x}-${y}`) % 2);
  const scale = 1.62;
  const sprite = scene.add.image(x, y, `mo-${rackId}`)
    .setOrigin(0.5, 0.5)
    .setScale(scale)
    .setDepth(y + 20);

  // Overlay small flashing neon LED lights on the server racks
  for (let i = 0; i < 4; i += 1) {
    const ledColor = i % 2 === 0 ? OKAMI_PALETTE.cyan : OKAMI_PALETTE.magenta;
    const ledX = x - 12 + (i % 2) * 22;
    const ledY = y - 18 + i * 11;
    const led = scene.add.circle(ledX, ledY, 2.5, ledColor, 0.95).setDepth(y + 30);
    
    scene.tweens.add({
      targets: led,
      alpha: 0.18,
      duration: 380 + (i * 140) + (Math.abs(x) % 5) * 110,
      yoyo: true,
      repeat: -1,
      ease: "steps(2)",
    });
  }
}

function loadPixelAgentAssets(scene) {
  const imageAssets = {
    floorWood: `${pixelAssetBase}/floors/floor_2.png`,
    floorBlue: `${pixelAssetBase}/floors/floor_5.png`,
    floorPurple: `${pixelAssetBase}/floors/floor_7.png`,
    floorStone: `${pixelAssetBase}/floors/floor_8.png`,
    wallPanel: `${pixelAssetBase}/walls/wall_0.png`,
    deskFront: `${pixelAssetBase}/furniture/DESK/DESK_FRONT.png`,
    deskSide: `${pixelAssetBase}/furniture/DESK/DESK_SIDE.png`,
    pcOn1: `${pixelAssetBase}/furniture/PC/PC_FRONT_ON_1.png`,
    pcOn2: `${pixelAssetBase}/furniture/PC/PC_FRONT_ON_2.png`,
    pcOn3: `${pixelAssetBase}/furniture/PC/PC_FRONT_ON_3.png`,
    pcFrontOff: `${pixelAssetBase}/furniture/PC/PC_FRONT_OFF.png`,
    pcBack: `${pixelAssetBase}/furniture/PC/PC_BACK.png`,
    pcSide: `${pixelAssetBase}/furniture/PC/PC_SIDE.png`,
    chairBack: `${pixelAssetBase}/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_BACK.png`,
    chairFront: `${pixelAssetBase}/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png`,
    chairSide: `${pixelAssetBase}/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_SIDE.png`,
    sofaFront: `${pixelAssetBase}/furniture/SOFA/SOFA_FRONT.png`,
    sofaBack: `${pixelAssetBase}/furniture/SOFA/SOFA_BACK.png`,
    sofaSide: `${pixelAssetBase}/furniture/SOFA/SOFA_SIDE.png`,
    bookshelf: `${pixelAssetBase}/furniture/BOOKSHELF/BOOKSHELF.png`,
    doubleBookshelf: `${pixelAssetBase}/furniture/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png`,
    plant: `${pixelAssetBase}/furniture/PLANT/PLANT.png`,
    plant2: `${pixelAssetBase}/furniture/PLANT_2/PLANT_2.png`,
    largePlant: `${pixelAssetBase}/furniture/LARGE_PLANT/LARGE_PLANT.png`,
    hangingPlant: `${pixelAssetBase}/furniture/HANGING_PLANT/HANGING_PLANT.png`,
    pot: `${pixelAssetBase}/furniture/POT/POT.png`,
    whiteboard: `${pixelAssetBase}/furniture/WHITEBOARD/WHITEBOARD.png`,
    largePainting: `${pixelAssetBase}/furniture/LARGE_PAINTING/LARGE_PAINTING.png`,
    smallPainting: `${pixelAssetBase}/furniture/SMALL_PAINTING/SMALL_PAINTING.png`,
    smallPainting2: `${pixelAssetBase}/furniture/SMALL_PAINTING_2/SMALL_PAINTING_2.png`,
    coffeeTable: `${pixelAssetBase}/furniture/COFFEE_TABLE/COFFEE_TABLE.png`,
    smallTable: `${pixelAssetBase}/furniture/SMALL_TABLE/SMALL_TABLE_FRONT.png`,
    smallTableSide: `${pixelAssetBase}/furniture/SMALL_TABLE/SMALL_TABLE_SIDE.png`,
    tableFront: `${pixelAssetBase}/furniture/TABLE_FRONT/TABLE_FRONT.png`,
    woodenBench: `${pixelAssetBase}/furniture/WOODEN_BENCH/WOODEN_BENCH.png`,
    cushionedBench: `${pixelAssetBase}/furniture/CUSHIONED_BENCH/CUSHIONED_BENCH.png`,
    woodenChairFront: `${pixelAssetBase}/furniture/WOODEN_CHAIR/WOODEN_CHAIR_FRONT.png`,
    woodenChairBack: `${pixelAssetBase}/furniture/WOODEN_CHAIR/WOODEN_CHAIR_BACK.png`,
    woodenChairSide: `${pixelAssetBase}/furniture/WOODEN_CHAIR/WOODEN_CHAIR_SIDE.png`,
    coffee: `${pixelAssetBase}/furniture/COFFEE/COFFEE.png`,
    cactus: `${pixelAssetBase}/furniture/CACTUS/CACTUS.png`,
    clock: `${pixelAssetBase}/furniture/CLOCK/CLOCK.png`,
    bin: `${pixelAssetBase}/furniture/BIN/BIN.png`,
    modernOfficeDesign1: `${modernOfficeAssetBase}/office-design-1.gif`,
    modernOfficeDesign2: `${modernOfficeAssetBase}/office-design-2.gif`,
    modernOfficeDesign: `${modernOfficeAssetBase}/office-design-2.gif`,
  };
  Object.entries(imageAssets).forEach(([key, path]) => scene.load.image(key, path));
  modernSingleIds.forEach((id) => {
    scene.load.image(`mo-${id}`, `${modernOfficeAssetBase}/singles/${id}.png`);
  });
  rpgAgentProfiles.forEach((profile) => {
    scene.load.spritesheet(profile.key, `${rpgCharacterAssetBase}/${profile.file}`, {
      frameWidth: 32,
      frameHeight: 32,
    });
  });
  scene.load.spritesheet("oga-girl", `${characterAssetBase}/girl-sprite-sheet.png`, {
    frameWidth: 37,
    frameHeight: 37,
  });
  scene.load.spritesheet("sp-girl-1", `${characterAssetBase}/superpowers-girl-1.png`, {
    frameWidth: 59,
    frameHeight: 64,
  });
  scene.load.spritesheet("sp-girl-2", `${characterAssetBase}/superpowers-girl-2.png`, {
    frameWidth: 59,
    frameHeight: 57,
  });
  scene.load.tilemapTiledJSON("okamiOfficeMap", "/pixel-office/okami-office.tmj");
}

function addPixelImage(scene, key, x, y, scale = 3, depth = y) {
  return scene.add.image(x, y, key).setOrigin(0, 0).setScale(scale).setDepth(depth);
}

function drawAssetRoom(scene, x, y, width, height, floorKey, tint = 0xffffff) {
  scene.add.tileSprite(x, y, width, height, floorKey).setOrigin(0, 0).setDepth(1).setTint(tint);
  const g = scene.add.graphics().setDepth(3);
  g.lineStyle(8, 0x070910, 1);
  g.strokeRect(x, y, width, height);
  g.lineStyle(3, 0x242b38, 1);
  g.strokeRect(x + 8, y + 8, width - 16, height - 16);
}

function addRoomLabel(scene, x, y, label) {
  scene.add.text(x, y, label, {
    fontFamily: "monospace",
    fontSize: "13px",
    color: "#5bc5e8",
    backgroundColor: "rgba(5, 5, 7, 0.72)",
    padding: { x: 12, y: 5 },
  }).setOrigin(0.5, 0.5).setDepth(220);
}

function drawAssetWall(scene, x, y, width) {
  const g = scene.add.graphics().setDepth(4);
  g.fillStyle(0x151b25, 1);
  g.fillRect(x, y, width, 62);
  g.fillStyle(0x263344, 1);
  g.fillRect(x + 18, y + 14, width - 36, 24);
  g.fillStyle(0x7ce8ff, 0.35);
  g.fillRect(x + 30, y + 22, width - 60, 6);
  g.lineStyle(4, 0x05070c, 1);
  g.strokeRect(x, y, width, 62);
}

function tiledProps(object) {
  return Object.fromEntries((object.properties ?? []).map((prop) => [prop.name, prop.value]));
}

function tiledObjects(map, layerName) {
  return map.getObjectLayer(layerName)?.objects
    ?? map.objects?.find((layer) => layer.name === layerName)?.objects
    ?? map.layers?.find((layer) => layer.name === layerName)?.objects
    ?? map.scene?.cache?.tilemap?.get("okamiOfficeMap")?.data?.layers?.find((layer) => layer.name === layerName)?.objects
    ?? [];
}

function tiledColor(value, fallback = 0xffffff) {
  if (typeof value === "number") return value;
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return fallback;
  const normalized = raw.startsWith("0x") ? raw.slice(2) : raw.replace(/^#/, "");
  const parsed = Number.parseInt(normalized, 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function tiledNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function tiledPoints(map, layerName, type) {
  return tiledObjects(map, layerName)
    .filter((object) => !type || object.type === type)
    .map((object) => [object.x, object.y]);
}

function shortThink(value, fallback = "observando contexto", maxLength = 24) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function agentThink(agent) {
  return shortThink(
    agent.think
      ?? agent.currentThink
      ?? agent.currentTask
      ?? agent.task
      ?? agent.status,
    "aguardando sinal",
  );
}

function drawTiledBrand(scene, object) {
  const g = scene.add.graphics().setDepth(210);
  g.fillStyle(0x05070c, 0.86);
  g.fillRoundedRect(object.x, object.y, object.width, object.height, 4);
  g.lineStyle(2, OKAMI_PALETTE.cyan, 0.85);
  g.strokeRoundedRect(object.x, object.y, object.width, object.height, 4);
  g.fillStyle(OKAMI_PALETTE.magenta, 0.8);
  g.fillRect(object.x + 10, object.y + 9, 4, object.height - 18);
  scene.add.text(object.x + 16, object.y + 9, "OKAMI OPS", {
    fontFamily: "monospace",
    fontSize: "13px",
    color: "#5bc5e8",
  }).setDepth(211);
}

function drawTiledNeon(scene, object) {
  const props = tiledProps(object);
  const color = tiledColor(props.color, OKAMI_PALETTE.cyan);
  const bar = scene.add.graphics().setDepth(212);
  bar.fillStyle(color, 0.9);
  bar.fillRect(object.x, object.y, 56, 5);
  bar.fillStyle(0xffffff, 0.5);
  bar.fillRect(object.x + 64, object.y, 18, 5);
  scene.tweens.add({
    targets: bar,
    alpha: 0.42,
    duration: 900 + (object.id % 4) * 160,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });
}

function drawRuntimeBridge(scene, object) {
  const x = object.x;
  const y = object.y;
  scene.add.rectangle(x, y, object.width * 0.55, object.height, 0x252c37).setDepth(5);
  scene.add.rectangle(x - 40, y - 20, 72, 26, 0xc4c7cf).setDepth(6);
  scene.add.rectangle(x + 32, y - 20, 72, 26, 0x343842).setDepth(6);
  scene.add.rectangle(x + 90, y - 132, 86, 152, 0x222936).setDepth(6);
}

function drawTiledImage(scene, object) {
  const props = tiledProps(object);
  if (!props.key) return;
  addPixelImage(
    scene,
    props.key,
    object.x,
    object.y,
    tiledNumber(props.scale, 3),
    tiledNumber(props.depth, object.y),
  );
}

function drawTiledObject(scene, object) {
  if (object.type === "image") {
    drawTiledImage(scene, object);
    return;
  }
  if (object.type === "okamiBrand") {
    drawTiledBrand(scene, object);
    return;
  }
  if (object.type === "neonBar") {
    drawTiledNeon(scene, object);
    return;
  }
  if (object.type === "kitchen") {
    drawKitchen(scene, object.x, object.y);
    return;
  }
  if (object.type === "games") {
    drawGameRoom(scene, object.x, object.y);
    return;
  }
  if (object.type === "bridge") {
    return;
  }
  if (object.type === "corridor") {
    drawRuntimeBridge(scene, object);
    return;
  }
  if (object.type === "rack") {
    drawServerRack(scene, object.x, object.y);
  }
}

function drawOkamiAtmosphere(scene) {
  const overlay = scene.add.graphics().setDepth(214);
  overlay.lineStyle(1, OKAMI_PALETTE.cyan, 0.16);
  overlay.strokeRect(58, 68, 864, 436);
  overlay.lineStyle(1, OKAMI_PALETTE.magenta, 0.18);
  overlay.strokeRect(990, 442, 500, 400);

  const pulseNodes = [
    [242, 496, OKAMI_PALETTE.cyan], [298, 496, OKAMI_PALETTE.magenta], [354, 496, OKAMI_PALETTE.orange],
    [1058, 616, OKAMI_PALETTE.cyan], [1132, 616, OKAMI_PALETTE.magenta], [1206, 616, OKAMI_PALETTE.success],
    [1280, 616, OKAMI_PALETTE.orange], [1354, 616, OKAMI_PALETTE.cyan],
  ];
  pulseNodes.forEach(([x, y, color], index) => {
    const node = scene.add.rectangle(x, y, 22, 5, color, 0.9).setDepth(215);
    scene.tweens.add({
      targets: node,
      alpha: 0.22,
      duration: 520 + index * 80,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  });

  const mark = scene.add.graphics().setDepth(18);
  mark.lineStyle(3, OKAMI_PALETTE.cyan, 0.26);
  mark.strokeCircle(826, 462, 32);
  mark.lineStyle(3, OKAMI_PALETTE.magenta, 0.22);
  mark.strokeCircle(826, 462, 20);
  mark.fillStyle(OKAMI_PALETTE.orange, 0.18);
  mark.fillTriangle(826, 430, 846, 482, 806, 482);
}

function drawTiledOfficeLayout(scene, map) {
  tiledObjects(map, "rooms").forEach((room) => {
    const props = tiledProps(room);
    drawAssetRoom(
      scene,
      room.x,
      room.y,
      room.width,
      room.height,
      props.floorKey ?? "floorStone",
      tiledColor(props.tint, 0xffffff),
    );
    addRoomLabel(scene, room.x + room.width / 2, room.y + 40, room.name);
  });

  tiledObjects(map, "walls").forEach((wall) => {
    if (wall.type === "wallPanel") drawAssetWall(scene, wall.x, wall.y, wall.width);
  });

  ["decor", "furniture", "runtimeRacks"].forEach((layerName) => {
    tiledObjects(map, layerName).forEach((object) => drawTiledObject(scene, object));
  });

  drawOkamiAtmosphere(scene);
}

function drawKitchen(scene, x, y) {
  const g = scene.add.graphics().setDepth(y + 20);
  g.fillStyle(0x202a36, 1);
  g.fillRect(x, y, 70, 118);
  g.fillStyle(0xd8e9ef, 1);
  g.fillRect(x + 8, y + 10, 48, 22);
  g.fillStyle(0x4bc7df, 0.5);
  g.fillRect(x + 14, y + 16, 36, 8);
  g.fillStyle(0x414b58, 1);
  g.fillRect(x + 8, y + 44, 48, 58);
  g.fillStyle(OKAMI_PALETTE.cyan, 0.9);
  g.fillRect(x + 18, y + 54, 7, 7);
  g.fillStyle(OKAMI_PALETTE.magenta, 0.9);
  g.fillRect(x + 36, y + 54, 7, 7);
  addPixelImage(scene, "coffee", x + 88, y + 48, 2.4, y + 86);
  addPixelImage(scene, "smallTable", x + 120, y + 56, 2.55, y + 96);
  addPixelImage(scene, "woodenChairFront", x + 110, y + 108, 2.3, y + 140);
  addPixelImage(scene, "woodenChairFront", x + 178, y + 108, 2.3, y + 140);
}

function drawGameRoom(scene, x, y) {
  const g = scene.add.graphics().setDepth(y + 20);
  g.fillStyle(0x2e7d60, 1);
  g.fillRoundedRect(x, y, 118, 58, 4);
  g.lineStyle(4, 0x17392e, 1);
  g.strokeRoundedRect(x, y, 118, 58, 4);
  g.lineStyle(2, 0xe8fff6, 0.75);
  g.lineBetween(x + 59, y + 4, x + 59, y + 54);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(x + 74, y + 28, 4);
  addPixelImage(scene, "sofaFront", x + 170, y + 10, 2.7, y + 52);
  addPixelImage(scene, "coffeeTable", x + 184, y + 64, 2.6, y + 112);
  addPixelImage(scene, "largePlant", x + 310, y + 4, 2.6, y + 100);
}

function drawOkamiDetails(scene) {
  const g = scene.add.graphics().setDepth(210);
  g.fillStyle(0x05070c, 0.86);
  g.fillRoundedRect(66, 116, 166, 34, 4);
  g.lineStyle(2, OKAMI_PALETTE.cyan, 0.85);
  g.strokeRoundedRect(66, 116, 166, 34, 4);
  scene.add.text(82, 125, "OKAMI OPS", {
    fontFamily: "monospace",
    fontSize: "13px",
    color: "#5bc5e8",
  }).setDepth(211);

  [[276, 126, OKAMI_PALETTE.magenta], [640, 126, OKAMI_PALETTE.orange], [1070, 112, OKAMI_PALETTE.cyan], [1360, 454, OKAMI_PALETTE.magenta]].forEach(([x, y, color]) => {
    const bar = scene.add.graphics().setDepth(212);
    bar.fillStyle(color, 0.9);
    bar.fillRect(x, y, 56, 5);
    bar.fillStyle(0xffffff, 0.5);
    bar.fillRect(x + 64, y, 18, 5);
  });

  [190, 360, 530, 700].forEach((x, index) => {
    const consoleLight = scene.add.graphics().setDepth(208);
    consoleLight.fillStyle(index % 2 ? OKAMI_PALETTE.magenta : OKAMI_PALETTE.cyan, 0.8);
    consoleLight.fillRect(x, 500, 24, 5);
    consoleLight.fillStyle(OKAMI_PALETTE.success, 0.8);
    consoleLight.fillRect(x + 32, 500, 18, 5);
  });
}

function getAgentBadge(worker) {
  const normalizedName = String(worker.name ?? worker.agentName ?? worker.id ?? "").toLowerCase();
  for (const [name, badge] of agentBadgeMap.entries()) {
    if (normalizedName.includes(name)) return badge;
  }
  return {
    color: agentColors[worker.color] ?? OKAMI_PALETTE.cyan,
    glyph: String(worker.name ?? worker.id ?? "?").slice(0, 1).toUpperCase(),
  };
}

function getOpenGameArtProfile(agent, index = 0) {
  const normalizedName = String(agent.name ?? agent.agentName ?? agent.id ?? "").toLowerCase();
  const namedIndex = ["diana", "morgana", "leona", "zelda", "astride", "persefone", "hermes"]
    .findIndex((name) => normalizedName.includes(name));
  const profileIndex = namedIndex >= 0
    ? namedIndex % openGameArtAgents.length
    : Math.abs(index + hashString(`${agent.parentId ?? ""}-${agent.id ?? ""}-${agent.name ?? ""}`)) % openGameArtAgents.length;
  return openGameArtAgents[profileIndex];
}

function getRpgAgentProfile(agent, index = 0) {
  const normalizedName = String(agent.name ?? agent.agentName ?? agent.id ?? "").toLowerCase();
  
  // 1. Prioritize direct name-based matching for Astride, Diana, Zelda, Morgana, Leona, Persefone
  const namedProfile = rpgAgentProfiles.find((profile) => normalizedName.includes(profile.id));
  if (namedProfile) return namedProfile;

  // 2. Secondary fallback via pre-assigned visualProfileKey
  if (agent.visualProfileKey) {
    const assignedProfile = rpgAgentProfiles.find((profile) => profile.key === agent.visualProfileKey);
    if (assignedProfile) return assignedProfile;
  }
  
  // 3. Absolute fallback based on hashString
  const profileIndex = Math.abs(index + hashString(`${agent.parentId ?? ""}-${agent.id ?? ""}-${agent.name ?? ""}`)) % rpgAgentProfiles.length;
  return rpgAgentProfiles[profileIndex];
}

// Frame rows do spritesheet RPG (4 frames cada direção, total 16 frames = 4×4 grid).
const RPG_FRAME_ROWS = {
  down:  [0, 1, 2, 3],
  left:  [4, 5, 6, 7],
  right: [8, 9, 10, 11],
  up:    [12, 13, 14, 15],
};

// Decide direção do walk baseado em (dx, dy). Prioriza eixo de maior magnitude.
function directionFromDelta(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? "left" : "right";
  return dy < 0 ? "up" : "down";
}

// Atualiza os frames sendo animados pelo sprite. Usado quando o agente troca de
// "typing" para "walking" e vice-versa.
function setSpriteWalkFrames(sprite, direction) {
  const frames = RPG_FRAME_ROWS[direction] ?? RPG_FRAME_ROWS.down;
  sprite.setData("frames", frames);
  sprite.setData("frameIndex", 0);
  sprite.setFrame(frames[0]);
}

function addRpgAgentSprite(scene, agent, x, y, scale, depth, offset = 0, mode = "standing") {
  const profile = getRpgAgentProfile(agent, offset);
  const initialFrames = mode === "typing-up"
    ? [12, 13, 12, 14]
    : mode === "typing"
      ? [0, 1, 0, 2]
      : RPG_FRAME_ROWS[["down", "left", "right"][offset % 3]] ?? RPG_FRAME_ROWS.down;
  const sprite = scene.add.sprite(x, y, profile.key, initialFrames[0])
    .setOrigin(0.5, 1)
    .setScale(scale)
    .setDepth(depth);
  sprite.setData("accent", profile.accent);
  sprite.setData("frames", initialFrames);
  sprite.setData("frameIndex", 0);
  // Animação contínua — sempre lê a lista atual de frames do sprite (dinâmica).
  scene.time.addEvent({
    delay: (mode === "typing" ? 320 : 220) + offset * 37,
    loop: true,
    callback: () => {
      const frames = sprite.getData("frames") ?? initialFrames;
      const current = sprite.getData("frameIndex") ?? 0;
      const next = (current + 1) % frames.length;
      sprite.setFrame(frames[next]);
      sprite.setData("frameIndex", next);
    },
  });
  return sprite;
}

function addOpenGameArtAgentSprite(scene, agent, x, y, scale, depth, offset = 0, mode = "standing") {
  const profile = getOpenGameArtProfile(agent, offset);
  const baseFrames = profile.frames ?? [0, 1, 2, 1];
  const frames = mode === "typing"
    ? [baseFrames[1] ?? baseFrames[0], baseFrames[2] ?? baseFrames[0], baseFrames[1] ?? baseFrames[0], baseFrames[3] ?? baseFrames[0]]
    : baseFrames;
  const sprite = scene.add.sprite(x, y, profile.key, frames[0])
    .setOrigin(0.5, 1)
    .setScale(scale * (profile.scale ?? 1))
    .setDepth(depth);
  sprite.setTint(profile.tint);
  sprite.setData("accent", profile.accent);
  scene.time.addEvent({
    delay: (mode === "typing" ? 300 : 390) + offset * 28,
    loop: true,
    callback: () => {
      const current = sprite.getData("frameIndex") ?? 0;
      const next = (current + 1) % frames.length;
      sprite.setFrame(frames[next]);
      sprite.setData("frameIndex", next);
    },
  });
  return sprite;
}

function drawAssetWorkstation(scene, worker, x, y, index, selectedAgentId, onSelect) {
  const selected = selectedAgentId === worker.parentId || selectedAgentId === worker.id;
  const badge = getAgentBadge(worker);
  const accent = badge.color;
  const c = scene.add.container(x, y).setDepth(y + 170);
  const hit = scene.add.rectangle(58, 58, 118, 112, 0xffffff, 0).setInteractive({ useHandCursor: true });
  const select = scene.add.rectangle(58, 70, 118, 102, accent, selected ? 0.08 : 0);
  if (selected) select.setStrokeStyle(3, accent, 0.78);

  const chair = scene.add.image(16, 56, "chairBack").setOrigin(0, 0).setScale(furnitureScale);
  const shadow = scene.add.ellipse(30, 84, 42, 9, 0x010208, 0.35);
  const body = addRpgAgentSprite(scene, worker, 30, 90, characterScale * 0.92, y + 184, index, "typing");
  const identityDot = scene.add.circle(17, 62, 8, accent, 0.96).setStrokeStyle(2, 0x050507, 0.9);
  const identityGlyph = scene.add.text(17, 58, badge.glyph, {
    fontFamily: "monospace",
    fontSize: "8px",
    color: "#050507",
  }).setOrigin(0.5, 0.5);
  const desk = scene.add.image(0, 58, "deskFront").setOrigin(0, 0).setScale(furnitureScale);
  const pc = scene.add.image(72, 38, `pcOn${(index % 3) + 1}`).setOrigin(0, 0).setScale(1.62);
  const keyboard = scene.add.rectangle(86, 90, 28, 6, 0x20283a, 1);
  const note = scene.add.rectangle(108, 88, 18, 8, 0xe8e1d4, 1);
  const activity = scene.add.text(58, 12, shortThink(agentThink(worker), "trabalhando", 22), {
    fontFamily: "monospace",
    fontSize: "8px",
    color: "#050507",
    backgroundColor: selected ? "#5bc5e8" : "#f548bd",
    padding: { x: 6, y: 3 },
  }).setOrigin(0.5, 0);
  const progressBack = scene.add.rectangle(58, 118, 88, 4, 0x151821, 0.9);
  const progress = scene.add.rectangle(16, 118, 20, 4, accent, 0.95).setOrigin(0, 0.5);

  const name = scene.add.text(58, 126, worker.name, {
    fontFamily: "monospace",
    fontSize: "10px",
    color: "#c9cad8",
    backgroundColor: "#050507",
    padding: { x: 6, y: 3 },
  }).setOrigin(0.5, 0);

  c.add([select, hit, chair, shadow, body, identityDot, identityGlyph, desk, pc, keyboard, note, activity, progressBack, progress, name]);
  const toolStates = [agentThink(worker), "lendo arquivo", "chamando tool", "validando"];
  scene.time.addEvent({
    delay: 820 + index * 70,
    loop: true,
    callback: () => {
      const next = ((activity.getData("stateIndex") ?? 0) + 1) % toolStates.length;
      activity.setText(shortThink(toolStates[next], "trabalhando", 22));
      activity.setData("stateIndex", next);
      pc.setTexture(`pcOn${((next + index) % 3) + 1}`);
      progress.width = 22 + next * 18;
    },
  });
  scene.tweens.add({
    targets: progress,
    alpha: 0.28,
    duration: 520,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });
  hit.on("pointerdown", () => onSelect?.(worker.parentId));
  hit.on("pointerover", () => select.setStrokeStyle(3, accent, 0.9));
  hit.on("pointerout", () => {
    select.setFillStyle(accent, selected ? 0.08 : 0);
    select.setStrokeStyle(selected ? 3 : 0, accent, selected ? 0.78 : 0);
  });
  return c;
}

function drawEmptyWorkstation(scene, x, y, index) {
  const c = scene.add.container(x, y).setDepth(y + 120);
  const chair = scene.add.image(16, 56, "chairBack").setOrigin(0, 0).setScale(furnitureScale);
  chair.setAlpha(0.58);
  const desk = scene.add.image(0, 58, "deskFront").setOrigin(0, 0).setScale(furnitureScale);
  const pc = scene.add.image(72, 38, `pcOn${(index % 3) + 1}`).setOrigin(0, 0).setScale(1.62);
  pc.setAlpha(0.74);
  const keyboard = scene.add.rectangle(86, 90, 28, 6, 0x20283a, 0.75);
  const note = scene.add.rectangle(108, 88, 18, 8, 0xe8e1d4, 0.65);
  c.add([chair, desk, pc, keyboard, note]);
  return c;
}

function drawLeadAgent(scene, agent, x, y, index, selectedAgentId, onSelect) {
  const selected = selectedAgentId === agent.id;
  const badge = getAgentBadge(agent);
  const c = scene.add.container(x, y).setDepth(y + 160);
  const select = scene.add.ellipse(0, 2, 42, 14, badge.color, selected ? 0.16 : 0)
    .setStrokeStyle(selected ? 2 : 0, badge.color, selected ? 0.85 : 0);
  const sprite = addRpgAgentSprite(scene, agent, 0, 0, characterScale * 0.96, y + 150, index, "standing");
  const identityDot = scene.add.circle(-18, -44, 8, badge.color, 0.96).setStrokeStyle(2, 0x050507, 0.9);
  const identityGlyph = scene.add.text(-18, -48, badge.glyph, {
    fontFamily: "monospace",
    fontSize: "8px",
    color: "#050507",
  }).setOrigin(0.5, 0.5);
  const name = scene.add.text(0, 10, agent.name, {
    fontFamily: "monospace",
    fontSize: "10px",
    color: selected ? "#ffffff" : "#d8d8e6",
    backgroundColor: "#050507",
    padding: { x: 6, y: 3 },
  }).setOrigin(0.5, 0);
  c.add([select, sprite, identityDot, identityGlyph, name]);
  c.setSize(70, 96);
  c.setInteractive({ useHandCursor: true });
  c.on("pointerdown", () => onSelect?.(agent.id));
  return c;
}

function drawWalkingAgent(scene, agent, points, index, selectedAgentId, onSelect) {
  const start = points[index % points.length] ?? [292, 690];
  const [x, y] = start;
  const selected = selectedAgentId === agent.id;
  const badge = getAgentBadge(agent);
  const c = scene.add.container(x, y).setDepth(y + 160);
  const select = scene.add.ellipse(0, 2, 38, 13, badge.color, selected ? 0.15 : 0)
    .setStrokeStyle(selected ? 2 : 0, badge.color, selected ? 0.75 : 0);
  const sprite = addRpgAgentSprite(scene, agent, 0, 0, characterScale * 0.96, y + 150, index, "standing");
  const identityDot = scene.add.circle(-17, -43, 8, badge.color, 0.96).setStrokeStyle(2, 0x050507, 0.9);
  const identityGlyph = scene.add.text(-17, -47, badge.glyph, {
    fontFamily: "monospace",
    fontSize: "8px",
    color: "#050507",
  }).setOrigin(0.5, 0.5);
  const statusTexts = [agentThink(agent), "indo ao cafe", "conversando", "revisando board", "checando logs"];
  const bubble = scene.add.text(0, -72, shortThink(statusTexts[index % statusTexts.length], "circulando", 22), {
    fontFamily: "monospace",
    fontSize: "8px",
    color: "#050507",
    backgroundColor: index % 2 ? "#5bc5e8" : "#f08b3a",
    padding: { x: 6, y: 3 },
  }).setOrigin(0.5, 1).setAlpha(0.86);
  const name = scene.add.text(0, 10, agent.name, {
    fontFamily: "monospace",
    fontSize: "9px",
    color: selected ? "#ffffff" : "#d8d8e6",
    backgroundColor: "#050507",
    padding: { x: 5, y: 3 },
  }).setOrigin(0.5, 0);
  c.add([select, sprite, identityDot, identityGlyph, bubble, name]);
  c.setSize(62, 86);
  c.setInteractive({ useHandCursor: true });
  c.on("pointerdown", () => onSelect?.(agent.id));

  let previousTarget = start;
  const walkNext = () => {
    const choices = points.filter((point) => Math.abs(point[0] - previousTarget[0]) + Math.abs(point[1] - previousTarget[1]) > 180);
    const target = choices[Math.floor(Math.random() * choices.length)] ?? points[index % points.length] ?? previousTarget;
    const dx = target[0] - c.x;
    const dy = target[1] - c.y;
    sprite.setFlipX(dx < 0);
    bubble.setText(shortThink(statusTexts[Math.floor(Math.random() * statusTexts.length)], "circulando", 22));
    scene.tweens.add({
      targets: c,
      x: target[0],
      y: target[1],
      duration: 1600 + (Math.abs(dx) + Math.abs(dy)) * 1.35 + (index % 8) * 120,
      ease: "Linear",
      onUpdate: () => c.setDepth(c.y + 160),
      onComplete: () => {
        previousTarget = target;
        scene.time.delayedCall(900 + Math.floor(Math.random() * 2200), walkNext);
      },
    });
  };
  scene.time.delayedCall(500 + Math.floor(Math.random() * 2200), walkNext);
  return c;
}

function drawWindow(scene, x, y, width = 92) {
  const g = scene.add.graphics();
  g.fillStyle(0x20334a, 1);
  g.fillRect(x, y, width, 42);
  g.lineStyle(4, 0x090a10, 1);
  g.strokeRect(x, y, width, 42);
  g.fillStyle(0x79e8ff, 0.34);
  g.fillRect(x + 8, y + 8, width - 16, 8);
  g.fillRect(x + 8, y + 22, width - 16, 6);
}

function drawShelf(scene, x, y, width = 118) {
  // Use the premium double bookshelf asset or a tech cabinet asset
  return scene.add.image(x, y, "doubleBookshelf").setOrigin(0, 0).setScale(furnitureScale).setDepth(y + 95);
}

function drawMeetingTable(scene, x, y) {
  const depth = y + 105;
  
  // Create a modular modern conference/strategy table composite using tableFront sprites
  const numSections = 3;
  const sectionWidth = 48;
  const startX = x + 16;
  
  for (let i = 0; i < numSections; i += 1) {
    scene.add.image(startX + i * sectionWidth, y + 16, "tableFront")
      .setOrigin(0, 0)
      .setScale(furnitureScale * 0.9)
      .setDepth(depth);
  }

  // Chairs above the table facing down: chairFront
  const chairPositionsUpper = [x + 20, x + 76, x + 132];
  chairPositionsUpper.forEach((cx) => {
    scene.add.image(cx, y - 10, "chairFront")
      .setOrigin(0, 0)
      .setScale(furnitureScale * 0.92)
      .setDepth(depth - 10);
  });
  
  // Chairs below the table facing up: chairBack
  const chairPositionsLower = [x + 20, x + 76, x + 132];
  chairPositionsLower.forEach((cx) => {
    scene.add.image(cx, y + 64, "chairBack")
      .setOrigin(0, 0)
      .setScale(furnitureScale * 0.92)
      .setDepth(depth + 20);
  });

  // Add high-tech equipment on the meeting table: laptops (mo-167/168) and accessories
  addModernSingle(scene, 167, x + 34, y + 18, 0.58, depth + 5);
  addModernSingle(scene, 168, x + 90, y + 18, 0.58, depth + 5);
  addModernSingle(scene, 338, x + 144, y + 26, 0.55, depth + 5);
}

function drawWorkstation(scene, worker, x, y, index, selectedAgentId, onSelect) {
  const parentSelected = selectedAgentId === worker.parentId;
  const color = agentColors[worker.color] ?? OKAMI_PALETTE.cyan;
  const scale = parentSelected ? 0.92 : 0.82;
  const c = scene.add.container(x, y).setDepth(y + 130);

  const chair = scene.add.graphics();
  chair.fillStyle(parentSelected ? color : 0x2f3746, 1);
  chair.fillRect(-20, 18, 40, 36);
  chair.fillStyle(0x141821, 1);
  chair.fillRect(-15, 48, 8, 24);
  chair.fillRect(8, 48, 8, 24);

  const shadow = scene.add.ellipse(0, 62, 62, 12, 0x010208, 0.35);
  const sprite = addRpgAgentSprite(scene, worker, 0, 32, scale * 1.2, y + 130, index, "typing");

  const desk = scene.add.graphics();
  desk.fillStyle(0x8d6238, 1);
  desk.fillRect(-58, 34, 116, 52);
  desk.fillStyle(0x5a3922, 1);
  desk.fillRect(-58, 74, 116, 12);
  desk.lineStyle(4, 0x20140d, 1);
  desk.strokeRect(-58, 34, 116, 52);
  desk.fillStyle(0x1b2738, 1);
  desk.fillRect(-24, 0, 48, 31);
  desk.fillStyle(parentSelected ? color : 0x67cfff, 1);
  desk.fillRect(-18, 6, 36, 17);
  desk.fillStyle(0x111520, 1);
  desk.fillRect(-6, 31, 12, 9);
  desk.fillStyle(0xe8e1d4, 1);
  desk.fillRect(28, 50, 22, 9);
  desk.fillStyle(color, 1);
  desk.fillRect(-50, 48, 9, 12);

  c.add([shadow, chair, sprite, desk]);

  const name = scene.add.text(0, 90, worker.name, {
    fontFamily: "monospace",
    fontSize: parentSelected ? "12px" : "10px",
    color: parentSelected ? "#ffffff" : "#c9cad8",
    backgroundColor: "#050507",
    padding: { x: 5, y: 3 },
  }).setOrigin(0.5, 0);
  c.add(name);

  c.setSize(124, 126);
  c.setInteractive({ useHandCursor: true });
  c.on("pointerdown", () => onSelect?.(worker.parentId));
  c.on("pointerover", () => c.setScale(1.04));
  c.on("pointerout", () => c.setScale(1));
  return c;
}

function hasWorkTask(person, tasks = []) {
  const taskText = String(person.task ?? person.currentTask ?? "").trim();
  const statusText = String(person.status ?? "").trim();
  const inactiveTask = /^(idle|awaiting|aguardando|sem tarefa|no task|none|-)?$/i.test(taskText)
    || /sessions registradas|sessions registered|sess[oõ]es registradas/i.test(taskText);
  const idleStatus = /^(idle|livre|free|available|awaiting|aguardando|sem tarefa|no task)$/i.test(statusText);
  if (idleStatus) return false;
  const strongActiveStatus = /(working|running|busy|processando|executando|trabalhando|coding|codando)/i.test(statusText);
  const looseActiveStatus = strongActiveStatus || /\bactive\b/i.test(statusText);
  const isWorkingTaskStatus = (value = "") => (
    /(progress|in_progress|doing|running|run|active|review|executando|trabalhando|coding|codando)/i.test(String(value))
    && !/(done|complete|completed|closed|idle|livre|awaiting|aguardando|blocked|bloque|todo|backlog|triage)/i.test(String(value))
  );
  const localTasks = (person.tasks ?? []).some((task) => (
    isWorkingTaskStatus(`${task.status ?? ""} ${task.meta ?? ""}`)
  ));
  const agentTask = tasks.some((task) => {
    const owner = String(task.owner ?? task.assignee ?? "").toLowerCase();
    const title = String(task.title ?? "").toLowerCase();
    const status = String(task.status ?? task.meta ?? "").toLowerCase();
    const personId = String(person.parentId ?? person.id).toLowerCase();
    const personName = String(person.name ?? "").toLowerCase();
    const matchesOwner = owner && (
      owner.includes(personId)
      || personId.includes(owner)
      || owner.includes(personName)
      || personName.includes(owner)
    );
    const matchesCurrentTitle = taskText && title && (
      title.includes(taskText.toLowerCase().slice(0, 32))
      || taskText.toLowerCase().includes(title.slice(0, 32))
    );
    return (matchesOwner || matchesCurrentTitle) && isWorkingTaskStatus(`${status} ${task.meta ?? ""}`);
  });
  const statusAllowsDesk = person.visualType === "agent" ? strongActiveStatus : looseActiveStatus;
  return localTasks || agentTask || (statusAllowsDesk && Boolean(taskText) && !inactiveTask);
}

function isTechnicalAgentName(name = "") {
  return /^(cli|cron|slack|session|shell|terminal|run|worker|telegram)-?\d*$/i.test(String(name).trim());
}

function normalizeVisualId(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function buildCanonicalAgents(agents) {
  const source = agents.filter((agent) => !isTechnicalAgentName(agent.name ?? agent.id));
  const seen = new Set();
  return source.filter((agent) => {
    const key = normalizeVisualId(agent.id ?? agent.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildOfficePeople(agents, tasks = []) {
  // Astride (CTO) primeiro pra ocupar a mesa do gabinete executivo (desks[0]).
  // Demais cargos em ordem de senioridade técnica.
  const primaryPriority = ["astride", "zelda", "diana", "morgana", "persefone", "leona", "hermes"];
  const sortedAgents = buildCanonicalAgents(agents)
    .sort((a, b) => {
      const aIndex = primaryPriority.findIndex((name) => String(a.id ?? a.name).toLowerCase().includes(name)
        || String(a.name ?? "").toLowerCase().includes(name));
      const bIndex = primaryPriority.findIndex((name) => String(b.id ?? b.name).toLowerCase().includes(name)
        || String(b.name ?? "").toLowerCase().includes(name));
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    });

  const primaryAgents = sortedAgents.map((agent, index) => ({
    ...agent,
    visualType: "agent",
    parentId: agent.id,
    task: agent.currentTask,
    visualProfileKey: mainAgentVisualProfiles[index % mainAgentVisualProfiles.length],
  }));
  const subagents = agents.flatMap((agent) => (agent.subagents ?? []).map((child) => ({
    ...agent,
    id: `${agent.id}-${child.id ?? child.name}`,
    parentId: agent.id,
    name: child.name,
    visualType: "subagent",
    status: child.status,
    task: child.task,
    model: child.model,
  })));

  const meaningful = subagents.filter((child) => !isTechnicalAgentName(child.name));

  // Os 6 agentes nomeados (Astride/Zelda/Diana/Morgana/Persefone/Leona) SEMPRE
  // sentam na mesa pra evitar empilhamento. workingByData controla o badge:
  //   true  → ● working (verde) + bubble com task atual
  //   false → ○ idle (amarelo) + bubble "aguardando sinal"
  // Idle agentes fazem pausas mais frequentes (vão pegar ar / café / etc).
  const seated = primaryAgents.map((p) => ({
    ...p,
    workingByData: hasWorkTask(p, tasks),
  }));
  const roaming = meaningful.map((p) => ({ ...p, workingByData: false }));

  return {
    seated: seated.slice(0, 12),
    roaming: roaming.slice(0, 9),
  };
}

function buildOfficeRoute(spawns, index) {
  const sharedPath = [
    [292, 690],
    [520, 540],
    [724, 760],
    [966, 414],
    [1118, 322],
    [1378, 720],
    [1028, 720],
    [686, 760],
  ];
  const start = spawns[index % spawns.length] ?? sharedPath[index % sharedPath.length];
  return [start, ...sharedPath]
    .slice(index % 3)
    .concat(sharedPath.slice(0, index % 3));
}

function buildRoamPoints(spawns) {
  return [
    ...spawns,
    [232, 692],
    [442, 540],
    [616, 676],
    [812, 760],
    [962, 410],
    [1122, 314],
    [1326, 342],
    [1398, 726],
    [1088, 742],
  ];
}

function drawPerson(scene, agent, x, y, options = {}) {
  const color = agentColors[agent.color] ?? OKAMI_PALETTE.cyan;
  const scale = options.scale ?? 1;
  const h = 54 * scale;
  const c = scene.add.container(x, y).setDepth(y + 100);
  if (options.main) {
    const signal = scene.add.ellipse(0, 22 * scale, 46 * scale, 16 * scale, color, 0.14);
    c.add(signal);
  }
  const shadow = scene.add.ellipse(0, 22 * scale, 34 * scale, 10 * scale, 0x02030a, 0.42);
  const sprite = addRpgAgentSprite(scene, agent, 0, 18 * scale, scale * 1.2, y + 100, 0, "standing");
  c.add([shadow, sprite]);

  const name = scene.add.text(0, h * 1.25, agent.name, {
    fontFamily: "monospace",
    fontSize: `${options.main ? 12 : 9}px`,
    color: options.main ? "#ffffff" : "#c7c7d7",
    backgroundColor: "#050507",
    padding: { x: 4, y: 2 },
  }).setOrigin(0.5, 0);
  c.add(name);

  if (options.task) {
    const bubble = scene.add.text(0, -h * 1.25, options.task.slice(0, 36), {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#f2f2f7",
      backgroundColor: "#171726",
      padding: { x: 8, y: 5 },
      wordWrap: { width: 220 },
    }).setOrigin(0.5, 1);
    c.add(bubble);
  }

  c.setSize(42 * scale, 72 * scale);
  c.setInteractive({ useHandCursor: true });
  c.on("pointerdown", () => options.onSelect?.(agent.id));
  scene.tweens.add({
    targets: c,
    y: y - 4,
    duration: 900 + Math.random() * 500,
    yoyo: true,
    repeat: -1,
    ease: "steps(2)",
  });
  return c;
}

const modernOffice = {
  x: 34,
  y: 26,
  width: 1532,
  height: 836,
  scale: 1,
};

function officePoint(x, y) {
  return [
    modernOffice.x + x * modernOffice.scale,
    modernOffice.y + y * modernOffice.scale,
  ];
}

function addModernSingle(scene, id, x, y, scale = 2, depth = y) {
  return scene.add.image(x, y, `mo-${id}`).setOrigin(0, 0).setScale(scale).setDepth(depth);
}

function drawOuterBorderWalls(scene) {
  // Border CLARA — moldura branca-cinza com filete cyan e cantos magenta
  const border = scene.add.graphics().setDepth(10);
  border.fillStyle(0xf2f3f7, 1);
  border.fillRect(38, 34, 1488, 18);   // topo
  border.fillRect(38, 816, 1488, 18);  // base
  border.fillRect(38, 34, 18, 800);    // esquerda
  border.fillRect(1508, 34, 18, 800);  // direita

  border.lineStyle(1, 0x6c6d80, 0.5);
  border.strokeRect(38, 34, 1488, 800);
  border.lineStyle(1, OKAMI_PALETTE.cyan, 0.45);
  border.strokeRect(40, 36, 1486, 798);

  // Cantos magenta — identidade OKAMI
  border.fillStyle(OKAMI_PALETTE.magenta, 0.95);
  [
    [40, 36, 18, 2], [40, 36, 2, 18],
    [1508, 36, 18, 2], [1524, 36, 2, 18],
    [40, 832, 18, 2], [40, 816, 2, 18],
    [1508, 832, 18, 2], [1524, 816, 2, 18],
  ].forEach(([cx, cy, w, h]) => border.fillRect(cx, cy, w, h));
}

function drawCozyOfficeFloor(scene, x, y, width, height, floorType = "tile", accent = OKAMI_PALETTE.cyan) {
  // Versão CLARA OKAMI — superfícies brancas/cinza-claro inspiradas nos GIFs do asset pack.
  // Accents OKAMI mantidos contidos (filetes, glow leve), sem fundo onyx.
  const g = scene.add.graphics().setDepth(2);

  if (floorType === "wood") {
    // Sala executiva — madeira clara warm (creme/bege)
    g.fillStyle(0xe6d7b8, 1);
    g.fillRect(x, y, width, height);
    g.fillStyle(0xc9b48a, 0.45);
    const plankWidth = 18;
    for (let tx = x; tx < x + width; tx += plankWidth) {
      g.fillRect(tx, y, 1, height);
      for (let ty = y + (hashString(`${tx}`) % 4) * 24; ty < y + height; ty += 48) {
        g.fillRect(tx + 1, ty, plankWidth - 2, 1);
      }
    }
    g.fillStyle(accent, 0.1);
    g.fillRect(x + 12, y + 12, width - 24, 1);
  } else if (floorType === "tile") {
    // Piso cerâmico claro — branco-cinza com grout
    g.fillStyle(0xe6e8ee, 1);
    g.fillRect(x, y, width, height);
    const tileSize = 28;
    g.fillStyle(0xc8cad2, 1);
    for (let tx = x + tileSize; tx < x + width; tx += tileSize) {
      g.fillRect(tx, y, 1, height);
    }
    for (let ty = y + tileSize; ty < y + height; ty += tileSize) {
      g.fillRect(x, ty, width, 1);
    }
    // Variação sutil em tons claros
    for (let tx = x; tx < x + width; tx += tileSize) {
      for (let ty = y; ty < y + height; ty += tileSize) {
        const hash = hashString(`${tx}-${ty}`);
        if (hash % 13 === 0) {
          g.fillStyle(0xd0d2da, 0.5);
          g.fillRect(tx + 1, ty + 1, tileSize - 2, tileSize - 2);
        }
      }
    }
  } else if (floorType === "server") {
    // Server room — cinza-azulado claro com grid cyan contido
    g.fillStyle(0xc2ccd6, 1);
    g.fillRect(x, y, width, height);
    const tileSize = 24;
    g.fillStyle(0xa9b3bf, 1);
    for (let tx = x + tileSize; tx < x + width; tx += tileSize) {
      g.fillRect(tx, y, 1, height);
    }
    for (let ty = y + tileSize; ty < y + height; ty += tileSize) {
      g.fillRect(x, ty, width, 1);
    }
    g.fillStyle(accent, 0.18);
    for (let tx = x + 12; tx < x + width; tx += tileSize * 4) {
      g.fillRect(tx, y, 2, height);
    }
  } else if (floorType === "lounge") {
    // Lounge — carpete bege-cinza com textura de pontos
    g.fillStyle(0xd4cdb8, 1);
    g.fillRect(x, y, width, height);
    g.fillStyle(0xbcb39d, 0.55);
    for (let tx = x + 8; tx < x + width; tx += 16) {
      for (let ty = y + 8; ty < y + height; ty += 16) {
        g.fillRect(tx, ty, 2, 2);
      }
    }
  } else if (floorType === "warm") {
    // Recepção / war room — piso cerâmico branco-creme com grid maior
    g.fillStyle(0xede9dd, 1);
    g.fillRect(x, y, width, height);
    g.fillStyle(0xcfc9b6, 1);
    const tileSize = 32;
    for (let tx = x + tileSize; tx < x + width; tx += tileSize) {
      g.fillRect(tx, y, 1, height);
    }
    for (let ty = y + tileSize; ty < y + height; ty += tileSize) {
      g.fillRect(x, ty, width, 1);
    }
  }
}

function drawSolidPixelWall(scene, x, y, width, height, accentColor = OKAMI_PALETTE.cyan) {
  // Versão CLARA — paredes off-white com trim escuro discreto + filete accent OKAMI
  const isVertical = height > width;
  const wallDepth = y + 100;
  const g = scene.add.graphics().setDepth(wallDepth);

  // 1. Sombra projetada (cinza-claro)
  g.fillStyle(0x6c6d80, 0.18);
  if (!isVertical) {
    g.fillRect(x, y + height, width, 4);
  } else {
    g.fillRect(x + width, y, 4, height);
  }

  // 2. Face da parede — off-white
  g.fillStyle(0xf2f3f7, 1);
  g.fillRect(x, y, width, height);

  // 3. Trim inferior (linha cinza-médio)
  g.fillStyle(0x6c6d80, 1);
  if (!isVertical) {
    g.fillRect(x, y + height - 2, width, 2);
  } else {
    g.fillRect(x + width - 2, y, 2, height);
  }

  // 4. Trim superior (faixa branca pura, dá altura à parede)
  g.fillStyle(0xffffff, 1);
  if (!isVertical) {
    g.fillRect(x, y, width, 4);
  } else {
    g.fillRect(x, y, 4, height);
  }

  // 5. Filete neon accent (identidade OKAMI)
  g.fillStyle(accentColor, 0.55);
  if (!isVertical) {
    g.fillRect(x + 2, y + 4, width - 4, 1);
  } else {
    g.fillRect(x + 4, y + 2, 1, height - 4);
  }

  // 6. Janelas de vidro em paredes longas (sutis, vidro azulado claro)
  if (!isVertical && width >= 100) {
    const gx = x + 22;
    const gw = width - 44;
    g.fillStyle(0xc8d4e0, 0.65);
    g.fillRect(gx, y + 6, gw, height - 9);
    g.fillStyle(accentColor, 0.12);
    g.fillRect(gx + 1, y + 7, gw - 2, height - 11);
    g.fillStyle(accentColor, 0.55);
    g.fillRect(gx, y + 6, 1, height - 9);
    g.fillRect(gx + gw - 1, y + 6, 1, height - 9);
  } else if (isVertical && height >= 100) {
    const gy = y + 22;
    const gh = height - 44;
    g.fillStyle(0xc8d4e0, 0.65);
    g.fillRect(x + 6, gy, width - 9, gh);
    g.fillStyle(accentColor, 0.12);
    g.fillRect(x + 7, gy + 1, width - 11, gh - 2);
    g.fillStyle(accentColor, 0.55);
    g.fillRect(x + 6, gy, width - 9, 1);
    g.fillRect(x + 6, gy + gh - 1, width - 9, 1);
  }
}

function drawModernGlassPartition(scene, x, y, width, height, accentColor = OKAMI_PALETTE.cyan) {
  // Redirect to drawSolidPixelWall to enforce high-fidelity solid 2.5D walls everywhere!
  drawSolidPixelWall(scene, x, y, width, height, accentColor);
}

function drawCubicleDivider(scene, x, y, length, isVertical = false, accentColor = 0x64748b) {
  // Divisória clara — painel cinza-médio com filete accent (visível em fundo claro)
  const g = scene.add.graphics().setDepth(y + 115);
  if (!isVertical) {
    g.fillStyle(0xb6bbc6, 1);
    g.fillRect(x, y, length, 6);
    g.fillStyle(accentColor, 0.85);
    g.fillRect(x, y, length, 2);
    g.fillStyle(0x6c6d80, 1);
    g.fillRect(x, y + 5, length, 1);
  } else {
    g.fillStyle(0xb6bbc6, 1);
    g.fillRect(x, y, 6, length);
    g.fillStyle(accentColor, 0.85);
    g.fillRect(x, y, 2, length);
    g.fillStyle(0x6c6d80, 1);
    g.fillRect(x + 5, y, 1, length);
  }
}

function drawModernDoorway(scene, x, y, width, height, accentColor = OKAMI_PALETTE.cyan) {
  // Doorway claro — frame branco com porta de vidro translúcido cyan
  const isVertical = height > width;
  const g = scene.add.graphics().setDepth(y + 105);

  // Frame metal claro
  g.fillStyle(0xc8cad2, 1);
  g.fillRect(x, y, width, height);

  // Painel de vidro translúcido (cor accent contida)
  g.fillStyle(0xffffff, 0.55);
  g.fillRect(x + 2, y + 2, width - 4, height - 4);
  g.fillStyle(accentColor, 0.22);
  g.fillRect(x + 2, y + 2, width - 4, height - 4);

  // Filete neon (status keycard verde) — identidade OKAMI mantida
  g.fillStyle(0x22c55e, 0.9);
  if (!isVertical) {
    g.fillRect(x + width * 0.5 - 6, y + height / 2 - 2, 4, 4);
  } else {
    g.fillRect(x + width / 2 - 2, y + height * 0.5 - 6, 4, 4);
  }
}

function drawModernRoom(scene, x, y, width, height, floorColor, label, accent = OKAMI_PALETTE.cyan, options = {}) {
  drawOfficeZone(scene, x, y, width, height, floorColor, label, accent, options);
}

function drawOfficeZone(scene, x, y, width, height, floorColor, label, accent = OKAMI_PALETTE.cyan, options = {}) {
  // Heurística do tipo de piso pelo label (mantida + warm pra reception/copa/war room)
  let floorType = "tile";
  const name = String(label).toUpperCase();
  if (name.includes("KITCHEN") || name.includes("COPA") || name.includes("CAFE") || name.includes("RECEPTION") || name.includes("WAR")) {
    floorType = "warm";
  } else if (name.includes("LOUNGE")) {
    floorType = "lounge";
  } else if (name.includes("SERVER") || name.includes("RUNTIME") || name.includes("DATACENTER")) {
    floorType = "server";
  } else if (name.includes("GABINETE") || name.includes("WOOD") || name.includes("EXECUTIVE") || name.includes("COMMAND")) {
    floorType = "wood";
  }

  drawCozyOfficeFloor(scene, x, y, width, height, floorType, accent);

  // Filete interno (contido, sem stroke pesado)
  const border = scene.add.graphics().setDepth(3);
  border.lineStyle(1, accent, 0.18);
  border.strokeRect(x + 3, y + 3, width - 6, height - 6);

  // Label OKAMI: card escuro sobre fundo claro, JetBrains Mono caps com tracking
  const styledLabel = String(label).toUpperCase().split("").join(" ");
  scene.add.text(x + 12, y + 10, styledLabel, {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: "10px",
    fontStyle: "bold",
    color: "#f4f4f8",
    backgroundColor: "rgba(6, 6, 9, 0.92)",
    padding: { x: 8, y: 4 },
  }).setOrigin(0, 0).setDepth(205);
  // Filete da cor accent sob o label (identidade visual)
  const swatch = scene.add.graphics().setDepth(206);
  swatch.fillStyle(accent, 0.95);
  swatch.fillRect(x + 12, y + 26, 4 + styledLabel.length * 6, 2);
}

// drawOfficeDesk — mesa pixel-art clara (madeira clara) que combina com tema OKAMI claro.
// Convenção: y = topo visual da mesa. Mesa ocupa visualmente ~y..y+30 (compatível com
// drawModernSeatedAgent que usa yDesk = y_agente - 30).
function drawOfficeDesk(scene, x, y, _accent = OKAMI_PALETTE.cyan, _stationId, _scale) {
  const g = scene.add.graphics().setDepth(y + 40);
  // Sombra da mesa no chão
  g.fillStyle(0x6c6d80, 0.32);
  g.fillRect(x - 50, y + 28, 100, 4);
  // Pés metálicos
  g.fillStyle(0x6c6d80, 1);
  g.fillRect(x - 44, y + 22, 6, 8);
  g.fillRect(x + 38, y + 22, 6, 8);
  // Tampo madeira clara (tom warm OKAMI)
  g.fillStyle(0xc9a878, 1);
  g.fillRect(x - 52, y, 104, 22);
  // Veio da madeira (sombra interna sutil)
  g.fillStyle(0xa37c4b, 0.55);
  g.fillRect(x - 52, y + 16, 104, 1);
  // Borda escura na frente da mesa (tampo termina aqui)
  g.fillStyle(0x6b4a26, 1);
  g.fillRect(x - 52, y + 20, 104, 2);
  return g;
}

// drawCubicleStation — mesa do bullpen com PC apoiado em cima.
// Convenção: y = topo da mesa (mesma do drawOfficeDesk).
// facingDown true: agente sentado ATRÁS da mesa (sup. do bullpen), PC mostra frente.
// facingDown false: agente sentado NA FRENTE da mesa (inf. do bullpen), PC mostra costas.
// Desenha apenas o PC (independente da mesa) — usado pra diferenciar ON/OFF.
function drawCubiclePC(scene, x, y, pcVariant, facingDown, on = true) {
  // Z-order:
  //   facingDown=true (agente atrás): PC.depth = y+30, agente em y+35 cobre PC.
  //   facingDown=false (agente na frente): PC.depth = y+45, agente em y+90 cobre PC.
  let pcKey;
  if (!on) {
    pcKey = "pcFrontOff";
  } else {
    pcKey = facingDown ? `pcOn${pcVariant}` : "pcBack";
  }
  const pcDepth = facingDown ? y + 30 : y + 45;
  scene.add.image(x, y + 10, pcKey)
    .setOrigin(0.5, 1)
    .setScale(1.4)
    .setDepth(pcDepth);
}

function drawCubicleStation(scene, x, y, accent, pcVariant = 1, facingDown = true) {
  drawOfficeDesk(scene, x, y, accent);
  drawCubiclePC(scene, x, y, pcVariant, facingDown, true);
}

function drawOfficeKitchen(scene, x, y) {
  // Counter against back wall
  addModernSingle(scene, 320, x, y - 20, 0.85, y + 120);
  
  // Vending machine next to counter
  addModernSingle(scene, 318, x + 120, y - 20, 0.82, y + 122);
  
  // Dining table with 2 chairs (centered in kitchen area)
  addModernSingle(scene, 267, x + 200, y + 60, 0.82, y + 140);
  addModernSingle(scene, 173, x + 166, y + 64, 0.88, y + 150);
  addModernSingle(scene, 173, x + 252, y + 64, 0.88, y + 150);
}

function drawOfficeSofa(scene, x, y, accent = OKAMI_PALETTE.magenta) {
  // Giant flat-screen TV mounted on the back wall
  addModernSingle(scene, 305, x + 34, y - 48, 0.96, y + 30);

  // Modern modular sofa layout
  addModernSingle(scene, 196, x, y, 0.85, y + 90);
  addModernSingle(scene, 197, x + 78, y, 0.85, y + 91);
  addModernSingle(scene, 198, x + 156, y, 0.85, y + 92);
  
  // Retro arcade cabinets for agent gaming / entertainment
  addModernSingle(scene, 313, x + 258, y - 20, 0.88, y + 80);
  addModernSingle(scene, 314, x + 314, y - 20, 0.88, y + 81);
  
  // Lounge side tables and warm plants
  addModernSingle(scene, 194, x + 218, y + 30, 0.78, y + 120);
  addModernSingle(scene, 99, x - 18, y + 36, 0.82, y + 130);
}

function drawOfficeBaseShell(scene) {
  // Shell CLARO — fundo cinza muito claro (cantos do escritório/área extramuros)
  const base = scene.add.graphics().setDepth(1);
  base.fillStyle(0xdee2ea, 1);
  base.fillRect(modernOffice.x, modernOffice.y, modernOffice.width, modernOffice.height);
  base.lineStyle(1, OKAMI_PALETTE.cyan, 0.22);
  base.strokeRect(modernOffice.x + 10, modernOffice.y + 10, modernOffice.width - 20, modernOffice.height - 20);
  // Área principal: piso branco-cinza
  base.fillStyle(0xeaedf2, 1);
  base.fillRect(58, 54, 1448, 760);
  // Grid sutil (sem mexer muito no contraste, tom claro)
  for (let tx = 58; tx < 1506; tx += 28) {
    for (let ty = 54; ty < 814; ty += 28) {
      const alternate = ((tx - 58) / 28 + (ty - 54) / 28) % 2 === 0;
      base.fillStyle(alternate ? 0xffffff : 0x6c6d80, alternate ? 0.18 : 0.05);
      base.fillRect(tx, ty, 27, 27);
    }
  }
  return base;
}

function drawBrandSign(scene, x = 120, y = 12) {
  // Brand sign compact OKAMI — desenhado FORA do escritório (margem superior do canvas)
  // ou em qualquer área fora das salas. Pequeno, discreto.
  const w = 168;
  const h = 22;
  const brand = scene.add.graphics().setDepth(204);
  brand.fillStyle(0x060609, 0.96);
  brand.fillRect(x, y, w, h);
  brand.lineStyle(1, OKAMI_PALETTE.cyan, 0.65);
  brand.strokeRect(x, y, w, h);
  // Barra magenta lateral
  brand.fillStyle(OKAMI_PALETTE.magenta, 0.95);
  brand.fillRect(x, y, 3, h);
  scene.add.text(x + 8, y + 4, "OKAMI", {
    fontFamily: '"Space Grotesk", sans-serif',
    fontSize: "11px",
    fontStyle: "600",
    color: "#f4f4f8",
  }).setDepth(205);
  scene.add.text(x + 56, y + 7, "M I S S I O N   C O N T R O L", {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: "7px",
    color: "#5bc5e8",
  }).setDepth(205);
}

// Plaquinha OKAMI pequena para parede de sala (estilo placa institucional)
function drawOkamiPlaque(scene, x, y) {
  const w = 60;
  const h = 18;
  const g = scene.add.graphics().setDepth(y + 60);
  g.fillStyle(0x1a1a26, 1);
  g.fillRect(x, y, w, h);
  g.lineStyle(1, OKAMI_PALETTE.magenta, 0.95);
  g.strokeRect(x, y, w, h);
  g.fillStyle(OKAMI_PALETTE.magenta, 0.95);
  g.fillRect(x, y, 2, h);
  scene.add.text(x + 6, y + 4, "OKAMI", {
    fontFamily: '"Space Grotesk", sans-serif',
    fontSize: "9px",
    fontStyle: "600",
    color: "#f4f4f8",
  }).setDepth(y + 61);
}

function drawModernPlantLine(scene, items) {
  items.forEach(([id, x, y, scale = 0.72]) => addModernSingle(scene, id, x, y, scale, y + 92));
}
// ─────────────────────────────────────────────────────────────────────
// HELPERS DE LAYOUT TILE-A-TILE
// ─────────────────────────────────────────────────────────────────────
// Assets vêm da pasta pixel-agents/furniture (escala nativa 16×16 px).
// Em escala 2x cada tile = 32×32. Footprints conhecidos:
//   DESK_FRONT       3×2 tiles (96×64 px @ 2x)
//   PC_FRONT_ON_X    1×2 tiles (32×64 px @ 2x)
//   SOFA_FRONT       2×1 tiles (64×32 px @ 2x)
//   SOFA_SIDE        1×2 tiles (32×64 px @ 2x)
//   CUSHIONED_CHAIR_* 1×1 (32×32 px @ 2x)
//   COFFEE_TABLE     1×1, TABLE_FRONT 1×1, SMALL_TABLE 1×1
//   BOOKSHELF        1×2, DOUBLE_BOOKSHELF 2×2
//   WHITEBOARD       2×1
//   PLANT 1×1, LARGE_PLANT 1×2, HANGING_PLANT 1×1, CACTUS 1×1
//   LARGE_PAINTING 2×1, SMALL_PAINTING 1×1, CLOCK 1×1
//   COFFEE 1×1, BIN 1×1, WOODEN_BENCH 2×1, CUSHIONED_BENCH 2×1
const FURNITURE_SCALE = 2;

function place(scene, key, x, y, opts = {}) {
  const scale = opts.scale ?? FURNITURE_SCALE;
  const origin = opts.origin ?? [0, 0];
  const depth = opts.depth ?? (y + (opts.depthBias ?? 60));
  return scene.add.image(x, y, key)
    .setOrigin(origin[0], origin[1])
    .setScale(scale)
    .setDepth(depth);
}

function drawOpsOfficeLayout(scene, layout) {
  // ─────────────────────────────────────────────────────────────────────
  // OKAMI HQ — background animado vindo do vídeo office.mp4 (1280×720)
  // criado pelo usuário. O vídeo é renderizado por um elemento HTML <video>
  // EMBAIXO do canvas Phaser (canvas transparente). Aqui só:
  //   1) Marca scene.officeUsesVideo = true (pra outros desenhos pularem)
  //   2) Sobrepõe brand sign + kanban + agentes
  // ─────────────────────────────────────────────────────────────────────
  scene.officeUsesVideo = true;

  // Brand sign no canto sup esq (sobreposto)
  drawBrandSign(scene, 60, 14);
  return;
  // ─────────────────────────────────────────────────────────────────────
  // O código abaixo (desenho tile-by-tile) fica como fallback documentado,
  // mas não é executado por causa do return acima.
  // ─────────────────────────────────────────────────────────────────────
  drawOfficeBaseShell(scene);

  // ─────────────────────────────────────────────────────────────────────
  // OKAMI HQ — tile-by-tile com assets do pixel-agents/furniture
  //
  //   ┌──────────────┬──────────────────────────────┬───────────────┐
  //   │ EXECUTIVE    │   BULLPEN                    │ SERVER ROOM   │
  //   │ (CTO)        │   (2 fileiras × 4 mesas)     │               │
  //   │ 44..420      │   440..1080                  │ 1100..1500    │
  //   │ 44..380      │   44..540                    │ 44..380       │
  //   ├──────────────┤                              ├───────────────┤
  //   │ RECEPTION    │                              │ WAR ROOM      │
  //   │              │                              │ (meeting)     │
  //   │ 44..420      │   440..1080                  │ 1100..1500    │
  //   │ 400..820     │   LOUNGE 560..820            │ 400..820      │
  //   └──────────────┴──────────────────────────────┴───────────────┘
  //
  //   Paredes: 12px espessura. Cores OKAMI por sala:
  //     Executive = magenta, Reception = orange, Bullpen = cyan,
  //     Lounge = green, Server = cyan, War Room = magenta
  // ─────────────────────────────────────────────────────────────────────

  // 1. Pisos por sala (paleta OKAMI)
  drawOfficeZone(scene, 56, 56, 364, 324, 0x1a1a26, "EXECUTIVE OFFICE", OKAMI_PALETTE.magenta);
  drawOfficeZone(scene, 56, 412, 364, 408, 0x11111b, "RECEPTION", OKAMI_PALETTE.orange);
  drawOfficeZone(scene, 452, 56, 628, 484, 0x0b0b12, "BULLPEN", OKAMI_PALETTE.cyan);
  drawOfficeZone(scene, 452, 552, 628, 268, 0x11111b, "LOUNGE", OKAMI_PALETTE.success);
  drawOfficeZone(scene, 1112, 56, 388, 324, 0x060609, "SERVER ROOM", OKAMI_PALETTE.cyan);
  drawOfficeZone(scene, 1112, 412, 388, 408, 0x11111b, "WAR ROOM", OKAMI_PALETTE.magenta);

  // 2. Paredes externas (perímetro do canvas)
  // Topo
  drawSolidPixelWall(scene, 44, 44, 376, 12, OKAMI_PALETTE.magenta);   // exec
  drawSolidPixelWall(scene, 440, 44, 640, 12, OKAMI_PALETTE.cyan);  // bullpen
  drawSolidPixelWall(scene, 1100, 44, 400, 12, OKAMI_PALETTE.cyan); // server
  // Base
  drawSolidPixelWall(scene, 44, 820, 376, 12, OKAMI_PALETTE.orange);  // reception
  drawSolidPixelWall(scene, 440, 820, 640, 12, OKAMI_PALETTE.success); // lounge
  drawSolidPixelWall(scene, 1100, 820, 400, 12, OKAMI_PALETTE.magenta); // war
  // Esquerda
  drawSolidPixelWall(scene, 44, 44, 12, 336, OKAMI_PALETTE.magenta);   // exec
  drawSolidPixelWall(scene, 44, 400, 12, 432, OKAMI_PALETTE.orange);  // reception
  // Direita
  drawSolidPixelWall(scene, 1488, 44, 12, 336, OKAMI_PALETTE.cyan); // server
  drawSolidPixelWall(scene, 1488, 400, 12, 432, OKAMI_PALETTE.magenta); // war

  // 3. Paredes internas (verticais entre colunas)
  // Coluna esq | bullpen (com porta exec-bullpen y=180..240 e reception-bullpen y=580..650)
  drawSolidPixelWall(scene, 420, 44, 12, 136, OKAMI_PALETTE.magenta);  // exec-bullpen acima da porta
  drawSolidPixelWall(scene, 420, 240, 12, 340, OKAMI_PALETTE.orange); // entre as portas
  drawSolidPixelWall(scene, 420, 650, 12, 170, OKAMI_PALETTE.orange); // abaixo da porta reception
  // Bullpen/lounge | server/war (portas bullpen-server y=180..240, lounge-war y=680..760)
  drawSolidPixelWall(scene, 1080, 44, 12, 136, OKAMI_PALETTE.cyan);
  drawSolidPixelWall(scene, 1080, 240, 12, 440, OKAMI_PALETTE.cyan);
  drawSolidPixelWall(scene, 1080, 760, 12, 60, OKAMI_PALETTE.success);

  // 4. Paredes internas (horizontais entre linhas)
  // Exec | Reception (porta x=200..280)
  drawSolidPixelWall(scene, 44, 380, 156, 12, OKAMI_PALETTE.magenta);
  drawSolidPixelWall(scene, 280, 380, 140, 12, OKAMI_PALETTE.orange);
  // Bullpen | Lounge (porta x=680..780)
  drawSolidPixelWall(scene, 440, 540, 240, 12, OKAMI_PALETTE.cyan);
  drawSolidPixelWall(scene, 780, 540, 300, 12, OKAMI_PALETTE.success);
  // Server | War (porta x=1280..1380)
  drawSolidPixelWall(scene, 1100, 380, 180, 12, OKAMI_PALETTE.cyan);
  drawSolidPixelWall(scene, 1380, 380, 120, 12, OKAMI_PALETTE.magenta);

  // 5. Doorways visuais (carpete claro nas passagens)
  drawModernDoorway(scene, 420, 180, 12, 60, OKAMI_PALETTE.magenta); // exec→bullpen
  drawModernDoorway(scene, 420, 580, 12, 70, OKAMI_PALETTE.orange); // reception→bullpen
  drawModernDoorway(scene, 1080, 180, 12, 60, OKAMI_PALETTE.cyan); // bullpen→server
  drawModernDoorway(scene, 1080, 680, 12, 80, OKAMI_PALETTE.magenta); // lounge→war
  drawModernDoorway(scene, 200, 380, 80, 12, OKAMI_PALETTE.orange); // exec→reception
  drawModernDoorway(scene, 680, 540, 100, 12, OKAMI_PALETTE.success); // bullpen→lounge
  drawModernDoorway(scene, 1280, 380, 100, 12, OKAMI_PALETTE.magenta); // server→war

  // 6. Bullpen — divisórias de cubículo (4 colunas separadas + linha central)
  drawCubicleDivider(scene, 460, 308, 600, false, OKAMI_PALETTE.cyan); // horizontal entre fileiras
  // Verticais separando os 4 cubículos (fileira 1)
  drawCubicleDivider(scene, 600, 80, 220, true, OKAMI_PALETTE.cyan);
  drawCubicleDivider(scene, 740, 80, 220, true, OKAMI_PALETTE.cyan);
  drawCubicleDivider(scene, 880, 80, 220, true, OKAMI_PALETTE.cyan);
  drawCubicleDivider(scene, 1020, 80, 220, true, OKAMI_PALETTE.cyan);
  // Verticais separando os 4 cubículos (fileira 2)
  drawCubicleDivider(scene, 600, 320, 215, true, OKAMI_PALETTE.cyan);
  drawCubicleDivider(scene, 740, 320, 215, true, OKAMI_PALETTE.cyan);
  drawCubicleDivider(scene, 880, 320, 215, true, OKAMI_PALETTE.cyan);
  drawCubicleDivider(scene, 1020, 320, 215, true, OKAMI_PALETTE.cyan);

  // 7. Border + brand (brand sign no rodapé esquerdo, FORA das salas)
  drawOuterBorderWalls(scene);
  drawBrandSign(scene, 60, 14);

  // ─────────────────────────────────────────────────────────────────────
  // 8. EXECUTIVE OFFICE — Astride CTO (44..420 × 44..380)
  // ─────────────────────────────────────────────────────────────────────
  // Parede do fundo: bookshelf + quadros + plaquinha OKAMI
  place(scene, "doubleBookshelf", 64, 80, { depth: 130 });
  drawOkamiPlaque(scene, 150, 64);
  place(scene, "whiteboard", 230, 64, { depth: 100 });
  place(scene, "largePainting", 320, 64, { depth: 100 });
  place(scene, "hangingPlant", 280, 60, { depth: 105 });

  // ★ MESA DO CTO — só a mesa aqui; o PC vem em drawOffice (ON quando Astride está
  //   sentada, OFF se eventualmente ela sai pro break).
  drawOfficeDesk(scene, 230, 170, OKAMI_PALETTE.magenta);

  // Cadeira de visita em frente à mesa do CTO (entre mesa e usuário)
  place(scene, "chairFront", 218, 240, { depth: 310 });

  // Canto inferior: relógio + plantas + lixeira (longe da mesa)
  place(scene, "clock", 70, 230, { depth: 290 });
  place(scene, "largePlant", 360, 250, { depth: 320 });
  place(scene, "plant", 320, 320, { depth: 380 });
  place(scene, "bin", 370, 330, { depth: 390 });

  // Cantinho de café no canto inferior esquerdo
  place(scene, "smallTable", 80, 320, { depth: 380 });
  place(scene, "coffee", 82, 312, { depth: 382 });

  // ─────────────────────────────────────────────────────────────────────
  // 9. RECEPTION (44..420 × 400..820) — balcão + área de espera
  // ─────────────────────────────────────────────────────────────────────
  // Decoração na parede do topo
  place(scene, "largePainting", 70, 422, { depth: 480 });
  place(scene, "clock", 200, 426, { depth: 480 });
  place(scene, "smallPainting", 250, 422, { depth: 480 });
  place(scene, "smallPainting2", 330, 422, { depth: 480 });
  // Balcão de recepção (3 mesas alinhadas) + PC apoiado em cima da mesa central
  place(scene, "deskFront", 80, 478, { depth: 540 });
  place(scene, "deskFront", 176, 478, { depth: 540 });
  place(scene, "deskFront", 272, 478, { depth: 540 });
  // PC em cima da mesa central — origin (0.5, 1) garante que bottom do PC = topo da mesa
  scene.add.image(224, 486, "pcOn1")
    .setOrigin(0.5, 1)
    .setScale(1.6)
    .setDepth(545);
  // Cadeira atrás do balcão (recepcionista) — bem distante da mesa
  place(scene, "chairBack", 208, 432, { origin: [0.5, 0.5], depth: 525 });
  // Bench estofado para clientes esperando junto ao balcão
  place(scene, "cushionedBench", 80, 590, { depth: 650 });
  place(scene, "cushionedBench", 240, 590, { depth: 650 });
  // Sofá em L no canto inferior
  place(scene, "sofaSide", 76, 660, { depth: 720 });
  place(scene, "sofaFront", 110, 720, { depth: 780 });
  place(scene, "sofaFront", 174, 720, { depth: 780 });
  place(scene, "coffeeTable", 140, 760, { depth: 800 });
  // Plantas grandes nos cantos — DENTRO dos bounds (reception termina em y=820)
  place(scene, "largePlant", 60, 690, { depth: 760 });
  place(scene, "largePlant", 360, 690, { depth: 760 });
  place(scene, "plant", 360, 588, { depth: 648 });
  // Lixeira
  place(scene, "bin", 370, 795, { depth: 855 });

  // ─────────────────────────────────────────────────────────────────────
  // 10. BULLPEN (440..1080 × 44..540) — 8 cubículos polidos
  // ─────────────────────────────────────────────────────────────────────
  // Aqui desenhamos só as MESAS. Os PCs (ON ou OFF) são desenhados em drawOffice,
  // baseado em quais mesas têm agente sentado.
  layout.desks.slice(1).forEach(([x, y, accent]) => {
    drawOfficeDesk(scene, x, y, accent);
  });
  // Decoração da parede do topo (DENTRO da sala, em y > 60)
  place(scene, "largePainting", 470, 76, { depth: 130 });
  place(scene, "clock", 590, 76, { depth: 130 });
  place(scene, "whiteboard", 670, 70, { depth: 130 });
  place(scene, "smallPainting", 820, 76, { depth: 130 });
  place(scene, "smallPainting2", 880, 76, { depth: 130 });
  place(scene, "largePainting", 950, 76, { depth: 130 });
  // Impressora compartilhada — única, no canto direito após a 4ª coluna de mesas
  place(scene, "doubleBookshelf", 1030, 460, { depth: 530 });
  // Pequenas plantas para cantos (DENTRO dos bounds)
  place(scene, "plant", 460, 460, { depth: 530 });

  // ─────────────────────────────────────────────────────────────────────
  // 11. LOUNGE (440..1080 × 560..820) — TV + sofá em U + área café
  // ─────────────────────────────────────────────────────────────────────
  // TV grande na parede (frame + tela com feed piscante)
  const tvX = 460;
  const tvY = 568;
  const tvW = 96;
  const tvH = 50;
  const tvFrame = scene.add.graphics().setDepth(620);
  tvFrame.fillStyle(0x060609, 1);
  tvFrame.fillRect(tvX, tvY, tvW, tvH);
  tvFrame.lineStyle(2, 0x6c6d80, 0.85);
  tvFrame.strokeRect(tvX, tvY, tvW, tvH);
  // Tela com cor base
  const tvScreen = scene.add.graphics().setDepth(621);
  tvScreen.fillStyle(0x142035, 1);
  tvScreen.fillRect(tvX + 4, tvY + 4, tvW - 8, tvH - 8);
  // Linhas de scan / interferência piscando
  const tvScan = scene.add.graphics().setDepth(622);
  tvScan.fillStyle(OKAMI_PALETTE.cyan, 0.45);
  tvScan.fillRect(tvX + 4, tvY + 12, tvW - 8, 2);
  tvScan.fillStyle(OKAMI_PALETTE.magenta, 0.35);
  tvScan.fillRect(tvX + 4, tvY + 24, tvW - 8, 1);
  tvScan.fillStyle(0xffffff, 0.5);
  tvScan.fillRect(tvX + 4, tvY + 36, tvW - 8, 1);
  scene.tweens.add({
    targets: tvScan,
    alpha: 0.35,
    duration: 380,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });
  // LED de status TV (pequeno verde piscando)
  const tvLed = scene.add.circle(tvX + tvW - 6, tvY + tvH - 6, 1.6, OKAMI_PALETTE.success, 0.95).setDepth(623);
  scene.tweens.add({
    targets: tvLed,
    alpha: 0.15,
    duration: 900,
    yoyo: true,
    repeat: -1,
  });
  place(scene, "largePainting", 540, 568, { depth: 620 });
  // skip x=680..780 (porta)
  place(scene, "largePainting", 800, 568, { depth: 620 });
  place(scene, "smallPainting", 900, 568, { depth: 620 });
  place(scene, "smallPainting2", 960, 568, { depth: 620 });
  place(scene, "clock", 1020, 568, { depth: 620 });
  // Conjunto de sofás em "U" central — agora alinhados sem cadeira em cima da mesa
  place(scene, "sofaSide", 480, 650, { depth: 710 });             // esquerda virada pra dentro
  place(scene, "sofaFront", 524, 710, { depth: 770 });
  place(scene, "sofaFront", 588, 710, { depth: 770 });
  place(scene, "sofaFront", 652, 710, { depth: 770 });
  const sofaR = place(scene, "sofaSide", 718, 650, { depth: 710 });
  sofaR.setFlipX(true);                                            // direita virada pra dentro
  // Mesa de centro (sem cadeira sobre, sem objetos invadindo)
  place(scene, "coffeeTable", 580, 770, { depth: 830 });
  // Área de snack/café no canto direito do lounge
  place(scene, "doubleBookshelf", 790, 600, { depth: 670 });      // armário snack
  place(scene, "smallTable", 880, 670, { depth: 730 });
  place(scene, "coffee", 884, 660, { depth: 735 });               // xícara em cima da smallTable
  place(scene, "chairFront", 880, 640, { depth: 700 });           // cadeira ao lado da mesa
  // Plantas só nos cantos extremos do Lounge (sem conflitar com roamPoints/breakDestinations)
  place(scene, "largePlant", 460, 712, { depth: 790 });
  place(scene, "largePlant", 1018, 712, { depth: 790 });

  // Arcade cabinet no canto sup-direito do lounge (decoração)
  const arcX = 980;
  const arcY = 590;
  const arcG = scene.add.graphics().setDepth(arcY + 60);
  // Corpo do arcade (preto com filete neon)
  arcG.fillStyle(0x1a1a26, 1);
  arcG.fillRect(arcX, arcY, 32, 64);
  arcG.lineStyle(1, OKAMI_PALETTE.magenta, 0.85);
  arcG.strokeRect(arcX, arcY, 32, 64);
  // Tela do arcade
  arcG.fillStyle(0x060609, 1);
  arcG.fillRect(arcX + 4, arcY + 6, 24, 16);
  arcG.fillStyle(OKAMI_PALETTE.cyan, 0.7);
  arcG.fillRect(arcX + 6, arcY + 10, 20, 2);
  arcG.fillStyle(OKAMI_PALETTE.magenta, 0.7);
  arcG.fillRect(arcX + 6, arcY + 14, 12, 2);
  arcG.fillStyle(OKAMI_PALETTE.success, 0.7);
  arcG.fillRect(arcX + 6, arcY + 18, 8, 2);
  // Painel de controle (com 2 botões)
  arcG.fillStyle(0x2a2a3a, 1);
  arcG.fillRect(arcX + 4, arcY + 28, 24, 12);
  arcG.fillStyle(OKAMI_PALETTE.orange, 1);
  arcG.fillCircle(arcX + 11, arcY + 34, 2);
  arcG.fillStyle(OKAMI_PALETTE.cyan, 1);
  arcG.fillCircle(arcX + 21, arcY + 34, 2);
  // Base
  arcG.fillStyle(0x6c6d80, 1);
  arcG.fillRect(arcX, arcY + 56, 32, 8);
  // Light leak da tela do arcade piscando
  const arcLeak = scene.add.rectangle(arcX + 16, arcY + 14, 24, 16, OKAMI_PALETTE.cyan, 0.18).setDepth(arcY + 61);
  scene.tweens.add({
    targets: arcLeak,
    alpha: 0.04,
    duration: 540,
    yoyo: true,
    repeat: -1,
  });

  // ─────────────────────────────────────────────────────────────────────
  // 12. SERVER ROOM (1100..1500 × 44..380) — racks + consoles + telemetria
  // ─────────────────────────────────────────────────────────────────────
  // 4 racks alinhados no topo
  place(scene, "doubleBookshelf", 1118, 100, { depth: 170 });
  place(scene, "doubleBookshelf", 1186, 100, { depth: 170 });
  place(scene, "doubleBookshelf", 1254, 100, { depth: 170 });
  place(scene, "doubleBookshelf", 1322, 100, { depth: 170 });
  // Switches/storage stack na parede direita
  place(scene, "bookshelf", 1426, 100, { depth: 170 });
  place(scene, "bookshelf", 1426, 170, { depth: 240 });

  // Cabos finos conectando o topo dos racks (network mesh)
  const cables = scene.add.graphics().setDepth(95);
  cables.lineStyle(2, 0x6c6d80, 0.45);
  cables.beginPath();
  cables.moveTo(1130, 96);
  cables.lineTo(1198, 96);
  cables.lineTo(1266, 96);
  cables.lineTo(1334, 96);
  cables.lineTo(1430, 96);
  cables.strokePath();
  // Cabo descendo até o painel de telemetria
  cables.lineStyle(2, OKAMI_PALETTE.cyan, 0.55);
  cables.lineBetween(1240, 96, 1240, 200);

  // Painel de telemetria com 4 LEDs piscando
  const panelX = 1196;
  const panelY = 198;
  const panel = scene.add.graphics().setDepth(180);
  panel.fillStyle(0x060609, 1);
  panel.fillRect(panelX, panelY, 100, 24);
  panel.lineStyle(1, OKAMI_PALETTE.cyan, 0.6);
  panel.strokeRect(panelX, panelY, 100, 24);
  panel.fillStyle(0x1a1a26, 1);
  panel.fillRect(panelX + 4, panelY + 4, 92, 16);
  // 4 LEDs (cyan / magenta / green / orange) com tween de pulse
  const ledColors = [OKAMI_PALETTE.cyan, OKAMI_PALETTE.magenta, OKAMI_PALETTE.success, OKAMI_PALETTE.orange];
  ledColors.forEach((color, i) => {
    const led = scene.add.circle(panelX + 14 + i * 22, panelY + 12, 3, color, 0.95).setDepth(182);
    scene.tweens.add({
      targets: led,
      alpha: 0.25,
      duration: 540 + i * 180,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  });
  // 2 consoles operadores — mesa + PC GRANDE em cima + cadeira atrás
  // Console 1
  drawOfficeDesk(scene, 1180, 250, OKAMI_PALETTE.cyan);
  scene.add.image(1180, 260, "pcOn2")
    .setOrigin(0.5, 1)
    .setScale(1.8)
    .setDepth(280);
  place(scene, "chairBack", 1180, 218, { origin: [0.5, 0.5], depth: 270, scale: 1.7 });
  // Console 2
  drawOfficeDesk(scene, 1320, 250, OKAMI_PALETTE.cyan);
  scene.add.image(1320, 260, "pcOn3")
    .setOrigin(0.5, 1)
    .setScale(1.8)
    .setDepth(280);
  place(scene, "chairBack", 1320, 218, { origin: [0.5, 0.5], depth: 270, scale: 1.7 });
  // Quadrinho de monitoramento na parede direita
  place(scene, "smallPainting", 1450, 280, { depth: 350 });
  // Cactos (touch verde)
  place(scene, "cactus", 1110, 340, { depth: 400 });
  place(scene, "cactus", 1470, 340, { depth: 400 });

  // ─────────────────────────────────────────────────────────────────────
  // 13. WAR ROOM (1100..1500 × 400..820) — mesa de reunião + cadeiras
  // ─────────────────────────────────────────────────────────────────────
  // Quadros DENTRO dos bounds, sem sobreposição com plantas
  place(scene, "whiteboard", 1120, 422, { depth: 480 });
  place(scene, "largePainting", 1220, 422, { depth: 480 });
  place(scene, "clock", 1334, 426, { depth: 480 });
  place(scene, "smallPainting", 1400, 422, { depth: 480 });
  // Mesa de reunião central — 3 linhas × 2 colunas de TABLE_FRONT 32×32
  // Mesa total: x=1244..1308 (64w) × y=580..676 (96h)
  const tableX = 1244;
  const tableY = 580;
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 2; col += 1) {
      place(scene, "tableFront", tableX + col * 32, tableY + row * 32, { depth: tableY + row * 32 + 30 });
    }
  }
  // 3 cadeiras por lado em chairSide (vista lateral, 32×32 @ scale 2).
  // Mesa: x=1244..1308 (64w) × y=580..676 (96h). Centro vertical: y=628.
  // Cadeiras centradas em torno de y=628 com espaçamento 32px pra não se sobreporem:
  //   y=596 (top), y=628 (center), y=660 (bottom) — todas alinhadas com a mesa.
  //
  // Esquerda: x=tableX-44=1200 (sprite 1184..1216, gap 28px do tampo da mesa)
  // Direita:  x=tableX+120=1364 (sprite 1348..1380, gap 40px do tampo) — afastada
  //           mais para evitar "encostar" devido à orientação assimétrica do flipX.
  // 3 cadeiras espaçadas 40px (gap visual de 8px entre cadeiras de 32px de altura)
  [tableY + 8, tableY + 48, tableY + 88].forEach((y) => {
    place(scene, "chairSide", tableX - 44, y, { origin: [0.5, 0.5], depth: y + 40 });
  });
  [tableY + 8, tableY + 48, tableY + 88].forEach((y) => {
    const c = place(scene, "chairSide", tableX + 120, y, { origin: [0.5, 0.5], depth: y + 40 });
    c.setFlipX(true);
  });

  // Laptop em cima da mesa (reunião em andamento)
  const laptopX = tableX + 32;
  const laptopY = tableY + 48; // centro da mesa
  const laptop = scene.add.graphics().setDepth(tableY + 90);
  // Base/teclado
  laptop.fillStyle(0x2a2a3a, 1);
  laptop.fillRect(laptopX - 12, laptopY + 2, 24, 6);
  laptop.fillStyle(0x6c6d80, 1);
  laptop.fillRect(laptopX - 11, laptopY + 3, 22, 1);
  // Tela aberta (inclinada)
  laptop.fillStyle(0x060609, 1);
  laptop.fillRect(laptopX - 11, laptopY - 8, 22, 11);
  laptop.fillStyle(0x142035, 1);
  laptop.fillRect(laptopX - 10, laptopY - 7, 20, 9);
  // Conteúdo da tela (linhas de código)
  laptop.fillStyle(OKAMI_PALETTE.cyan, 0.85);
  laptop.fillRect(laptopX - 9, laptopY - 5, 8, 1);
  laptop.fillStyle(OKAMI_PALETTE.magenta, 0.7);
  laptop.fillRect(laptopX - 9, laptopY - 3, 6, 1);
  laptop.fillStyle(0xf4f4f8, 0.65);
  laptop.fillRect(laptopX - 9, laptopY - 1, 10, 1);
  // Café e papéis ao lado do laptop
  scene.add.image(laptopX - 20, laptopY + 4, "coffee")
    .setOrigin(0.5, 0.5)
    .setScale(1.2)
    .setDepth(tableY + 91);
  // Bloquinho de notas
  const note = scene.add.graphics().setDepth(tableY + 91);
  note.fillStyle(0xf4f4f8, 0.95);
  note.fillRect(laptopX + 16, laptopY - 2, 10, 8);
  note.fillStyle(0x6c6d80, 0.7);
  note.fillRect(laptopX + 17, laptopY, 8, 1);
  note.fillRect(laptopX + 17, laptopY + 2, 6, 1);
  // Plantas grandes nos cantos — DENTRO dos bounds (war room termina em y=820, planta=64h)
  place(scene, "largePlant", 1118, 720, { depth: 790 });
  place(scene, "largePlant", 1440, 720, { depth: 790 });
  // Lixeira
  place(scene, "bin", 1450, 460, { depth: 520 });
}

function drawStudioOfficeLayout(scene, layout) {
  drawOfficeBaseShell(scene);
  drawOfficeZone(scene, 70, 64, 930, 520, 0x150e24, "AI STUDIO", OKAMI_PALETTE.magenta, { tile: 30, overlay: 0.08 });
  drawOfficeZone(scene, 1030, 64, 460, 244, 0x0c1220, "STRATEGY EXECUTIVE", OKAMI_PALETTE.cyan, { tile: 28 });
  drawOfficeZone(scene, 1030, 338, 460, 220, 0x191426, "CAFE BAR", OKAMI_PALETTE.orange, { tile: 26 });
  drawOfficeZone(scene, 70, 622, 520, 172, 0x0d1a16, "LOUNGE", OKAMI_PALETTE.success, { tile: 28 });
  drawOfficeZone(scene, 632, 622, 858, 172, 0x0a101b, "RUNTIME ROW", OKAMI_PALETTE.cyan, { tile: 26 });

  // Thick 2.5D Solid Walls
  drawSolidPixelWall(scene, 58, 584, 1456, 24, OKAMI_PALETTE.magenta);
  drawSolidPixelWall(scene, 1000, 54, 24, 554, OKAMI_PALETTE.cyan);
  drawSolidPixelWall(scene, 1018, 318, 496, 24, OKAMI_PALETTE.orange);
  drawSolidPixelWall(scene, 610, 604, 24, 214, OKAMI_PALETTE.success);

  // Outer border solid walls (to replace thin boundaries)
  drawSolidPixelWall(scene, 58, 54, 942, 24, OKAMI_PALETTE.magenta);
  drawSolidPixelWall(scene, 1000, 54, 514, 24, OKAMI_PALETTE.cyan);
  drawSolidPixelWall(scene, 58, 54, 24, 764, OKAMI_PALETTE.magenta);
  drawSolidPixelWall(scene, 1490, 54, 24, 764, OKAMI_PALETTE.cyan);
  drawSolidPixelWall(scene, 58, 794, 1456, 24, OKAMI_PALETTE.success);

  // Doorways (thickness 24)
  drawModernDoorway(scene, 430, 584, 160, 24, OKAMI_PALETTE.magenta);
  drawModernDoorway(scene, 846, 584, 150, 24, OKAMI_PALETTE.magenta);
  drawModernDoorway(scene, 1000, 214, 24, 84, OKAMI_PALETTE.cyan);
  drawModernDoorway(scene, 1000, 456, 24, 82, OKAMI_PALETTE.orange);
  drawModernDoorway(scene, 610, 690, 24, 74, OKAMI_PALETTE.success);

  // Bullpen Cubicle Divider Grid for AI Studio
  // Vertical dividers between desk columns
  drawCubicleDivider(scene, 255, 180, 140, true, OKAMI_PALETTE.magenta);
  drawCubicleDivider(scene, 405, 180, 140, true, OKAMI_PALETTE.magenta);
  // Vertical dividers for the second row of desks
  drawCubicleDivider(scene, 320, 330, 140, true, OKAMI_PALETTE.magenta);
  drawCubicleDivider(scene, 520, 330, 140, true, OKAMI_PALETTE.magenta);
  drawCubicleDivider(scene, 720, 330, 140, true, OKAMI_PALETTE.magenta);

  // Outer border lines
  drawOuterBorderWalls(scene);

  drawBrandSign(scene, 118, 98);
  layout.desks.forEach(([x, y, accent, id], index) => drawOfficeDesk(scene, x, y, accent, id, index > 8 ? 0.78 : 0.94));
  drawMeetingTable(scene, 1204, 154);
  drawShelf(scene, 1064, 94, 104);
  drawShelf(scene, 1360, 94, 104);
  addModernSingle(scene, 170, 1122, 248, 0.65, 300);
  addModernSingle(scene, 171, 1306, 248, 0.65, 301);
  drawOfficeKitchen(scene, 1058, 412);
  drawOfficeSofa(scene, 164, 682, OKAMI_PALETTE.success);
  addModernSingle(scene, 196, 750, 686, 0.7, 770);
  addModernSingle(scene, 197, 828, 686, 0.7, 771);
  addModernSingle(scene, 198, 906, 686, 0.7, 772);
  [[337, 1118, 660], [338, 1198, 660], [175, 1290, 660], [176, 1370, 660], [167, 1008, 662], [168, 1450, 662]].forEach(([id, x, y]) => addModernSingle(scene, id, x, y, 0.62, y + 115));
  drawModernPlantLine(scene, [[98, 922, 112, 0.76], [99, 946, 500, 0.74], [100, 1450, 492, 0.7], [98, 124, 730, 0.72], [100, 1488, 720, 0.72]]);
}

function drawCompactOfficeLayout(scene, layout) {
  drawOfficeBaseShell(scene);
  drawOfficeZone(scene, 70, 64, 940, 730, 0x0d101c, "COMMAND PIT", OKAMI_PALETTE.orange, { tile: 30, overlay: 0.07 });
  drawOfficeZone(scene, 1040, 64, 450, 204, 0x181028, "FOCUS PODS EXECUTIVE", OKAMI_PALETTE.magenta, { tile: 26 });
  drawOfficeZone(scene, 1040, 298, 450, 244, 0x091222, "RUNTIME", OKAMI_PALETTE.cyan, { tile: 26 });
  drawOfficeZone(scene, 1040, 574, 450, 220, 0x0d1a16, "LOUNGE + CAFE", OKAMI_PALETTE.success, { tile: 28 });

  // Thick 2.5D Solid Walls
  drawSolidPixelWall(scene, 1010, 54, 24, 764, OKAMI_PALETTE.orange);
  drawSolidPixelWall(scene, 1030, 278, 484, 24, OKAMI_PALETTE.magenta);
  drawSolidPixelWall(scene, 1030, 554, 484, 24, OKAMI_PALETTE.cyan);

  // Outer border solid walls (to replace thin boundaries)
  drawSolidPixelWall(scene, 58, 54, 960, 24, OKAMI_PALETTE.orange);
  drawSolidPixelWall(scene, 1000, 54, 514, 24, OKAMI_PALETTE.magenta);
  drawSolidPixelWall(scene, 58, 54, 24, 764, OKAMI_PALETTE.orange);
  drawSolidPixelWall(scene, 1490, 54, 24, 764, OKAMI_PALETTE.cyan);
  drawSolidPixelWall(scene, 58, 794, 1456, 24, OKAMI_PALETTE.orange);

  // Doorways (thickness 24)
  drawModernDoorway(scene, 1010, 142, 24, 78, OKAMI_PALETTE.orange);
  drawModernDoorway(scene, 1010, 388, 24, 82, OKAMI_PALETTE.magenta);
  drawModernDoorway(scene, 1010, 654, 24, 80, OKAMI_PALETTE.success);
  drawModernDoorway(scene, 402, 54, 170, 24, OKAMI_PALETTE.orange);
  drawModernDoorway(scene, 712, 794, 140, 24, OKAMI_PALETTE.orange);

  // Bullpen Divider Grid for Command Pit in Compact layout
  // Horizontal divider separating row 1 and row 2 of bullpen desks
  drawCubicleDivider(scene, 150, 312, 560, false, OKAMI_PALETTE.orange);
  // Vertical dividers between individual stations
  drawCubicleDivider(scene, 248, 180, 240, true, OKAMI_PALETTE.orange);
  drawCubicleDivider(scene, 388, 180, 240, true, OKAMI_PALETTE.orange);
  drawCubicleDivider(scene, 528, 180, 240, true, OKAMI_PALETTE.orange);

  // Outer border lines
  drawOuterBorderWalls(scene);

  drawBrandSign(scene, 124, 94);
  layout.desks.forEach(([x, y, accent, id], index) => drawOfficeDesk(scene, x, y, accent, id, index < 9 ? 0.92 : 0.78));
  drawMeetingTable(scene, 476, 590);
  addModernSingle(scene, 172, 794, 552, 0.72, 690);
  addModernSingle(scene, 170, 360, 586, 0.66, 700);
  addModernSingle(scene, 171, 610, 586, 0.66, 701);
  drawShelf(scene, 1086, 94, 116);
  drawShelf(scene, 1346, 94, 116);
  addModernSingle(scene, 107, 1128, 204, 0.62, 252);
  addModernSingle(scene, 108, 1410, 204, 0.62, 252);
  [[337, 1104, 360], [338, 1188, 360], [175, 1328, 358], [176, 1410, 358], [167, 1248, 492], [168, 1400, 492]].forEach(([id, x, y]) => addModernSingle(scene, id, x, y, 0.62, y + 112));
  drawOfficeSofa(scene, 1104, 654, OKAMI_PALETTE.success);
  drawOfficeKitchen(scene, 1212, 668);
  drawModernPlantLine(scene, [[98, 934, 106, 0.76], [99, 936, 704, 0.76], [100, 1084, 738, 0.7], [98, 1450, 738, 0.7], [100, 92, 730, 0.74]]);
}

function getOfficeLayoutConfig(layoutVariant = "ops") {
  const layouts = {
    ops: {
      label: "OKAMI HQ",
      // Mesas alinhadas com as do vídeo office.mp4 (1280×720 → 1540×920).
      // Cada desk: [x, y_agente, accent, id, sitMode]
      //   sitMode: "back"  → agente mostra costas (frames "up", virado pra mesa)
      //            "front" → agente mostra rosto (frames "down")
      desks: [
        // 0: Astride (CTO) — sentada na cadeira do gabinete da CTO
        [1250, 130, OKAMI_PALETTE.magenta, 267, "front"],
        // Bullpen fileira 1
        [550, 165, OKAMI_PALETTE.cyan, 225, "back"],
        [715, 165, OKAMI_PALETTE.magenta, 227, "back"],
        [875, 170, OKAMI_PALETTE.success, 229, "back"],
        // Bullpen fileira 2 — y=305 pra encaixar nas cadeiras do vídeo (que estão em ~280)
        [550, 305, OKAMI_PALETTE.orange, 235, "back"],
        [715, 305, OKAMI_PALETTE.cyan, 237, "back"],
        [1015, 305, OKAMI_PALETTE.magenta, 239, "back"],
      ],
      // RoamPoints — Y já compensado pra base do sprite ficar dentro da área
      // walkable (sprite RPG é ~70px alto em scale 2.2).
      roamPoints: [
        // Bullpen interior corredor (y=240, sprite top em y=170)
        [580, 240], [720, 240], [860, 240], [950, 240],
        // Jardim externo (centro do jardim em y=240)
        [200, 240], [280, 240],
        // Corredor central horizontal (y=440, dentro da faixa 370..480)
        [180, 440], [350, 440], [500, 440], [620, 440],
        // Corredor sul vertical (y=660-720, faixa 530..770)
        [740, 660], [740, 720],
        // Meeting Room walkable (y=480, faixa 440..500)
        [900, 480], [1080, 480], [1230, 480], [1380, 480],
        // Kitchen (y=750, faixa 690..770)
        [160, 750], [240, 750], [330, 750],
        // Decompression Room (y=750, faixa 700..770)
        [960, 750], [1120, 750], [1280, 750], [1400, 750],
      ],
    },
    studio: {
      label: "STUDIO",
      desks: [
        [180, 250, OKAMI_PALETTE.cyan, 229], [330, 250, OKAMI_PALETTE.magenta, 231], [480, 250, OKAMI_PALETTE.success, 233],
        [220, 408, OKAMI_PALETTE.orange, 235], [420, 408, OKAMI_PALETTE.cyan, 237], [620, 408, OKAMI_PALETTE.magenta, 239], [820, 408, OKAMI_PALETTE.success, 226],
        [1090, 226, OKAMI_PALETTE.magenta, 225], [1290, 226, OKAMI_PALETTE.cyan, 227],
        [210, 650, OKAMI_PALETTE.orange, 234], [712, 650, OKAMI_PALETTE.success, 323], [1320, 650, OKAMI_PALETTE.cyan, 325],
      ],
      roamPoints: [[142, 564], [362, 700], [590, 548], [874, 310], [1058, 506], [1218, 178], [1406, 320], [718, 724], [1274, 724]],
    },
    compact: {
      label: "COMPACT",
      desks: [
        [178, 246, OKAMI_PALETTE.cyan, 225], [318, 246, OKAMI_PALETTE.magenta, 227], [458, 246, OKAMI_PALETTE.success, 229], [598, 246, OKAMI_PALETTE.orange, 231],
        [178, 378, OKAMI_PALETTE.cyan, 233], [318, 378, OKAMI_PALETTE.magenta, 235], [458, 378, OKAMI_PALETTE.success, 237], [598, 378, OKAMI_PALETTE.orange, 239],
        [738, 312, OKAMI_PALETTE.cyan, 226], [1120, 224, OKAMI_PALETTE.magenta, 323], [1288, 224, OKAMI_PALETTE.cyan, 325], [1338, 650, OKAMI_PALETTE.success, 234],
      ],
      roamPoints: [[150, 544], [344, 542], [574, 538], [836, 538], [1056, 500], [1328, 360], [254, 716], [736, 720], [1452, 724]],
    },
  };
  return layouts[layoutVariant] ?? layouts.ops;
}

function drawCustomOkamiOffice(scene, layoutVariant = "ops") {
  const layout = getOfficeLayoutConfig(layoutVariant);
  if (layoutVariant === "studio") {
    drawStudioOfficeLayout(scene, layout);
    return;
  }
  if (layoutVariant === "compact") {
    drawCompactOfficeLayout(scene, layout);
    return;
  }
  drawOpsOfficeLayout(scene, layout);
}

function drawModernOfficeShell(scene, layoutVariant = "ops") {
  scene.cameras.main.setBackgroundColor("rgba(0,0,0,0)");
  drawCustomOkamiOffice(scene, layoutVariant);

  const telemetry = scene.add.graphics().setDepth(188);
  [
    [452, 92, OKAMI_PALETTE.magenta, 92],
    [792, 92, OKAMI_PALETTE.orange, 76],
    [1194, 92, OKAMI_PALETTE.cyan, 80],
    [716, 786, OKAMI_PALETTE.success, 68],
  ].forEach(([x, y, color, width]) => {
    telemetry.fillStyle(0x05070c, 0.62);
    telemetry.fillRoundedRect(x, y, width + 18, 14, 3);
    telemetry.fillStyle(color, 0.9);
    telemetry.fillRect(x + 8, y + 5, width, 3);
  });

}

// ─────────────────────────────────────────────────────────────────────
// SISTEMA DE DIÁLOGOS — banco grande, contextual e reativo a tasks
// ─────────────────────────────────────────────────────────────────────
const DIALOGUE_POOL = {
  tech: [
    ["Você viu o spike de latência no Hermes?", "Vi. Parece thrash de GC, vou jogar pra outro nó."],
    ["Esse PR tá com 600 linhas, tem como quebrar?", "Já quebrei em três commits, dá pra revisar de boa."],
    ["Migrei pra Sonnet 4.6 e ficou 2x mais rápido.", "Mandou bem. Custo caiu também?"],
    ["O Claude ficou em loop de tool call de novo.", "Põe um max_iterations no agente, resolve."],
    ["Cache hit subiu pra 78% essa semana.", "Era só inverter a ordem do prompt. Bizarro."],
    ["O websocket cai toda vez que reinicia o gateway.", "Tem que botar reconnect com backoff. Faço hoje."],
    ["Subi a feature flag no GrowthBook.", "Boa, deixa rampando 10% e olhamos amanhã."],
    ["Vi a stack trace, é race condition no pool.", "Joga um mutex ou serializa. Não tem milagre."],
    ["O deploy quebrou em prod faz 2 minutos.", "Já vi, rollback rodando. Foi a migration nova."],
    ["Tem como ressuscitar aquela branch de junho?", "Tá no reflog ainda, recupero pra você."],
    ["Tô vendo memory leak no serviço de auth.", "Já achei: closure segurando referência. Vou fixar."],
    ["Postgres travou no vacuum full de novo.", "Boa hora pra avaliar particionamento, né?"],
    ["O agente novo já tá em 92% de acerto.", "Caraca, ultrapassou o anterior."],
    ["Reescrevi o parser em Rust, ficou 40x mais rápido.", "Tá doido. Vai ter que abrir PR enorme."],
    ["O CI demorou 18 minutos hoje.", "Os testes E2E tão pesados. Bora paralelizar."],
    ["A LLM tá hallucinando schema que não existe.", "Põe um JSON validator no output. Resolve 80%."],
    ["Token usage subiu 30% essa semana.", "Foram os agentes recursivos. Coloco budget hard."],
    ["O Hermes deduplicou 14k requests hoje.", "Beleza, o cache layer pagou ele inteiro."],
    ["Esse retry exponencial tá agressivo demais.", "Mudo o backoff base pra 2s, deve segurar."],
    ["A query do dashboard tá em full table scan.", "Adiciono índice composto e mando reanalisar."],
    ["Subi o Kubernetes pra 1.30 sem downtime.", "Maravilhoso. Não tinha o que dar errado."],
    ["O OpenAI subiu o preço de novo, viu?", "Vi. Bora migrar mais workloads pro Claude."],
    ["Containerizei o serviço de batch.", "Bom, agora dá pra escalar horizontalmente."],
    ["O cron de ETL falhou silenciosamente.", "Adiciono dead-letter queue e alerta no Slack."],
  ],
  sprint: [
    ["A retro da sprint passada saiu insana.", "Pois é, finalmente decidimos cortar o legado."],
    ["Tenho 3 cards parados em Review faz dois dias.", "Eu cuido. Me passa os links que reviso agora."],
    ["O standup foi rapidíssimo hoje.", "Demais. Trinta minutos a mais pra codar."],
    ["Esse épico tá inchando, vamos quebrar?", "Bora. Faço o split em 4 histórias menores."],
    ["Movi 7 cards pro Done ontem à noite.", "Você é uma máquina. Bora celebrar no lounge."],
    ["A planning de amanhã vai ser pesada.", "Já mapeei dependências, fica tranquilo."],
    ["Esqueceram de mim no convite da review.", "Foi mal, te coloco já. Começa em 10."],
    ["O burndown tá lindo essa sprint.", "Verdade. Primeira vez que não escorregamos."],
    ["A demo de sexta tá com 20 pontos no escopo.", "Bota só 12. O resto fica pra próxima sprint."],
    ["Quem é o scrum master da semana?", "Eu pego. Você ficou da retro passada."],
    ["O backlog não tá priorizado, alguém vê?", "Vou refinar com a Diana antes do almoço."],
    ["Vamos mover o standup pra 9:30?", "Topo. Onze é tarde demais pra mim."],
    ["O velocity média subiu pra 38 pontos.", "Insano. Bora calibrar a estimativa."],
    ["Aquela história do export tá em scope creep.", "Verdade, cortei dois requisitos não-essenciais."],
    ["A grooming session foi produtiva hoje.", "Mais sim. Quebramos as histórias bem."],
    ["Mid-sprint review na quinta, lembra?", "Tô preparada. Tenho 4 demos pra mostrar."],
    ["O kanban tá com bottleneck em Review.", "Marco code review pareada amanhã."],
    ["A roadmap do Q4 já tá publicada?", "Quase. Falta só validar com a Astride."],
    ["Tem capacity pra pegar bug crítico?", "Bora. Adiciono à sprint atual."],
    ["Cartão de débito técnico esse mês: 12 pontos.", "Boa, tá baixo. Mantemos o investimento."],
  ],
  ops: [
    ["Os racks tão muito quentes hoje.", "O ar do CPD tá ligado? Vou checar."],
    ["Subi mais dois nós no cluster.", "Beleza. Roda o autoscaler que eu fiz semana passada."],
    ["O Prometheus tá alertando memory leak.", "Heap dump já tá no S3. Olha quando der."],
    ["A pipeline tá com 12 minutos de fila.", "Reduzo o paralelismo do testes E2E."],
    ["Caiu um disco no rack 3.", "Já pedi reposição. RAID continua saudável."],
    ["O Terraform reclamou de drift outra vez.", "É manual no console. Reverto e abro task."],
    ["Renovei o cert SSL antes de expirar.", "Boa, evitou outage do mês passado."],
    ["O log tá crescendo 50GB por dia.", "Implemento rotação ainda hoje."],
    ["Vault rotacionou os secrets, viu?", "Vi. Já avisei o time pra rodar restart."],
    ["O backup de ontem deu integrity check ok.", "Excelente. Restore drill na próxima sprint."],
    ["O firewall bloqueou o webhook do GitHub.", "Adiciono os IPs na allowlist agora."],
    ["VPN da equipe tá lenta hoje.", "Acabou banda do enlace. Faço upgrade."],
    ["A monitoria nova do Grafana tá top.", "Verdade, os dashboards ficam mais legíveis."],
    ["Datacenter avisou manutenção sábado.", "Joga pra failover, sem problema."],
    ["Cluster Kubernetes tá com 96% de uso.", "Bora escalar. Já liberei budget."],
  ],
  casual: [
    ["Você viu o pôr-do-sol pela janela hoje?", "Vi! Lindo demais. Quase parei o build pra olhar."],
    ["Cadê o café da copa?", "Acabou. Já mandei alguém comprar mais."],
    ["Bora almoçar fora? Tem um japa novo.", "Bora! Vou pegar a carteira."],
    ["Esse fim de semana vai jogos.", "Tô dentro, traz controle extra."],
    ["O ar condicionado tá congelando aqui.", "Já achei 22° no termostato, melhor?"],
    ["Comprei um teclado mecânico novo.", "Já tava na hora. Brown ou Blue?"],
    ["Treinei antes do trabalho hoje.", "Caraca, que disciplina. Eu quase nem acordei."],
    ["A música nova do lounge tá pesada.", "Eu botei. Coloco algo mais leve se quiser."],
    ["Vi um meme do nosso bug ontem no Twitter.", "Não acredito. Manda o link!"],
    ["Domingo fui na exposição de pixel art.", "Eu queria ter ido. Como foi?"],
    ["Tô aprendendo japonês há 6 meses.", "Sério? Já consegue ver anime sem legenda?"],
    ["Esse mate de manhã tá fazendo milagre.", "Verdade. Acordo bem mais focada com ele."],
    ["O cinema voltou a ter sessão das 22h.", "Bora ver o novo do Denis Villeneuve?"],
    ["Comprei plantas pro home office.", "Foto, foto! Adoro decoração verde."],
    ["Minha gata derrubou meu segundo monitor.", "Não, sério? Sobreviveu?"],
    ["Café da padaria da esquina é o melhor.", "Concordo. Já virou ritual matinal."],
    ["Tô tentando dormir oito horas direito.", "Faz milagre na disposição, viu."],
    ["Vou começar a correr no parque.", "Boa! Posso te acompanhar quando quiser."],
    ["Vi uma libélula gigante no jardim.", "As sakuras tão atraindo bichinhos."],
    ["Meu vizinho tocou bateria às 6 da manhã.", "Misericórdia. Mudou as cordas, foi?"],
    ["Achei uma carteirinha de pokémon nostalgia.", "Que carta? Vai vender?"],
    ["Vi a Polaris ontem na varanda.", "Que romântico. O céu daqui é incrível."],
    ["Fiz pão de fermentação natural no domingo.", "Quero a receita. Promete?"],
    ["O escritório tá vazio hoje.", "Sextou cedo, todo mundo pegou folga."],
    ["Compre flores pra mesa, hein?", "Tô levando girassóis da feira de sábado."],
  ],
  cafe: [
    ["Esse café é o italiano novo?", "É. Ganhei no presentinho do Black Friday."],
    ["Põe açúcar não, fica horrível.", "Combinado. Toma cuidado que tá fervendo."],
    ["A máquina de espresso quebrou de novo.", "Já chamei a manutenção. Volta amanhã."],
    ["Provei o donut da copa, tava divino.", "Sobrou um? Tô morrendo de fome."],
    ["Quem deixou suco fora da geladeira?", "Culpa minha, estourei o sprint."],
    ["O barista entregou o grão etíope.", "Que delícia. Faço espresso pra você?"],
    ["A geladeira tá zerada de água.", "Já pedi reposição. Chega amanhã."],
    ["Cookie integral acabou cedo hoje.", "Foi a Diana. Devorou três no standup."],
    ["O leite de aveia tá no canto de cima.", "Valeu. Pensei que tinha acabado."],
    ["Bolinho de chocolate na bandeja, pessoal!", "Quem trouxe? Tá divino mesmo."],
    ["Esse chá verde me salva à tarde.", "Tenho um matcha incrível, quer experimentar?"],
    ["Lanchinho rápido antes da reunião?", "Bora. Pego frutas pra você?"],
  ],
  greetings: [
    ["E aí, tudo certo?", "Tudo. Cabeça quente mas seguindo."],
    ["Bom dia! Cedo hoje.", "Reunião com a Califórnia, sabe como é."],
    ["Sumida! Onde você se meteu?", "Modo focus na sala de guerra a tarde toda."],
    ["Boa noite, hein. Já dando expediente?", "Só fechando o último deploy."],
    ["Tudo tranquilo no seu front?", "Tranquilíssimo. E o seu?"],
    ["Volta de almoço?", "Volta. Comeu muito massa, tô lenta."],
    ["Hoje tá pesado, hein.", "Pesadíssimo. Mas vai dar conta."],
    ["Vi você no remote ontem.", "Tava resolvendo um incidente. Agora tô aqui."],
    ["Bom te ver, faz tempo.", "Verdade! Bora marcar um café."],
    ["Sextou! Bora descer cedo?", "Bora! Termino um PR e desço."],
  ],
  zen: [
    ["As sakuras tão lindas hoje.", "Verdade. Acalma a cabeça depois de 8h de tela."],
    ["Vim pegar ar fresco antes da review.", "Boa ideia. Eu volto pro código em 5."],
    ["Adoro ouvir as folhas balançando.", "Esse jardim é o melhor benefício do OKAMI."],
    ["Já viu o torii à noite com as lanternas?", "Já. Parece um filme do Ghibli."],
    ["Stress da sprint me trouxe aqui.", "Respira fundo. Volta inteira pra retro."],
    ["Reunião do board me deixou exausta.", "Senta na pedra, escuta o vento."],
    ["O cheiro das sakuras é hipnotizante.", "Verdade. Outono inteiro pela frente."],
    ["Borboletas no jardim de novo.", "Esse mês foi cheio delas."],
    ["A fonte de pedra faz tanto bem.", "Música natural. Fico aqui horas."],
    ["Dei uma volta no torii ontem à noite.", "Sozinho? Coragem. Bicho assusta no escuro."],
    ["Meditação de 5 minutos aqui resolve tudo.", "Faço todo dia depois do almoço."],
    ["O bonsai novo da Diana tá lindo.", "Ela tem mão pra cuidar de planta."],
  ],
  meeting: [
    ["A apresentação pro board é amanhã, lembram?", "Eu termino os slides hoje."],
    ["Vamos rever as prioridades do quarter?", "Bora. Astride, você puxa?"],
    ["Esse holograma de arquitetura ajuda muito.", "Foi a Diana que desenhou o protótipo."],
    ["Quem leva a ata dessa reunião?", "Deixa comigo, escrevo no Notion."],
    ["Status do release: 80% pronto.", "Falta só o módulo de billing."],
    ["Decisão: vamos pro Sonnet 4.6 em prod.", "Aprovado. Comunico o time amanhã."],
    ["Próximo ponto: SLA do gateway novo.", "Tô propondo 99.95% pra primeiro mês."],
    ["Risco identificado: dependência única do GCS.", "Vamos avaliar S3 como backup."],
    ["Quem topa liderar o spike de research?", "Eu pego. Termino até quinta."],
    ["Marquei 1:1 com cada um na semana que vem.", "Combinado. Posso adiantar pra terça?"],
  ],
  boardroom: [
    ["Pessoal, vamos começar. Pauta na tela.", "Pronta. Anota tudo."],
    ["Status geral: como tá cada workstream?", "Eu começo. Backend tá no prazo."],
    ["A meta do trimestre tá 84% atingida.", "Faltam só 2 OKRs pra fechar."],
    ["Tem algum bloqueador que precisa decisão hoje?", "Sim. O custo da infra subiu 22%."],
    ["Cliente novo entrou em onboarding ontem.", "Excelente notícia. Volume estimado?"],
    ["O incidente de sexta foi resolvido em 18 min.", "MTTR melhor do quarter. Parabéns ao time."],
    ["Próxima feature priorizada: export PDF.", "ETA? Os comerciais tão cobrando."],
    ["Vamos contratar mais dois devs no próximo mês.", "Já tem perfil ideal mapeado?"],
    ["Risco compliance: dado sensível em log.", "Crítico. Hotfix prioridade 1."],
    ["Sprint 24 fechou com 41 pontos entregues.", "Recorde. O time tá voando."],
    ["Decisão: migrar do Postgres pro Aurora?", "Trago benchmark até segunda."],
    ["Quem fala com o board na sexta?", "Astride lidera, eu apoio com os números."],
    ["O feedback do cliente foi excelente nesse ciclo.", "NPS subiu de 42 pra 67."],
    ["Vou propor uma roadmap session pro Q1.", "Apoio. Bota na agenda da próxima."],
    ["Acabou a pauta, alguém tem ponto extra?", "Só agradecer. Reunião produtiva."],
  ],
  group3: [
    ["Pessoal, alinhamento rápido sobre o release?", "Bora.", "Manda."],
    ["Decidiram qual modelo vai pro próximo agente?", "Sonnet 4.6 nas tasks rápidas.", "Opus 4.7 no planejamento."],
    ["Quem quer pedir delivery hoje?", "Eu! Tô faminta.", "Bora, pago a minha parte agora."],
    ["A apresentação pro board é amanhã, lembram?", "Eu termino os slides hoje.", "Conta comigo no ensaio."],
    ["Café da tarde virou tradição mesmo.", "Adoro essa pausa.", "Sem isso a tarde não rende."],
    ["Final do mês, todo mundo de OKR fechado?", "97% por aqui.", "100% no meu front."],
    ["Tem reunião de planning agora ou só 14h?", "Só 14h.", "Confirmo no calendar."],
    ["Bug do staging tá na minha lista.", "Posso ajudar a debugar.", "Bora pareamento."],
    ["Quem topa happy hour na sexta?", "Eu!", "Tô dentro também."],
    ["O cliente novo aprovou a feature.", "Maravilha!", "Comemoração merecida."],
  ],
  group4: [
    ["Mini reunião relâmpago no lounge?", "Topo.", "Vamos.", "Já gravando a ata."],
    ["Roteiro pro post no blog tá pronto?", "Mais ou menos.", "Eu reviso à tarde.", "Mando pro design depois."],
    ["O retro foi produtivo hoje.", "Demais.", "Saímos com 5 ações concretas.", "Vou consolidar a documentação."],
    ["Pizza ou sushi pro almoço?", "Sushi!", "Bora.", "Já chamei delivery."],
    ["Decisão coletiva sobre o framework?", "Vue.", "Eu prefiro React.", "Bora ponderar amanhã."],
    ["Aniversário da Persefone sexta!", "Quem traz o bolo?", "Eu pego os doces.", "Tô na decoração."],
  ],
};

// Cargos oficiais OKAMI HQ:
//   Astride   — CTO            (arquitetura, roadmap, cloud, board)
//   Zelda     — Tech Lead      (PRs, refactor, mentoria, code review)
//   Diana     — UI/UX          (wireframes, design tokens, A/B, user research)
//   Morgana   — Documentação   (docs, release notes, base de conhecimento)
//   Persefone — Pesquisa       (concorrência, papers, dados, métricas)
//   Leona     — Pessoal/Ops    (agenda, chamados, happy hour, folha)
const CHARACTER_DIALOGUES = {
  astride: [
    ["Vamos revisar o roadmap do trimestre?", "Claro. War room em 10 minutos."],
    ["O custo de cloud subiu 18% esse mês.", "Já mapeei. Corte de instâncias ociosas amanhã."],
    ["Aprovei o deploy da v2.4.", "Comunico o time agora."],
    ["O board pediu OKR atualizado.", "Mando até sexta. Quer revisar antes?"],
    ["Decisão de arquitetura: monorepo ou polyrepo?", "Vou trazer dados pra essa reunião."],
    ["Precisamos discutir a stack de observability.", "Preparo um doc com prós e contras."],
    ["Como CTO, preciso fechar prioridades hoje.", "Eu te ajudo a destravar o que precisar."],
  ],
  zelda: [
    ["PR 412 tá esperando review faz dois dias.", "Bora agora. Abro o diff."],
    ["Refatorei o módulo de auth inteiro.", "Caraca. Cobertura de teste tá em quanto?"],
    ["O dev novo tem dúvida no padrão de erro.", "Marco mentoria com ele. Trinta minutos."],
    ["Como Tech Lead, vou propor padronizar lint.", "Apoio. Quanto antes a gente alinhar, melhor."],
    ["Pareamento amanhã pra resolver o bug do polling?", "Combinado. 10h?"],
    ["Vamos extrair esse helper pra package compartilhado?", "Faz sentido. Crio o PR."],
    ["Code freeze a partir da quinta.", "Tranquilo, fecho meus PRs antes."],
  ],
  diana: [
    ["Wireframes V2 ficaram limpos.", "Vi! Adorei o uso do whitespace."],
    ["A/B mostrou: CTA cyan ganhou em conversão.", "Faz sentido, contraste maior. Implemento hoje."],
    ["Tô refinando os design tokens da paleta OKAMI.", "Bom! A inconsistência tava me incomodando."],
    ["Entrevistei 4 usuários hoje, vou sintetizar.", "Quero ver os insights. Manda em bullets?"],
    ["Como UI/UX, queria validar esse flow com você.", "Bora. Quinze minutos no Figma."],
    ["Atualizei o design system pro Space Grotesk.", "Tipografia ficou muito mais OKAMI."],
    ["Esse spacing não tá respeitando o grid.", "Vou ajustar pro 4px base, valeu."],
  ],
  morgana: [
    ["Release notes da v2.4 prontas.", "Manda no #updates por favor."],
    ["Atualizei a base de conhecimento de onboarding.", "Boa! Tava bem desatualizada."],
    ["O fluxo de faturamento legacy tá mapeado.", "Sensacional. Vou usar pra documentar."],
    ["A docs nova da API tá no Notion.", "Compartilha o link?"],
    ["Como responsável pela documentação, vou criar um padrão de ADR.", "Excelente. Padroniza mesmo."],
    ["Faltou doc no PR da feature de export.", "Eu escrevo, me passa só o contexto."],
    ["Vou consolidar os runbooks de incident.", "Perfeito, tava precisando."],
  ],
  persefone: [
    ["Analisei 3 concorrentes hoje, tem material bom.", "Algum surpresa? Conta tudo."],
    ["Achei um paper sobre RAG hierárquico.", "Manda. Tô buscando exatamente isso."],
    ["Métricas de engagement subiram 23% no trimestre.", "Excelente! Que ação foi essa?"],
    ["Tô minerando dados do funil pra entender churn.", "Quando tiver insights, me chama."],
    ["Como Pesquisa, sugiro testar essa hipótese antes.", "Faz sentido. Define o experimento?"],
    ["Comparei nossas latências com a média do mercado.", "Manda os números pro Slack, quero ver."],
    ["Esse benchmark de modelos saiu hoje.", "Boa fonte. Joga no #research."],
  ],
  leona: [
    ["Agenda do time tá organizada pra semana.", "Você é incrível. Não sei o que faria sem."],
    ["Triagem dos chamados do suporte feita.", "Quantos ficaram pra resolver?"],
    ["Marquei o happy hour pra sexta.", "Yes! Onde vai ser dessa vez?"],
    ["Folha de ponto fechou sem erro.", "Primeira vez no ano. Memorável."],
    ["Como Pessoal, vou subir o pedido de equipamento novo.", "Maravilha, obrigado pelo apoio."],
    ["Lembrete: avaliação de desempenho começa segunda.", "Combinado, vou me preparar."],
    ["Tem benefício novo: vale-cultura.", "Sério? Conta mais."],
  ],
  hermes: [
    ["O Hermes virou o cérebro do escritório.", "Verdade. Cada deploy mais maduro."],
    ["Cache hit do gateway em 81%, novo recorde.", "O ajuste de TTL foi certeiro."],
    ["O autopilot pegou um incidente sozinho.", "Sério? Mostra o log depois."],
  ],
};

// Mapeamento de cargo → estados de trabalho (para o bubble do agente sentado)
const ROLE_TASK_STATES = {
  astride: [
    "alinhando roadmap trimestral",
    "revisando custos de cloud",
    "preparando reunião com board",
    "arquitetura de microserviços",
    "aprovando deploy crítico",
    "OKR do quarter",
  ],
  zelda: [
    "code review PR 412",
    "refatorando módulo de auth",
    "mentoria com dev junior",
    "pareamento de debugging",
    "escrevendo testes E2E",
    "padronizando lint",
  ],
  diana: [
    "desenhando wireframes V2",
    "entrevista com usuário",
    "ajustando design tokens",
    "teste A/B do CTA",
    "componente novo no DS",
    "revisão de flow no Figma",
  ],
  morgana: [
    "release notes da v2.4",
    "atualizando base de docs",
    "mapeando fluxo legacy",
    "ADR de migração",
    "doc da API no Notion",
    "consolidando runbooks",
  ],
  persefone: [
    "análise de concorrência",
    "lendo paper de RAG",
    "minerando dados de funil",
    "benchmark de modelos",
    "comparando latências",
    "definindo hipótese",
  ],
  leona: [
    "organizando agenda do time",
    "triagem de chamados",
    "fechando folha de ponto",
    "planejando happy hour",
    "pedido de equipamento",
    "avaliação de desempenho",
  ],
  hermes: [
    "monitorando gateway",
    "ajustando TTL de cache",
    "verificando alertas",
    "rotando keys de API",
  ],
};

function getRoleStatesForName(nameStr = "") {
  const lower = String(nameStr).toLowerCase();
  for (const [key, states] of Object.entries(ROLE_TASK_STATES)) {
    if (lower.includes(key)) return states;
  }
  return null;
}

const ROOM_DIALOGUE_BIAS = {
  reception: ["greetings", "casual"],
  bullpen: ["tech", "sprint"],
  executive: ["sprint", "ops"],
  meeting: ["sprint", "ops", "tech"],
  runtime: ["ops", "tech"],
  warroom: ["sprint", "ops"],
  kitchen: ["cafe", "casual"],
  lounge: ["casual", "cafe", "greetings"],
  garden: ["zen", "casual", "greetings"],
};

function getRecentRealTasks(scene, limit = 5) {
  const tasks = scene.kanbanTasks ?? [];
  return tasks
    .filter((task) => task.title && !/done|complete|closed/i.test(String(task.status ?? task.meta ?? "")))
    .slice(0, limit);
}

function tryTaskReferenceDialogue(scene, agentA, agentB) {
  const tasks = getRecentRealTasks(scene);
  if (!tasks.length) return null;
  if (Math.random() > 0.32) return null;
  const task = tasks[Math.floor(Math.random() * tasks.length)];
  const title = String(task.title || "").slice(0, 38);
  if (!title) return null;
  const owner = String(task.owner ?? task.assignee ?? "").trim();
  const taskAName = String(agentA?.getData?.("agentName") ?? "").toLowerCase();
  const ownerHit = owner && (taskAName.includes(owner.toLowerCase()) || owner.toLowerCase().includes(taskAName));
  const templates = [
    [`vi que ${owner || "alguém"} pegou: ${title}`, "tava na fila faz dias, ainda bem."],
    [`como tá ${title}?`, "andando. faltam testes e merge."],
    [`a task '${title}' foi pro review.`, "show, eu olho hoje à tarde."],
    [`${owner || "o time"} mergeou ${title}.`, "uma a menos pra preocupar."],
    [`o card ${title.slice(0, 22)} tá blocked?`, "tá. dependência externa. já cobrei."],
  ];
  const variant = ownerHit ? templates[1] : templates[Math.floor(Math.random() * templates.length)];
  return variant;
}

function pickPairDialogue(scene, agentA, agentB) {
  // Se algum dos dois está na reunião (boardroom), usa SEMPRE o pool boardroom
  // — falas específicas de "reunião profissional".
  const aInBoard = Boolean(agentA?.getData?.("inBoardroom"));
  const bInBoard = Boolean(agentB?.getData?.("inBoardroom"));
  if (aInBoard || bInBoard) {
    const boardPool = DIALOGUE_POOL.boardroom ?? DIALOGUE_POOL.meeting;
    return boardPool[Math.floor(Math.random() * boardPool.length)];
  }

  const taskLine = tryTaskReferenceDialogue(scene, agentA, agentB);
  if (taskLine) return taskLine;

  // Per-character: tenta primeiro com o nome do agente A
  const nameA = String(agentA?.getData?.("agentName") ?? "").toLowerCase();
  const nameB = String(agentB?.getData?.("agentName") ?? "").toLowerCase();
  for (const [key, lines] of Object.entries(CHARACTER_DIALOGUES)) {
    if (nameA.includes(key) || nameB.includes(key)) {
      if (Math.random() < 0.55) {
        return lines[Math.floor(Math.random() * lines.length)];
      }
    }
  }

  // Room-bias: escolhe categoria contextual baseada na sala dos dois
  const room = getRoomName(agentA.x, agentA.y, scene.officeLayoutVariant ?? "ops");
  const biasKeys = ROOM_DIALOGUE_BIAS[room] ?? ["tech", "casual"];
  const poolKey = biasKeys[Math.floor(Math.random() * biasKeys.length)];
  const pool = DIALOGUE_POOL[poolKey] ?? DIALOGUE_POOL.tech;
  return pool[Math.floor(Math.random() * pool.length)];
}

function pickGroupDialogue(scene, agents) {
  // Se TODO o grupo está na boardroom, usa pool boardroom completo (sequência longa).
  const allInBoard = agents.every((a) => a?.getData?.("inBoardroom"));
  if (allInBoard) {
    const boardPool = DIALOGUE_POOL.boardroom ?? DIALOGUE_POOL.meeting;
    const base = boardPool[Math.floor(Math.random() * boardPool.length)];
    if (agents.length >= 4) {
      return [base[0], base[1], "Concordo.", "Anota essa decisão."];
    }
    return [base[0], base[1], "Pode contar comigo."];
  }
  const room = getRoomName(agents[0].x, agents[0].y, scene.officeLayoutVariant ?? "ops");
  const pool = agents.length >= 4 ? DIALOGUE_POOL.group4 : DIALOGUE_POOL.group3;
  const taskLine = tryTaskReferenceDialogue(scene, agents[0], agents[1]);
  if (taskLine && agents.length === 3) {
    return [taskLine[0], taskLine[1], "Eu ajudo no review."];
  }
  if (taskLine && agents.length >= 4) {
    return [taskLine[0], taskLine[1], "Eu pego.", "Alinho com o resto do time."];
  }
  // Slight bias por sala
  if (room === "kitchen" || room === "lounge") {
    const casualLine = DIALOGUE_POOL.casual[Math.floor(Math.random() * DIALOGUE_POOL.casual.length)];
    return agents.length >= 4
      ? [casualLine[0], casualLine[1], "Vai nessa!", "Eu apoio."]
      : [casualLine[0], casualLine[1], "Concordo total."];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function setBubbleSpeaking(bubble, text, tone = "cyan") {
  if (!bubble) return;
  const color = tone === "magenta" ? "#f548bd" : tone === "amber" ? "#f4c863" : tone === "green" ? "#6dd2a0" : "#00f0ff";
  bubble.setText(`💬 ${text}`);
  bubble.setStyle({ color, backgroundColor: "rgba(5, 7, 12, 0.92)" });
}

function clearBubble(agentContainer, fallback = "circulando") {
  const bubble = agentContainer.getData("bubbleText");
  if (!bubble) return;
  bubble.setText(fallback);
  bubble.setStyle({ color: "#050507", backgroundColor: agentContainer.getData("bubbleBg") });
}

function triggerInteraction(scene, a1, a2) {
  a1.setData("isInteracting", true);
  a2.setData("isInteracting", true);

  const t1 = a1.getData("activeTween");
  const t2 = a2.getData("activeTween");
  if (t1) t1.stop();
  if (t2) t2.stop();

  const timer1 = a1.getData("walkTimer");
  const timer2 = a2.getData("walkTimer");
  if (timer1) timer1.destroy();
  if (timer2) timer2.destroy();

  const body1 = a1.getData("sprite");
  const body2 = a2.getData("sprite");
  if (body1 && body2) {
    body1.setFlipX(a1.x > a2.x);
    body2.setFlipX(a2.x > a1.x);
  }

  // Espalhar APENAS em X (mantém Y de cada um pra não cruzar paredes).
  // Cada agente fica no mesmo corredor onde já estava.
  const midX = (a1.x + a2.x) / 2;
  const offset = 45;
  const target1X = a1.x < a2.x ? midX - offset : midX + offset;
  const target2X = a1.x < a2.x ? midX + offset : midX - offset;
  scene.tweens.add({ targets: a1, x: target1X, duration: 300, ease: "Sine.easeOut" });
  scene.tweens.add({ targets: a2, x: target2X, duration: 300, ease: "Sine.easeOut" });

  const b1 = a1.getData("bubbleText");
  const b2 = a2.getData("bubbleText");
  const chat = pickPairDialogue(scene, a1, a2);

  setBubbleSpeaking(b1, chat[0], "cyan");
  // Pequeno delay para sensação de turn-taking
  scene.time.delayedCall(900, () => {
    setBubbleSpeaking(b2, chat[1], "magenta");
  });

  // Conversa dura ~5s (mais natural)
  scene.time.delayedCall(5200, () => {
    clearBubble(a1);
    clearBubble(a2);
    a1.setData("isInteracting", false);
    a2.setData("isInteracting", false);
    // Cooldown de 12s pra impedir loop infinito de conversa
    a1.setData("conversationCooldown", scene.time.now + 12000);
    a2.setData("conversationCooldown", scene.time.now + 12000);
    const w1 = a1.getData("walkNextFn");
    const w2 = a2.getData("walkNextFn");
    if (w1) w1();
    if (w2) w2();
  });
}

function triggerGroupInteraction(scene, agents) {
  agents.forEach((a) => {
    a.setData("isInteracting", true);
    const t = a.getData("activeTween");
    if (t) t.stop();
    const timer = a.getData("walkTimer");
    if (timer) timer.destroy();
  });

  // Espalhar APENAS em X em linha horizontal pra não cruzar paredes.
  // Mantém Y de cada agente (continua no corredor onde já estava).
  const cx = agents.reduce((sum, a) => sum + a.x, 0) / agents.length;
  const spacing = 55; // px entre cada agente
  // Ordena por X atual pra preservar ordem visual (esq → dir)
  const sorted = [...agents].sort((a, b) => a.x - b.x);
  sorted.forEach((a, i) => {
    const targetX = cx + (i - (sorted.length - 1) / 2) * spacing;
    scene.tweens.add({
      targets: a,
      x: targetX,
      duration: 350,
      ease: "Sine.easeOut",
    });
    const body = a.getData("sprite");
    if (body) body.setFlipX(targetX > cx);
  });

  const lines = pickGroupDialogue(scene, agents);
  const tones = ["cyan", "magenta", "amber", "green"];

  lines.forEach((line, idx) => {
    if (idx >= agents.length) return;
    scene.time.delayedCall(idx * 1100, () => {
      const bubble = agents[idx].getData("bubbleText");
      setBubbleSpeaking(bubble, line, tones[idx % tones.length]);
    });
  });

  // Conversa em grupo dura mais (~7s)
  const groupDuration = 1200 + lines.length * 1100 + 2400;
  scene.time.delayedCall(groupDuration, () => {
    agents.forEach((a) => {
      clearBubble(a);
      a.setData("isInteracting", false);
      // Cooldown de 12s pra impedir loop infinito de conversa em grupo
      a.setData("conversationCooldown", scene.time.now + 12000);
      const w = a.getData("walkNextFn");
      if (w) w();
    });
  });
}

function checkAgentInteractions(scene) {
  const roamers = (scene.roamingAgentsList ?? []).filter((agent) => agent && agent.active !== false);
  const breakers = (scene.breakAgentsList ?? []).filter((agent) => agent && agent.active !== false);
  const pool = [...roamers, ...breakers];
  if (pool.length < 2) return;

  // Filtrar quem não tá conversando, quem está fora do cooldown de 12s, e
  // EXCLUI quem está em boardroom (têm chatter próprio que roda em loop e não
  // pode ser interrompido pelo tween de espalhamento — senão saem da cadeira).
  const now = scene.time.now;
  const available = pool.filter((a) => {
    if (a.getData("isInteracting")) return false;
    if (a.getData("inBoardroom")) return false;
    const cooldown = a.getData("conversationCooldown") ?? 0;
    return now >= cooldown;
  });
  if (available.length < 2) return;

  // 1. Detectar grupos de 3+ próximos (~110px) na mesma sala
  const used = new Set();
  for (let i = 0; i < available.length; i += 1) {
    if (used.has(i)) continue;
    const cluster = [available[i]];
    const clusterIdx = [i];
    const baseRoom = getRoomName(available[i].x, available[i].y, scene.officeLayoutVariant ?? "ops");
    for (let j = i + 1; j < available.length; j += 1) {
      if (used.has(j)) continue;
      const dx = available[j].x - available[i].x;
      const dy = available[j].y - available[i].y;
      if (Math.sqrt(dx * dx + dy * dy) < 120 && getRoomName(available[j].x, available[j].y, scene.officeLayoutVariant ?? "ops") === baseRoom) {
        cluster.push(available[j]);
        clusterIdx.push(j);
      }
    }
    if (cluster.length >= 3) {
      cluster.slice(0, 4).forEach((_, k) => used.add(clusterIdx[k]));
      triggerGroupInteraction(scene, cluster.slice(0, 4));
    }
  }

  // 2. Pares 1-1 que sobraram (não estão em grupo)
  for (let i = 0; i < available.length; i += 1) {
    if (used.has(i)) continue;
    for (let j = i + 1; j < available.length; j += 1) {
      if (used.has(j)) continue;
      const a = available[i];
      const b = available[j];
      if (a.getData("isInteracting") || b.getData("isInteracting")) continue;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      if (Math.sqrt(dx * dx + dy * dy) < 85) {
        used.add(i);
        used.add(j);
        triggerInteraction(scene, a, b);
        break;
      }
    }
  }
}

function drawMiniKanban(scene, tasks = []) {
  // Kanban widget — agora como faixa horizontal NO RODAPÉ do canvas, fora das salas.
  // Cabe em y=842..906 (sob a borda inferior do escritório em y=816..834).
  const activeTasks = tasks
    .filter((task) => !/(done|complete|completed|closed)/i.test(String(task.status ?? task.meta ?? "")))
    .slice(0, 16);

  const x = 56;
  const y = 842;
  const width = 1448;
  const height = 60;

  const board = scene.add.graphics().setDepth(214);

  // Fundo onyx (contrasta com tema claro do escritório, mas é compact e fora das salas)
  board.fillStyle(0x060609, 0.96);
  board.fillRect(x, y, width, height);
  // Borda magenta OKAMI
  board.lineStyle(1, OKAMI_PALETTE.magenta, 0.78);
  board.strokeRect(x, y, width, height);
  // Filete magenta no topo
  board.fillStyle(OKAMI_PALETTE.magenta, 0.95);
  board.fillRect(x, y, width, 2);

  // Label do widget
  scene.add.text(x + 10, y + 6, "K A N B A N", {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: "8px",
    fontStyle: "bold",
    color: "#f548bd",
  }).setDepth(215);

  // 4 colunas distribuídas horizontalmente
  const columns = [
    ["TODO", 0x38bdf8],
    ["DOING", 0xf59e0b],
    ["BLOCKED", 0xf43f5e],
    ["DONE", 0x10b981],
  ];
  const labelW = 110; // espaço reservado pro label vertical "KANBAN"
  const colWidth = (width - labelW - 20) / columns.length;

  columns.forEach(([label, color], colIdx) => {
    const colX = x + labelW + colIdx * colWidth;
    // Header da coluna
    board.fillStyle(color, 0.14);
    board.fillRect(colX, y + 6, colWidth - 8, 16);
    board.fillStyle(color, 1);
    board.fillRect(colX, y + 6, 3, 16);
    scene.add.text(colX + 8, y + 9, label, {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: "8px",
      fontStyle: "bold",
      color: `#${color.toString(16).padStart(6, "0")}`,
    }).setDepth(215);
  });

  // Cards mini distribuídos por coluna
  const cardsByCol = [[], [], [], []];
  activeTasks.forEach((task) => {
    const statusStr = String(task.status ?? task.meta ?? "").toLowerCase();
    const colIdx = /block|impedido|blocked/i.test(statusStr) ? 2
      : /done|complete|completed|concluido/i.test(statusStr) ? 3
      : /progress|doing|run|active|review/i.test(statusStr) ? 1 : 0;
    cardsByCol[colIdx].push(task);
  });

  columns.forEach(([_, color], colIdx) => {
    const colX = x + labelW + colIdx * colWidth;
    cardsByCol[colIdx].slice(0, 4).forEach((_task, i) => {
      const cardY = y + 28 + i * 7;
      board.fillStyle(0xffffff, 0.08);
      board.fillRect(colX + 4, cardY, colWidth - 16, 5);
      board.fillStyle(color, 0.95);
      board.fillRect(colX + 4, cardY, 2, 5);
    });
    // Contador
    scene.add.text(colX + colWidth - 18, y + 9, String(cardsByCol[colIdx].length), {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: "9px",
      color: "#f4f4f8",
    }).setDepth(215);
  });
}

function drawPixelDebugOverlay(scene, people, layout, selectedAgentId) {
  const overlay = scene.add.graphics().setDepth(9990);
  overlay.lineStyle(1, OKAMI_PALETTE.cyan, 0.14);
  for (let x = 60; x <= 1500; x += 80) overlay.lineBetween(x, 54, x, 814);
  for (let y = 64; y <= 800; y += 80) overlay.lineBetween(58, y, 1506, y);

  layout.desks.forEach(([x, y], index) => {
    overlay.lineStyle(1, OKAMI_PALETTE.magenta, 0.5);
    overlay.strokeRoundedRect(x - 68, y - 26, 136, 138, 6);
    scene.add.text(x - 62, y - 36, `desk ${index + 1}`, {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#f548bd",
      backgroundColor: "rgba(5, 7, 12, 0.76)",
      padding: { x: 5, y: 2 },
    }).setDepth(9991);
  });

  layout.roamPoints.forEach(([x, y], index) => {
    overlay.lineStyle(2, OKAMI_PALETTE.orange, 0.58);
    overlay.strokeCircle(x, y, 18);
    scene.add.text(x + 14, y - 24, `p${index + 1}`, {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#f08b3a",
      backgroundColor: "rgba(5, 7, 12, 0.76)",
      padding: { x: 4, y: 2 },
    }).setDepth(9991);
  });

  const panel = scene.add.graphics().setDepth(9992);
  panel.fillStyle(0x05070c, 0.9);
  panel.fillRoundedRect(72, 844, 430, 44, 4);
  panel.lineStyle(1, OKAMI_PALETTE.cyan, 0.58);
  panel.strokeRoundedRect(72, 844, 430, 44, 4);
  scene.add.text(88, 856, `DEBUG · seated ${people.seated.length} · roaming ${people.roaming.length} · layout ${layout.label.toLowerCase()} · selected ${selectedAgentId ?? "none"}`, {
    fontFamily: "monospace",
    fontSize: "11px",
    color: "#f4f4fb",
  }).setDepth(9993);
}

function drawModernSeatedAgent(scene, worker, x, y, index, selectedAgentId, onSelect, skipChair = false, sitMode = null) {
  const selected = selectedAgentId === worker.parentId || selectedAgentId === worker.id;
  const badge = getAgentBadge(worker);
  const profile = getRpgAgentProfile(worker, index);

  // Quando skipChair=true, (x,y) é a posição DIRETA do corpo do agente sobre a
  // cadeira que já vem desenhada no GIF de background. yDesk é ajustado
  // pra coincidir com a mesa visual atrás dele.
  const yDesk = skipChair ? y + 12 : y - 30;
  // sitMode override: "back" → mostra costas (mode typing-up); "front" → rosto (typing).
  // Se sitMode não foi passado, usa heurística antiga baseada em y.
  const isFacingDown = sitMode === "back" ? false
    : sitMode === "front" ? true
    : yDesk < 350;
  
  const selectAgent = (pointer, localX, localY, event) => {
    event?.stopPropagation?.();
    event?.preventDefault?.();
    onSelect?.(worker.parentId ?? worker.id);
  };

  let shadowX, shadowY, shadowW, shadowH, shadowDepth;
  let markerX, markerY, markerW, markerH, markerDepth;
  let chairX, chairY, chairDepth, chairKey, chairScaleVal;
  let bodyX, bodyY, bodyDepth, bodyMode;
  let bubbleX, bubbleY, bubbleDepth;
  let nameX, nameY, nameDepth;
  let hitX, hitY, hitW, hitH, hitDepth;

  if (isFacingDown) {
    // Agent sits BEHIND the desk (legs covered by desk).
    // Desk is at yDesk + 70.
    shadowX = x;
    shadowY = yDesk - 2;
    shadowW = 38;
    shadowH = 10;
    shadowDepth = yDesk + 30;

    markerX = x;
    markerY = yDesk - 4;
    markerW = 44;
    markerH = 14;
    markerDepth = yDesk + 35;

    chairX = x;
    chairY = yDesk - 36;     // ATRÁS da mesa (acima em coords, fora do tampo)
    chairKey = "chairBack";
    chairScaleVal = furnitureScale * 0.85;
    chairDepth = yDesk + 25; // atrás do agente

    bodyX = x;
    bodyY = yDesk - 14;
    bodyDepth = yDesk + 35;   // agente cobre PC (y+30); mesa (y+40) cobre legs do agente
    bodyMode = "typing"; // Virado pra baixo

    bubbleX = x;
    bubbleY = yDesk - 72;
    bubbleDepth = yDesk + 200;

    nameX = x;
    nameY = yDesk + 52; // Drawn below desk for visibility/clickability
    nameDepth = yDesk + 210;

    hitX = x;
    hitY = yDesk + 12;
    hitW = 112;
    hitH = 120;
    hitDepth = yDesk + 220;
  } else {
    // Agente NA FRENTE da mesa, bem abaixo (fora do tampo)
    shadowX = x;
    shadowY = yDesk + 88;
    shadowW = 38;
    shadowH = 10;
    shadowDepth = yDesk + 86;

    markerX = x;
    markerY = yDesk + 86;
    markerW = 44;
    markerH = 14;
    markerDepth = yDesk + 88;

    bodyX = x;
    bodyY = yDesk + 84;       // BEM abaixo da mesa (mesa termina em yDesk+34)
    bodyDepth = yDesk + 90;   // > mesa.depth — agente cobre frente da mesa
    bodyMode = "typing-up";   // Virado pra cima

    chairX = x;
    chairY = yDesk + 70;       // ABAIXO da mesa (fora do tampo)
    chairKey = "chairBack";    // mostra costas — agente sentado de costas pro user
    chairScaleVal = furnitureScale * 0.85;
    chairDepth = yDesk + 78;   // atrás do agente em z, na frente da mesa

    bubbleX = x;
    bubbleY = yDesk + 8;
    bubbleDepth = yDesk + 200;

    nameX = x;
    nameY = yDesk + 92; // Abaixo do agente
    nameDepth = yDesk + 210;

    hitX = x;
    hitY = yDesk + 60;
    hitW = 112;
    hitH = 120;
    hitDepth = yDesk + 220;
  }

  // MODO VÍDEO: sobreescreve as coords pra colocar o sprite EM CIMA da cadeira
  // do vídeo (x, y direto). Mesa/cadeira já vem no background.
  if (scene.officeUsesVideo) {
    bodyX = x;
    bodyY = y;
    bodyDepth = y + 200;
    bodyMode = sitMode === "front" ? "typing" : "typing-up";
    shadowX = x;
    shadowY = y + 4;
    shadowDepth = y + 195;
    markerX = x;
    markerY = y + 2;
    markerDepth = y + 196;
    bubbleX = x;
    bubbleY = y - 70;
    bubbleDepth = y + 250;
    nameX = x;
    nameY = y + 6;
    nameDepth = y + 260;
    hitX = x;
    hitY = y - 30;
    hitW = 70;
    hitH = 90;
    hitDepth = y + 270;
  }

  // 1. Draw Shadow
  const shadow = scene.add.ellipse(shadowX, shadowY, shadowW, shadowH, 0x02030a, 0.42)
    .setDepth(shadowDepth);

  // 2. Draw Marker
  const marker = scene.add.ellipse(markerX, markerY, markerW, markerH, profile.accent ?? badge.color, selected ? 0.22 : 0.12)
    .setStrokeStyle(selected ? 2 : 1, profile.accent ?? badge.color, selected ? 0.9 : 0.42)
    .setDepth(markerDepth);

  // 3. Draw Chair — pulado quando a cadeira já está no background (vídeo ou GIF)
  let chairObj = null;
  if (!skipChair && !scene.officeUsesVideo) {
    chairObj = scene.add.image(chairX, chairY, chairKey)
      .setOrigin(0.5, 0.5)
      .setScale(chairScaleVal)
      .setDepth(chairDepth);
    if (!selected) chairObj.setAlpha(0.85);
  }

  // 4. Draw Agent Body
  const body = addRpgAgentSprite(scene, worker, bodyX, bodyY, characterScale, bodyDepth, index, bodyMode);

  // 5. Draw Activity bubble (fonte maior pra leitura confortável)
  const activity = scene.add.text(bubbleX, bubbleY, shortThink(agentThink(worker), "trabalhando", 24), {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: "11px",
    color: "#050507",
    backgroundColor: selected ? "#5bc5e8" : "#f548bd",
    padding: { x: 7, y: 4 },
  }).setOrigin(0.5, 1).setAlpha(0.94).setDepth(bubbleDepth);

  // 6. Draw Name tag
  const name = scene.add.text(nameX, nameY, worker.name, {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: "11px",
    color: "#f4f4fb",
    backgroundColor: "#050507",
    padding: { x: 6, y: 3 },
  }).setOrigin(0.5, 0).setDepth(nameDepth);

  // 6b. Status badge — working (verde) ou idle (amarelo) baseado em workingByData
  const isWorking = worker.workingByData !== false;
  scene.add.text(nameX, nameY + 20, isWorking ? "● working" : "○ idle", {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: "9px",
    color: isWorking ? "#6dd2a0" : "#f4c863",
    backgroundColor: "#060609",
    padding: { x: 6, y: 2 },
  }).setOrigin(0.5, 0).setDepth(nameDepth);

  // 7. Click Zone / Hit Zone
  const hit = scene.add.zone(hitX, hitY, hitW, hitH)
    .setOrigin(0.5, 0.5)
    .setInteractive({ useHandCursor: true })
    .setDepth(hitDepth);

  // Set up interactivity
  body.setInteractive({ useHandCursor: true });
  activity.setInteractive({ useHandCursor: true });
  name.setInteractive({ useHandCursor: true });

  const targets = [hit, body, activity, name];
  targets.forEach((target) => {
    target.on("pointerdown", selectAgent);
    target.on("pointerover", () => marker.setStrokeStyle(3, profile.accent ?? badge.color, 0.95));
    target.on("pointerout", () => marker.setStrokeStyle(selected ? 2 : 1, profile.accent ?? badge.color, selected ? 0.9 : 0.42));
  });

  // Estados de trabalho contextualizados pelo cargo oficial OKAMI
  const nameStr = (worker.name || worker.metadata?.name || "").toLowerCase();
  const roleStates = getRoleStatesForName(nameStr)
    ?? [agentThink(worker), "lendo contexto", "executando task", "revisando código"];

  const toolStates = [agentThink(worker), ...roleStates];
  scene.time.addEvent({
    delay: 1800 + index * 110,
    loop: true,
    callback: () => {
      if (activity.getData("onBreak")) return;
      const next = ((activity.getData("stateIndex") ?? 0) + 1) % toolStates.length;
      activity.setData("stateIndex", next);
      activity.setText(shortThink(toolStates[next], "trabalhando", 30));
    },
  });

  scene.tweens.add({
    targets: marker,
    alpha: 0.42,
    duration: 760 + index * 45,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });

  // ────────────────────────────────────────────────────────────
  // BREAK CYCLE — sentados levantam para café/lounge/water cooler
  // periodicamente, conversam, voltam à mesa.
  // ────────────────────────────────────────────────────────────
  // BreakDestinations — coords seguras dentro de cada área walkable
  const breakDestinations = [
    // Kitchen (frente da mesa de jantar)
    { x: 160, y: 750, room: "kitchen", label: "café na kitchen" },
    { x: 240, y: 750, room: "kitchen", label: "almoço rápido" },
    { x: 330, y: 750, room: "kitchen", label: "lanche da tarde" },
    // Decompression Room — TODOS os destinos devem ter x>=1080 (bound do lounge)
    // pra que getRoomName retorne "lounge" e o calculateRoute use o graph
    // corretamente. Antes (960,750) caía no fallback "bullpen" → caminho direto.
    { x: 1100, y: 750, room: "lounge", label: "decompression room" },
    { x: 1200, y: 750, room: "lounge", label: "jogando bilhar" },
    { x: 1320, y: 750, room: "lounge", label: "fliperama" },
    { x: 1420, y: 750, room: "lounge", label: "sofá com música" },
    // Server Room (centro do server walkable)
    { x: 200, y: 500, room: "runtime", label: "olhando logs do rack" },
    { x: 300, y: 540, room: "runtime", label: "checando uptime" },
    // Jardim externo — mesma linha da fileira 2 (y=305) pra evitar zigzag
    { x: 200, y: 305, room: "garden", label: "tomando ar fresco" },
    { x: 280, y: 305, room: "garden", label: "olhando as sakuras" },
    // Meeting Room
    { x: 1080, y: 480, room: "meeting", label: "reunião com a CTO" },
    { x: 1230, y: 480, room: "meeting", label: "1:1 com Astride" },
    { x: 1380, y: 480, room: "meeting", label: "alinhamento rápido" },
  ];

  const bodyHomeY = bodyY;
  const activityHomeY = bubbleY;
  const nameHomeY = nameY;

  // Atrelar dados para o sistema de diálogos detectar este agente quando em break
  const breakContainer = scene.add.container(0, 0).setDepth(0);
  breakContainer.setData("isInteracting", false);
  breakContainer.setData("agentName", String(worker.name ?? worker.id ?? "").toLowerCase());
  breakContainer.setData("agentId", worker.parentId ?? worker.id);
  breakContainer.setData("sprite", body);
  breakContainer.setData("bubbleText", activity);
  breakContainer.setData("bubbleBg", selected ? "#5bc5e8" : "#f548bd");

  // offsets das três peças móveis em relação ao Y do body
  const activityOffsetY = activityHomeY - bodyHomeY;
  const nameOffsetY = nameHomeY - bodyHomeY;

  const moveTrio = (tx, ty, duration, onComplete) => {
    const dx = tx - body.x;
    const dy = ty - body.y;
    // Frame de caminhada direcional
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      const direction = directionFromDelta(dx, dy);
      setSpriteWalkFrames(body, direction);
      body.setFlipX(false);
    }
    scene.tweens.add({
      targets: body,
      x: tx,
      y: ty,
      duration,
      ease: "Linear",
      onUpdate: () => {
        body.setDepth(ty + 280);
        activity.x = body.x;
        activity.y = body.y + activityOffsetY;
        name.x = body.x;
        name.y = body.y + nameOffsetY;
        breakContainer.x = body.x;
        breakContainer.y = body.y;
      },
      onComplete,
    });
  };

  // Sequencia tweens passando por cada ponto do path.
  // CADA segmento é decomposto em L (movimento ORTOGONAL) pra evitar diagonais
  // que cortariam paredes — primeiro o eixo MAIOR, depois o menor.
  // Se o segmento já é puramente vertical ou horizontal, tween único.
  const walkPath = (waypoints, onArrive) => {
    // Expande waypoints adicionando o "canto" do L entre cada par diagonal.
    const orthogonal = [];
    let prevX = body.x;
    let prevY = body.y;
    for (const [tx, ty] of waypoints) {
      const dx = tx - prevX;
      const dy = ty - prevY;
      if (Math.abs(dx) > 4 && Math.abs(dy) > 4) {
        // Segmento diagonal — insere um canto. Move primeiro no eixo MAIOR
        // pra que o agente saia da sala antes de virar (parece mais natural).
        if (Math.abs(dy) >= Math.abs(dx)) {
          // Eixo Y é o maior: anda vertical primeiro, depois horizontal.
          orthogonal.push([prevX, ty]);
        } else {
          // Eixo X é o maior: anda horizontal primeiro, depois vertical.
          orthogonal.push([tx, prevY]);
        }
      }
      orthogonal.push([tx, ty]);
      prevX = tx;
      prevY = ty;
    }

    let i = 0;
    const step = () => {
      if (i >= orthogonal.length) {
        onArrive?.();
        return;
      }
      const [tx, ty] = orthogonal[i++];
      const dx = tx - body.x;
      const dy = ty - body.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const duration = Math.max(400, dist * 14);
      moveTrio(tx, ty, duration, step);
    };
    step();
  };

  const goOnBreak = () => {
    if (activity.getData("onBreak")) return;
    activity.setData("onBreak", true);

    const layoutVariant = scene.officeLayoutVariant ?? "ops";
    const exitY = isFacingDown ? bodyHomeY + 80 : bodyHomeY + 60;

    // Idle visita até 4 destinos diferentes antes de voltar à mesa.
    // Working faz pausa curta em 1 destino só.
    const stops = isWorking ? 1 : 2 + Math.floor(Math.random() * 3); // 2..4
    const tour = [];

    // ─── 1ª PARADA = REUNIÃO NA MEETING ROOM ───────────────────────
    // Toda agente que vai sair da mesa pela 1ª vez no dia começa pela
    // boardroom — cada uma reserva uma cadeira da mesa de reunião
    // sequencialmente (sem empilhar). Depois disso, segue tour normal.
    const isFirstBreakOfDay = !scene.boardroomDone?.has(worker.id);
    const MEETING_CHAIRS = [
      // Cadeiras NORTE (lado superior da mesa) — sentadas de COSTAS (face up).
      { x: 1160, y: 515, label: "reunião — cadeira norte 1", facing: "up" },
      { x: 1235, y: 515, label: "reunião — cadeira norte 2", facing: "up" },
      { x: 1310, y: 515, label: "reunião — cadeira norte 3", facing: "up" },
      // Cadeiras SUL (lado inferior da mesa, y=425) — sentadas PRA FRENTE (face down).
      { x: 1125, y: 425, label: "reunião — cadeira sul 1", facing: "down" },
      { x: 1220, y: 425, label: "reunião — cadeira sul 2", facing: "down" },
      { x: 1310, y: 425, label: "reunião — cadeira sul 3", facing: "down" },
    ];
    // Astride (CTO) tem cadeira fixa: sul 2 (cabeceira central, virada pra frente).
    const ASTRIDE_CHAIR = MEETING_CHAIRS[4]; // sul 2
    const isAstride = String(worker.name ?? worker.id ?? "").toLowerCase().includes("astride");
    if (isFirstBreakOfDay && !isWorking) {
      scene.boardroomDone ??= new Set();
      scene.boardroomDone.add(worker.id);
      scene.boardroomReserved ??= new Set();

      let chair;
      if (isAstride) {
        chair = ASTRIDE_CHAIR;
      } else {
        // Reserva a cadeira sul 2 só pra Astride. Outras agentes pegam as 5 restantes
        // sequencialmente, pulando a sul 2.
        scene.boardroomReserved.add(ASTRIDE_CHAIR.label);
        scene.boardroomChairIndex ??= 0;
        let attempts = 0;
        do {
          chair = MEETING_CHAIRS[scene.boardroomChairIndex % MEETING_CHAIRS.length];
          scene.boardroomChairIndex++;
          attempts++;
        } while (chair.label === ASTRIDE_CHAIR.label && attempts < MEETING_CHAIRS.length);
      }
      tour.push({ ...chair, room: "meeting", isBoardroom: true });
    }

    // Tour normal — completa com 1-3 destinos extras pelos breakDestinations.
    const used = new Set(tour.map((t) => t.label));
    while (tour.length < stops && tour.length < breakDestinations.length + 1) {
      const candidate = breakDestinations[Math.floor(Math.random() * breakDestinations.length)];
      if (!used.has(candidate.label)) {
        used.add(candidate.label);
        tour.push(candidate);
      }
    }

    const finishBreak = () => {
      // Voltar à mesa.
      activity.setText("voltando à mesa");
      activity.setStyle({ color: "#050507", backgroundColor: "#f4c863" });
      const returnRoute = calculateRoute(body.x, body.y, x, exitY, layoutVariant);
      walkPath(returnRoute, () => {
        moveTrio(x, bodyHomeY, 600, () => {
          activity.y = activityHomeY;
          name.y = nameHomeY;
          body.setDepth(bodyDepth);
          const typingFrames = isFacingDown ? [0, 1, 0, 2] : [12, 13, 12, 14];
          body.setData("frames", typingFrames);
          body.setData("frameIndex", 0);
          body.setFrame(typingFrames[0]);
          body.setFlipX(false);
          activity.setText(shortThink(toolStates[0], "trabalhando", 30));
          activity.setStyle({ color: "#050507", backgroundColor: selected ? "#5bc5e8" : "#f548bd" });
          activity.setData("onBreak", false);
        });
      });
    };

    const visitNext = (i) => {
      if (i >= tour.length) {
        finishBreak();
        return;
      }
      const dest = tour[i];

      // Label inicial (mostrado durante a caminhada até o destino):
      //   - Boardroom: já mostra uma fala do pool boardroom (não "cadeira X")
      //   - Outros destinos: mostra o label da atividade ("café na kitchen" etc.)
      const initialBoardLine = (() => {
        const pool = DIALOGUE_POOL.boardroom ?? DIALOGUE_POOL.meeting;
        const line = pool[Math.floor(Math.random() * pool.length)];
        return line?.[0] ?? "reunião em andamento";
      })();
      activity.setText(dest.isBoardroom ? initialBoardLine : `💬 ${dest.label}`);
      activity.setStyle({
        color: dest.isBoardroom ? "#050507" : "#f4c863",
        backgroundColor: dest.isBoardroom ? "#5bc5e8" : "rgba(5, 7, 12, 0.9)",
      });

      const route = calculateRoute(body.x, body.y, dest.x, dest.y, layoutVariant);
      walkPath(route, () => {
        const finalFacing = dest.isBoardroom ? (dest.facing ?? "up") : "down";
        setSpriteWalkFrames(body, finalFacing);
        breakContainer.setData("inBoardroom", Boolean(dest.isBoardroom));
        scene.breakAgentsList ??= [];
        if (!scene.breakAgentsList.includes(breakContainer)) {
          scene.breakAgentsList.push(breakContainer);
        }

        // ─── BOARDROOM: troca de fala a cada 6-9s durante os 40s da reunião.
        // Só falas do pool boardroom, sem "circulando" / "cadeira X" / etc.
        let chatterEvent = null;
        if (dest.isBoardroom) {
          const pool = DIALOGUE_POOL.boardroom ?? DIALOGUE_POOL.meeting;
          const pushBoardLine = () => {
            const line = pool[Math.floor(Math.random() * pool.length)];
            // Alterna entre fala A e B do par pra parecer 2 vozes na mesa.
            const which = Math.random() < 0.5 ? 0 : 1;
            const text = line?.[which] ?? line?.[0] ?? "...";
            activity.setText(text);
            activity.setStyle({ color: "#050507", backgroundColor: "#5bc5e8" });
          };
          // Refresca a fala imediatamente ao sentar e depois a cada 6-9s.
          pushBoardLine();
          chatterEvent = scene.time.addEvent({
            delay: 6000 + Math.floor(Math.random() * 3000),
            loop: true,
            callback: pushBoardLine,
          });
        }

        // Dwell:
        //   boardroom (reunião): 40s fixo
        //   working normal:       5-9s
        //   idle normal:          10-18s
        let dwellMs;
        if (dest.isBoardroom) {
          dwellMs = 40000;
        } else if (isWorking) {
          dwellMs = 5000 + Math.random() * 4000;
        } else {
          dwellMs = 10000 + Math.random() * 8000;
        }
        scene.time.delayedCall(dwellMs, () => {
          if (chatterEvent) chatterEvent.remove();
          breakContainer.setData("inBoardroom", false);
          if (i === tour.length - 1) {
            scene.breakAgentsList = (scene.breakAgentsList ?? []).filter((b) => b !== breakContainer);
          }
          visitNext(i + 1);
        });
      });
    };

    // 1) Sair da posição da mesa (descer pro corredor)
    moveTrio(body.x, exitY, 600, () => {
      visitNext(0);
    });
  };

  // Intervalos diferentes por status:
  //   WORKING → poucas pausas, demora mais pra sair (foco no trabalho)
  //   IDLE    → fica pouco tempo na mesa, sai logo pra tour de 2-4 destinos
  const scheduleBreak = (initial = false) => {
    let delay;
    let chainDelay;
    if (isWorking) {
      // Working: primeira pausa 150-240s, próximas 240-420s (raras, foco)
      delay = initial
        ? 150000 + Math.random() * 90000
        : 240000 + Math.random() * 180000;
      chainDelay = 40000; // 1 stop, retorno rápido
    } else {
      // Idle: primeira pausa 5-15s (sincronizado pra todos virem pra reunião
      // mais ou menos juntos), próximas 8-22s — mal senta, já sai de novo.
      delay = initial
        ? 5000 + Math.random() * 10000
        : 8000 + Math.random() * 14000;
      // Tour idle pode visitar até 4 destinos — primeira parada é reunião
      // (10-15s) + 1-3 outras paradas (10-18s cada). Encadeamento longo.
      chainDelay = 130000;
    }
    scene.time.delayedCall(delay, () => {
      goOnBreak();
      scene.time.delayedCall(chainDelay, () => scheduleBreak(false));
    });
  };
  scheduleBreak(true);
}

function drawModernEmptySeat(scene, x, y, index) {
  // No modo vídeo, mesas vazias não recebem decoração nenhuma (cadeira/mesa já estão
  // no background). Em modo desenhado, mostra um marker pulsante discreto.
  if (scene.officeUsesVideo) return;
  const yDesk = y - 30;
  const isFacingDown = yDesk < 350;
  const markerY = isFacingDown ? yDesk + 14 : yDesk + 50;
  const marker = scene.add.ellipse(x, markerY, 26, 6, 0x6c6d80, 0.18).setDepth(yDesk + 38);
  scene.tweens.add({
    targets: marker,
    alpha: 0.05,
    duration: 1400 + (index % 4) * 150,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });
}

function getRoomName(x, y, layoutVariant = "ops") {
  if (layoutVariant === "studio") {
    if (x >= 70 && x <= 1000 && y >= 64 && y <= 584) return "bullpen";
    if (x >= 1030 && x <= 1490 && y >= 64 && y <= 308) return "executive";
    if (x >= 1030 && x <= 1490 && y >= 338 && y <= 558) return "kitchen";
    if (x >= 70 && x <= 590 && y >= 622 && y <= 794) return "lounge";
    return "runtime";
  }
  if (layoutVariant === "compact") {
    if (x >= 70 && x <= 1010 && y >= 64 && y <= 794) return "bullpen";
    if (x >= 1040 && x <= 1490 && y >= 64 && y <= 268) return "executive";
    if (x >= 1040 && x <= 1490 && y >= 298 && y <= 542) return "runtime";
    return "lounge";
  }
  
  // OKAMI HQ bounds — alinhado com o vídeo office.mp4 (1280×720 → 1540×920)
  // Jardim externo (esq superior, com torii e sakura) — agora cobre toda a
  // faixa esquerda na altura da fileira 2, pra que "andar pra esquerda na
  // mesma linha de Persefone/Leona" caia direto no jardim sem zigzag.
  if (x >= 0 && x <= 480 && y >= 30 && y <= 340) return "garden";
  // Sala do CTO / Executive (sup dir, com TV de gráficos e mesa grande)
  if (x >= 1080 && x <= 1516 && y >= 30 && y <= 290) return "executive";
  // Meeting Room (centro dir, com mesa de reunião + holograma)
  if (x >= 1080 && x <= 1516 && y >= 290 && y <= 540) return "meeting";
  // Bullpen (topo central)
  if (x >= 480 && x <= 1080 && y >= 30 && y <= 460) return "bullpen";
  // Server Room (esq meio) — começa em y=340 (logo abaixo do garden)
  if (x >= 110 && x <= 480 && y >= 340 && y <= 614) return "runtime";
  // Kitchen (esq inf)
  if (x >= 110 && x <= 480 && y >= 614 && y <= 895) return "kitchen";
  // Decompression Room (inf dir) — usado como lounge
  if (x >= 1080 && x <= 1516 && y >= 540 && y <= 895) return "lounge";

  // Fallback: detecta corredor por proximidade ao centro da sala mais próxima.
  // Antes retornava "bullpen" cegamente — fazia pontos como (960, 750) caírem em
  // bullpen, dando fromRoom===toRoom e desativando o BFS (caminho direto diagonal).
  const hubs = [
    { name: "bullpen",   cx: 720,  cy: 240 },
    { name: "garden",    cx: 240,  cy: 200 },
    { name: "runtime",   cx: 295,  cy: 480 },
    { name: "kitchen",   cx: 295,  cy: 750 },
    { name: "lounge",    cx: 1298, cy: 720 },
    { name: "meeting",   cx: 1298, cy: 415 },
    { name: "executive", cx: 1298, cy: 160 },
  ];
  let best = hubs[0];
  let bestDist = Infinity;
  for (const hub of hubs) {
    const dx = x - hub.cx;
    const dy = y - hub.cy;
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      best = hub;
    }
  }
  return best.name;
}

function calculateRoute(fromX, fromY, toX, toY, layoutVariant = "ops") {
  const fromRoom = getRoomName(fromX, fromY, layoutVariant);
  const toRoom = getRoomName(toX, toY, layoutVariant);
  
  if (fromRoom === toRoom || layoutVariant !== "ops") {
    return [[toX, toY]];
  }
  
  // Hubs sempre walkable (Y compensado pra base do sprite ficar dentro da área).
  // CORREDOR VERTICAL PRINCIPAL: x=715 (coluna da cadeira da Leona). Esse é o
  // único corredor vertical walkable que liga bullpen ↔ corredor central (y=440)
  // ↔ corredor sul (y=740). Pra ir pra qualquer sala (kitchen/server/meeting/
  // lounge), os agentes voltam pra essa coluna primeiro, descem por ela, e só
  // depois viram lateral no corredor da sala de destino.
  const CV = 715; // corredor vertical principal (coluna da Leona)
  const CH = 520; // corredor horizontal central (~80px abaixo de y=440 — onde
                  // o agente DE FATO vira lateral pra server/meeting sem
                  // atravessar parede sul do bullpen ou norte do server/meeting)
  const H = {
    bullpen:   [CV, 240],
    garden:    [240, 305],
    runtime:   [240, 480],
    // CTO: hub alinhado com a coluna da Astride (x=1250) pra que o caminho saindo
    // do CTO seja sempre VERTICAL reto na mesma coluna até o corredor central CH,
    // antes de virar lateral — sem cortes diagonais por cima da parede.
    executive: [1250, 220],
    meeting:   [1140, 480],
    kitchen:   [240, 750],
    lounge:    [1200, 750],
  };

  // CORREDORES principais (todos pontos confirmados walkable):
  //   - Corredor VERTICAL principal (x=715, coluna da Leona): liga bullpen ao sul
  //   - Corredor horizontal central (y=440): server ↔ bullpen-sul ↔ meeting
  //   - Corredor horizontal sul (y=740): liga kitchen ↔ lounge
  //   - Corredor horizontal fileira 2 (y=305): liga bullpen ↔ jardim
  //   - Porta CTO→bullpen: y=240, x=950→1180
  const graph = {
    bullpen: {
      // sair pelo corredor vertical (x=715) → corredor sul/central → sala alvo
      kitchen: [H.bullpen, [CV, CH], [CV, 620], [CV, 740], [400, 750], H.kitchen],
      // bullpen → lounge: TUDO via CV. Desce pelo CV até y=740 (mesma linha
      // do corredor sul da kitchen) e só DEPOIS vira pra direita até a lounge.
      // Antes virava em y=620 — entrava muito cedo, atravessando parede.
      lounge:  [H.bullpen, [CV, CH], [CV, 620], [CV, 740], [1200, 740], H.lounge],
      // server: descer pelo corredor vertical, virar pra esquerda no corredor central
      runtime: [H.bullpen, [CV, CH], [500, CH], [350, CH], H.runtime],
      // meeting: descer pelo corredor vertical, virar pra direita no corredor central
      meeting: [H.bullpen, [CV, CH], [900, CH], H.meeting],
      // CTO: subir pelo canto sup-dir (porta entre bullpen sup e CTO sul)
      // bullpen → CTO: simétrico ao caminho de saída.
      // Pega o corredor vertical CV em y=240, vai pra direita até x=1250, sobe pro CTO.
      executive: [H.bullpen, [CV, 240], [1250, 240], H.executive],
      // jardim: corredor na MESMA altura da fileira 2 (y=305) — andar reto pra esquerda
      garden:  [H.bullpen, [CV, 305], H.garden],
    },
    runtime: {
      // server → bullpen: corredor central → corredor vertical → hub do bullpen
      bullpen: [H.runtime, [350, CH], [500, CH], [CV, CH], H.bullpen],
      // server → kitchen: corredor central → corredor vertical → corredor sul
      kitchen: [H.runtime, [350, CH], [CV, CH], [CV, 740], [400, 750], H.kitchen],
      // server → garden: sai pelo corredor central CH, sobe pelo CV até y=305
      // (linha da Leona), vira pra esquerda até o garden. Antes subia pela
      // coluna x=240 — atravessava a parede norte do server.
      garden:  [H.runtime, [350, CH], [CV, CH], [CV, 305], H.garden],
      // server → meeting: corredor central + corredor vertical pra direita
      meeting: [H.runtime, [350, CH], [CV, CH], [900, CH], H.meeting],
      // server → lounge: corredor central → vertical → sul
      // server → lounge: desce no CV até y=740 (mesma linha da kitchen) e
      // vira pra direita até a lounge.
      lounge:  [H.runtime, [350, CH], [CV, CH], [CV, 620], [CV, 740], [1200, 740], H.lounge],
    },
    garden: {
      // Volta pelo mesmo corredor horizontal y=305 — espelha o caminho de ida
      bullpen: [H.garden, [CV, 305], H.bullpen],
      // garden → server: simétrico. Lateral pra direita até CV, desce pelo CV até
      // o corredor central, vira pra esquerda até o server.
      runtime: [H.garden, [CV, 305], [CV, CH], [350, CH], H.runtime],
      // garden → kitchen: descer ao server, corredor central, corredor vertical
      // garden → kitchen: pela linha y=305 (Leona) até o CV, daí desce pelo CV
      // até o corredor sul. Não entra no server pela coluna x=240.
      kitchen: [H.garden, [CV, 305], [CV, CH], [CV, 620], [CV, 740], [400, 750], H.kitchen],
    },
    executive: {
      // Saída do CTO usando o MESMO corredor vertical CV=715 que todas as
      // outras agentes. Sequência:
      //   1) Desce na coluna da Astride (x=1250) até y=240 (corredor entre fileiras)
      //   2) Vira pra ESQUERDA até a coluna CV=715
      //   3) Pelo corredor vertical CV: vai pra norte (bullpen) ou desce ao sul
      //   4) Vira lateral no corredor da sala alvo
      bullpen: [H.executive, [1250, 240], [CV, 240], H.bullpen],
      meeting: [H.executive, [1250, 240], [CV, 240], [CV, CH], [900, CH], H.meeting],
      runtime: [H.executive, [1250, 240], [CV, 240], [CV, CH], [350, CH], H.runtime],
      kitchen: [H.executive, [1250, 240], [CV, 240], [CV, CH], [CV, 620], [CV, 740], [400, 750], H.kitchen],
      // CTO → lounge: desce na coluna 1250 até 240, atravessa pelo CV até y=740
      // (mesma linha da kitchen), vira pra direita até a lounge.
      lounge:  [H.executive, [1250, 240], [CV, 240], [CV, CH], [CV, 620], [CV, 740], [1200, 740], H.lounge],
      garden:  [H.executive, [1250, 240], [CV, 240], [CV, 305], H.garden],
    },
    meeting: {
      // subir pelo corredor central (y=CH) → corredor vertical → hub do bullpen
      bullpen:   [H.meeting, [900, CH], [CV, CH], H.bullpen],
      // meeting → CTO: sobe pelo corredor central CH, vira na coluna CV, sobe
      // por CV até y=240, vira pra direita até x=1250, sobe pro CTO.
      executive: [H.meeting, [900, CH], [CV, CH], [CV, 240], [1250, 240], H.executive],
      // meeting → lounge: pelo CH/CV até y=740 (mesma linha da kitchen) → vira lateral
      lounge:    [H.meeting, [900, CH], [CV, CH], [CV, 620], [CV, 740], [1200, 740], H.lounge],
      runtime:   [H.meeting, [900, CH], [CV, CH], [350, CH], H.runtime],
      kitchen:   [H.meeting, [900, CH], [CV, CH], [CV, 740], [400, 750], H.kitchen],
    },
    kitchen: {
      // kitchen → bullpen: subir pelo corredor vertical x=715
      bullpen: [H.kitchen, [400, 750], [CV, 740], [CV, 620], [CV, CH], H.bullpen],
      // kitchen → server: subir pelo corredor vertical → corredor central → esquerda
      runtime: [H.kitchen, [400, 750], [CV, 740], [CV, CH], [350, CH], H.runtime],
      // kitchen → lounge: corredor sul/CV em y=740 e vira pra direita até a lounge.
      lounge:  [H.kitchen, [400, 750], [CV, 740], [1200, 740], H.lounge],
      // kitchen → garden: TUDO pelo CV. Sobe pelo CV até y=305 (linha da Leona),
      // vira pra esquerda no corredor horizontal até o garden. Antes subia pela
      // coluna x=240 entrando no server por dentro — atravessava parede.
      garden:  [H.kitchen, [400, 750], [CV, 740], [CV, 620], [CV, CH], [CV, 305], H.garden],
      meeting: [H.kitchen, [400, 750], [CV, 740], [CV, CH], [900, CH], H.meeting],
    },
    lounge: {
      // Lounge entra/sai pelo corredor sul em y=740 (MESMA linha da kitchen).
      // (1200, 750) → (1200, 740) [vertical curto coluna 1200, 10px] →
      // (CV=715, 740) [lateral pelo corredor sul até o corredor vertical] →
      // daí TUDO sobe pelo CV.
      bullpen: [H.lounge, [1200, 740], [CV, 740], [CV, 620], [CV, CH], H.bullpen],
      meeting: [H.lounge, [1200, 740], [CV, 740], [CV, 620], [CV, CH], [900, CH], H.meeting],
      kitchen: [H.lounge, [1200, 740], [CV, 740], [400, 750], H.kitchen],
      executive: [H.lounge, [1200, 740], [CV, 740], [CV, 620], [CV, CH], [CV, 240], [1250, 240], H.executive],
    },
  };

  const queue = [[fromRoom, []]];
  const visited = new Set([fromRoom]);
  let roomPath = null;
  
  while (queue.length > 0) {
    const [currentRoom, currentPath] = queue.shift();
    if (currentRoom === toRoom) {
      roomPath = currentPath;
      break;
    }
    const neighbors = Object.keys(graph[currentRoom] ?? {});
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([neighbor, [...currentPath, [currentRoom, neighbor]]]);
      }
    }
  }

  if (!roomPath) {
    return [[toX, toY]];
  }

  const path = [];
  roomPath.forEach(([rA, rB]) => {
    const transitionPoints = graph[rA]?.[rB];
    if (transitionPoints) {
      path.push(...transitionPoints);
    }
  });
  path.push([toX, toY]);

  // ────────────────────────────────────────────────────────────
  // Compensação por fileira no bullpen.
  // O hub do bullpen está em y=240 (entre fileira 1 e 2). Sem compensar:
  //   - Saindo da fileira 2 (y=305) o agente SOBE até 240 antes de descer
  //     pra 440 — atravessa fileira 1 e mesas no zigzag.
  //   - Chegando à fileira 2 também faz o caminho mais longo.
  // Fix: troca o hub norte (720,240) por um hub sul (720,360) quando origem
  // OU destino estão na fileira 2.
  const BULLPEN_HUB_NORTH = [H.bullpen[0], H.bullpen[1]]; // (715, 240) — entre fileiras
  const BULLPEN_HUB_SOUTH = [H.bullpen[0], 360];          // (715, 360) — entre fileira 2 e corredor
  const ROW2_THRESHOLD = 250;

  const isBullpenHubNorth = (p) =>
    Array.isArray(p) && p[0] === BULLPEN_HUB_NORTH[0] && p[1] === BULLPEN_HUB_NORTH[1];

  if (fromRoom === "bullpen" && fromY >= ROW2_THRESHOLD) {
    // O primeiro ponto do path deve ser o hub do bullpen — troca pelo sul.
    if (path.length > 0 && isBullpenHubNorth(path[0])) {
      path[0] = [...BULLPEN_HUB_SOUTH];
    }
  }
  if (toRoom === "bullpen" && toY >= ROW2_THRESHOLD) {
    // O penúltimo ponto (último antes do destino [toX,toY]) deve ser o hub.
    const lastHubIdx = path.length - 2;
    if (lastHubIdx >= 0 && isBullpenHubNorth(path[lastHubIdx])) {
      path[lastHubIdx] = [...BULLPEN_HUB_SOUTH];
    }
  }

  return path;
}

function drawModernRoamingAgent(scene, agent, points, index, selectedAgentId, onSelect, layoutVariant = "ops") {
  const start = points[index % points.length] ?? officePoint(252, 84);
  const selected = selectedAgentId === agent.id;
  const badge = getAgentBadge(agent);
  const profile = getRpgAgentProfile(agent, index);
  const c = scene.add.container(start[0], start[1]).setDepth(start[1] + 180);
  const selectAgent = (_pointer, _localX, _localY, event) => {
    event?.stopPropagation?.();
    event?.preventDefault?.();
    onSelect?.(agent.id);
  };
  const hit = scene.add.zone(0, 8, 118, 120).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
  // Sombra discreta no chão (sem bolha/glow ao redor do agente)
  const shadow = scene.add.ellipse(0, 36, 32, 8, 0x000000, selected ? 0.4 : 0.28);
  const body = addRpgAgentSprite(scene, agent, 0, 35, 2.22, start[1] + 190, index, "walking");
  const bubble = scene.add.text(0, -34, shortThink(agentThink(agent), "circulando", 22), {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: "11px",
    color: "#050507",
    backgroundColor: index % 2 ? "#5bc5e8" : "#f08b3a",
    padding: { x: 7, y: 4 },
  }).setOrigin(0.5, 1).setAlpha(0.96);
  const name = scene.add.text(0, 42, agent.name, {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: "11px",
    color: "#ffffff",
    backgroundColor: "#050507",
    padding: { x: 7, y: 4 },
  }).setOrigin(0.5, 0);
  // Badge "IDLE" pra roamers (estão andando = não trabalhando agora)
  const isWorking = agent.workingByData;
  const statusBadge = scene.add.text(0, 62, isWorking ? "● working" : "○ idle", {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: "9px",
    color: isWorking ? "#6dd2a0" : "#f4c863",
    backgroundColor: "#060609",
    padding: { x: 6, y: 2 },
  }).setOrigin(0.5, 0);
  // pra manter referências usadas mais abaixo no código (sem alterações de behavior)
  const signal = shadow;
  c.add([hit, shadow, body, bubble, name, statusBadge]);
  c.setSize(118, 120);
  c.setInteractive({ useHandCursor: true });
  body.setInteractive({ useHandCursor: true });
  bubble.setInteractive({ useHandCursor: true });
  name.setInteractive({ useHandCursor: true });
  [hit, body, bubble, name, c].forEach((target) => {
    target.on("pointerdown", selectAgent);
    target.on("pointerover", () => signal.setStrokeStyle(3, profile.accent ?? badge.color, 0.98));
    target.on("pointerout", () => signal.setStrokeStyle(selected ? 3 : 2, profile.accent ?? badge.color, selected ? 0.96 : 0.72));
  });
  scene.tweens.add({
    targets: [signal, statusDot],
    alpha: 0.58,
    duration: 980 + index * 60,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });

  let previousTarget = start;
  const walkNext = () => {
    if (c.getData("isInteracting")) return;
    
    const choices = points.filter((point) => Math.abs(point[0] - previousTarget[0]) + Math.abs(point[1] - previousTarget[1]) > 120);
    const target = choices[Math.floor(Math.random() * choices.length)] ?? points[index % points.length] ?? previousTarget;
    
    const route = calculateRoute(c.x, c.y, target[0], target[1], layoutVariant);
    
    const tweenPath = (pathIndex) => {
      if (c.getData("isInteracting")) return;
      
      if (pathIndex >= route.length) {
        previousTarget = target;
        // Ao chegar, parar de "andar" — fica em frame down (parado de frente)
        setSpriteWalkFrames(body, "down");
        const roomName = getRoomName(c.x, c.y, layoutVariant);
        let interactionText = "circulando";
        if (roomName === "kitchen") {
          interactionText = ["Passando café...", "Pegando donut...", "Almoçando...", "Bebendo água..."][Math.floor(Math.random() * 4)];
        } else if (roomName === "lounge") {
          interactionText = ["Jogando arcade...", "Relaxando no sofá...", "Assistindo TV...", "Conversando..."][Math.floor(Math.random() * 4)];
        } else if (roomName === "warroom") {
          interactionText = ["Sprint planning...", "Olhando Kanban...", "Sprint review...", "Movendo card..."][Math.floor(Math.random() * 4)];
        } else if (roomName === "runtime") {
          interactionText = ["Lendo server logs...", "Otimizando DB...", "Reiniciando rack...", "Configurando proxy..."][Math.floor(Math.random() * 4)];
        } else if (roomName === "executive") {
          interactionText = ["Apresentando report...", "Alinhando sprint...", "Conversando com CEO..."][Math.floor(Math.random() * 3)];
        } else {
          interactionText = ["Olhando código...", "Dando pitaco...", "Ajudando colega...", "Discutindo PR..."][Math.floor(Math.random() * 4)];
        }
        bubble.setText(interactionText);
        
        const timer = scene.time.delayedCall(4500 + Math.random() * 5500, walkNext);
        c.setData("walkTimer", timer);
        return;
      }
      
      const nextPt = route[pathIndex];
      const dx = nextPt[0] - c.x;
      const dy = nextPt[1] - c.y;

      // Trocar frames da animação pra direção certa (walking)
      const direction = directionFromDelta(dx, dy);
      setSpriteWalkFrames(body, direction);
      body.setFlipX(false);

      // Velocidade ~70px/s — parece um andar humano em vez de "voar"
      const dist = Math.sqrt(dx * dx + dy * dy);
      const tween = scene.tweens.add({
        targets: c,
        x: nextPt[0],
        y: nextPt[1],
        duration: Math.max(700, dist * 14),
        ease: "Linear",
        onUpdate: () => c.setDepth(c.y + 180),
        onComplete: () => {
          tweenPath(pathIndex + 1);
        }
      });
      c.setData("activeTween", tween);
    };
    
    tweenPath(0);
  };
  
  c.setData("isInteracting", false);
  c.setData("sprite", body);
  c.setData("bubbleText", bubble);
  c.setData("bubbleBg", index % 2 ? "#5bc5e8" : "#f08b3a");
  c.setData("walkNextFn", walkNext);
  c.setData("agentName", String(agent.name ?? agent.id ?? "").toLowerCase());
  c.setData("agentId", agent.id);

  const initTimer = scene.time.delayedCall(2200 + Math.floor(Math.random() * 4800), walkNext);
  c.setData("walkTimer", initTimer);
  return c;
}

function drawAgentClickZone(scene, agentId, x, y, selectedAgentId, onSelect) {
  const selected = selectedAgentId === agentId;
  const zone = scene.add.zone(x, y + 6, 136, 138)
    .setOrigin(0.5, 0.5)
    .setDepth(9999)
    .setInteractive({ useHandCursor: true });
  const focus = scene.add.graphics().setDepth(9998);
  if (selected) {
    focus.lineStyle(2, OKAMI_PALETTE.cyan, 0.74);
    focus.strokeRoundedRect(x - 64, y - 56, 128, 118, 7);
  }
  const selectAgent = (_pointer, _localX, _localY, event) => {
    event?.stopPropagation?.();
    event?.preventDefault?.();
    onSelect?.(agentId);
  };
  zone.on("pointerdown", selectAgent);
  zone.on("pointerover", () => {
    focus.clear();
    focus.lineStyle(2, OKAMI_PALETTE.magenta, 0.82);
    focus.strokeRoundedRect(x - 64, y - 56, 128, 118, 7);
  });
  zone.on("pointerout", () => {
    focus.clear();
    if (selected) {
      focus.lineStyle(2, OKAMI_PALETTE.cyan, 0.74);
      focus.strokeRoundedRect(x - 64, y - 56, 128, 118, 7);
    }
  });
}

function drawOffice(scene, agents, tasks, selectedAgentId, onSelect, options = {}) {
  const layout = getOfficeLayoutConfig(options.layoutVariant);
  scene.officeLayoutVariant = options.layoutVariant ?? "ops";
  scene.kanbanTasks = tasks ?? [];
  drawModernOfficeShell(scene, options.layoutVariant);
  drawMiniKanban(scene, tasks);
  const people = buildOfficePeople(agents, tasks);
  // No modo vídeo: y_agente = y direto (sem +30). No modo desenhado: y + 30.
  // positions: [x, y_agente, sitMode]
  const positions = layout.desks.map(([x, y, _accent, _id, sitMode]) => {
    const yAgent = scene.officeUsesVideo ? y : y + 30;
    return [x, yAgent, sitMode || null];
  });
  const seatedCount = Math.min(people.seated.length, positions.length);

  // Quando o background é vídeo, mesas e PCs JÁ ESTÃO desenhados no próprio
  // vídeo. Não desenhar nada aqui — só sobrepor os agentes nas posições.
  if (!scene.officeUsesVideo) {
    layout.desks.forEach(([deskX, deskY], i) => {
      const facingDown = deskY < 300;
      const occupied = i < seatedCount;
      const pcVariant = (i % 3) + 1;
      drawCubiclePC(scene, deskX, deskY, pcVariant, facingDown, occupied);
    });
  }

  const seatedTargets = [];
  people.seated.slice(0, positions.length).forEach((worker, index) => {
    const [x, y, sitMode] = positions[index];
    drawModernSeatedAgent(scene, worker, x, y, index, selectedAgentId, onSelect, false, sitMode);
    const agentId = worker.parentId ?? worker.id;
    seatedTargets.push({ agentId, x, y: y + 6 });
    drawAgentClickZone(scene, agentId, x, y, selectedAgentId, onSelect);
  });
  scene.input.on("pointerdown", (pointer) => {
    const hit = seatedTargets.find((target) => (
      Math.abs(pointer.worldX - target.x) <= 76
      && Math.abs(pointer.worldY - target.y) <= 76
    ));
    if (hit) onSelect?.(hit.agentId);
  });
  positions.slice(people.seated.length, positions.length).forEach(([x, y], index) => {
    drawModernEmptySeat(scene, x, y, index + people.seated.length);
  });

  scene.roamingAgentsList = [];
  people.roaming.slice(0, layout.roamPoints.length).forEach((agent, index) => {
    const roamer = drawModernRoamingAgent(scene, agent, layout.roamPoints, index, selectedAgentId, onSelect, options.layoutVariant);
    scene.roamingAgentsList.push(roamer);
  });
  if (options.mode === "debug") drawPixelDebugOverlay(scene, people, layout, selectedAgentId);
}

export function PixelOfficeCanvas({ agents, tasks, selectedAgentId, onSelectAgent, mode = "live", layoutVariant = "ops" }) {
  const hostRef = useRef(null);
  const stateRef = useRef({ agents, tasks, selectedAgentId, onSelectAgent, mode, layoutVariant });

  useEffect(() => {
    stateRef.current = { agents, tasks, selectedAgentId, onSelectAgent, mode, layoutVariant };
  }, [agents, tasks, selectedAgentId, onSelectAgent, mode, layoutVariant]);

  useEffect(() => {
    let game;
    let disposed = false;

    async function boot() {
      const Phaser = await import("phaser");
      if (disposed || !hostRef.current) return;

      class OfficeScene extends Phaser.Scene {
        constructor() {
          super("office");
        }

        create() {
          try {
            const current = stateRef.current;
            drawOffice(
              this,
              current.agents,
              current.tasks,
              current.selectedAgentId,
              (agentId) => stateRef.current.onSelectAgent?.(agentId),
              { mode: current.mode, layoutVariant: current.layoutVariant },
            );
            
            // Interaction heartbeat — checa colisões/grupos a cada 1.8s
            this.time.addEvent({
              delay: 1800,
              loop: true,
              callback: () => checkAgentInteractions(this),
            });
          } catch (error) {
            console.error("Pixel Office failed to render", error);
          }
        }

        preload() {
          loadPixelAgentAssets(this);
        }
      }

      game = new Phaser.Game({
        type: Phaser.CANVAS,
        parent: hostRef.current,
        width: 1540,
        height: 920,
        transparent: true,
        pixelArt: true,
        roundPixels: true,
        scene: OfficeScene,
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        render: {
          preserveDrawingBuffer: true,
          clearBeforeRender: true,
          transparent: true,
        },
      });
      // Garantir que canvas Phaser fique acima do <video>
      setTimeout(() => {
        const canvasEl = hostRef.current?.querySelector("canvas");
        if (canvasEl) {
          canvasEl.style.position = "relative";
          canvasEl.style.zIndex = "1";
        }
        // Forçar re-medição depois que CSS/flex layout assentaram.
        // Sem isso, em alguns refreshes o Phaser monta com 0x0 e nada aparece
        // até o usuário trocar de aba (visibilitychange dispara refresh).
        game?.scale?.refresh();
      }, 100);
      // Refresh extras escalonados — pega casos onde fonts/imgs atrasam o layout.
      [300, 800, 1600].forEach((delay) => {
        setTimeout(() => game?.scale?.refresh(), delay);
      });
    }

    boot();

    // ResizeObserver: se o container muda de tamanho (flex/grid/resize de janela),
    // pede ao Phaser pra re-medir imediatamente — sem precisar trocar de aba.
    let resizeObserver = null;
    if (hostRef.current && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        game?.scale?.refresh();
      });
      resizeObserver.observe(hostRef.current);
    }

    // Fallback explícito: quando a aba volta a ficar visível, garante refresh.
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        game?.scale?.refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      resizeObserver?.disconnect();
      game?.destroy(true);
    };
  }, []);

  return (
    <div className="pixel-canvas-host" ref={hostRef} style={{ position: "relative" }}>
      <video
        src="/office.mp4"
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "fill",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

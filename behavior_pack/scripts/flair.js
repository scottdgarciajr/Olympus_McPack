// Cosmetic shapes only. Coordinates are relative to the player's eye-level plane.
export const FLAIR = {
  hermes: { color: [0.96, 0.80, 0.30], sound: 'random.orb' },
  zeus: { color: [1.00, 0.95, 0.52], sound: 'ambient.weather.thunder' },
  poseidon: { color: [0.20, 0.72, 0.95], sound: 'bucket.fill_water' },
  hades: { color: [0.48, 0.34, 0.75], sound: 'mob.endermen.portal' },
  ares: { color: [0.95, 0.25, 0.22], sound: 'random.anvil_use' },
  apollo: { color: [1.00, 0.74, 0.23], sound: 'random.levelup' },
  hephaestus: { color: [1.00, 0.45, 0.13], sound: 'random.anvil_use' },
  dionysus: { color: [0.72, 0.34, 0.91], sound: 'random.orb' },
  kratos: { color: [0.75, 0.12, 0.10], sound: 'random.anvil_use' },
  athena: { color: [0.71, 0.74, 0.81], sound: 'random.orb' },
  artemis: { color: [0.40, 0.73, 0.53], sound: 'random.orb' },
  hestia: { color: [0.91, 0.56, 0.40], sound: 'random.orb' }
};

function line(points, ax, ay, bx, by, steps = 5) {
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t, z: 0.35 });
  }
}
function ring(points, cx, cy, radius, count = 16) {
  for (let i = 0; i < count; i++) {
    const angle = i * Math.PI * 2 / count;
    points.push({ x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius, z: 0.35 });
  }
}

export function flairPoints(god) {
  const points = [];
  switch (god) {
    case 'hermes':
      for (const side of [-1, 1]) {
        line(points, side * 0.25, 0, side * 1.2, 0.65);
        line(points, side * 0.48, 0.16, side * 1.42, 0.36);
        line(points, side * 0.65, 0.26, side * 1.40, 0.05);
      }
      break;
    case 'zeus':
      line(points, -0.55, 0.85, 0.25, 0.85);
      line(points, 0.25, 0.85, -0.20, 0.10);
      line(points, -0.20, 0.10, 0.62, 0.10);
      line(points, 0.62, 0.10, -0.40, -0.85);
      break;
    case 'poseidon':
      line(points, 0, -0.95, 0, 0.65, 9);
      line(points, -0.65, 0.72, 0.65, 0.72, 8);
      for (const x of [-0.65, 0, 0.65]) line(points, x, 0.72, x, 1.07, 3);
      break;
    case 'hades':
      for (let i = 0; i < 24; i++) {
        const t = i / 23;
        const angle = t * Math.PI * 3;
        for (const side of [-1, 1]) points.push({ x: side * (0.54 + 0.24 * Math.sin(angle)), y: -0.9 + t * 1.9, z: 0.35 + side * 0.22 * Math.cos(angle) });
      }
      break;
    case 'ares':
      line(points, -0.8, -0.8, 0.8, 0.8, 12);
      line(points, 0.8, -0.8, -0.8, 0.8, 12);
      line(points, -0.95, 0.78, -0.62, 0.98, 3);
      line(points, 0.95, 0.78, 0.62, 0.98, 3);
      break;
    case 'apollo':
      ring(points, 0, 0, 0.48, 20);
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        line(points, Math.cos(a) * 0.67, Math.sin(a) * 0.67, Math.cos(a) * 1.05, Math.sin(a) * 1.05, 2);
      }
      break;
    case 'hephaestus':
      line(points, -0.85, 0.45, 0.85, 0.45, 10);
      line(points, -0.65, 0.28, 0.65, 0.28, 8);
      line(points, -0.42, 0.24, -0.42, -0.58, 5);
      line(points, 0.42, 0.24, 0.42, -0.58, 5);
      line(points, -0.7, -0.62, 0.7, -0.62, 8);
      break;
    case 'dionysus':
      line(points, -0.7, 0.48, 0.7, 0.48, 8);
      line(points, -0.7, 0.48, -0.22, -0.42, 7);
      line(points, 0.7, 0.48, 0.22, -0.42, 7);
      line(points, -0.22, -0.42, 0.22, -0.42, 4);
      line(points, 0, -0.42, 0, -0.78, 3);
      line(points, -0.42, -0.82, 0.42, -0.82, 5);
      break;
    case 'athena':
      line(points,-0.7,0.8,0.7,0.8,8);
      line(points,-0.7,0.8,-0.55,-0.35,8);
      line(points,0.7,0.8,0.55,-0.35,8);
      line(points,-0.55,-0.35,0,-0.95,6);
      line(points,0.55,-0.35,0,-0.95,6);
      break;
    case 'artemis':
      ring(points,0,0,0.72,24);
      line(points,-0.9,0,0.9,0,12);
      line(points,0.9,0,0.5,0.3,4);
      break;
    case 'hestia':
      line(points,0,1,-0.7,-0.7,10);
      line(points,-0.7,-0.7,0.7,-0.7,10);
      line(points,0.7,-0.7,0,1,10);
      ring(points,0,-0.25,0.2,12);
      break;
    case 'kratos':
      line(points,-0.85,-0.85,0.85,0.85,12);
      line(points,0.85,-0.85,-0.85,0.85,12);
      ring(points,0,0,0.22,12);
      break;
  }
  return points;
}

function wrapPosition(pos, w, h) {
  if (pos.x < 0) pos.x += w;
  if (pos.x > w) pos.x -= w;
  if (pos.y < 0) pos.y += h;
  if (pos.y > h) pos.y -= h;
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function vecFromAngle(angle, speed) {
  return {
    x: Math.cos(angle) * speed,
    y: Math.sin(angle) * speed,
  };
}

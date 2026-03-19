function circleCollides(a, b) {
  var dx = a.x - b.x;
  var dy = a.y - b.y;
  var dist = Math.sqrt(dx * dx + dy * dy);
  return dist < a.radius + b.radius;
}

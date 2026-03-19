function Particle(x, y) {
  this.x = x;
  this.y = y;
  var angle = randomRange(0, Math.PI * 2);
  var speed = randomRange(60, 180);
  this.vx = Math.cos(angle) * speed;
  this.vy = Math.sin(angle) * speed;
  this.lifetime = randomRange(0.4, 0.8);
}

Particle.prototype.update = function(dt, w, h) {
  this.x += this.vx * dt;
  this.y += this.vy * dt;
  this.lifetime -= dt;
  wrapPosition(this, w, h);
};

Particle.prototype.isExpired = function() {
  return this.lifetime <= 0;
};

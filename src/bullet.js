var BULLET_SPEED = 500;
var BULLET_LIFETIME = 1.2; // seconds

function Bullet(x, y, angle) {
  this.x = x;
  this.y = y;
  this.radius = 3;
  var v = vecFromAngle(angle, BULLET_SPEED);
  this.vx = v.x;
  this.vy = v.y;
  this.lifetime = BULLET_LIFETIME;
}

Bullet.prototype.update = function(dt) {
  this.x += this.vx * dt;
  this.y += this.vy * dt;
  this.lifetime -= dt;
};

Bullet.prototype.isExpired = function() {
  return this.lifetime <= 0;
};

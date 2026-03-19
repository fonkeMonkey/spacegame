var SHIP_ROTATE_SPEED = 3;    // radians/sec
var SHIP_THRUST       = 250;  // px/sec^2
var SHIP_FRICTION     = 0.97;
var SHIP_FIRE_COOLDOWN = 0.25; // seconds

function Ship(x, y) {
  this.x = x;
  this.y = y;
  this.angle = -Math.PI / 2; // pointing up
  this.vx = 0;
  this.vy = 0;
  this.radius = 14;
  this.fireCooldown = 0;
  this.thrusting = false;
}

Ship.prototype.update = function(dt, input, canvasW, canvasH) {
  if (input.isDown('ArrowLeft')  || input.isDown('KeyA')) this.angle -= SHIP_ROTATE_SPEED * dt;
  if (input.isDown('ArrowRight') || input.isDown('KeyD')) this.angle += SHIP_ROTATE_SPEED * dt;

  this.thrusting = input.isDown('ArrowUp') || input.isDown('KeyW');
  if (this.thrusting) {
    this.vx += Math.cos(this.angle) * SHIP_THRUST * dt;
    this.vy += Math.sin(this.angle) * SHIP_THRUST * dt;
  }

  this.vx *= SHIP_FRICTION;
  this.vy *= SHIP_FRICTION;

  this.x += this.vx * dt;
  this.y += this.vy * dt;
  wrapPosition(this, canvasW, canvasH);

  if (this.fireCooldown > 0) this.fireCooldown -= dt;
};

Ship.prototype.fire = function() {
  if (this.fireCooldown > 0) return null;
  this.fireCooldown = SHIP_FIRE_COOLDOWN;
  var tip = {
    x: this.x + Math.cos(this.angle) * this.radius,
    y: this.y + Math.sin(this.angle) * this.radius,
  };
  return new Bullet(tip.x, tip.y, this.angle);
};

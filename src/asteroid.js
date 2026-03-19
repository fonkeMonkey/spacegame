var ASTEROID_SIZES = {
  large:  { radius: 40, speed: 60,  score: 20,  next: 'medium' },
  medium: { radius: 20, speed: 100, score: 50,  next: 'small'  },
  small:  { radius: 10, speed: 150, score: 100, next: null      },
};

function Asteroid(x, y, size) {
  var cfg = ASTEROID_SIZES[size];
  this.x = x;
  this.y = y;
  this.size = size;
  this.radius = cfg.radius;
  this.score = cfg.score;

  var angle = randomRange(0, Math.PI * 2);
  var v = vecFromAngle(angle, randomRange(cfg.speed * 0.5, cfg.speed));
  this.vx = v.x;
  this.vy = v.y;

  // Pre-generate irregular polygon vertices
  this.vertices = [];
  var count = 10;
  for (var i = 0; i < count; i++) {
    var a = (i / count) * Math.PI * 2;
    var r = cfg.radius * randomRange(0.75, 1.25);
    this.vertices.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
}

Asteroid.prototype.update = function(dt, canvasW, canvasH) {
  this.x += this.vx * dt;
  this.y += this.vy * dt;
  wrapPosition(this, canvasW, canvasH);
};

Asteroid.prototype.split = function() {
  var next = ASTEROID_SIZES[this.size].next;
  if (!next) return [];
  return [
    new Asteroid(this.x, this.y, next),
    new Asteroid(this.x, this.y, next),
  ];
};

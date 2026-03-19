function drawShip(ctx, ship) {
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);

  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-10, -10);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-10, 10);
  ctx.closePath();
  ctx.stroke();

  if (ship.thrusting) {
    ctx.strokeStyle = '#f80';
    ctx.beginPath();
    ctx.moveTo(-6, -4);
    ctx.lineTo(-18, 0);
    ctx.lineTo(-6, 4);
    ctx.stroke();
  }

  ctx.restore();
}

function drawAsteroid(ctx, asteroid) {
  ctx.save();
  ctx.translate(asteroid.x, asteroid.y);
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 2;
  ctx.beginPath();
  var v = asteroid.vertices;
  ctx.moveTo(v[0].x, v[0].y);
  for (var i = 1; i < v.length; i++) ctx.lineTo(v[i].x, v[i].y);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawBullet(ctx, bullet) {
  ctx.beginPath();
  ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#ff0';
  ctx.fill();
}

function drawHUD(ctx, state) {
  ctx.fillStyle = '#fff';
  ctx.font = '16px monospace';
  ctx.fillText('SCORE: ' + state.score, 10, 24);
  ctx.fillText('WAVE: '  + state.wave,  10, 44);
  ctx.fillText('LIVES: ' + state.lives, 10, 64);
}

function drawScreen(ctx, w, h, title, subtitle) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 48px monospace';
  ctx.fillText(title, w / 2, h / 2 - 20);
  ctx.font = '20px monospace';
  ctx.fillText(subtitle, w / 2, h / 2 + 30);
  ctx.textAlign = 'left';
}

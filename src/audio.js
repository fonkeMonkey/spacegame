var audioCtx = null;
var thrustNode = null;
var thrustGain = null;

function ensureAudio() {
  if (!window.audioEnabled) return null;
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function startThrust() {
  var ctx = ensureAudio();
  if (!ctx || thrustNode) return;
  thrustGain = ctx.createGain();
  thrustGain.gain.value = 0.3;
  thrustNode = ctx.createOscillator();
  thrustNode.type = 'sawtooth';
  thrustNode.frequency.value = 80;
  thrustNode.connect(thrustGain);
  thrustGain.connect(ctx.destination);
  thrustNode.start();
}

function stopThrust() {
  if (!thrustNode) return;
  thrustNode.stop();
  thrustNode.disconnect();
  thrustGain.disconnect();
  thrustNode = null;
  thrustGain = null;
}

function playShoot() {
  var ctx = ensureAudio();
  if (!ctx) return;
  var osc = ctx.createOscillator();
  var gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(1, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.08);
  osc.onended = function() { osc.disconnect(); gain.disconnect(); };
}

function playExplosion() {
  var ctx = ensureAudio();
  if (!ctx) return;
  var bufferSize = Math.floor(ctx.sampleRate * 0.3);
  var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  var data = buffer.getChannelData(0);
  for (var i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  var source = ctx.createBufferSource();
  source.buffer = buffer;
  var filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  var gain = ctx.createGain();
  gain.gain.setValueAtTime(1, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
  source.onended = function() { source.disconnect(); filter.disconnect(); gain.disconnect(); };
}

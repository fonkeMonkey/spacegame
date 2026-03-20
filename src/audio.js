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
  thrustGain.gain.value = 0.12;
  thrustNode = ctx.createOscillator();
  thrustNode.type = 'triangle';
  thrustNode.frequency.value = 110;
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
  osc.frequency.setValueAtTime(520, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.12);
  gain.gain.setValueAtTime(0.35, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.12);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.12);
  osc.onended = function() { osc.disconnect(); gain.disconnect(); };
}

function playExplosion() {
  var ctx = ensureAudio();
  if (!ctx) return;
  // Low sine thud
  var osc = ctx.createOscillator();
  var oscGain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.25);
  oscGain.gain.setValueAtTime(0.6, ctx.currentTime);
  oscGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.25);
  osc.onended = function() { osc.disconnect(); oscGain.disconnect(); };
  // Soft noise crackle
  var bufferSize = Math.floor(ctx.sampleRate * 0.2);
  var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  var data = buffer.getChannelData(0);
  for (var i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  var source = ctx.createBufferSource();
  source.buffer = buffer;
  var filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 300;
  filter.Q.value = 0.8;
  var noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.3, ctx.currentTime);
  noiseGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
  source.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  source.start();
  source.onended = function() { source.disconnect(); filter.disconnect(); noiseGain.disconnect(); };
}

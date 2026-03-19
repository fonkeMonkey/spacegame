function Input() {
  this._keys = {};
  window.addEventListener('keydown', (e) => { this._keys[e.code] = true; });
  window.addEventListener('keyup',   (e) => { this._keys[e.code] = false; });
}

Input.prototype.isDown = function(code) {
  return !!this._keys[code];
};

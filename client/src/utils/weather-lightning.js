var LightningCtrl = {};

LightningCtrl.create = function(opts) {
  opts = opts || {};
  return {
    active: false,
    minInterval: opts.minInterval || 3000,
    maxInterval: opts.maxInterval || 8000,
    doubleStrike: opts.doubleStrike !== undefined ? opts.doubleStrike : 0.3,
    onFlash: opts.onFlash || function() {},
    onBolt: opts.onBolt || function() {},
    timer: null
  };
};

LightningCtrl.start = function(ctrl) {
  ctrl.active = true;
  LightningCtrl.schedule(ctrl);
};

LightningCtrl.schedule = function(ctrl) {
  if (!ctrl.active) return;
  var delay = ctrl.minInterval + Math.random() * (ctrl.maxInterval - ctrl.minInterval);
  ctrl.timer = setTimeout(function() {
    if (!ctrl.active) return;
    LightningCtrl.strike(ctrl);
    LightningCtrl.schedule(ctrl);
  }, delay);
};

LightningCtrl.strike = function(ctrl) {
  var bolt = LightningCtrl.generateBolt();
  ctrl.onBolt(bolt);
  ctrl.onFlash();
  if (Math.random() < ctrl.doubleStrike) {
    setTimeout(function() {
      if (!ctrl.active) return;
      var bolt2 = LightningCtrl.generateBolt();
      ctrl.onBolt(bolt2);
      ctrl.onFlash();
    }, 80 + Math.random() * 200);
  }
};

LightningCtrl.generateBolt = function() {
  var startX = 15 + Math.random() * 70;
  var points = [];
  var x = startX;
  var y = 0;
  var steps = 7 + Math.floor(Math.random() * 5);
  var stepY = 75 / steps;
  points.push({ x: x, y: y });
  for (var i = 0; i < steps; i++) {
    x += (Math.random() - 0.5) * 18;
    y += stepY * (0.8 + Math.random() * 0.4);
    points.push({ x: x, y: y });
  }
  var branches = [];
  for (var j = 2; j < points.length - 1; j++) {
    if (Math.random() < 0.3) {
      var branch = [];
      var bx = points[j].x;
      var by = points[j].y;
      var bSteps = 2 + Math.floor(Math.random() * 3);
      var dir = Math.random() < 0.5 ? -1 : 1;
      for (var k = 0; k < bSteps; k++) {
        bx += dir * (3 + Math.random() * 8);
        by += stepY * 0.5 * (0.6 + Math.random() * 0.4);
        branch.push({ x: bx, y: by });
      }
      branches.push({ from: { x: points[j].x, y: points[j].y }, points: branch });
    }
  }
  return { main: points, branches: branches };
};

LightningCtrl.boltToPaths = function(bolt) {
  var paths = [];
  var main = bolt.main;
  var d = 'M' + main[0].x.toFixed(1) + ',' + main[0].y.toFixed(1);
  for (var i = 1; i < main.length; i++) {
    var prev = main[i - 1];
    var curr = main[i];
    var cpx = ((prev.x + curr.x) / 2 + (Math.random() - 0.5) * 3).toFixed(1);
    var cpy = ((prev.y + curr.y) / 2).toFixed(1);
    d += ' Q' + cpx + ',' + cpy + ' ' + curr.x.toFixed(1) + ',' + curr.y.toFixed(1);
  }
  paths.push({ d: d, width: 2.0, opacity: 0.95 });
  paths.push({ d: d, width: 4.0, opacity: 0.3 });
  paths.push({ d: d, width: 8.0, opacity: 0.08 });
  for (var j = 0; j < bolt.branches.length; j++) {
    var br = bolt.branches[j];
    var bd = 'M' + br.from.x.toFixed(1) + ',' + br.from.y.toFixed(1);
    for (var k = 0; k < br.points.length; k++) {
      bd += ' L' + br.points[k].x.toFixed(1) + ',' + br.points[k].y.toFixed(1);
    }
    paths.push({ d: bd, width: 1.0, opacity: 0.6 });
    paths.push({ d: bd, width: 2.5, opacity: 0.15 });
  }
  return paths;
};

LightningCtrl.stop = function(ctrl) {
  ctrl.active = false;
  if (ctrl.timer) {
    clearTimeout(ctrl.timer);
    ctrl.timer = null;
  }
};

LightningCtrl.destroy = function(ctrl) {
  LightningCtrl.stop(ctrl);
};

export default LightningCtrl;

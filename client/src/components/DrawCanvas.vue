<template>
  <div class="draw-canvas" :class="'draw-canvas--' + mode" ref="root">
    <!-- ========== 全屏画板模式工具栏 ========== -->
    <div v-if="mode === 'full'" class="dc-toolbar">
      <div class="dc-tools-left">
        <!-- 工具按钮 -->
        <button
          v-for="tool in visibleTools"
          :key="tool.id"
          class="dc-tool-btn"
          :class="{ active: activeTool === tool.id }"
          @click="setTool(tool.id)"
          :title="tool.name"
        >
          <i class="fa-solid" :class="tool.icon"></i>
        </button>
        <div class="dc-toolbar-sep"></div>
        <!-- 笔刷类型 (画笔激活时) -->
        <template v-if="activeTool === 'brush'">
          <button
            v-for="bt in brushTypes"
            :key="bt.id"
            class="dc-tool-btn dc-brush-btn"
            :class="{ active: brushType === bt.id }"
            @click="brushType = bt.id"
            :title="bt.name"
          >
            <i class="fa-solid" :class="bt.icon"></i>
          </button>
          <div class="dc-toolbar-sep"></div>
        </template>
        <!-- 填充切换 (形状工具激活时) -->
        <template v-if="isShapeTool">
          <button
            class="dc-tool-btn"
            :class="{ active: fillShape }"
            @click="fillShape = !fillShape"
            title="填充/描边切换"
          >
            <i class="fa-solid" :class="fillShape ? 'fa-fill-drip' : 'fa-fill'"></i>
          </button>
          <div class="dc-toolbar-sep"></div>
        </template>
        <!-- 颜色选择 -->
        <label class="dc-color-wrap">
          <input type="color" v-model="color" class="dc-color-input" />
          <span class="dc-color-preview" :style="{ background: color }"></span>
        </label>
        <div class="dc-preset-colors">
          <span
            v-for="c in presetColors"
            :key="c"
            class="dc-preset-color"
            :style="{ background: c }"
            :class="{ active: color === c }"
            @click="color = c"
          ></span>
        </div>
        <div class="dc-toolbar-sep"></div>
        <!-- 大小滑块 -->
        <div class="dc-slider-group">
          <label class="dc-slider-label">大小</label>
          <input type="range" min="1" max="80" v-model.number="lineWidth" class="dc-slider" />
          <span class="dc-slider-value">{{ lineWidth }}</span>
        </div>
        <!-- 透明度滑块 -->
        <div class="dc-slider-group">
          <label class="dc-slider-label">透明</label>
          <input type="range" min="5" max="100" v-model.number="opacity" class="dc-slider" />
          <span class="dc-slider-value">{{ Math.round(opacity) }}%</span>
        </div>
        <div class="dc-toolbar-sep"></div>
        <!-- 网格/吸附/参考线 -->
        <button class="dc-tool-btn" :class="{ active: showGrid }" @click="toggleGrid" title="网格">
          <i class="fa-solid fa-border-all"></i>
        </button>
        <button class="dc-tool-btn" :class="{ active: snapToGrid }" @click="snapToGrid = !snapToGrid" title="吸附网格">
          <i class="fa-solid fa-magnet"></i>
        </button>
        <button class="dc-tool-btn" :class="{ active: showGuides }" @click="showGuides = !showGuides" title="参考线">
          <i class="fa-solid fa-grip-lines"></i>
        </button>
        <!-- 图片导入 -->
        <button class="dc-tool-btn" @click="triggerImageImport" title="导入图片">
          <i class="fa-solid fa-image"></i>
        </button>
        <input type="file" ref="imageInput" accept="image/*" style="display:none" @change="onImageImport" />
      </div>
      <div class="dc-tools-right">
        <button class="dc-tool-btn" @click="undo" :disabled="historyIdx <= 0" title="撤销">
          <i class="fa-solid fa-rotate-left"></i>
        </button>
        <button class="dc-tool-btn" @click="redo" :disabled="historyIdx >= history.length - 1" title="重做">
          <i class="fa-solid fa-rotate-right"></i>
        </button>
        <button class="dc-tool-btn" @click="clearLayer" title="清除当前图层">
          <i class="fa-solid fa-trash-can"></i>
        </button>
        <div class="dc-toolbar-sep"></div>
        <button class="btn-secondary" @click="$emit('close')">取消</button>
        <button class="btn-primary" @click="saveAndClose">保存并关闭</button>
      </div>
    </div>

    <!-- ========== 批注模式工具栏 ========== -->
    <div v-if="mode === 'annotation'" class="dc-anno-toolbar">
      <div class="dc-anno-tools">
        <button
          class="dc-tool-btn"
          :class="{ active: annotating }"
          @click="annotating = !annotating"
          title="批注画笔"
        >
          <i class="fa-solid fa-pen"></i>
        </button>
        <template v-if="annotating">
          <button
            v-for="tool in annoTools"
            :key="tool.id"
            class="dc-tool-btn"
            :class="{ active: activeTool === tool.id }"
            @click="setTool(tool.id)"
            :title="tool.name"
          >
            <i class="fa-solid" :class="tool.icon"></i>
          </button>
          <div class="dc-toolbar-sep"></div>
          <label class="dc-color-wrap">
            <input type="color" v-model="color" class="dc-color-input" />
            <span class="dc-color-preview dc-color-preview--sm" :style="{ background: color }"></span>
          </label>
          <div class="dc-slider-group">
            <input type="range" min="1" max="30" v-model.number="lineWidth" class="dc-slider dc-slider--sm" />
            <span class="dc-slider-value">{{ lineWidth }}</span>
          </div>
          <div class="dc-toolbar-sep"></div>
          <button class="dc-tool-btn" @click="undo" :disabled="historyIdx <= 0" title="撤销">
            <i class="fa-solid fa-rotate-left"></i>
          </button>
          <button class="dc-tool-btn" @click="redo" :disabled="historyIdx >= history.length - 1" title="重做">
            <i class="fa-solid fa-rotate-right"></i>
          </button>
        </template>
      </div>
      <button v-if="annotating" class="btn-primary btn-sm" @click="finishAnnotation">完成批注</button>
    </div>

    <!-- ========== 画布工作区 ========== -->
    <div
      class="dc-workspace"
      ref="workspace"
      @wheel.prevent="onWheel"
      @dblclick="fitToWindow"
    >
      <div
        class="dc-layers-container"
        ref="layersContainer"
        :style="layersContainerStyle"
      >
        <!-- 图层 canvas -->
        <canvas
          v-for="(layer, idx) in layers"
          :key="layer.id"
          :ref="'layer_' + idx"
          class="dc-layer"
          :style="{ zIndex: idx, opacity: layer.visible ? 1 : 0, pointerEvents: activeLayerIdx === idx && (mode === 'full' || annotating) ? 'auto' : 'none' }"
          @mousedown="onMouseDown"
          @mousemove="onMouseMove"
          @mouseup="onMouseUp"
          @mouseleave="onMouseUp"
          @touchstart.prevent="onTouchStart"
          @touchmove.prevent="onTouchMove"
          @touchend.prevent="onTouchEnd"
        ></canvas>
        <!-- 形状预览叠加层 -->
        <canvas ref="previewOverlay" class="dc-layer dc-preview-overlay" :style="{ zIndex: layers.length, pointerEvents: 'none' }"></canvas>
        <!-- 网格叠加层 -->
        <canvas v-if="mode === 'full'" ref="gridOverlay" class="dc-layer dc-grid-overlay" :style="{ zIndex: layers.length + 1, pointerEvents: 'none', opacity: showGrid ? 1 : 0 }"></canvas>
        <!-- 参考线叠加层 -->
        <canvas v-if="mode === 'full' && showGuides" ref="guidesOverlay" class="dc-layer dc-guides-overlay" :style="{ zIndex: layers.length + 2, pointerEvents: 'none' }"></canvas>
        <!-- 文字输入 -->
        <div v-if="textInput.visible" class="dc-text-input-wrap" :style="{ left: textInput.x + 'px', top: textInput.y + 'px' }">
          <input
            ref="textInputEl"
            v-model="textInput.text"
            class="dc-text-input"
            :style="{ fontSize: Math.max(14, lineWidth * 3) + 'px', color: color }"
            @keydown.enter="commitText"
            @keydown.escape="cancelText"
            placeholder="输入文字后回车确认..."
          />
        </div>
      </div>
      <!-- 缩略图导航 (画板模式) -->
      <div v-if="mode === 'full'" class="dc-minimap" ref="minimap">
        <canvas ref="minimapCanvas" class="dc-minimap-canvas" @click="onMinimapClick"></canvas>
        <div class="dc-minimap-viewport" :style="minimapViewportStyle"></div>
      </div>
    </div>

    <!-- ========== 图层管理栏 (画板模式) ========== -->
    <div v-if="mode === 'full'" class="dc-layers-bar">
      <button class="dc-layer-btn" @click="addLayer" title="添加图层">
        <i class="fa-solid fa-plus"></i>
      </button>
      <div class="dc-layer-list">
        <div
          v-for="(layer, idx) in layers"
          :key="layer.id"
          class="dc-layer-item"
          :class="{ active: activeLayerIdx === idx }"
          @click="activeLayerIdx = idx"
        >
          <button class="dc-layer-vis-btn" @click.stop="toggleLayerVisibility(idx)" :title="layer.visible ? '隐藏' : '显示'">
            <i class="fa-solid" :class="layer.visible ? 'fa-eye' : 'fa-eye-slash'"></i>
          </button>
          <span class="dc-layer-name">{{ layer.name }}</span>
          <select v-model="layer.blendMode" class="dc-layer-blend" @click.stop title="混合模式">
            <option value="normal">正常</option>
            <option value="multiply">正片叠底</option>
            <option value="screen">滤色</option>
            <option value="overlay">叠加</option>
          </select>
          <button class="dc-layer-del-btn" @click.stop="removeLayer(idx)" v-if="layers.length > 1" title="删除图层">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
      <div class="dc-layer-reorder">
        <button class="dc-layer-reorder-btn" @click="moveLayerUp" :disabled="activeLayerIdx <= 0" title="上移图层">
          <i class="fa-solid fa-chevron-up"></i>
        </button>
        <button class="dc-layer-reorder-btn" @click="moveLayerDown" :disabled="activeLayerIdx >= layers.length - 1" title="下移图层">
          <i class="fa-solid fa-chevron-down"></i>
        </button>
      </div>
    </div>

    <!-- 导入图片的变换控制 -->
    <div v-if="importedImage" class="dc-image-transform">
      <div class="dc-image-transform-btns">
        <button class="btn-sm btn-primary" @click="commitImportedImage">放置</button>
        <button class="btn-sm btn-secondary" @click="cancelImportedImage">取消</button>
      </div>
    </div>
  </div>
</template>

<script>
// ============ 工具函数 ============
function generateId() {
  return 'dc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ============ 工具定义 ============
var FULL_TOOLS = [
  { id: 'select', name: '选择', icon: 'fa-arrow-pointer' },
  { id: 'brush', name: '画笔', icon: 'fa-paintbrush' },
  { id: 'eraser', name: '橡皮擦', icon: 'fa-eraser' },
  { id: 'rect', name: '矩形', icon: 'fa-square' },
  { id: 'circle', name: '圆形', icon: 'fa-circle' },
  { id: 'line', name: '直线', icon: 'fa-minus' },
  { id: 'triangle', name: '三角形', icon: 'fa-play' },
  { id: 'arrow', name: '箭头', icon: 'fa-arrow-right' },
  { id: 'diamond', name: '菱形', icon: 'fa-diamond' },
  { id: 'text', name: '文字', icon: 'fa-font' },
  { id: 'eyedropper', name: '吸管', icon: 'fa-eye-dropper' }
];

var ANNO_TOOLS = [
  { id: 'brush', name: '画笔', icon: 'fa-paintbrush' },
  { id: 'eraser', name: '橡皮擦', icon: 'fa-eraser' },
  { id: 'rect', name: '矩形', icon: 'fa-square' },
  { id: 'circle', name: '圆形', icon: 'fa-circle' },
  { id: 'arrow', name: '箭头', icon: 'fa-arrow-right' }
];

var BRUSH_TYPES = [
  { id: 'pencil', name: '铅笔', icon: 'fa-pencil' },
  { id: 'marker', name: '马克笔', icon: 'fa-highlighter' },
  { id: 'highlighter', name: '荧光笔', icon: 'fa-marker' },
  { id: 'crayon', name: '蜡笔', icon: 'fa-paintbrush' }
];

var PRESET_COLORS = ['#000000', '#ff0000', '#ff6600', '#ffcc00', '#00cc00', '#0066ff', '#9900cc', '#ffffff', '#ffeb3b', '#ff9800', '#e91e63', '#00bcd4'];

var SHAPE_TOOLS = ['rect', 'circle', 'line', 'triangle', 'arrow', 'diamond'];

export default {
  name: 'DrawCanvas',
  props: {
    mode: { type: String, default: 'full' },
    initialLayers: { type: Array, default: function() { return []; } },
    canvasWidth: { type: Number, default: 0 },
    canvasHeight: { type: Number, default: 0 }
  },
  data: function() {
    return {
      // 工具状态
      activeTool: 'brush',
      color: '#000000',
      lineWidth: 3,
      opacity: 100,
      brushType: 'pencil',
      fillShape: false,

      // 图层
      layers: [],
      activeLayerIdx: 0,

      // 绘制状态
      drawing: false,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,

      // 历史
      history: [],
      historyIdx: -1,

      // 形状预览
      shapePreview: null,

      // 文字输入
      textInput: { visible: false, text: '', x: 0, y: 0, canvasX: 0, canvasY: 0 },

      // 网格
      showGrid: false,
      gridSize: 20,
      snapToGrid: false,

      // 参考线
      showGuides: false,
      guides: [],
      draggingGuide: null,

      // 无限画布
      scale: 1,
      offsetX: 0,
      offsetY: 0,

      // 图片导入
      importedImage: null,
      imageTransform: { x: 0, y: 0, scale: 1, rotation: 0 },

      // 批注模式
      annotating: false,

      // 触摸
      touchDist0: 0,
      touchCX0: 0,
      touchCY0: 0,

      // 预设
      presetColors: PRESET_COLORS,

      // minimap
      minimapSize: 120
    };
  },
  computed: {
    visibleTools: function() {
      return this.mode === 'full' ? FULL_TOOLS : [];
    },
    annoTools: function() {
      return ANNO_TOOLS;
    },
    brushTypes: function() {
      return BRUSH_TYPES;
    },
    isShapeTool: function() {
      return SHAPE_TOOLS.indexOf(this.activeTool) !== -1;
    },
    layersContainerStyle: function() {
      var w = this.canvasWidth || 800;
      var h = this.canvasHeight || 600;
      return {
        width: w + 'px',
        height: h + 'px',
        transform: 'scale(' + this.scale + ') translate(' + this.offsetX + 'px, ' + this.offsetY + 'px)',
        transformOrigin: '0 0'
      };
    },
    minimapViewportStyle: function() {
      var ws = this.$refs.workspace;
      if (!ws) return {};
      var vw = ws.offsetWidth;
      var vh = ws.offsetHeight;
      var cw = this.canvasWidth || 800;
      var ch = this.canvasHeight || 600;
      var ratio = this.minimapSize / Math.max(cw, ch);
      return {
        left: (-this.offsetX * this.scale * ratio) + 'px',
        top: (-this.offsetY * this.scale * ratio) + 'px',
        width: (vw / this.scale * ratio) + 'px',
        height: (vh / this.scale * ratio) + 'px'
      };
    }
  },
  watch: {
    showGrid: function() {
      this.$nextTick(function() { this.drawGrid(); });
    },
    showGuides: function() {
      this.$nextTick(function() { this.drawGuides(); });
    },
    activeTool: function(val) {
      this.$emit('update:activeTool', val);
    },
    color: function(val) {
      this.$emit('update:color', val);
    }
  },
  methods: {
    // ============ 初始化 ============
    init: function(existingData) {
      var self = this;
      var workspace = self.$refs.workspace;
      if (!workspace) return;
      var maxW = workspace.offsetWidth - 40;
      var maxH = workspace.offsetHeight - 40;
      var w = self.canvasWidth || Math.min(maxW, 1200);
      var h = self.canvasHeight || Math.min(maxH, 800);
      if (w < 400) w = 400;
      if (h < 300) h = 300;
      w = Math.floor(w);
      h = Math.floor(h);

      self.layers = [];
      self.activeLayerIdx = 0;
      self.history = [];
      self.historyIdx = -1;
      self.activeTool = 'brush';
      self.color = '#000000';
      self.lineWidth = 3;
      self.opacity = 100;
      self.fillShape = false;
      self.textInput = { visible: false, text: '', x: 0, y: 0, canvasX: 0, canvasY: 0 };
      self.scale = 1;
      self.offsetX = 0;
      self.offsetY = 0;

      if (existingData && existingData.length > 0) {
        existingData.forEach(function(dataUrl, idx) {
          self.layers.push({
            id: generateId(),
            name: '图层 ' + (idx + 1),
            visible: true,
            blendMode: 'normal',
            width: w,
            height: h
          });
        });
      } else {
        self.layers.push({
          id: generateId(),
          name: '图层 1',
          visible: true,
          blendMode: 'normal',
          width: w,
          height: h
        });
      }

      self.$nextTick(function() {
        self.layers.forEach(function(layer, idx) {
          var canvas = self.getLayerCanvas(idx);
          if (canvas) {
            canvas.width = w;
            canvas.height = h;
            var ctx = canvas.getContext('2d');
            ctx.fillStyle = self.mode === 'annotation' ? 'rgba(0,0,0,0)' : '#ffffff';
            ctx.fillRect(0, 0, w, h);
            if (existingData && existingData[idx]) {
              var img = new Image();
              img.onload = (function(c, d) {
                return function() { c.drawImage(d, 0, 0, w, h); };
              })(ctx, img);
              img.src = existingData[idx];
            }
          }
        });
        var overlay = self.$refs.previewOverlay;
        if (overlay) {
          overlay.width = w;
          overlay.height = h;
        }
        var gridOverlay = self.$refs.gridOverlay;
        if (gridOverlay) {
          gridOverlay.width = w;
          gridOverlay.height = h;
        }
        var guidesOverlay = self.$refs.guidesOverlay;
        if (guidesOverlay) {
          guidesOverlay.width = w;
          guidesOverlay.height = h;
        }
        self.showGrid = false;
        self.snapToGrid = false;
        self.saveState();
        self.fitToWindow();
      });
    },

    // ============ 图层 Canvas 引用 ============
    getLayerCanvas: function(idx) {
      var refKey = 'layer_' + idx;
      var canvasArr = this.$refs[refKey];
      return canvasArr ? canvasArr[0] : null;
    },

    getActiveCanvas: function() {
      return this.getLayerCanvas(this.activeLayerIdx);
    },

    // ============ 坐标转换 ============
    getCanvasPos: function(e) {
      var self = this;
      var canvas = self.getActiveCanvas();
      if (!canvas) return { x: 0, y: 0 };
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / rect.width;
      var scaleY = canvas.height / rect.height;
      var pos = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
      if (self.snapToGrid && self.showGrid) {
        pos.x = Math.round(pos.x / self.gridSize) * self.gridSize;
        pos.y = Math.round(pos.y / self.gridSize) * self.gridSize;
      }
      return pos;
    },

    // ============ 无限画布 ============
    onWheel: function(e) {
      var self = this;
      if (self.mode !== 'full') return;
      e.preventDefault();
      var delta = e.deltaY > 0 ? 0.9 : 1.1;
      var newScale = Math.min(10, Math.max(0.1, self.scale * delta));
      // 以鼠标位置为中心缩放
      var rect = self.$refs.workspace.getBoundingClientRect();
      var mx = e.clientX - rect.left;
      var my = e.clientY - rect.top;
      self.offsetX = mx - (mx - self.offsetX) * (newScale / self.scale);
      self.offsetY = my - (my - self.offsetY) * (newScale / self.scale);
      self.scale = newScale;
      self.updateMinimap();
    },

    fitToWindow: function() {
      var self = this;
      if (self.mode !== 'full') return;
      var ws = self.$refs.workspace;
      if (!ws) return;
      var vw = ws.offsetWidth;
      var vh = ws.offsetHeight;
      var cw = self.canvasWidth || 800;
      var ch = self.canvasHeight || 600;
      var fitScale = Math.min(vw / cw, vh / ch, 1) * 0.9;
      self.scale = fitScale;
      self.offsetX = (vw - cw * fitScale) / 2 / fitScale;
      self.offsetY = (vh - ch * fitScale) / 2 / fitScale;
      self.updateMinimap();
    },

    // ============ 鼠标事件 ============
    onMouseDown: function(e) {
      var self = this;
      if (self.mode === 'annotation' && !self.annotating) return;
      if (self.activeTool === 'select') return;
      if (self.activeTool === 'eyedropper') {
        self.doEyedropper(e);
        return;
      }
      if (self.activeTool === 'text') {
        var containerRect = self.$refs.layersContainer.getBoundingClientRect();
        var pos = self.getCanvasPos(e);
        self.textInput = {
          visible: true,
          text: '',
          x: e.clientX - containerRect.left,
          y: e.clientY - containerRect.top,
          canvasX: pos.x,
          canvasY: pos.y
        };
        self.$nextTick(function() {
          if (self.$refs.textInputEl) self.$refs.textInputEl.focus();
        });
        return;
      }
      self.drawing = true;
      var pos = self.getCanvasPos(e);
      self.startX = pos.x;
      self.startY = pos.y;
      self.lastX = pos.x;
      self.lastY = pos.y;
      var canvas = self.getActiveCanvas();
      if (!canvas) return;
      var ctx = canvas.getContext('2d');
      if (self.activeTool === 'brush' || self.activeTool === 'eraser') {
        self.beginBrushStroke(ctx, pos);
      }
      if (SHAPE_TOOLS.indexOf(self.activeTool) !== -1) {
        self.shapePreview = {
          tool: self.activeTool,
          startX: pos.x,
          startY: pos.y,
          endX: pos.x,
          endY: pos.y
        };
      }
    },

    onMouseMove: function(e) {
      var self = this;
      if (!self.drawing) return;
      var pos = self.getCanvasPos(e);
      var canvas = self.getActiveCanvas();
      if (!canvas) return;
      var ctx = canvas.getContext('2d');
      if (self.activeTool === 'brush' || self.activeTool === 'eraser') {
        self.continueBrushStroke(ctx, pos);
      }
      if (self.shapePreview) {
        self.shapePreview.endX = pos.x;
        self.shapePreview.endY = pos.y;
        self.redrawShapePreview();
      }
    },

    onMouseUp: function(e) {
      var self = this;
      if (!self.drawing) return;
      self.drawing = false;
      var canvas = self.getActiveCanvas();
      if (!canvas) return;
      var ctx = canvas.getContext('2d');
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      if (self.shapePreview) {
        self.drawShape(ctx, self.shapePreview);
        self.shapePreview = null;
        var overlay = self.$refs.previewOverlay;
        if (overlay) {
          var octx = overlay.getContext('2d');
          octx.clearRect(0, 0, overlay.width, overlay.height);
        }
      }
      self.saveState();
    },

    // ============ 触摸事件 ============
    onTouchStart: function(e) {
      var self = this;
      if (e.touches.length === 1) {
        // 单指绘制
        var touch = e.touches[0];
        self.onMouseDown(touch);
      } else if (e.touches.length === 2 && self.mode === 'full') {
        // 双指缩放/平移
        self.drawing = false;
        var t0 = e.touches[0];
        var t1 = e.touches[1];
        self.touchDist0 = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        self.touchCX0 = (t0.clientX + t1.clientX) / 2;
        self.touchCY0 = (t0.clientY + t1.clientY) / 2;
      }
    },

    onTouchMove: function(e) {
      var self = this;
      if (e.touches.length === 1 && self.drawing) {
        var touch = e.touches[0];
        self.onMouseMove(touch);
      } else if (e.touches.length === 2 && self.mode === 'full') {
        var t0 = e.touches[0];
        var t1 = e.touches[1];
        var dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        var cx = (t0.clientX + t1.clientX) / 2;
        var cy = (t0.clientY + t1.clientY) / 2;
        if (self.touchDist0 > 0) {
          var newScale = Math.min(10, Math.max(0.1, self.scale * (dist / self.touchDist0)));
          self.scale = newScale;
          self.touchDist0 = dist;
        }
        self.offsetX += (cx - self.touchCX0) / self.scale;
        self.offsetY += (cy - self.touchCY0) / self.scale;
        self.touchCX0 = cx;
        self.touchCY0 = cy;
        self.updateMinimap();
      }
    },

    onTouchEnd: function(e) {
      var self = this;
      if (e.touches.length === 0) {
        self.onMouseUp(e);
      }
    },

    // ============ 笔刷绘制 ============
    beginBrushStroke: function(ctx, pos) {
      var self = this;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (self.activeTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = '#000000';
        ctx.globalAlpha = 1;
        ctx.lineWidth = self.lineWidth;
      } else if (self.brushType === 'marker') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = self.color;
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = Math.max(10, self.lineWidth);
      } else if (self.brushType === 'highlighter') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = self.color;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = Math.max(15, self.lineWidth);
      } else if (self.brushType === 'crayon') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = self.color;
        ctx.globalAlpha = self.opacity / 100;
        ctx.lineWidth = self.lineWidth;
      } else {
        // pencil
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = self.color;
        ctx.globalAlpha = self.opacity / 100;
        ctx.lineWidth = self.lineWidth;
      }
    },

    continueBrushStroke: function(ctx, pos) {
      var self = this;
      if (self.brushType === 'crayon' && self.activeTool === 'brush') {
        // 蜡笔: 添加随机抖动
        var jitterX = pos.x + (Math.random() - 0.5) * self.lineWidth * 0.8;
        var jitterY = pos.y + (Math.random() - 0.5) * self.lineWidth * 0.8;
        ctx.lineTo(jitterX, jitterY);
      } else {
        ctx.lineTo(pos.x, pos.y);
      }
      ctx.stroke();
      self.lastX = pos.x;
      self.lastY = pos.y;
    },

    // ============ 形状绘制 ============
    redrawShapePreview: function() {
      var self = this;
      if (!self.shapePreview) return;
      var overlay = self.$refs.previewOverlay;
      if (!overlay) return;
      var ctx = overlay.getContext('2d');
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      self.drawShape(ctx, self.shapePreview);
    },

    drawShape: function(ctx, shape) {
      var self = this;
      ctx.save();
      ctx.strokeStyle = self.color;
      ctx.fillStyle = self.color;
      ctx.lineWidth = self.lineWidth;
      ctx.globalAlpha = self.opacity / 100;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      var sx = shape.startX, sy = shape.startY;
      var ex = shape.endX, ey = shape.endY;

      if (shape.tool === 'rect') {
        if (self.fillShape) {
          ctx.fillRect(sx, sy, ex - sx, ey - sy);
        } else {
          ctx.strokeRect(sx, sy, ex - sx, ey - sy);
        }
      } else if (shape.tool === 'circle') {
        var rx = Math.abs(ex - sx) / 2;
        var ry = Math.abs(ey - sy) / 2;
        var ccx = (sx + ex) / 2;
        var ccy = (sy + ey) / 2;
        ctx.beginPath();
        ctx.ellipse(ccx, ccy, rx, ry, 0, 0, Math.PI * 2);
        if (self.fillShape) {
          ctx.fill();
        } else {
          ctx.stroke();
        }
      } else if (shape.tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      } else if (shape.tool === 'triangle') {
        var midX = (sx + ex) / 2;
        ctx.beginPath();
        ctx.moveTo(midX, sy);
        ctx.lineTo(ex, ey);
        ctx.lineTo(sx, ey);
        ctx.closePath();
        if (self.fillShape) {
          ctx.fill();
        } else {
          ctx.stroke();
        }
      } else if (shape.tool === 'arrow') {
        var headLen = Math.max(10, self.lineWidth * 4);
        var dx = ex - sx;
        var dy = ey - sy;
        var angle = Math.atan2(dy, dx);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      } else if (shape.tool === 'diamond') {
        var dcx = (sx + ex) / 2;
        var dcy = (sy + ey) / 2;
        var halfW = Math.abs(ex - sx) / 2;
        var halfH = Math.abs(ey - sy) / 2;
        ctx.beginPath();
        ctx.moveTo(dcx, dcy - halfH);
        ctx.lineTo(dcx + halfW, dcy);
        ctx.lineTo(dcx, dcy + halfH);
        ctx.lineTo(dcx - halfW, dcy);
        ctx.closePath();
        if (self.fillShape) {
          ctx.fill();
        } else {
          ctx.stroke();
        }
      }
      ctx.restore();
    },

    // ============ 历史 ============
    saveState: function() {
      var self = this;
      var canvas = self.getActiveCanvas();
      if (!canvas) return;
      var dataUrl = canvas.toDataURL('image/png');
      if (self.historyIdx < self.history.length - 1) {
        self.history = self.history.slice(0, self.historyIdx + 1);
      }
      self.history.push(dataUrl);
      if (self.history.length > 50) {
        self.history = self.history.slice(self.history.length - 50);
      }
      self.historyIdx = self.history.length - 1;
    },

    undo: function() {
      var self = this;
      if (self.historyIdx <= 0) return;
      self.historyIdx--;
      self.restoreFromHistory();
    },

    redo: function() {
      var self = this;
      if (self.historyIdx >= self.history.length - 1) return;
      self.historyIdx++;
      self.restoreFromHistory();
    },

    restoreFromHistory: function() {
      var self = this;
      var canvas = self.getActiveCanvas();
      if (!canvas) return;
      var ctx = canvas.getContext('2d');
      var dataUrl = self.history[self.historyIdx];
      if (!dataUrl) return;
      var img = new Image();
      img.onload = function() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = dataUrl;
    },

    clearLayer: function() {
      var self = this;
      var canvas = self.getActiveCanvas();
      if (!canvas) return;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = self.mode === 'annotation' ? 'rgba(0,0,0,0)' : '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      self.saveState();
    },

    // ============ 图层管理 ============
    addLayer: function(name) {
      var self = this;
      var w = self.canvasWidth || 800;
      var h = self.canvasHeight || 600;
      var newLayer = {
        id: generateId(),
        name: name || ('图层 ' + (self.layers.length + 1)),
        visible: true,
        blendMode: 'normal',
        width: w,
        height: h
      };
      self.layers.push(newLayer);
      self.activeLayerIdx = self.layers.length - 1;
      self.$nextTick(function() {
        var canvas = self.getLayerCanvas(self.layers.length - 1);
        if (canvas) {
          canvas.width = w;
          canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
        }
        var overlay = self.$refs.previewOverlay;
        if (overlay) {
          overlay.width = w;
          overlay.height = h;
        }
        self.saveState();
      });
    },

    removeLayer: function(idx) {
      var self = this;
      if (self.layers.length <= 1) return;
      self.layers.splice(idx, 1);
      if (self.activeLayerIdx >= self.layers.length) {
        self.activeLayerIdx = self.layers.length - 1;
      } else if (self.activeLayerIdx > idx) {
        self.activeLayerIdx--;
      } else if (self.activeLayerIdx === idx) {
        self.activeLayerIdx = Math.min(idx, self.layers.length - 1);
      }
      self.history = [];
      self.historyIdx = -1;
      self.$nextTick(function() {
        self.saveState();
      });
    },

    toggleLayerVisibility: function(idx) {
      this.layers[idx].visible = !this.layers[idx].visible;
    },

    moveLayerUp: function() {
      var self = this;
      var idx = self.activeLayerIdx;
      if (idx <= 0) return;
      var temp = self.layers[idx];
      self.$set(self.layers, idx, self.layers[idx - 1]);
      self.$set(self.layers, idx - 1, temp);
      self.activeLayerIdx = idx - 1;
    },

    moveLayerDown: function() {
      var self = this;
      var idx = self.activeLayerIdx;
      if (idx >= self.layers.length - 1) return;
      var temp = self.layers[idx];
      self.$set(self.layers, idx, self.layers[idx + 1]);
      self.$set(self.layers, idx + 1, temp);
      self.activeLayerIdx = idx + 1;
    },

    // ============ 网格 ============
    toggleGrid: function() {
      var self = this;
      self.showGrid = !self.showGrid;
      self.$nextTick(function() {
        self.drawGrid();
      });
    },

    drawGrid: function() {
      var self = this;
      var overlay = self.$refs.gridOverlay;
      if (!overlay) return;
      var w = self.canvasWidth || 800;
      var h = self.canvasHeight || 600;
      overlay.width = w;
      overlay.height = h;
      var ctx = overlay.getContext('2d');
      ctx.clearRect(0, 0, w, h);
      if (!self.showGrid) return;
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 1;
      var gs = self.gridSize;
      for (var x = gs; x < w; x += gs) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, h);
        ctx.stroke();
      }
      for (var y = gs; y < h; y += gs) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(w, y + 0.5);
        ctx.stroke();
      }
    },

    // ============ 参考线 ============
    drawGuides: function() {
      var self = this;
      var overlay = self.$refs.guidesOverlay;
      if (!overlay) return;
      var w = self.canvasWidth || 800;
      var h = self.canvasHeight || 600;
      overlay.width = w;
      overlay.height = h;
      var ctx = overlay.getContext('2d');
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = '#00bcd4';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      self.guides.forEach(function(g) {
        ctx.beginPath();
        if (g.orientation === 'horizontal') {
          ctx.moveTo(0, g.position);
          ctx.lineTo(w, g.position);
        } else {
          ctx.moveTo(g.position, 0);
          ctx.lineTo(g.position, h);
        }
        ctx.stroke();
      });
      ctx.setLineDash([]);
    },

    // ============ 吸管 ============
    doEyedropper: function(e) {
      var self = this;
      var canvas = self.getActiveCanvas();
      if (!canvas) return;
      var pos = self.getCanvasPos(e);
      var ctx = canvas.getContext('2d');
      var pixel = ctx.getImageData(Math.round(pos.x), Math.round(pos.y), 1, 1).data;
      var hex = '#' + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1);
      self.color = hex;
      self.activeTool = 'brush';
    },

    // ============ 文字 ============
    commitText: function() {
      var self = this;
      if (!self.textInput.text.trim()) {
        self.textInput.visible = false;
        return;
      }
      var canvas = self.getActiveCanvas();
      if (!canvas) return;
      var ctx = canvas.getContext('2d');
      ctx.save();
      ctx.font = Math.max(14, self.lineWidth * 3) + 'px sans-serif';
      ctx.fillStyle = self.color;
      ctx.globalAlpha = self.opacity / 100;
      ctx.textBaseline = 'top';
      var lines = self.textInput.text.split('\n');
      var lineHeight = Math.max(14, self.lineWidth * 3) * 1.3;
      for (var i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], self.textInput.canvasX, self.textInput.canvasY + i * lineHeight);
      }
      ctx.restore();
      self.textInput.visible = false;
      self.saveState();
    },

    cancelText: function() {
      this.textInput.visible = false;
    },

    // ============ 图片导入 ============
    triggerImageImport: function() {
      this.$refs.imageInput.click();
    },

    onImageImport: function(e) {
      var self = this;
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        var img = new Image();
        img.onload = function() {
          self.importedImage = img;
          self.imageTransform = {
            x: 100,
            y: 100,
            scale: 1,
            rotation: 0
          };
          self.drawImportedImagePreview();
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },

    drawImportedImagePreview: function() {
      // 在预览层绘制导入图片
      var self = this;
      var overlay = self.$refs.previewOverlay;
      if (!overlay || !self.importedImage) return;
      var ctx = overlay.getContext('2d');
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      var t = self.imageTransform;
      ctx.save();
      ctx.translate(t.x + self.importedImage.width * t.scale / 2, t.y + self.importedImage.height * t.scale / 2);
      ctx.rotate(t.rotation);
      ctx.drawImage(self.importedImage, -self.importedImage.width * t.scale / 2, -self.importedImage.height * t.scale / 2, self.importedImage.width * t.scale, self.importedImage.height * t.scale);
      ctx.restore();
    },

    commitImportedImage: function() {
      var self = this;
      if (!self.importedImage) return;
      var canvas = self.getActiveCanvas();
      if (!canvas) return;
      var ctx = canvas.getContext('2d');
      var t = self.imageTransform;
      ctx.save();
      ctx.translate(t.x + self.importedImage.width * t.scale / 2, t.y + self.importedImage.height * t.scale / 2);
      ctx.rotate(t.rotation);
      ctx.drawImage(self.importedImage, -self.importedImage.width * t.scale / 2, -self.importedImage.height * t.scale / 2, self.importedImage.width * t.scale, self.importedImage.height * t.scale);
      ctx.restore();
      self.importedImage = null;
      var overlay = self.$refs.previewOverlay;
      if (overlay) {
        overlay.getContext('2d').clearRect(0, 0, overlay.width, overlay.height);
      }
      self.saveState();
    },

    cancelImportedImage: function() {
      this.importedImage = null;
      var overlay = this.$refs.previewOverlay;
      if (overlay) {
        overlay.getContext('2d').clearRect(0, 0, overlay.width, overlay.height);
      }
    },

    // ============ Minimap ============
    updateMinimap: function() {
      var self = this;
      if (self.mode !== 'full') return;
      self.$nextTick(function() {
        var mc = self.$refs.minimapCanvas;
        if (!mc) return;
        var ms = self.minimapSize;
        var cw = self.canvasWidth || 800;
        var ch = self.canvasHeight || 600;
        var ratio = ms / Math.max(cw, ch);
        mc.width = cw * ratio;
        mc.height = ch * ratio;
        var ctx = mc.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, mc.width, mc.height);
        // 绘制所有可见图层缩略图
        self.layers.forEach(function(layer, idx) {
          if (!layer.visible) return;
          var canvas = self.getLayerCanvas(idx);
          if (canvas) {
            ctx.drawImage(canvas, 0, 0, mc.width, mc.height);
          }
        });
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, mc.width, mc.height);
      });
    },

    onMinimapClick: function(e) {
      var self = this;
      var mc = self.$refs.minimapCanvas;
      if (!mc) return;
      var rect = mc.getBoundingClientRect();
      var cw = self.canvasWidth || 800;
      var ch = self.canvasHeight || 600;
      var ratio = self.minimapSize / Math.max(cw, ch);
      var clickX = (e.clientX - rect.left) / ratio;
      var clickY = (e.clientY - rect.top) / ratio;
      var ws = self.$refs.workspace;
      if (!ws) return;
      self.offsetX = -(clickX - ws.offsetWidth / 2 / self.scale);
      self.offsetY = -(clickY - ws.offsetHeight / 2 / self.scale);
    },

    // ============ 保存/关闭 ============
    getData: function() {
      var self = this;
      var canvasData = [];
      self.layers.forEach(function(layer, idx) {
        var canvas = self.getLayerCanvas(idx);
        if (canvas) {
          canvasData.push(canvas.toDataURL('image/png'));
        }
      });
      return canvasData;
    },

    saveAndClose: function() {
      var data = this.getData();
      this.$emit('save', data);
    },

    finishAnnotation: function() {
      this.annotating = false;
      var data = this.getData();
      this.$emit('save', data);
    },

    // ============ 工具切换 ============
    setTool: function(toolId) {
      this.activeTool = toolId;
      if (this.mode === 'annotation') {
        this.annotating = true;
      }
    }
  },

  mounted: function() {
    var self = this;
    self.$nextTick(function() {
      self.init(self.initialLayers);
    });
  }
};
</script>

<style scoped>
/* ========== 根容器 ========== */
.draw-canvas {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-color);
  user-select: none;
  -webkit-user-select: none;
}

/* ========== 全屏工具栏 ========== */
.dc-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-bottom: 0.5px solid var(--separator-color);
  background: var(--card-bg);
  flex-shrink: 0;
  gap: 4px;
  flex-wrap: wrap;
}

.dc-tools-left {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.dc-tools-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.dc-toolbar-sep {
  width: 1px;
  height: 28px;
  background: var(--separator-color);
  margin: 0 4px;
}

/* ========== 工具按钮 ========== */
.dc-tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 44px;
  border-radius: 10px;
  color: var(--text-secondary);
  font-size: 16px;
  cursor: pointer;
  border: 2px solid transparent;
  background: none;
  transition: all 0.15s;
  padding: 0 8px;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.dc-tool-btn:active:not(:disabled) {
  transform: scale(0.9);
  opacity: 0.7;
}

.dc-tool-btn.active {
  background: var(--primary-color);
  color: #FFFFFF;
  border-color: var(--primary-color);
}

.dc-tool-btn:disabled {
  opacity: 0.3;
  pointer-events: none;
}

/* ========== 颜色选择 ========== */
.dc-color-wrap {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.dc-color-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
}

.dc-color-preview {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: 2px solid var(--border-color);
  cursor: pointer;
}

.dc-color-preview--sm {
  width: 36px;
  height: 36px;
  border-radius: 8px;
}

.dc-preset-colors {
  display: flex;
  gap: 3px;
  align-items: center;
}

.dc-preset-color {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.15s, transform 0.15s;
  touch-action: manipulation;
}

.dc-preset-color:active {
  transform: scale(0.85);
  opacity: 0.7;
}

.dc-preset-color.active {
  border-color: var(--primary-color);
  transform: scale(1.15);
}

/* ========== 滑块 ========== */
.dc-slider-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.dc-slider-label {
  font-size: 12px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.dc-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 70px;
  height: 4px;
  background: var(--separator-color);
  border-radius: 2px;
  cursor: pointer;
  outline: none;
}

.dc-slider--sm {
  width: 50px;
}

.dc-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #FFFFFF;
  border: none;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
}

.dc-slider::-webkit-slider-thumb:active {
  transform: scale(1.15);
}

.dc-slider-value {
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 28px;
  text-align: center;
}

/* ========== 批注工具栏 ========== */
.dc-anno-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: var(--card-bg);
  border-bottom: 0.5px solid var(--separator-color);
  flex-shrink: 0;
  gap: 6px;
}

.dc-anno-tools {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

/* ========== 工作区 ========== */
.dc-workspace {
  flex: 1;
  min-height: 0;
  position: relative;
  background: #e8e8e8;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.draw-canvas--annotation .dc-workspace {
  background: transparent;
}

.dc-layers-container {
  position: relative;
  background: var(--card-bg);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: transform 0.05s ease-out;
}

.draw-canvas--annotation .dc-layers-container {
  background: transparent;
  box-shadow: none;
}

/* ========== 图层 Canvas ========== */
.dc-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  cursor: crosshair;
  touch-action: none;
}

.dc-preview-overlay {
  pointer-events: none;
}

.dc-grid-overlay {
  pointer-events: none;
  transition: opacity 0.2s;
}

.dc-guides-overlay {
  pointer-events: none;
}

/* ========== 文字输入 ========== */
.dc-text-input-wrap {
  position: absolute;
  z-index: 999;
}

.dc-text-input {
  border: 2px dashed var(--primary-color);
  background: rgba(255, 255, 255, 0.95);
  padding: 6px 10px;
  outline: none;
  min-width: 120px;
  font-family: sans-serif;
  border-radius: 6px;
}

/* ========== Minimap ========== */
.dc-minimap {
  position: absolute;
  right: 10px;
  bottom: 10px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  box-shadow: var(--shadow-md);
  cursor: pointer;
}

.dc-minimap-canvas {
  display: block;
}

.dc-minimap-viewport {
  position: absolute;
  border: 2px solid var(--primary-color);
  background: rgba(0, 122, 255, 0.08);
  pointer-events: none;
}

/* ========== 图层栏 ========== */
.dc-layers-bar {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  border-top: 0.5px solid var(--separator-color);
  background: var(--card-bg);
  flex-shrink: 0;
  gap: 6px;
}

.dc-layer-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 44px;
  border-radius: 10px;
  background: var(--primary-color);
  color: #FFFFFF;
  font-size: 16px;
  cursor: pointer;
  border: none;
  flex-shrink: 0;
  touch-action: manipulation;
}

.dc-layer-btn:active {
  opacity: 0.8;
}

.dc-layer-list {
  flex: 1;
  display: flex;
  gap: 4px;
  overflow-x: auto;
  padding: 4px 0;
}

.dc-layer-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  cursor: pointer;
  background: var(--card-bg);
  white-space: nowrap;
  transition: all 0.15s;
  flex-shrink: 0;
  touch-action: manipulation;
}

.dc-layer-item.active {
  border-color: var(--primary-color);
  background: var(--primary-light);
}

.dc-layer-vis-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  border: none;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 6px;
  font-size: 14px;
  touch-action: manipulation;
}

.dc-layer-vis-btn:active {
  transform: scale(0.9);
  opacity: 0.7;
}

.dc-layer-name {
  font-size: 13px;
  color: var(--text-primary);
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dc-layer-blend {
  font-size: 11px;
  padding: 2px 4px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background: var(--bg-color);
  color: var(--text-secondary);
  cursor: pointer;
}

.dc-layer-del-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  border: none;
  background: none;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: 6px;
  font-size: 13px;
  touch-action: manipulation;
}

.dc-layer-del-btn:active {
  color: var(--danger-color);
  transform: scale(0.9);
}

.dc-layer-reorder {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
}

.dc-layer-reorder-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 28px;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 6px;
  font-size: 12px;
  touch-action: manipulation;
}

.dc-layer-reorder-btn:active:not(:disabled) {
  transform: scale(0.9);
}

.dc-layer-reorder-btn:disabled {
  opacity: 0.3;
  pointer-events: none;
}

/* ========== 按钮样式 ========== */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 16px;
  border-radius: 8px;
  background: var(--primary-color);
  color: #FFFFFF;
  border: none;
  font-size: 14px;
  cursor: pointer;
  min-width: 44px;
  height: 44px;
  touch-action: manipulation;
  white-space: nowrap;
}

.btn-primary:active {
  opacity: 0.8;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 16px;
  border-radius: 8px;
  background: var(--bg-color);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  font-size: 14px;
  cursor: pointer;
  min-width: 44px;
  height: 44px;
  touch-action: manipulation;
  white-space: nowrap;
}

.btn-secondary:active {
  background: var(--separator-color);
}

.btn-sm {
  padding: 4px 12px;
  height: 36px;
  min-width: 36px;
  font-size: 13px;
  border-radius: 6px;
}

/* ========== 图片变换控制 ========== */
.dc-image-transform {
  position: absolute;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  background: var(--card-bg);
  border-radius: 12px;
  padding: 8px 16px;
  box-shadow: var(--shadow-lg);
}

.dc-image-transform-btns {
  display: flex;
  gap: 8px;
}
</style>

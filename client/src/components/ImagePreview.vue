<template>
  <transition name="fade">
    <div v-if="visible" class="image-preview-overlay" @click="onOverlayClick">
      <div class="image-preview-content" @click.stop>
        <div class="preview-image-wrap"
          @touchstart="onTouchStart"
          @touchmove="onTouchMove"
          @touchend="onTouchEnd"
          @touchcancel="onTouchEnd"
          @wheel="onWheel">
          <img :src="imageUrl" class="preview-image"
            :style="{ transform: 'translate(' + x + 'px,' + y + 'px) scale(' + scale + ')', transition: (isPinching || isDragging) ? 'none' : 'transform 0.18s ease-out' }"
            @contextmenu.prevent
            draggable="false" />
        </div>
        <div class="preview-hint" v-if="scale === 1">双指缩放 · 双击放大 · 点击关闭</div>
        <button v-if="showSave" class="preview-action-btn preview-save-btn" @click="saveToCloud">
          <i class="fa-solid fa-cloud-arrow-up"></i>
        </button>
        <button class="preview-action-btn preview-close-btn" @click="$emit('close')">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>
  </transition>
</template>

<script>
import api from '@/utils/api';

export default {
  name: 'ImagePreview',
  props: {
    visible: { type: Boolean, default: false },
    imageUrl: { type: String, default: '' },
    // 是否显示转存到云盘按钮
    showSave: { type: Boolean, default: true }
  },
  data: function() {
    return {
      scale: 1,
      x: 0,
      y: 0,
      isPinching: false,
      isDragging: false,
      pinchStartDist: 0,
      pinchStartScale: 1,
      dragStartX: 0,
      dragStartY: 0,
      lastTapTime: 0
    };
  },
  watch: {
    visible: function(val) {
      if (val) {
        // 打开时重置状态
        this.scale = 1;
        this.x = 0;
        this.y = 0;
        this.isPinching = false;
        this.isDragging = false;
        this.lastTapTime = 0;
      }
    }
  },
  methods: {
    onOverlayClick: function() {
      if (this.scale === 1) {
        this.$emit('close');
      } else {
        this.scale = 1;
        this.x = 0;
        this.y = 0;
      }
    },
    getTouchDist: function(touches) {
      var dx = touches[0].clientX - touches[1].clientX;
      var dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    },
    onTouchStart: function(e) {
      if (e.touches.length === 2) {
        this.isPinching = true;
        this.isDragging = false;
        this.pinchStartDist = this.getTouchDist(e.touches);
        this.pinchStartScale = this.scale;
      } else if (e.touches.length === 1) {
        // 双击检测
        var now = Date.now();
        if (now - this.lastTapTime < 280) {
          if (this.scale > 1) {
            this.scale = 1;
            this.x = 0;
            this.y = 0;
          } else {
            this.scale = 2;
          }
          this.lastTapTime = 0;
          return;
        }
        this.lastTapTime = now;
        // 单指拖动（仅缩放状态）
        if (this.scale > 1) {
          this.isDragging = true;
          this.dragStartX = e.touches[0].clientX - this.x;
          this.dragStartY = e.touches[0].clientY - this.y;
        }
      }
    },
    onTouchMove: function(e) {
      if (this.isPinching && e.touches.length === 2) {
        e.preventDefault();
        var dist = this.getTouchDist(e.touches);
        var newScale = this.pinchStartScale * (dist / this.pinchStartDist);
        this.scale = Math.max(1, Math.min(5, newScale));
        if (this.scale === 1) {
          this.x = 0;
          this.y = 0;
        }
      } else if (this.isDragging && e.touches.length === 1) {
        e.preventDefault();
        this.x = e.touches[0].clientX - this.dragStartX;
        this.y = e.touches[0].clientY - this.dragStartY;
      }
    },
    onTouchEnd: function(e) {
      if (e.touches.length < 2) {
        this.isPinching = false;
      }
      if (e.touches.length === 0) {
        this.isDragging = false;
      }
    },
    onWheel: function(e) {
      e.preventDefault();
      var delta = e.deltaY > 0 ? -0.15 : 0.15;
      var newScale = this.scale + delta;
      this.scale = Math.max(1, Math.min(5, newScale));
      if (this.scale === 1) {
        this.x = 0;
        this.y = 0;
      }
    },
    saveToCloud: function() {
      var self = this;
      var url = this.imageUrl;
      if (!url) return;
      api.post('/cloud/save-from-url', { url: url }).then(function(res) {
        if (res.data.code === 200) {
          self.$store.commit('toast/SHOW_TOAST', { message: '图片已转存到云盘', type: 'success' });
        } else {
          self.$store.commit('toast/SHOW_TOAST', { message: res.data.message || '转存失败', type: 'error' });
        }
      }).catch(function(err) {
        console.error('转存图片失败:', err);
        self.$store.commit('toast/SHOW_TOAST', { message: '转存失败，请重试', type: 'error' });
      });
    }
  }
};
</script>

<style scoped>
.image-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.image-preview-content {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.preview-image-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.preview-image {
  max-width: 95vw;
  max-height: 95vh;
  object-fit: contain;
  transform-origin: center center;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  pointer-events: none;
  -webkit-tap-highlight-color: transparent;
  will-change: transform;
}

.preview-hint {
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.55);
  font-size: 12px;
  -webkit-user-select: none;
  user-select: none;
  pointer-events: none;
  text-align: center;
  white-space: nowrap;
}

.preview-action-btn {
  position: absolute;
  top: 16px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s, transform 0.15s;
  z-index: 10;
  -webkit-tap-highlight-color: transparent;
}

.preview-action-btn:active {
  background: rgba(255, 255, 255, 0.35);
  transform: scale(0.92);
}

.preview-close-btn {
  right: 16px;
}

.preview-save-btn {
  right: 64px;
}
</style>

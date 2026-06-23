<template>
  <transition name="capsule-fade">
    <div
      v-if="visible"
      class="weather-alert-capsule"
      :class="capsuleClass"
    >
      <span class="capsule-icon">{{ hasRain ? '🌧️' : '⚠️' }}</span>
      <span class="capsule-text">{{ displayText }}</span>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'WeatherAlertCapsule',
  data: function() {
    return {
      visible: false,
      alertData: null,
      animPhase: 'dot',
      hideTimer: null
    };
  },
  computed: {
    hasRain: function() {
      return this.alertData && (this.alertData.rain || this.alertData.has_rain || this.alertData.alert_type === 'rain' || this.alertData.alert_type === 'both');
    },
    hasWarning: function() {
      return this.alertData && (this.alertData.warning || this.alertData.has_warning || this.alertData.alert_type === 'warning' || this.alertData.alert_type === 'both');
    },
    capsuleClass: function() {
      var cls = [];
      if (this.hasRain && this.hasWarning) {
        cls.push('capsule-mixed');
      } else if (this.hasWarning) {
        cls.push('capsule-warning');
      } else if (this.hasRain) {
        cls.push('capsule-rain');
      }
      if (this.animPhase === 'dot') {
        cls.push('phase-dot');
      } else {
        cls.push('phase-expand');
      }
      return cls;
    },
    displayText: function() {
      if (!this.alertData) return '';
      var parts = [];
      if (this.hasRain) {
        var rainDesc = '';
        if (this.alertData.rain && this.alertData.rain.description) {
          rainDesc = this.alertData.rain.description;
        } else if (this.alertData.rain_text) {
          rainDesc = this.alertData.rain_text;
        } else {
          rainDesc = '降雨提醒';
        }
        parts.push(rainDesc);
      }
      if (this.hasWarning) {
        var warnTitle = '';
        if (this.alertData.warning && this.alertData.warning.title) {
          warnTitle = this.alertData.warning.title;
        } else if (this.alertData.warnings && this.alertData.warnings.length > 0) {
          warnTitle = this.alertData.warnings[0].title || this.alertData.warnings[0].typeName || '天气预警';
        } else {
          warnTitle = '天气预警';
        }
        parts.push(warnTitle);
      }
      return parts.join(' · ');
    }
  },
  methods: {
    showAlert: function(data) {
      var self = this;
      if (self.hideTimer) {
        clearTimeout(self.hideTimer);
        self.hideTimer = null;
      }
      self.alertData = data;
      self.visible = true;
      self.animPhase = 'dot';
      self.$nextTick(function() {
        setTimeout(function() {
          self.animPhase = 'expand';
        }, 350);
      });
      self.hideTimer = setTimeout(function() {
        self.visible = false;
        self.alertData = null;
        self.animPhase = 'dot';
      }, 15350);
    }
  },
  beforeDestroy: function() {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }
  }
};
</script>

<style scoped>
.weather-alert-capsule {
  position: fixed;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9998;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: var(--shadow-lg);
  white-space: nowrap;
  overflow: hidden;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.3px;
  transition: width 0.5s cubic-bezier(0.32, 0.72, 0, 1),
              border-radius 0.5s cubic-bezier(0.32, 0.72, 0, 1),
              padding 0.5s cubic-bezier(0.32, 0.72, 0, 1),
              opacity 0.3s ease;
}

.capsule-icon {
  flex-shrink: 0;
  font-size: 16px;
  line-height: 1;
}

.capsule-text {
  overflow: hidden;
  transition: opacity 0.3s var(--ease-standard) 0.2s, max-width 0.5s cubic-bezier(0.32, 0.72, 0, 1);
}

/* 圆点阶段 */
.phase-dot {
  width: 40px;
  padding: 0;
  border-radius: 50%;
  animation: dot-pop 0.35s cubic-bezier(0.32, 0.72, 0, 1) forwards;
}

.phase-dot .capsule-text {
  max-width: 0;
  opacity: 0;
  margin: 0;
}

.phase-dot .capsule-icon {
  margin: 0 auto;
}

/* 展开阶段 */
.phase-expand {
  padding: 0 18px;
  border-radius: var(--radius-2xl);
  animation: expand-in 0.5s cubic-bezier(0.32, 0.72, 0, 1) forwards;
}

.phase-expand .capsule-text {
  max-width: 300px;
  opacity: 1;
  margin-left: 6px;
}

@keyframes dot-pop {
  0% {
    opacity: 0;
    transform: translateX(-50%) scale(0.3);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) scale(1);
  }
}

@keyframes expand-in {
  0% {
    width: 40px;
    border-radius: 50%;
  }
  100% {
    width: auto;
    border-radius: 20px;
  }
}

/* 退场动画 */
.capsule-fade-leave-active {
  transition: opacity 0.3s var(--ease-standard), transform 0.3s var(--ease-standard);
}
.capsule-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px) scale(0.95);
}

/* 颜色主题 - 降雨 */
.capsule-rain {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
  border-color: rgba(59, 130, 246, 0.2);
}

/* 颜色主题 - 预警 */
.capsule-warning {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.2);
}

/* 颜色主题 - 混合 */
.capsule-mixed {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(239, 68, 68, 0.12));
  color: #8b5cf6;
  border-color: rgba(139, 92, 246, 0.2);
}
</style>

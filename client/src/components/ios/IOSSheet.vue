<template>
  <transition name="ios-sheet">
    <div v-if="visible" class="ios-sheet-overlay" @click.self="close">
      <div class="ios-sheet" :class="'ios-sheet-' + detent">
        <div class="ios-sheet-grabber" @touchstart="onGrabStart"></div>
        <div class="ios-sheet-content">
          <slot></slot>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'IOSSheet',
  props: {
    visible: { type: Boolean, default: false },
    detent: { type: String, default: 'large' }
  },
  methods: {
    close: function() {
      this.$emit('close');
    },
    onGrabStart: function() {
      this.close();
    }
  }
};
</script>

<style scoped>
.ios-sheet-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: var(--glass-blur-thin);
  -webkit-backdrop-filter: var(--glass-blur-thin);
  z-index: var(--z-overlay);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.ios-sheet {
  width: 100%;
  max-width: 500px;
  background: var(--card-bg);
  border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.ios-sheet-medium {
  height: 50vh;
}

.ios-sheet-large {
  height: 80vh;
}

.ios-sheet-grabber {
  width: 36px;
  height: 5px;
  background: rgba(60, 60, 67, 0.3);
  border-radius: var(--radius-pill);
  margin: var(--spacing-sm) auto;
  cursor: pointer;
  flex-shrink: 0;
}

.ios-sheet-content {
  flex: 1;
  overflow: auto;
  padding: 0 var(--spacing-md) var(--spacing-lg);
}

.ios-sheet-enter-active {
  transition: opacity var(--duration-slow) var(--ease-standard);
}
.ios-sheet-enter-active .ios-sheet {
  transition: transform var(--duration-slow) var(--ease-decelerate);
}
.ios-sheet-leave-active {
  transition: opacity var(--duration-normal) var(--ease-standard);
}
.ios-sheet-leave-active .ios-sheet {
  transition: transform var(--duration-normal) var(--ease-accelerate);
}
.ios-sheet-enter,
.ios-sheet-leave-to {
  opacity: 0;
}
.ios-sheet-enter .ios-sheet,
.ios-sheet-leave-to .ios-sheet {
  transform: translateY(100%);
}
</style>

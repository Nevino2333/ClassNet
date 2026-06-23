<template>
  <div class="ios-nav-bar">
    <div class="ios-nav-bar-main">
      <div class="ios-nav-bar-left">
        <button class="ios-nav-bar-back" v-if="showBack" @click="goBack">
          <i class="fa-solid fa-chevron-left"></i>
          <span v-if="backText" class="ios-nav-bar-back-text">{{ backText }}</span>
        </button>
        <slot name="left"></slot>
      </div>
      <div class="ios-nav-bar-center">
        <h1 class="ios-nav-bar-title">{{ title }}</h1>
      </div>
      <div class="ios-nav-bar-right">
        <slot name="right"></slot>
      </div>
    </div>
    <div class="ios-nav-bar-large-title" v-if="largeTitle">
      <h1 class="ios-nav-bar-large-title-text">{{ title }}</h1>
    </div>
  </div>
</template>

<script>
export default {
  name: 'IOSNavBar',
  props: {
    title: { type: String, default: '' },
    largeTitle: { type: Boolean, default: false },
    showBack: { type: Boolean, default: true },
    backText: { type: String, default: '' }
  },
  methods: {
    goBack: function() {
      if (window.history.length > 1) {
        this.$router.go(-1);
      } else {
        this.$router.push({ name: 'Desktop' });
      }
    }
  }
};
</script>

<style scoped>
.ios-nav-bar {
  flex-shrink: 0;
}

.ios-nav-bar-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 var(--spacing-sm);
  background: var(--nav-bg);
  backdrop-filter: var(--glass-blur-container);
  -webkit-backdrop-filter: var(--glass-blur-container);
  border-bottom: 0.5px solid var(--separator-color);
}

.ios-nav-bar-left {
  display: flex;
  align-items: center;
  min-width: 70px;
}

.ios-nav-bar-back {
  display: flex;
  align-items: center;
  gap: 2px;
  border: none;
  background: transparent;
  color: var(--primary-color);
  font-size: var(--font-size-body);
  font-family: var(--font-family);
  cursor: pointer;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  transition: opacity var(--duration-fast) var(--ease-standard);
  -webkit-tap-highlight-color: transparent;
}

.ios-nav-bar-back:active {
  opacity: 0.7;
}

.ios-nav-bar-back-text {
  font-size: var(--font-size-body);
}

.ios-nav-bar-center {
  flex: 1;
  text-align: center;
  overflow: hidden;
}

.ios-nav-bar-title {
  font-size: var(--font-size-subheadline);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ios-nav-bar-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 70px;
  gap: var(--spacing-xs);
}

.ios-nav-bar-large-title {
  padding: 0 var(--spacing-md) var(--spacing-sm);
  background: var(--nav-bg);
  backdrop-filter: var(--glass-blur-container);
  -webkit-backdrop-filter: var(--glass-blur-container);
}

.ios-nav-bar-large-title-text {
  font-size: var(--font-size-largeTitle);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin: 0;
}
</style>

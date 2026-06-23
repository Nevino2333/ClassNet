<template>
  <div class="browser-page" :class="{ 'browser-fullscreen': isFullscreen }">
    <div v-if="!isFullscreen" class="browser-toolbar">
      <button class="browser-back-btn" @click="goBack" title="返回">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      <div class="browser-url-bar">
        <i class="fa-solid fa-globe browser-url-icon"></i>
        <span class="browser-url-text">{{ displayUrl }}</span>
      </div>
      <button class="browser-action-btn" @click="toggleFullscreen" title="全屏">
        <i class="fa-solid fa-expand"></i>
      </button>
    </div>
    <div v-if="isFullscreen" class="browser-float-back" @click="toggleFullscreen" title="退出全屏">
      <i class="fa-solid fa-compress"></i>
    </div>
    <iframe
      ref="browserFrame"
      :src="currentUrl"
      class="browser-iframe"
      sandbox="allow-scripts allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox"
      allow="clipboard-read; clipboard-write"
    ></iframe>
  </div>
</template>

<script>
export default {
  name: 'Browser',
  data: function() {
    return {
      currentUrl: '',
      displayUrl: '',
      isFullscreen: false
    };
  },
  created: function() {
    var url = this.$route.query.url || '';
    if (!url) {
      this.$router.push({ name: 'Desktop' });
      return;
    }
    this.currentUrl = url;
    this.displayUrl = url;
  },
  methods: {
    goBack: function() {
      this.$router.push({ name: 'Desktop' });
    },
    toggleFullscreen: function() {
      this.isFullscreen = !this.isFullscreen;
    }
  }
};
</script>

<style scoped>
.browser-page {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  background: var(--card-bg);
  z-index: 9999;
}
.browser-toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--nav-bg);
  backdrop-filter: var(--glass-blur-container);
  -webkit-backdrop-filter: var(--glass-blur-container);
  border-bottom: 0.5px solid var(--separator-color);
  flex-shrink: 0;
  height: 44px;
}
.browser-back-btn {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-callout);
  color: var(--primary-color);
  cursor: pointer;
  flex-shrink: 0;
  transition: transform var(--duration-fast) var(--ease-standard), opacity var(--duration-fast) var(--ease-standard), background var(--duration-fast) var(--ease-standard);
}
.browser-back-btn:hover {
  background: var(--primary-light);
}
.browser-back-btn:active {
  transform: scale(0.92);
  opacity: 0.7;
}
.browser-url-bar {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  background: var(--bg-color);
  padding: 0 var(--spacing-md);
  border-radius: var(--radius-md);
  min-width: 0;
  height: 44px;
}
.browser-url-icon {
  color: var(--text-tertiary);
  font-size: var(--font-size-caption);
  flex-shrink: 0;
}
.browser-url-text {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.browser-action-btn {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-callout);
  color: var(--primary-color);
  cursor: pointer;
  flex-shrink: 0;
  transition: transform var(--duration-fast) var(--ease-standard), opacity var(--duration-fast) var(--ease-standard), background var(--duration-fast) var(--ease-standard);
}
.browser-action-btn:hover {
  background: var(--primary-light);
}
.browser-action-btn:active {
  transform: scale(0.92);
  opacity: 0.7;
}
.browser-float-back {
  position: fixed;
  top: var(--spacing-md);
  left: var(--spacing-md);
  width: 44px;
  height: 44px;
  border-radius: var(--radius-pill);
  background: var(--island-bg);
  color: var(--island-text);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-callout);
  cursor: pointer;
  z-index: 10001;
  transition: transform var(--duration-fast) var(--ease-standard), opacity var(--duration-fast) var(--ease-standard), background var(--duration-fast) var(--ease-standard);
}
.browser-float-back:hover {
  background: var(--island-bg);
  opacity: 0.85;
}
.browser-float-back:active {
  transform: scale(0.92);
  opacity: 0.7;
}
.browser-iframe {
  flex: 1;
  width: 100%;
  border: none;
  background: var(--card-bg);
}
</style>

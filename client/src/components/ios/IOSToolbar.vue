<template>
  <div class="ios-toolbar">
    <slot></slot>
  </div>
</template>

<script>
export default {
  name: 'IOSToolbar'
};
</script>

<style scoped>
.ios-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--nav-bg);
  backdrop-filter: var(--glass-blur-container);
  -webkit-backdrop-filter: var(--glass-blur-container);
  border-top: 0.5px solid var(--separator-color);
  min-height: 44px;
}
</style>

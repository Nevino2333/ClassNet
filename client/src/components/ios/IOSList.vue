<template>
  <div class="ios-list">
    <div class="ios-list-header" v-if="header">{{ header }}</div>
    <div class="ios-list-body">
      <slot></slot>
    </div>
    <div class="ios-list-footer" v-if="footer">{{ footer }}</div>
  </div>
</template>

<script>
export default {
  name: 'IOSList',
  props: {
    header: { type: String, default: '' },
    footer: { type: String, default: '' }
  }
};
</script>

<style scoped>
.ios-list {
  margin: 0 var(--spacing-md);
  background: var(--card-bg);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.ios-list-header {
  padding: var(--spacing-sm) var(--spacing-md) var(--spacing-xs);
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-regular);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.ios-list-footer {
  padding: var(--spacing-xs) var(--spacing-md) var(--spacing-sm);
  font-size: var(--font-size-caption);
  color: var(--text-secondary);
}

.ios-list-body > * + * {
  border-top: 0.5px solid var(--separator-color);
}
</style>

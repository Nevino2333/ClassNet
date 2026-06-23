<template>
  <div class="ios-card" :class="{ 'ios-card-inset': inset }">
    <slot></slot>
  </div>
</template>

<script>
export default {
  name: 'IOSCard',
  props: {
    inset: {
      type: Boolean,
      default: false
    }
  }
};
</script>

<style scoped>
.ios-card {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.ios-card-inset {
  margin: 0 var(--spacing-md);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
}
</style>

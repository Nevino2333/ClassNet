<template>
  <span class="ios-badge" :class="'ios-badge-' + variant" :style="badgeStyle">
    <slot>{{ count }}</slot>
  </span>
</template>

<script>
export default {
  name: 'IOSBadge',
  props: {
    count: { type: [String, Number], default: '' },
    variant: { type: String, default: 'primary' },
    color: { type: String, default: '' }
  },
  computed: {
    badgeStyle: function() {
      if (this.color) {
        return { background: this.color };
      }
      return {};
    }
  }
};
</script>

<style scoped>
.ios-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  font-weight: var(--font-weight-semibold);
  color: #FFFFFF;
  font-family: var(--font-family);
  line-height: 1;
}

.ios-badge-primary {
  background: var(--primary-color);
}

.ios-badge-danger {
  background: var(--danger-color);
}

.ios-badge-success {
  background: var(--success-color);
}

.ios-badge-warning {
  background: var(--warning-color);
}
</style>

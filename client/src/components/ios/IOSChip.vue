<template>
  <span class="ios-chip" :class="{ 'ios-chip-selected': selected }" @click="$emit('click', $event)">
    <i :class="icon" v-if="icon" class="ios-chip-icon"></i>
    <span class="ios-chip-label"><slot></slot></span>
    <button class="ios-chip-close" v-if="closable" @click.stop="$emit('close')">
      <i class="fa-solid fa-xmark"></i>
    </button>
  </span>
</template>

<script>
export default {
  name: 'IOSChip',
  props: {
    icon: { type: String, default: '' },
    selected: { type: Boolean, default: false },
    closable: { type: Boolean, default: false }
  }
};
</script>

<style scoped>
.ios-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  background: rgba(118, 118, 128, 0.12);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-standard);
  -webkit-tap-highlight-color: transparent;
  -webkit-user-select: none;
  user-select: none;
}

.ios-chip-selected {
  background: var(--primary-color);
  color: #FFFFFF;
}

.ios-chip-icon {
  font-size: 12px;
}

.ios-chip-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.15);
  color: inherit;
  font-size: 9px;
  cursor: pointer;
  margin-left: 2px;
  -webkit-tap-highlight-color: transparent;
}
</style>

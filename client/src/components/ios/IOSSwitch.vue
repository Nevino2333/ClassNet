<template>
  <button
    class="ios-switch"
    :class="{ 'ios-switch-on': value, 'ios-switch-disabled': disabled }"
    :style="switchStyle"
    :disabled="disabled"
    @click="toggle"
  >
    <span class="ios-switch-thumb"></span>
  </button>
</template>

<script>
export default {
  name: 'IOSSwitch',
  props: {
    value: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    color: { type: String, default: '' }
  },
  computed: {
    switchStyle: function() {
      if (this.value && this.color) {
        return { background: this.color };
      }
      return {};
    }
  },
  methods: {
    toggle: function() {
      if (!this.disabled) {
        this.$emit('input', !this.value);
        this.$emit('change', !this.value);
      }
    }
  }
};
</script>

<style scoped>
.ios-switch {
  position: relative;
  width: 51px;
  height: 31px;
  border: none;
  border-radius: var(--radius-pill);
  background: rgba(120, 120, 128, 0.16);
  cursor: pointer;
  flex-shrink: 0;
  transition: background var(--duration-normal) var(--ease-standard);
  -webkit-tap-highlight-color: transparent;
}

.ios-switch-on {
  background: var(--success-color);
}

.ios-switch-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ios-switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 27px;
  height: 27px;
  border-radius: 50%;
  background: #FFFFFF;
  box-shadow: var(--shadow-md);
  transition: transform var(--duration-normal) var(--ease-standard);
}

.ios-switch-on .ios-switch-thumb {
  transform: translateX(20px);
}
</style>

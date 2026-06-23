<template>
  <div class="ios-segmented" :class="{ 'ios-segmented-disabled': disabled }">
    <div class="ios-segmented-thumb" :style="thumbStyle"></div>
    <button
      v-for="(seg, idx) in segments"
      :key="idx"
      class="ios-segmented-item"
      :class="{ 'ios-segmented-item-active': value === seg.value }"
      :disabled="disabled"
      @click="select(seg.value)"
    >
      <i :class="seg.icon" v-if="seg.icon"></i>
      <span>{{ seg.label }}</span>
    </button>
  </div>
</template>

<script>
export default {
  name: 'IOSSegmented',
  props: {
    segments: { type: Array, default: function() { return []; } },
    value: { type: [String, Number], default: '' },
    disabled: { type: Boolean, default: false }
  },
  data: function() {
    return {
      thumbWidth: 0,
      thumbLeft: 0
    };
  },
  computed: {
    thumbStyle: function() {
      return {
        width: this.thumbWidth + 'px',
        transform: 'translateX(' + this.thumbLeft + 'px)'
      };
    }
  },
  watch: {
    value: function() {
      var self = this;
      this.$nextTick(function() { self.updateThumb(); });
    },
    segments: function() {
      var self = this;
      this.$nextTick(function() { self.updateThumb(); });
    }
  },
  mounted: function() {
    var self = this;
    this.$nextTick(function() { self.updateThumb(); });
  },
  methods: {
    select: function(val) {
      if (!this.disabled) {
        this.$emit('input', val);
        this.$emit('change', val);
      }
    },
    updateThumb: function() {
      var items = this.$el.querySelectorAll('.ios-segmented-item');
      if (items.length === 0) return;
      var itemWidth = items[0].offsetWidth;
      this.thumbWidth = itemWidth;
      var activeIdx = 0;
      for (var i = 0; i < this.segments.length; i++) {
        if (this.segments[i].value === this.value) {
          activeIdx = i;
          break;
        }
      }
      this.thumbLeft = activeIdx * itemWidth;
    }
  }
};
</script>

<style scoped>
.ios-segmented {
  position: relative;
  display: flex;
  height: 32px;
  background: rgba(118, 118, 128, 0.12);
  border-radius: var(--radius-md);
  padding: 2px;
}

.ios-segmented-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  height: calc(100% - 4px);
  background: var(--card-bg);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
  transition: transform var(--duration-normal) var(--ease-standard),
              width var(--duration-normal) var(--ease-standard);
}

.ios-segmented-item {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: none;
  background: transparent;
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  cursor: pointer;
  transition: color var(--duration-fast) var(--ease-standard);
  -webkit-tap-highlight-color: transparent;
}

.ios-segmented-disabled {
  opacity: 0.5;
}

.ios-segmented-disabled .ios-segmented-item {
  cursor: not-allowed;
}
</style>

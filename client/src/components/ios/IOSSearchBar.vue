<template>
  <div class="ios-search-bar">
    <i class="fa-solid fa-magnifying-glass ios-search-icon"></i>
    <input
      class="ios-search-input"
      type="text"
      :value="value"
      :placeholder="placeholder"
      @input="$emit('input', $event.target.value)"
      @keydown.enter="$emit('search', $event.target.value)"
    />
    <button
      class="ios-search-clear"
      v-if="value"
      @click="$emit('input', '')"
    >
      <i class="fa-solid fa-xmark"></i>
    </button>
  </div>
</template>

<script>
export default {
  name: 'IOSSearchBar',
  props: {
    value: { type: String, default: '' },
    placeholder: { type: String, default: '搜索' }
  }
};
</script>

<style scoped>
.ios-search-bar {
  display: flex;
  align-items: center;
  height: 36px;
  padding: 0 var(--spacing-sm);
  background: rgba(118, 118, 128, 0.12);
  border-radius: var(--radius-md);
  gap: var(--spacing-xs);
}

.ios-search-icon {
  font-size: 14px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.ios-search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: var(--font-size-body);
  color: var(--text-primary);
  outline: none;
  font-family: var(--font-family);
}

.ios-search-input::placeholder {
  color: var(--text-tertiary);
}

.ios-search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: var(--text-tertiary);
  color: var(--card-bg);
  font-size: 10px;
  cursor: pointer;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}
</style>

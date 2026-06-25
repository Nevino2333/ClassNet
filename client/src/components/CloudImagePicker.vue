<template>
  <div class="cloud-picker-overlay" @click.self="$emit('close')">
    <div class="cloud-picker-sheet">
      <div class="picker-header">
        <span>选择云盘图片</span>
        <button class="picker-close" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="picker-search">
        <i class="fa-solid fa-magnifying-glass picker-search-icon"></i>
        <input v-model="searchQuery" class="picker-search-input" placeholder="搜索图片..." />
      </div>
      <div class="picker-content">
        <div v-if="loading" class="picker-loading">
          <i class="fa-solid fa-spinner fa-spin"></i>
          <span>加载中...</span>
        </div>
        <div v-else-if="filteredFiles.length === 0" class="picker-empty">
          <i class="fa-solid fa-cloud"></i>
          <span>{{ searchQuery ? '无匹配图片' : '云盘无图片' }}</span>
        </div>
        <div v-else class="picker-grid">
          <div
            v-for="file in filteredFiles"
            :key="file.name"
            class="picker-item"
            @click="selectFile(file)"
          >
            <img :src="file.url" :alt="file.name" loading="lazy" class="picker-img" />
            <div class="picker-name">{{ file.name }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import api from '@/utils/api';

export default {
  name: 'CloudImagePicker',
  data: function() {
    return {
      files: [],
      loading: true,
      searchQuery: ''
    };
  },
  computed: {
    filteredFiles: function() {
      var self = this;
      if (!self.searchQuery) return self.files;
      var query = self.searchQuery.toLowerCase();
      return self.files.filter(function(file) {
        return file.name.toLowerCase().indexOf(query) > -1;
      });
    }
  },
  mounted: function() {
    this.loadFiles();
  },
  methods: {
    loadFiles: function() {
      var self = this;
      self.loading = true;
      api.get('/cloud/files').then(function(res) {
        self.files = res.data.data.files || [];
        self.loading = false;
      }).catch(function(err) {
        console.error('加载云盘文件失败:', err);
        self.loading = false;
        self.$store.commit('toast/SHOW_TOAST', { message: '加载云盘文件失败', type: 'error' });
      });
    },
    selectFile: function(file) {
      this.$emit('select', file);
      this.$emit('close');
    }
  }
};
</script>

<style scoped>
.cloud-picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 10002;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.cloud-picker-sheet {
  background: var(--card-bg);
  width: 100%;
  max-width: 500px;
  max-height: 70vh;
  border-radius: 16px 16px 0 0;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
}

.picker-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 20px;
  padding: 4px;
  cursor: pointer;
  transition: color 0.15s;
}

.picker-close:hover {
  color: var(--text-primary);
}

.picker-search {
  padding: 12px 20px;
  position: relative;
}

.picker-search-icon {
  position: absolute;
  left: 32px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  font-size: 14px;
}

.picker-search-input {
  width: 100%;
  padding: 10px 12px 10px 36px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-color);
  color: var(--text-primary);
  font-size: 14px;
  transition: border-color 0.15s;
}

.picker-search-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.picker-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.picker-loading,
.picker-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  color: var(--text-tertiary);
  font-size: 14px;
}

.picker-loading i,
.picker-empty i {
  font-size: 32px;
}

.picker-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.picker-item {
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-md);
  background: var(--bg-color);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.picker-item:hover {
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.picker-img {
  width: 100%;
  height: 80px;
  object-fit: cover;
  background: var(--border-color);
}

.picker-name {
  padding: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
}
</style>
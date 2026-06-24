<template>
  <div class="cloud-drive">
    <AppNavBar title="我的云盘">
      <template slot="actions">
        <button class="nav-action-btn" @click="triggerUpload" title="上传">
          <i class="fa-solid fa-cloud-arrow-up"></i>
        </button>
      </template>
    </AppNavBar>

    <input ref="fileInput" type="file" accept="image/*" multiple style="display:none" @change="handleUpload" />

    <div class="cloud-content">
      <div v-if="loading" class="loading-state">
        <div class="skeleton-pulse"></div>
      </div>

      <div v-else-if="files.length === 0" class="empty-state">
        <i class="fa-solid fa-cloud"></i>
        <p>云盘为空</p>
        <button class="upload-btn" @click="triggerUpload">上传照片</button>
      </div>

      <div v-else class="file-grid">
        <div v-for="file in files" :key="file.name" class="file-card">
          <div class="file-preview" @click="previewFile(file)">
            <img :src="file.url" :alt="file.name" loading="lazy" />
          </div>
          <div class="file-info">
            <span class="file-name">{{ file.name }}</span>
            <span class="file-size">{{ formatSize(file.size) }}</span>
          </div>
          <button class="file-delete" @click="deleteFile(file)">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- 图片预览 -->
    <div v-if="previewUrl" class="preview-overlay" @click.self="previewUrl = ''">
      <img :src="previewUrl" class="preview-img" />
      <button class="preview-close" @click="previewUrl = ''"><i class="fa-solid fa-xmark"></i></button>
    </div>

    <!-- 上传中提示 -->
    <div v-if="uploading" class="upload-progress">
      <div class="upload-spinner"></div>
      <span>上传中...</span>
    </div>
  </div>
</template>

<script>
import AppNavBar from '@/components/AppNavBar.vue';
import api from '@/utils/api';

export default {
  name: 'CloudDrive',
  components: { AppNavBar: AppNavBar },
  data: function() {
    return {
      files: [],
      loading: true,
      uploading: false,
      previewUrl: ''
    };
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
      }).catch(function() {
        self.loading = false;
      });
    },
    triggerUpload: function() {
      this.$refs.fileInput.click();
    },
    handleUpload: function(e) {
      var self = this;
      var files = e.target.files;
      if (!files || files.length === 0) return;

      self.uploading = true;
      var formData = new FormData();
      for (var i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      api.post('/cloud/upload-batch', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }).then(function(res) {
        if (res.data.code === 200) {
          self.$store.commit('toast/SHOW_TOAST', { message: '上传成功', type: 'success' });
          self.loadFiles();
        } else {
          self.$store.commit('toast/SHOW_TOAST', { message: res.data.message || '上传失败', type: 'error' });
        }
      }).catch(function(err) {
        var msg = '上传失败';
        if (err.response && err.response.data && err.response.data.message) {
          msg = err.response.data.message;
        }
        self.$store.commit('toast/SHOW_TOAST', { message: msg, type: 'error' });
      }).finally(function() {
        self.uploading = false;
        e.target.value = '';
      });
    },
    deleteFile: function(file) {
      var self = this;
      if (!confirm('确认删除？')) return;
      api.delete('/cloud/files/' + encodeURIComponent(file.name)).then(function(res) {
        if (res.data.code === 200) {
          self.files = self.files.filter(function(f) { return f.name !== file.name; });
        }
      }).catch(function() {
        self.$store.commit('toast/SHOW_TOAST', { message: '删除失败', type: 'error' });
      });
    },
    previewFile: function(file) {
      this.previewUrl = file.url;
    },
    formatSize: function(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    }
  }
};
</script>

<style scoped>
.cloud-drive {
  min-height: 100vh;
  background: var(--bg-color);
}
.nav-action-btn {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-callout);
  color: var(--primary-color);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.15s;
}
.nav-action-btn:hover { background: var(--primary-light); }
.nav-action-btn:active { transform: scale(0.92); opacity: 0.7; }
.cloud-content {
  padding: 16px;
}
.loading-state {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}
.skeleton-pulse {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--accent-color);
  animation: pulse 1s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 20px;
  color: var(--text-color-secondary);
}
.empty-state i {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.3;
}
.upload-btn {
  margin-top: 16px;
  padding: 10px 24px;
  background: var(--accent-color);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-body);
  cursor: pointer;
}
.upload-btn:active { transform: scale(0.95); opacity: 0.8; }
.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}
.file-card {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  overflow: hidden;
  position: relative;
  box-shadow: var(--shadow-sm);
}
.file-preview {
  width: 100%;
  aspect-ratio: 1;
  background: var(--bg-color-secondary);
  cursor: pointer;
  overflow: hidden;
}
.file-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.file-info {
  padding: 8px;
}
.file-name {
  display: block;
  font-size: var(--font-size-caption2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.file-size {
  font-size: var(--font-size-caption2);
  color: var(--text-color-secondary);
}
.file-delete {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(0,0,0,0.5);
  color: #fff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}
.file-card:active .file-delete { opacity: 1; }
.preview-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.9);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview-img {
  max-width: 95%;
  max-height: 95%;
  object-fit: contain;
}
.preview-close {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  color: #fff;
  border: none;
  font-size: 20px;
  cursor: pointer;
}
.upload-progress {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: 100;
}
.upload-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--separator-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>

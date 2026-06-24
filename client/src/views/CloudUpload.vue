<template>
  <div class="cloud-upload-page">
    <div class="upload-header">
      <h2>照片上传</h2>
    </div>
    <div class="upload-body">
      <div v-if="!uploading && !uploaded" class="upload-actions">
        <button class="upload-action-btn" @click="takePhoto">
          <i class="fa-solid fa-camera"></i>
          <span>拍照上传</span>
        </button>
        <button class="upload-action-btn" @click="selectFromAlbum">
          <i class="fa-solid fa-images"></i>
          <span>从相册选择</span>
        </button>
      </div>
      <div v-if="uploading" class="upload-loading">
        <div class="upload-spinner"></div>
        <p>正在上传...</p>
      </div>
      <div v-if="uploaded" class="upload-success">
        <i class="fa-solid fa-circle-check"></i>
        <p>上传成功！</p>
        <button class="upload-again" @click="uploaded = false">继续上传</button>
      </div>
    </div>
    <input ref="fileInput" type="file" accept="image/*" capture="environment" style="display:none" @change="handleFile" />
  </div>
</template>

<script>
import api from '@/utils/api';

export default {
  name: 'CloudUpload',
  data: function() {
    return {
      uploading: false,
      uploaded: false
    };
  },
  methods: {
    takePhoto: function() {
      // 尝试调用 X5 拍照，回退到 file input
      if (window.AndroidJSBridge && window.AndroidJSBridge.takePhoto) {
        window.AndroidJSBridge.takePhoto();
      } else {
        this.$refs.fileInput.setAttribute('capture', 'environment');
        this.$refs.fileInput.click();
      }
    },
    selectFromAlbum: function() {
      this.$refs.fileInput.removeAttribute('capture');
      this.$refs.fileInput.click();
    },
    handleFile: function(e) {
      var self = this;
      var file = e.target.files[0];
      if (!file) return;

      self.uploading = true;
      var formData = new FormData();
      formData.append('file', file);

      api.post('/cloud/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }).then(function(res) {
        self.uploading = false;
        if (res.data.code === 200) {
          self.uploaded = true;
        } else {
          alert(res.data.message || '上传失败，请重试');
        }
      }).catch(function(err) {
        self.uploading = false;
        var msg = '上传失败，请重试';
        if (err.response && err.response.data && err.response.data.message) {
          msg = err.response.data.message;
        }
        alert(msg);
      }).finally(function() {
        e.target.value = '';
      });
    }
  }
};
</script>

<style scoped>
.cloud-upload-page {
  min-height: 100vh;
  background: var(--bg-color);
  display: flex;
  flex-direction: column;
}
.upload-header {
  padding: 20px;
  text-align: center;
  border-bottom: 0.5px solid var(--separator-color);
}
.upload-header h2 {
  font-size: var(--font-size-title3);
  font-weight: 600;
  margin: 0;
}
.upload-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}
.upload-actions {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  max-width: 300px;
}
.upload-action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 30px;
  background: var(--card-bg);
  border: none;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
}
.upload-action-btn:active { transform: scale(0.95); opacity: 0.8; }
.upload-action-btn i { font-size: 40px; color: var(--accent-color); }
.upload-action-btn span { font-size: var(--font-size-body); }
.upload-loading, .upload-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.upload-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--separator-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.upload-success i { font-size: 60px; color: var(--success-color); }
.upload-again {
  padding: 10px 24px;
  background: var(--accent-color);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
}
.upload-again:active { transform: scale(0.95); opacity: 0.8; }
</style>

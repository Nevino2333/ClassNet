<template>
  <div class="lock-screen" @click="handleTap" @touchend.prevent="handleTap">
    <div class="lock-center">
      <i class="fa-solid fa-lock lock-icon"></i>
      <span class="lock-text">锁屏中</span>
    </div>
    <div class="lock-footer">
      <span class="lock-footer-item">{{ wifiName }}</span>
      <span class="lock-footer-divider">|</span>
      <span class="lock-footer-item">{{ classInfo }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LockScreen',
  data: function() {
    return {
      tapTimes: [],
      wifiName: 'WIFI: ChangyanSTU118',
      classInfo: ''
    };
  },
  created: function() {
    var self = this;
    var host = window.location.hostname;
    var port = window.location.port || '80';
    self.classInfo = '班级名称/IP: 智慧课堂(' + host + ':' + port + ')';
  },
  methods: {
    handleTap: function(e) {
      var x = e.clientX;
      var y = e.clientY;
      if (e.changedTouches && e.changedTouches.length > 0) {
        x = e.changedTouches[0].clientX;
        y = e.changedTouches[0].clientY;
      }
      var w = window.innerWidth;
      var h = window.innerHeight;
      if (x < w * 0.7 || y > h * 0.3) return;
      var now = Date.now();
      this.tapTimes.push(now);
      if (this.tapTimes.length > 10) {
        this.tapTimes = this.tapTimes.slice(-10);
      }
      if (this.tapTimes.length === 10) {
        var diff = this.tapTimes[9] - this.tapTimes[0];
        if (diff < 3000) {
          this.$emit('unlock');
          this.tapTimes = [];
        }
      }
    }
  }
};
</script>

<style scoped>
.lock-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  z-index: 99999;
  cursor: default;
  -webkit-user-select: none;
  user-select: none;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.lock-center {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.lock-icon {
  font-size: 52px;
  color: #777;
  margin-bottom: 24px;
}

.lock-text {
  font-size: 13.5px;
  color: #777;
  letter-spacing: 2.5px;
  font-weight: 400;
}

.lock-footer {
  position: absolute;
  bottom: 18px;
  left: 28px;
  right: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.lock-footer-item {
  font-size: 11.5px;
  color: #666;
  white-space: nowrap;
  letter-spacing: 0.5px;
}

.lock-footer-divider {
  font-size: 11.5px;
  color: #555;
}
</style>

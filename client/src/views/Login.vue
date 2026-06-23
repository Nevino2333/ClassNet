<template>
  <div class="login-page" :class="{ 'page-enter': entered }">
    <div class="login-card">
      <div class="login-header">
        <div class="logo-icon">C</div>
        <h1 class="login-title">ClassNet</h1>
        <p class="login-subtitle">智慧校园平台</p>
      </div>
      <form class="login-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <input
            v-model="account"
            type="text"
            class="form-input"
            :class="{ 'input-error': accountError }"
            placeholder="用户名/ID/网名"
            autocomplete="username"
            aria-label="账号"
            @input="accountError = false"
          />
        </div>
        <div class="form-group" style="position: relative;">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            class="form-input"
            :class="{ 'input-error': passwordError }"
            placeholder="密码"
            autocomplete="current-password"
            aria-label="密码"
            @input="passwordError = false"
          />
          <button type="button" class="password-toggle" @click="showPassword = !showPassword" :aria-label="showPassword ? '隐藏密码' : '显示密码'">
            <i :class="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"></i>
          </button>
        </div>
        <transition name="error-fade">
          <div v-if="errorMsg" class="error-message" role="alert">{{ errorMsg }}</div>
        </transition>
        <button type="submit" class="btn-primary" :disabled="loading">
          <span v-if="loading" class="btn-loading"></span>
          <span v-else>登 录</span>
        </button>
      </form>
      <div class="login-footer">
        <span class="footer-text">还没有账号？</span>
        <router-link to="/register" class="footer-link">立即注册</router-link>
        <span v-if="isLoggedIn" class="footer-divider">|</span>
        <router-link v-if="isLoggedIn" to="/" class="footer-link">返回桌面</router-link>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Login',
  data: function() {
    return {
      account: '',
      password: '',
      errorMsg: '',
      loading: false,
      accountError: false,
      passwordError: false,
      entered: false,
      showPassword: false
    };
  },
  computed: {
    isLoggedIn: function() {
      return !!this.$store.state.auth.token;
    }
  },
  mounted: function() {
    var self = this;
    self.$nextTick(function() {
      self.entered = true;
    });
  },
  methods: {
    handleLogin: function() {
      var self = this;
      self.errorMsg = '';
      self.accountError = false;
      self.passwordError = false;
      if (!self.account.trim()) {
        self.accountError = true;
        self.errorMsg = '请输入用户名';
        return;
      }
      if (!self.password) {
        self.passwordError = true;
        self.errorMsg = '请输入密码';
        return;
      }
      self.loading = true;
      self.$store
        .dispatch('auth/login', {
          account: self.account.trim(),
          password: self.password
        })
        .then(function() {
          self.$router.push({ name: 'Desktop' });
        })
        .catch(function(err) {
          var data = err.response && err.response.data;
          self.errorMsg = (data && data.message) || '登录失败，请检查用户名和密码';
          if (self.errorMsg.indexOf('用户') > -1 || self.errorMsg.indexOf('账号') > -1) {
            self.accountError = true;
          } else if (self.errorMsg.indexOf('密码') > -1) {
            self.passwordError = true;
          }
        })
        .finally(function() {
          self.loading = false;
        });
    }
  }
};
</script>

<style scoped>
.login-page {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary-color) 100%);
  opacity: 0;
  transform: translateY(20px);
  transition: opacity var(--duration-slow) var(--ease-standard), transform var(--duration-slow) var(--ease-standard);
}

.login-page.page-enter {
  opacity: 1;
  transform: translateY(0);
}

.login-card {
  width: 420px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur-container);
  -webkit-backdrop-filter: var(--glass-blur-container);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  padding: 48px 40px;
  box-shadow: var(--shadow-lg);
}

.login-header {
  text-align: center;
  margin-bottom: 36px;
}

.logo-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  background: var(--primary-color);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-title1);
  font-weight: var(--font-weight-bold);
  color: var(--card-bg);
}

.login-title {
  font-size: var(--font-size-title1);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin-bottom: 4px;
}

.login-subtitle {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.form-group {
  width: 100%;
}

.form-input {
  width: 100%;
  height: 48px;
  padding: 0 16px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: var(--font-size-callout);
  color: var(--text-primary);
  background: var(--bg-color);
  transition: border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard);
}

.form-input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.15);
}

.form-input.input-error {
  border-color: var(--danger-color);
  box-shadow: 0 0 0 3px rgba(var(--danger-rgb), 0.15);
}

.password-toggle {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: var(--font-size-sm);
  transition: color var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard), opacity var(--duration-fast) var(--ease-standard);
}
.password-toggle:hover {
  color: var(--text-secondary);
}
.password-toggle:active {
  transform: translateY(-50%) scale(0.92);
  opacity: 0.7;
}

.form-input::placeholder {
  color: var(--text-secondary);
}

.error-message {
  padding: 10px 14px;
  background: rgba(var(--danger-rgb), 0.1);
  color: var(--danger-color);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  text-align: center;
}

.error-fade-enter-active,
.error-fade-leave-active {
  transition: opacity 0.25s, transform 0.25s;
}

.error-fade-enter,
.error-fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

.btn-primary {
  width: 100%;
  height: 50px;
  background: var(--primary-color);
  color: var(--card-bg);
  border-radius: var(--radius-md);
  font-size: var(--font-size-subheadline);
  font-weight: var(--font-weight-semibold);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard), opacity var(--duration-fast) var(--ease-standard);
}

.btn-primary:hover {
  background: var(--primary-hover);
}

.btn-primary:active {
  transform: scale(0.92);
  opacity: 0.7;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-loading {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s var(--ease-standard) infinite;
}

.login-footer {
  text-align: center;
  margin-top: 24px;
  font-size: var(--font-size-footnote);
}

.footer-text {
  color: var(--text-secondary);
}

.footer-divider {
  color: var(--text-secondary);
  margin: 0 var(--spacing-sm);
}

.footer-link {
  color: var(--primary-color);
  font-weight: var(--font-weight-medium);
  margin-left: var(--spacing-xs);
}

.footer-link:hover {
  text-decoration: underline;
}
</style>

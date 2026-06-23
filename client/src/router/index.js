import Vue from 'vue';
import VueRouter from 'vue-router';
import api from '@/utils/api';

Vue.use(VueRouter);

var routes = [
  {
    path: '/login',
    name: 'Login',
    component: function() { return import('@/views/Login.vue'); }
  },
  {
    path: '/register',
    name: 'Register',
    component: function() { return import('@/views/Register.vue'); }
  },
  {
    path: '/banned',
    name: 'Banned',
    component: function() { return import('@/views/Banned.vue'); }
  },
  {
    path: '/',
    name: 'Desktop',
    component: function() { return import('@/views/Desktop.vue'); },
    meta: { requiresAuth: true }
  },
  {
    path: '/announcements',
    name: 'Announcements',
    component: function() { return import('@/views/Announcements.vue'); },
    meta: { requiresAuth: true }
  },
  {
    path: '/browser',
    name: 'Browser',
    component: function() { return import('@/views/Browser.vue'); },
    meta: { requiresAuth: true }
  },
  {
    path: '/chat',
    name: 'Chat',
    component: function() { return import('@/views/Chat.vue'); },
    meta: { requiresAuth: true }
  },
  {
    path: '/community',
    name: 'Community',
    component: function() { return import('@/views/Community.vue'); },
    meta: { requiresAuth: true }
  },
  {
    path: '/weather',
    name: 'Weather',
    component: function() { return import('@/views/Weather.vue'); },
    meta: { requiresAuth: true }
  },
  {
    path: '/music',
    name: 'Music',
    component: function() { return import('@/views/Music.vue'); },
    meta: { requiresAuth: true }
  },
  {
    path: '/ai-chat',
    name: 'AIChat',
    component: function() { return import('@/views/AIChat.vue'); },
    meta: { requiresAuth: true }
  },
  {
    path: '/notes',
    name: 'Notes',
    component: function() { return import('@/views/Notes.vue'); },
    meta: { requiresAuth: true }
  },
  {
    path: '/resource',
    name: 'Resource',
    component: function() { return import('@/views/Resource.vue'); },
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: function() { return import('@/views/Settings.vue'); },
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: function() { return import('@/views/Admin.vue'); },
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '*',
    redirect: '/'
  }
];

var router = new VueRouter({
  mode: 'history',
  routes: routes
});

router.beforeEach(function(to, from, next) {
  var token = localStorage.getItem('token');
  var user = (function() { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch(e) { localStorage.removeItem('user'); return null; } })();

  if (user && user.status === 'disabled' && to.name !== 'Banned') {
    next({ name: 'Banned' });
    return;
  }

  if (to.name === 'Banned') {
    next();
    return;
  }

  if (to.meta.requiresAuth && !token) {
    next({ name: 'Login' });
  } else if (to.meta.requiresAdmin) {
    if (user && (user.is_admin === 1 || user.is_admin === true || user.role === 'officer')) {
      next();
    } else if (token) {
      api.get('/auth/check-status').then(function(response) {
        var data = response.data;
        if (data.code === 200 && data.data && data.data.user_info) {
          var userInfo = data.data.user_info;
          localStorage.setItem('user', JSON.stringify(userInfo));
          try { router.app.$store.commit('auth/SET_USER', userInfo); } catch (e) {}
          if (userInfo.is_admin === 1 || userInfo.is_admin === true || userInfo.role === 'officer') {
            next();
          } else {
            next({ name: 'Desktop' });
          }
        } else {
          next({ name: 'Desktop' });
        }
      }).catch(function() {
        next({ name: 'Desktop' });
      });
    } else {
      next({ name: 'Desktop' });
    }
  } else {
    next();
  }
});

export default router;

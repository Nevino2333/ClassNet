<template>
  <div class="weather-icon" :style="{ width: size + 'px', height: size + 'px' }">
    <div v-if="iconSvg" class="icon-svg" v-html="iconSvg"></div>
    <div v-else class="icon-placeholder"></div>
  </div>
</template>

<script>
var ICON_MAP = {
  '100': 'clear-day',
  '150': 'clear-night',
  '101': 'partly-cloudy-day',
  '151': 'partly-cloudy-night',
  '102': 'mostly-clear-day',
  '152': 'mostly-clear-night',
  '103': 'partly-cloudy-day',
  '153': 'partly-cloudy-night',
  '104': 'overcast-day',
  '154': 'overcast-night',
  '300': 'overcast-day-rain',
  '301': 'overcast-day-rain',
  '302': 'thunderstorms-day-rain',
  '303': 'thunderstorms-rain',
  '304': 'thunderstorms-day-hail',
  '305': 'drizzle',
  '306': 'rain',
  '307': 'rain',
  '308': 'extreme-rain',
  '309': 'drizzle',
  '310': 'extreme-rain',
  '311': 'extreme-rain',
  '312': 'extreme-rain',
  '313': 'overcast-day-sleet',
  '314': 'rain',
  '315': 'rain',
  '350': 'overcast-night-rain',
  '351': 'overcast-night-rain',
  '399': 'rain',
  '400': 'snow',
  '401': 'snow',
  '402': 'snow',
  '403': 'extreme-snow',
  '404': 'sleet',
  '405': 'sleet',
  '406': 'overcast-day-sleet',
  '407': 'snow',
  '408': 'snow',
  '409': 'snow',
  '410': 'extreme-snow',
  '456': 'overcast-night-sleet',
  '457': 'overcast-night-sleet',
  '499': 'snow',
  '500': 'fog-day',
  '501': 'fog-day',
  '502': 'haze-day',
  '503': 'dust-day',
  '504': 'dust-day',
  '507': 'dust-day',
  '508': 'dust-day',
  '509': 'fog-day',
  '510': 'fog-day',
  '511': 'fog-day',
  '512': 'fog-day',
  '513': 'fog-day',
  '514': 'fog-day',
  '515': 'fog-day',
  '599': 'fog-day',
  '200': 'thunderstorms-day',
  '201': 'thunderstorms-day',
  '202': 'thunderstorms-day-rain',
  '203': 'thunderstorms-day',
  '204': 'thunderstorms-day',
  '205': 'thunderstorms-day',
  '206': 'thunderstorms-day',
  '207': 'thunderstorms-day',
  '208': 'thunderstorms-day',
  '209': 'thunderstorms-day',
  '210': 'thunderstorms-day',
  '211': 'thunderstorms-day',
  '212': 'thunderstorms-day',
  '213': 'thunderstorms-day',
  '299': 'thunderstorms-day',
  '900': 'thermometer-warmer',
  '901': 'thermometer-colder',
  '999': 'overcast'
};

var NIGHT_VARIANTS = {
  'clear-day': 'clear-night',
  'mostly-clear-day': 'mostly-clear-night',
  'partly-cloudy-day': 'partly-cloudy-night',
  'overcast-day': 'overcast-night',
  'overcast-day-rain': 'overcast-night-rain',
  'overcast-day-drizzle': 'overcast-night-drizzle',
  'overcast-day-snow': 'overcast-night-snow',
  'overcast-day-sleet': 'overcast-night-sleet',
  'overcast-day-fog': 'overcast-night-fog',
  'overcast-day-hail': 'overcast-night-hail',
  'overcast-day-haze': 'overcast-night-haze',
  'fog-day': 'fog-night',
  'haze-day': 'haze-night',
  'dust-day': 'dust-night',
  'thunderstorms-day': 'thunderstorms-night',
  'thunderstorms-day-rain': 'thunderstorms-night',
  'thunderstorms-day-hail': 'thunderstorms-night'
};

var NIGHT_CODES = {
  '150': true, '151': true, '152': true, '153': true, '154': true,
  '350': true, '351': true, '456': true, '457': true
};

var iconModules = import.meta.glob('@/assets/weather-icons/*.svg', {
  eager: true,
  query: '?raw',
  import: 'default'
});

var ICON_CACHE = {};
Object.keys(iconModules).forEach(function(key) {
  var name = key.split('/').pop().replace('.svg', '');
  var raw = iconModules[key];
  raw = raw.replace(/<animateTransform[^>]*>/g, '');
  raw = raw.replace(/<animate[^>]*>/g, '');
  ICON_CACHE[name] = raw;
});

export default {
  name: 'WeatherIcon',
  props: {
    code: {
      type: [String, Number],
      default: '100'
    },
    size: {
      type: Number,
      default: 48
    },
    isNight: {
      type: Boolean,
      default: false
    }
  },
  data: function() {
    return {
      iconSvg: '',
      uid: Math.random().toString(36).substring(2, 8)
    };
  },
  computed: {
    iconName: function() {
      var code = String(this.code);
      var name = ICON_MAP[code] || 'overcast';
      if (this.isNight && !NIGHT_CODES[code]) {
        var nightName = NIGHT_VARIANTS[name];
        if (nightName) {
          name = nightName;
        }
      }
      return name;
    }
  },
  watch: {
    iconName: {
      immediate: true,
      handler: 'loadIcon'
    }
  },
  methods: {
    loadIcon: function(name) {
      if (!name) {
        this.iconSvg = '';
        return;
      }
      var raw = ICON_CACHE[name] || '';
      if (raw) {
        raw = raw.replace(/id="([^"]+)"/g, 'id="$1_' + this.uid + '"');
        raw = raw.replace(/url\(#([^)]+)\)/g, 'url(#$1_' + this.uid + ')');
        raw = raw.replace(/href="#([^"]+)"/g, 'href="#$1_' + this.uid + '"');
      }
      this.iconSvg = raw;
    }
  }
};
</script>

<style scoped>
.weather-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-svg {
  width: 100%;
  height: 100%;
}

.icon-svg >>> svg {
  width: 100%;
  height: 100%;
}

.icon-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
}
</style>

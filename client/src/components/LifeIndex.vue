<template>
  <div class="life-index">
    <div class="life-grid">
      <div class="life-item" v-for="item in displayItems" :key="item.type">
        <i :class="item.iconClass" class="life-icon"></i>
        <div class="life-text">
          <span class="life-name">{{ item.name }}</span>
          <span class="life-cat">{{ item.category }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
var ICON_MAP = {
  '1': 'fa-solid fa-person-running',
  '2': 'fa-solid fa-car',
  '3': 'fa-solid fa-shirt',
  '5': 'fa-solid fa-sun',
  '6': 'fa-solid fa-umbrella-beach',
  '9': 'fa-solid fa-virus'
};

var DEFAULT_ITEMS = [
  { type: '1', name: '运动', category: '--' },
  { type: '2', name: '洗车', category: '--' },
  { type: '3', name: '穿衣', category: '--' },
  { type: '5', name: '紫外线', category: '--' },
  { type: '6', name: '旅游', category: '--' },
  { type: '9', name: '感冒', category: '--' }
];

export default {
  name: 'LifeIndex',
  props: {
    data: {
      type: Array,
      default: function() {
        return [];
      }
    }
  },
  computed: {
    displayItems: function() {
      var dataMap = {};
      if (this.data && this.data.length) {
        for (var i = 0; i < this.data.length; i++) {
          var item = this.data[i];
          dataMap[String(item.type)] = item;
        }
      }
      return DEFAULT_ITEMS.map(function(def) {
        var matched = dataMap[def.type];
        return {
          type: def.type,
          name: matched ? matched.name : def.name,
          category: matched ? matched.category : def.category,
          iconClass: ICON_MAP[def.type] || 'fa-solid fa-circle'
        };
      });
    }
  }
};
</script>

<style scoped>
.life-index {
  color: #fff;
  min-width: 0;
  overflow: hidden;
}

.life-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 12px;
}

.life-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
}

.life-icon {
  font-size: 13px;
  opacity: 0.35;
  width: 16px;
  text-align: center;
  flex-shrink: 0;
}

.life-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.life-name {
  font-size: 10px;
  opacity: 0.35;
}

.life-cat {
  font-size: 13px;
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-height: 640px) {
  .life-grid { gap: 4px 10px; }
  .life-item { padding: 3px 0; gap: 6px; }
  .life-icon { font-size: 11px; width: 14px; }
  .life-name { font-size: 9px; }
  .life-cat { font-size: 11px; }
}
</style>

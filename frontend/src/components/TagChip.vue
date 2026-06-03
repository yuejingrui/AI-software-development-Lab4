<template>
  <span
    class="tag-chip"
    :style="{ backgroundColor: color + '20', color: color, borderColor: color }"
  >
    {{ name }}
  </span>
</template>

<script setup lang="ts">
defineProps<{ name: string; color: string }>()
</script>

<style scoped>
.tag-chip {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 4px;
  font-size: 12px;
  border: 1px solid;
  white-space: nowrap;
  line-height: 1.6;
}
</style>

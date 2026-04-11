<script setup lang="ts">
import { computed } from 'vue';
import UiButton from '../ui/UiButton.vue';
import UiPanel from '../ui/UiPanel.vue';

const props = defineProps<{
  confirmLabel: string;
  deleting: boolean;
  hint: string;
  open: boolean;
  questionTitle: string;
}>();

const emit = defineEmits<{
  (event: 'confirm'): void;
  (event: 'update:open', value: boolean): void;
}>();

const openModel = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
});
</script>

<template>
  <v-dialog v-model="openModel" max-width="480">
    <UiPanel class="confirm-card training-exit-dialog" padding="default">
      <h2>Удалить вопрос?</h2>
      <p class="confirm-text">
        {{ questionTitle }}
      </p>
      <div class="training-exit-dialog__copy">
        <small>{{ hint }}</small>
      </div>
      <div class="training-exit-dialog__actions">
        <UiButton tone="text" @click="openModel = false">
          Отмена
        </UiButton>
        <UiButton :loading="deleting" tone="danger" @click="$emit('confirm')">
          {{ confirmLabel }}
        </UiButton>
      </div>
    </UiPanel>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import QuestionChangeRequestDiffCard from '../components/questions/QuestionChangeRequestDiffCard.vue';
import UiPanel from '../components/ui/UiPanel.vue';
import {
  buildChangeRequestSubject,
  formatChangeRequestStatus,
  formatChangeRequestType,
  statusTone,
} from '../features/moderation/moderation.utils';
import type {
  QuestionChangeRequestDetail,
  QuestionChangeRequestSummary,
} from '../features/moderation/moderation.types';
import { formatDate } from '../features/questions/questions.utils';
import { apiService } from '../services/api.service';
import { toUserErrorMessage } from '../features/system/error.utils';

const route = useRoute();
const router = useRouter();

const requests = ref<QuestionChangeRequestSummary[]>([]);
const loading = ref(false);
const detailLoading = ref(false);
const detail = ref<QuestionChangeRequestDetail | null>(null);
const selectedId = ref<string | null>(null);
const errorMessage = ref('');

async function loadRequests() {
  loading.value = true;
  errorMessage.value = '';

  try {
    requests.value = await apiService.listMyQuestionChangeRequests();
    const requestedId =
      typeof route.query.selected === 'string' ? route.query.selected : null;
    const nextId = requestedId ?? requests.value[0]?.id ?? null;

    if (nextId) {
      await selectRequest(nextId, false);
    } else {
      detail.value = null;
      selectedId.value = null;
    }
  } catch (error) {
    errorMessage.value = toUserErrorMessage(error, 'Не удалось загрузить заявки.');
  } finally {
    loading.value = false;
  }
}

async function selectRequest(id: string, syncUrl = true) {
  selectedId.value = id;
  detailLoading.value = true;

  if (syncUrl) {
    void router.replace({
      name: 'my-requests',
      query: { selected: id },
    });
  }

  try {
    detail.value = await apiService.getQuestionChangeRequest(id);
  } catch (error) {
    errorMessage.value = toUserErrorMessage(
      error,
      'Не удалось загрузить детали заявки.',
    );
  } finally {
    detailLoading.value = false;
  }
}

watch(
  () => route.query.selected,
  (value) => {
    const nextId = typeof value === 'string' ? value : null;

    if (nextId && nextId !== selectedId.value) {
      void selectRequest(nextId, false);
    }
  },
);

void loadRequests();

const emptyCaption = computed(() =>
  loading.value
    ? 'Загрузка'
    : 'Заявок пока нет.',
);
</script>

<template>
  <section class="page-frame">
    <v-alert
      v-if="errorMessage"
      type="error"
      variant="tonal"
    >
      {{ errorMessage }}
    </v-alert>

    <div class="split-workspace moderation-layout">
      <UiPanel class="detail-panel moderation-list-card" variant="detail">
        <div class="panel-header">
          <div class="panel-copy">
            <h2>Мои заявки</h2>
          </div>
          <span class="table-card__caption">{{ requests.length }} заявок</span>
        </div>

        <div v-if="requests.length" class="moderation-list">
          <button
            v-for="item in requests"
            :key="item.id"
            type="button"
            class="moderation-list__item"
            :class="{ 'moderation-list__item--active': item.id === selectedId }"
            @click="selectRequest(item.id)"
          >
            <div class="moderation-list__head">
              <strong>{{ buildChangeRequestSubject(item) }}</strong>
              <v-chip
                :color="statusTone(item.status)"
                size="small"
                variant="tonal"
              >
                {{ formatChangeRequestStatus(item.status) }}
              </v-chip>
            </div>
            <p>{{ formatChangeRequestType(item.type) }} · {{ formatDate(item.createdAt) }}</p>
          </button>
        </div>

        <div v-else class="empty-state empty-state-panel">
          <p>Пусто</p>
          <span>{{ emptyCaption }}</span>
        </div>
      </UiPanel>

      <QuestionChangeRequestDiffCard
        :detail="detail"
        :loading="detailLoading"
      />
    </div>
  </section>
</template>

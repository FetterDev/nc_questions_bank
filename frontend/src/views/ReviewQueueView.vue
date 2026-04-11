<script setup lang="ts">
import { computed, ref } from 'vue';
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

const requests = ref<QuestionChangeRequestSummary[]>([]);
const loading = ref(false);
const detailLoading = ref(false);
const reviewComment = ref('');
const reviewBusy = ref(false);
const detail = ref<QuestionChangeRequestDetail | null>(null);
const selectedId = ref<string | null>(null);
const errorMessage = ref('');

async function loadRequests(preserveDetail?: QuestionChangeRequestDetail | null) {
  loading.value = true;
  errorMessage.value = '';

  try {
    requests.value = await apiService.listReviewQuestionChangeRequests();

    if (requests.value.length === 0) {
      detail.value = preserveDetail ?? null;
      selectedId.value = null;
      return;
    }

    const nextId = requests.value.some((item) => item.id === selectedId.value)
      ? selectedId.value
      : requests.value[0]?.id;

    if (nextId) {
      await selectRequest(nextId);
    }
  } catch (error) {
    errorMessage.value = toUserErrorMessage(error, 'Не удалось загрузить очередь.');
  } finally {
    loading.value = false;
  }
}

async function selectRequest(id: string) {
  selectedId.value = id;
  detailLoading.value = true;
  reviewComment.value = '';

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

async function approveSelected() {
  if (!selectedId.value) {
    return;
  }

  reviewBusy.value = true;

  try {
    const reviewed = await apiService.approveQuestionChangeRequest(selectedId.value);
    await loadRequests(reviewed);
  } catch (error) {
    errorMessage.value = toUserErrorMessage(error, 'Не удалось одобрить заявку.');
  } finally {
    reviewBusy.value = false;
  }
}

async function rejectSelected() {
  if (!selectedId.value || !reviewComment.value.trim()) {
    return;
  }

  reviewBusy.value = true;

  try {
    const reviewed = await apiService.rejectQuestionChangeRequest(selectedId.value, {
      reviewComment: reviewComment.value.trim(),
    });
    reviewComment.value = '';
    await loadRequests(reviewed);
  } catch (error) {
    errorMessage.value = toUserErrorMessage(error, 'Не удалось отклонить заявку.');
  } finally {
    reviewBusy.value = false;
  }
}

const emptyCaption = computed(() =>
  loading.value
    ? 'Загрузка'
    : 'Очередь пуста.',
);

void loadRequests();
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
            <h2>Заявки на ревью</h2>
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
            <small>{{ item.author.displayName }}</small>
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
        :review-comment="reviewComment"
        :reviewing="reviewBusy"
        :show-review-actions="true"
        @approve="approveSelected"
        @reject="rejectSelected"
        @update:review-comment="reviewComment = $event"
      />
    </div>
  </section>
</template>

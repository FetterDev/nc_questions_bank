<script setup lang="ts">
import {
  mdiChartTimelineVariant,
  mdiClipboardTextOutline,
  mdiCalendarMonthOutline,
  mdiFileDocumentPlusOutline,
  mdiFolderStarOutline,
  mdiHistory,
  mdiOfficeBuildingOutline,
  mdiRunFast,
  mdiShieldCheckOutline,
  mdiTagMultipleOutline,
  mdiTextBoxSearchOutline,
  mdiTrendingUp,
  mdiAccountGroupOutline,
} from '@mdi/js';
import { computed } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import UiButton from '../components/ui/UiButton.vue';
import UiPanel from '../components/ui/UiPanel.vue';
import UiShellNavItem from '../components/ui/UiShellNavItem.vue';
import { useAccountProfile } from '../composables/useAccountProfile';

const route = useRoute();
const { profile, session } = useAccountProfile();

void session.loadSession();

const primaryNavItems = computed(() => {
  const items = [
    {
      label: 'Банк вопросов',
      section: 'bank',
      icon: mdiTextBoxSearchOutline,
      to: { name: 'question-bank' },
    },
  ];

  if (session.isUser.value) {
    items.push({
      label: 'Новая заявка',
      section: 'editor',
      icon: mdiFileDocumentPlusOutline,
      to: { name: 'question-editor-create' },
    });
    items.push({
      label: 'Мои заявки',
      section: 'requests',
      icon: mdiClipboardTextOutline,
      to: { name: 'my-requests' },
    });
    items.push({
      label: 'Тренировка',
      section: 'training',
      icon: mdiRunFast,
      to: { name: 'training' },
    });
    items.push({
      label: 'Мои собеседования',
      section: 'my-interviews',
      icon: mdiCalendarMonthOutline,
      to: { name: 'my-interviews' },
    });
    items.push({
      label: 'Статистика собеседований',
      section: 'my-interviews-dashboard',
      icon: mdiChartTimelineVariant,
      to: { name: 'my-interviews-dashboard' },
    });
    items.push({
      label: 'История собеседований',
      section: 'interview-history',
      icon: mdiHistory,
      to: { name: 'interview-history' },
    });
    items.push({
      label: 'Матрица компетенций',
      section: 'competency-matrix',
      icon: mdiChartTimelineVariant,
      to: { name: 'competency-matrix' },
    });
    items.push({
      label: 'Точки роста',
      section: 'growth',
      icon: mdiTrendingUp,
      to: { name: 'growth-card' },
    });
    items.push({
      label: 'История тренировок',
      section: 'training-history',
      icon: mdiHistory,
      to: { name: 'training-history' },
    });
  }

  if (session.isManager.value) {
    items.push({
      label: 'Модерация',
      section: 'review',
      icon: mdiShieldCheckOutline,
      to: { name: 'review-queue' },
    });
    items.push({
      label: 'Редактор',
      section: 'editor',
      icon: mdiFileDocumentPlusOutline,
      to: { name: 'question-editor-create' },
    });
    items.push({
      label: 'Темы',
      section: 'topics',
      icon: mdiTagMultipleOutline,
      to: { name: 'topics-admin' },
    });
    items.push({
      label: 'Компании',
      section: 'companies',
      icon: mdiOfficeBuildingOutline,
      to: { name: 'companies-admin' },
    });
    items.push({
      label: 'Пресеты',
      section: 'training-presets',
      icon: mdiFolderStarOutline,
      to: { name: 'training-presets' },
    });
    items.push({
      label: 'Сотрудники',
      section: 'team',
      icon: mdiAccountGroupOutline,
      to: { name: 'team-dashboard' },
    });
    items.push({
      label: 'Собеседования',
      section: 'interviews',
      icon: mdiCalendarMonthOutline,
      to: { name: 'interviews-admin' },
    });
    items.push({
      label: 'Dashboard собеседований',
      section: 'interviews-dashboard',
      icon: mdiChartTimelineVariant,
      to: { name: 'interviews-dashboard' },
    });
    items.push({
      label: 'Матрица компетенций',
      section: 'competency-matrix',
      icon: mdiChartTimelineVariant,
      to: { name: 'competency-matrix' },
    });
    items.push({
      label: 'Анализ банка',
      section: 'bank-analysis',
      icon: mdiChartTimelineVariant,
      to: { name: 'bank-analysis' },
    });
  }

  if (session.isAdmin.value) {
    items.push({
      label: 'Пользователи',
      section: 'users',
      icon: mdiAccountGroupOutline,
      to: { name: 'users-admin' },
    });
  }

  return items;
});

const activeSection = computed(() => String(route.meta.section ?? 'bank'));
const topbarTitle = computed(() => String(route.meta.title ?? 'Банк вопросов'));
const topbarEyebrow = computed(() =>
  primaryNavItems.value.find((item) => item.section === activeSection.value)?.label ?? 'Контур',
);
</script>

<template>
  <v-main>
    <div class="app-shell">
      <div class="app-frame">
        <UiPanel class="app-sidebar" padding="default" tag="aside" tone="muted" variant="detail">
          <RouterLink class="sidebar-brand" to="/" aria-label="Nord">
            <svg
              aria-hidden="true"
              class="sidebar-brand__logo"
              viewBox="0 0 161.641 77.311"
              xmlns="http://www.w3.org/2000/svg"
            >
              <polygon fill="#1C3A41" points="2.000,18.555 39.664,53.633 56.080,45.497" />
              <polygon fill="#07A0C3" points="159.641,2.000 45.104,58.860 62.772,75.311" />
            </svg>
          </RouterLink>

          <nav class="sidebar-nav" aria-label="Основные разделы">
            <UiShellNavItem
              v-for="item in primaryNavItems"
              :key="item.section"
              :active="activeSection === item.section"
              :icon="item.icon"
              :label="item.label"
              :to="item.to"
            />
          </nav>
        </UiPanel>

        <div class="workspace">
          <UiPanel class="workspace-bar" padding="default" tag="header" variant="toolbar">
            <div class="workspace-bar__tools">
              <div class="workspace-account">
                <UiButton
                  :to="{ name: 'account' }"
                  class="account-anchor"
                  size="lg"
                  tone="text"
                >
                  <span class="account-anchor__avatar" aria-hidden="true">
                    {{ profile.avatarLabel }}
                  </span>
                  <span class="account-anchor__copy">
                    <strong>{{ profile.login }}</strong>
                    <small>{{ profile.role }}</small>
                  </span>
                </UiButton>
              </div>
            </div>
          </UiPanel>

          <main class="workspace-content">
            <RouterView />
          </main>
        </div>
      </div>
    </div>
  </v-main>
</template>

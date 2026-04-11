<script setup lang="ts">
import { mdiLogoutVariant } from '@mdi/js';
import UiButton from '../components/ui/UiButton.vue';
import UiPanel from '../components/ui/UiPanel.vue';
import { useAccountProfile } from '../composables/useAccountProfile';

const { profile, session } = useAccountProfile();

function handleLogout() {
  session.logout();
}
</script>

<template>
  <section class="page-frame">
    <div class="split-workspace account-layout">
      <UiPanel class="account-card detail-panel" variant="detail">
        <div class="account-card__hero">
          <div class="account-card__avatar" aria-hidden="true">
            {{ profile.avatarLabel }}
          </div>

          <div class="account-card__copy">
            <h2>{{ profile.fullName }}</h2>
            <p class="page-copy">
              {{ profile.email }}
            </p>
          </div>
        </div>

        <div class="account-facts">
          <article class="account-fact">
            <span>Логин</span>
            <strong>{{ profile.login }}</strong>
          </article>

          <article class="account-fact">
            <span>Роль</span>
            <strong>{{ profile.role }}</strong>
          </article>

          <article class="account-fact">
            <span>Статус</span>
            <strong>{{ profile.status }}</strong>
          </article>
        </div>
      </UiPanel>

      <UiPanel class="account-card account-card--side detail-panel" tone="muted" variant="detail">
        <div class="account-card__hero">
          <div class="account-card__avatar" aria-hidden="true">
            {{ profile.avatarLabel }}
          </div>

          <div class="account-card__copy">
            <strong>{{ profile.login }}</strong>
            <p class="page-copy account-card__mode-copy">
              Логин и пароль управляются только администратором.
            </p>
          </div>
        </div>

        <div class="account-card__actions">
          <UiButton :icon="mdiLogoutVariant" block tone="secondary" @click="handleLogout">
            Выйти
          </UiButton>
        </div>
      </UiPanel>
    </div>
  </section>
</template>

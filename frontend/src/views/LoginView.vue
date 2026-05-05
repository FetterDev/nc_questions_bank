<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import UiButton from '../components/ui/UiButton.vue';
import UiField from '../components/ui/UiField.vue';
import UiPanel from '../components/ui/UiPanel.vue';
import { useSession } from '../composables/useSession';
import { toUserErrorMessage } from '../features/system/error.utils';

const route = useRoute();
const router = useRouter();
const session = useSession();
const form = reactive({
  login: '',
  password: '',
});
const localError = ref('');

const redirectTarget = computed(() => {
  const value = route.query.redirect;
  return typeof value === 'string' && value.startsWith('/') ? value : '/bank';
});

async function submitLogin() {
  localError.value = '';

  try {
    await session.login({
      login: form.login,
      password: form.password,
    });
    await router.replace(redirectTarget.value);
  } catch (error) {
    localError.value = toUserErrorMessage(error, 'Не удалось выполнить вход.');
  }
}
</script>

<template>
  <section class="login-shell">
    <div class="login-shell__backdrop" aria-hidden="true" />

    <div class="login-shell__grid">
      <aside class="login-card login-card--accent" aria-label="Nord">
        <svg
          aria-hidden="true"
          class="login-card__mark"
          viewBox="0 0 161.641 77.311"
          xmlns="http://www.w3.org/2000/svg"
        >
          <polygon fill="#E8F4F5" points="2.000,18.555 39.664,53.633 56.080,45.497" />
          <polygon fill="#12B8B0" points="159.641,2.000 45.104,58.860 62.772,75.311" />
        </svg>
        <div>
          <h1>Nord</h1>
          <p>Оценка, интервью, рост.</p>
        </div>
      </aside>

      <UiPanel class="login-card login-card--form form-panel" variant="form">
        <div class="panel-copy">
          <h2>Вход</h2>
          <p class="page-copy">
            Используй логин и пароль, выданные администратором.
          </p>
        </div>

        <form class="login-form" @submit.prevent="submitLogin">
          <UiField
            v-model="form.login"
            autocomplete="username"
            label="Логин"
            placeholder="nord.admin"
            required
          />

          <UiField
            v-model="form.password"
            autocomplete="current-password"
            label="Пароль"
            placeholder="Введите пароль"
            required
            type="password"
          />

          <v-alert v-if="localError || session.errorMessage.value" type="error" variant="tonal">
            {{ localError || session.errorMessage.value }}
          </v-alert>

          <UiButton block :loading="session.loading.value" size="lg" type="submit">
            Войти
          </UiButton>
        </form>
      </UiPanel>
    </div>
  </section>
</template>

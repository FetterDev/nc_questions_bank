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

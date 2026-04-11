import { createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg';
import 'vuetify/styles';
import { lightTheme } from '../theme/vuetify-light-theme';

export const vuetify = createVuetify({
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  theme: {
    defaultTheme: 'light-theme',
    themes: {
      'light-theme': lightTheme,
    },
  },
  defaults: {
    VBtn: {
      rounded: 0,
      ripple: false,
    },
    VCard: {
      elevation: 0,
    },
    VTextField: {
      density: 'comfortable',
      hideDetails: 'auto',
    },
    VTextarea: {
      density: 'comfortable',
      hideDetails: 'auto',
    },
    VSelect: {
      density: 'comfortable',
      hideDetails: 'auto',
    },
    VCombobox: {
      density: 'comfortable',
      hideDetails: 'auto',
    },
    VChip: {
      rounded: 0,
    },
    VDialog: {
      scrim: 'rgba(15, 60, 67, 0.42)',
    },
  },
});

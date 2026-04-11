export const buttonStateMap = {
  primary: {
    default: {
      background: 'var(--btn-primary-bg)',
      color: 'var(--btn-primary-color)',
      border: 'var(--btn-primary-border)',
    },
    hover: {
      background: 'var(--btn-primary-bg-hover)',
      color: 'var(--btn-primary-color)',
      border: 'var(--btn-primary-border)',
    },
    disabled: {
      background: 'color-mix(in srgb, var(--color-ink-muted) 40%, var(--color-paper))',
      color: 'var(--color-paper)',
      border: 'transparent',
    },
  },
  secondary: {
    default: {
      background: 'var(--btn-secondary-bg)',
      color: 'var(--btn-secondary-color)',
      border: 'var(--btn-secondary-border)',
    },
    hover: {
      background: 'var(--btn-secondary-bg-hover)',
      color: 'var(--btn-secondary-color)',
      border: 'var(--btn-secondary-border-hover)',
    },
    disabled: {
      background: 'var(--color-paper)',
      color: 'color-mix(in srgb, var(--color-ink-muted) 70%, var(--color-paper))',
      border: 'color-mix(in srgb, var(--color-ink-muted) 28%, var(--color-paper))',
    },
  },
  text: {
    default: {
      background: 'var(--btn-text-bg)',
      color: 'var(--btn-text-color)',
      border: 'var(--btn-text-border)',
    },
    hover: {
      background: 'var(--btn-text-bg-hover)',
      color: 'var(--color-ink)',
      border: 'var(--btn-text-border)',
    },
    disabled: {
      background: 'transparent',
      color: 'color-mix(in srgb, var(--color-ink-muted) 68%, var(--color-paper))',
      border: 'transparent',
    },
  },
  icon: {
    default: {
      background: 'transparent',
      color: 'var(--color-ink-muted)',
      border: 'transparent',
    },
    hover: {
      background: 'var(--color-ivory)',
      color: 'var(--color-ink)',
      border: 'transparent',
    },
    disabled: {
      background: 'transparent',
      color: 'color-mix(in srgb, var(--color-ink-muted) 68%, var(--color-paper))',
      border: 'transparent',
    },
  },
  danger: {
    default: {
      background: 'var(--color-paper)',
      color: 'var(--color-danger)',
      border: 'color-mix(in srgb, var(--color-danger) 38%, var(--color-paper))',
    },
    hover: {
      background: 'color-mix(in srgb, var(--color-danger) 10%, var(--color-paper))',
      color: 'var(--color-danger)',
      border: 'var(--color-danger)',
    },
    disabled: {
      background: 'var(--color-paper)',
      color: 'color-mix(in srgb, var(--color-danger) 45%, var(--color-paper))',
      border: 'color-mix(in srgb, var(--color-danger) 24%, var(--color-paper))',
    },
  },
} as const;

export type ButtonTone = keyof typeof buttonStateMap;
export type ButtonState = keyof typeof buttonStateMap.primary;

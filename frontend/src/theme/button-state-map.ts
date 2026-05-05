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
      background: 'var(--panel-border)',
      color: '#7b8794',
      border: 'var(--panel-border)',
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
      background: 'var(--color-surface-subtle)',
      color: '#9aa6b2',
      border: 'var(--panel-border)',
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
      color: '#9aa6b2',
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
      background: 'var(--table-header-bg)',
      color: 'var(--color-ink)',
      border: 'transparent',
    },
    disabled: {
      background: 'transparent',
      color: '#9aa6b2',
      border: 'transparent',
    },
  },
  danger: {
    default: {
      background: 'var(--color-surface-primary)',
      color: 'var(--color-danger)',
      border: '#f1a29b',
    },
    hover: {
      background: 'var(--color-danger-soft)',
      color: 'var(--color-danger)',
      border: 'var(--color-danger)',
    },
    disabled: {
      background: 'var(--color-surface-primary)',
      color: '#d92d20',
      border: '#fecdca',
    },
  },
} as const;

export type ButtonTone = keyof typeof buttonStateMap;
export type ButtonState = keyof typeof buttonStateMap.primary;

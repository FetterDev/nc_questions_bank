export interface ThemeTokens {
  colors: {
    paper: string;
    ivory: string;
    ink: string;
    inkMuted: string;
    cyan: string;
    cyanLight: string;
    brass: string;
    danger: string;
    success: string;
    warning: string;
    tagJunior: string;
    tagMiddle: string;
    tagSenior: string;
    tagLead: string;
    backdrop: string;
  };
}

export const themeTokens: ThemeTokens = {
  colors: {
    paper: '#F6F7F9',
    ivory: '#FFFFFF',
    ink: '#17212B',
    inkMuted: '#5F6F7F',
    cyan: '#0F7F84',
    cyanLight: '#159AA0',
    brass: '#B7791F',
    danger: '#B42318',
    success: '#067647',
    warning: '#B54708',
    tagJunior: '#067647',
    tagMiddle: '#A15C07',
    tagSenior: '#B42318',
    tagLead: '#6941C6',
    backdrop: 'linear-gradient(180deg,#17212B 0%,#243242 100%)',
  },
};

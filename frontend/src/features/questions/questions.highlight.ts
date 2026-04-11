import type { QuestionCodeLanguage } from './questions.types';

const FALLBACK_CODE_LANGUAGE: QuestionCodeLanguage = 'typescript';
const htmlCache = new Map<string, Promise<string>>();
let highlighterPromise: Promise<{
  codeToHtml: (code: string, options: { lang: string; theme: string }) => string;
}> | null = null;

function resolveLanguage(language?: QuestionCodeLanguage) {
  switch (language) {
    case 'javascript':
      return 'javascript';
    case 'jsx':
      return 'jsx';
    case 'tsx':
      return 'tsx';
    case 'typescript':
    default:
      return 'typescript';
  }
}

async function getQuestionHighlighter() {
  highlighterPromise ??= Promise.all([
    import('shiki/core'),
    import('shiki/engine/javascript'),
    import('shiki/themes/github-light.mjs'),
    import('shiki/langs/javascript.mjs'),
    import('shiki/langs/jsx.mjs'),
    import('shiki/langs/typescript.mjs'),
    import('shiki/langs/tsx.mjs'),
  ]).then(
    ([
      { createHighlighterCore },
      { createJavaScriptRegexEngine },
      { default: githubLight },
      { default: javascript },
      { default: jsx },
      { default: typescript },
      { default: tsx },
    ]) =>
      createHighlighterCore({
        engine: createJavaScriptRegexEngine(),
        themes: [githubLight],
        langs: [javascript, jsx, typescript, tsx],
      }),
  );

  return highlighterPromise;
}

export async function renderQuestionCodeToHtml(
  code: string,
  language?: QuestionCodeLanguage,
) {
  const normalizedLanguage = resolveLanguage(language ?? FALLBACK_CODE_LANGUAGE);
  const cacheKey = `${normalizedLanguage}::${code}`;
  const cached = htmlCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const rendered = getQuestionHighlighter().then((highlighter) =>
    highlighter.codeToHtml(code, {
      lang: normalizedLanguage,
      theme: 'github-light',
    }),
  );

  htmlCache.set(cacheKey, rendered);
  return rendered;
}

export function formatQuestionCodeLanguage(
  language?: QuestionCodeLanguage,
) {
  switch (language) {
    case 'javascript':
      return 'JAVASCRIPT';
    case 'jsx':
      return 'JSX';
    case 'tsx':
      return 'TSX';
    case 'typescript':
      return 'TYPESCRIPT';
    default:
      return 'CODE';
  }
}

export function escapeCodeForHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

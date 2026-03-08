import { createSystem, defaultConfig, defineConfig, defineSemanticTokens } from '@chakra-ui/react';

const semanticTokens = defineSemanticTokens({
  colors: {
    'fg.default': { value: { base: '#eaeaea', _dark: '#eaeaea' } },
    'fg.muted': { value: { base: '#8892b0', _dark: '#8892b0' } },
    'bg.canvas': { value: { base: '#1a1a2e', _dark: '#1a1a2e' } },
    'bg.surface': { value: { base: '#16213e', _dark: '#16213e' } },
    'bg.subtle': { value: { base: '#1a2745', _dark: '#1a2745' } },
    'border.default': {
      value: { base: 'rgba(255, 255, 255, 0.08)', _dark: 'rgba(255, 255, 255, 0.08)' },
    },
  },
});

const dialogRecipe = defaultConfig.theme?.slotRecipes?.dialog;

if (!dialogRecipe || !dialogRecipe.base) {
  throw new Error('dialog slot recipe is not available in defaultConfig');
}

const dialogOverride = {
  ...dialogRecipe,
  base: {
    ...dialogRecipe.base,
    content: {
      ...dialogRecipe.base.content,
      color: 'fg.default',
      bg: '#16213e',
      borderRadius: '20px',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
    },
    header: { ...dialogRecipe.base.header, color: 'fg.default' },
    title: { ...dialogRecipe.base.title, color: 'inherit' },
    body: { ...dialogRecipe.base.body, color: 'fg.default' },
  },
};

const config = defineConfig({
  globalCss: {
    body: {
      color: 'fg.default',
      bg: 'bg.canvas',
    },
    'h1, h2, h3, h4, h5, h6': {
      color: 'fg.default',
    },
  },
  theme: {
    semanticTokens,
    slotRecipes: {
      dialog: dialogOverride,
    },
  },
});

export const system = createSystem(defaultConfig, config);

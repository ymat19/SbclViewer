import { createSystem, defaultConfig, defineConfig, defineSemanticTokens } from '@chakra-ui/react';

const semanticTokens = defineSemanticTokens({
  colors: {
    'fg.default': { value: { base: '{colors.gray.900}', _dark: '{colors.white}' } },
    'fg.muted': { value: { base: '{colors.gray.600}', _dark: '{colors.gray.300}' } },
    'bg.canvas': { value: { base: '{colors.gray.50}', _dark: '{colors.gray.900}' } },
    'bg.surface': { value: { base: '{colors.white}', _dark: '{colors.gray.800}' } },
    'bg.subtle': { value: { base: '{colors.gray.100}', _dark: '{colors.gray.850}' } },
    'border.default': { value: { base: '{colors.gray.200}', _dark: '{colors.gray.700}' } },
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
    content: { ...dialogRecipe.base.content, color: 'fg.default' },
    header: { ...dialogRecipe.base.header, color: 'fg.default' },
    title: { ...dialogRecipe.base.title, color: 'inherit' },
    body: { ...dialogRecipe.base.body, color: 'fg.default' },
  },
};

const config = defineConfig({
  globalCss: {
    body: {
      color: 'fg.default',
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

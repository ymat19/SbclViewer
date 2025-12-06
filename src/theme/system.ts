import { createSystem, defaultConfig, defineConfig, defineSemanticTokens } from '@chakra-ui/react';

const semanticTokens = defineSemanticTokens({
  colors: {
    'fg.default': { value: { base: '{colors.gray.900}', _dark: '{colors.white}' } },
    'fg.muted': { value: { base: '{colors.gray.700}', _dark: '{colors.gray.300}' } },
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

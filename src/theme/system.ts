import {
  createSystem,
  defaultConfig,
  defineConfig,
  defineSemanticTokens,
} from '@chakra-ui/react';

const semanticTokens = defineSemanticTokens({
  colors: {
    'fg.default': { value: { base: '{colors.gray.900}', _dark: '{colors.white}' } },
    'fg.muted': { value: { base: '{colors.gray.700}', _dark: '{colors.gray.300}' } },
  },
});

const config = defineConfig({
  theme: {
    semanticTokens,
    styles: {
      global: {
        body: {
          color: 'fg.default',
        },
        'h1, h2, h3, h4, h5, h6': {
          color: 'fg.default',
        },
      },
    },
    slotRecipes: {
      dialog: {
        base: {
          content: { color: 'fg.default' },
          header: { color: 'fg.default' },
          title: { color: 'inherit' },
          body: { color: 'fg.default' },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);

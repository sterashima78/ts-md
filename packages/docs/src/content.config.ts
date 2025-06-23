import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import type { Loader } from 'astro/loaders';
import { packagesLoader } from './packagesLoader';

const combinedLoader = (): Loader => ({
  name: 'combined-loader',
  async load(ctx) {
    await docsLoader().load(ctx);
    await packagesLoader().load(ctx);
  },
});

export const collections = {
  docs: defineCollection({ schema: docsSchema(), loader: combinedLoader() }),
};

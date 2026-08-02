import starlight from '@astrojs/starlight';
// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  base: '/ts-md/',
  integrations: [
    starlight({
      title: 'TS-MD Docs',
      sidebar: [
        {
          label: 'Guide',
          items: [{ label: 'Playground', link: '/playground/' }],
        },
        {
          label: 'Packages',
          items: [{ autogenerate: { directory: 'packages' } }],
        },
      ],
      markdown: { headingLinks: false },
    }),
  ],
});

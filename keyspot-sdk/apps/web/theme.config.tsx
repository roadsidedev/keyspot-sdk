import { DocsThemeConfig } from 'nextra-theme-docs';

const config: DocsThemeConfig = {
  logo: <span className="font-semibold tracking-tight">KeySpot SDK</span>,
  project: {
    link: 'https://github.com/roadsidedev/keyspot-sdk',
  },
  docsRepositoryBase: 'https://github.com/roadsidedev/keyspot-sdk/tree/main/keyspot-web',
  footer: {
    content: 'MIT License • Runtime security for autonomous AI agents',
  },
  head: {
    titleTemplate: '%s – KeySpot SDK',
  },
  sidebar: {
    defaultMenuCollapseLevel: 1,
  },
  toc: {
    backToTop: true,
  },
};

export default config;

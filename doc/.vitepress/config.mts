import { defineConfig, HeadConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';
import llmstxt from 'vitepress-plugin-llms';

const hostname = 'https://minepanel.ketbome.com';

// https://vitepress.dev/reference/site-config
export default withMermaid(
  defineConfig({
    lang: 'en-US',
    title: 'Minepanel',
    // Frontmatter titles already include the brand; avoid "… | Minepanel" duplication
    titleTemplate: false,
    description:
      'Free open source Minecraft server management panel for Java and Bedrock Edition. Self-hosted Docker-based alternative to Pterodactyl and Aternos. Manage Paper, Forge, Fabric, Spigot, Purpur, and Bedrock servers from one web UI.',

    head: [
      // Performance: DNS prefetch & preconnect for external resources
      ['link', { rel: 'dns-prefetch', href: 'https://fonts.googleapis.com' }],
      ['link', { rel: 'dns-prefetch', href: 'https://fonts.gstatic.com' }],
      ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com', crossorigin: '' }],
      ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
      // Load fonts async to avoid render-blocking CSS (LCP)
      [
        'link',
        {
          rel: 'preload',
          as: 'style',
          href: 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;700;800&family=Archivo+Black&family=JetBrains+Mono:wght@400;500;700&display=swap',
        },
      ],
      [
        'link',
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;700;800&family=Archivo+Black&family=JetBrains+Mono:wght@400;500;700&display=swap',
          media: 'print',
          onload: "this.media='all'",
        },
      ],
      [
        'noscript',
        {},
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;700;800&family=Archivo+Black&family=JetBrains+Mono:wght@400;500;700&display=swap">',
      ],

      // Icons & PWA
      ['link', { rel: 'icon', href: '/favicon.ico', sizes: '48x48' }],
      ['link', { rel: 'manifest', href: '/manifest.json' }],
      ['link', { rel: 'apple-touch-icon', href: '/cubo.webp', sizes: '512x512' }],
      ['meta', { name: 'theme-color', content: '#0a0e08' }],
      ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
      ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }],
      ['meta', { name: 'apple-mobile-web-app-title', content: 'Minepanel' }],
      [
        'meta',
        {
          name: 'keywords',
          content:
            'minecraft server manager, minecraft java server, minecraft bedrock server, minecraft server panel, minecraft docker, minecraft control panel, pterodactyl alternative, aternos alternative, self hosted minecraft, minecraft web panel, paper server manager, forge server manager, neoforge server manager, fabric server manager, purpur server, spigot server, minecraft bedrock docker, free minecraft server hosting, minecraft dashboard, minecraft server hosting panel, manage minecraft servers',
        },
      ],
      ['meta', { name: 'author', content: 'Ketbome' }],
      [
        'meta',
        { name: 'robots', content: 'index, follow, max-snippet:150, max-image-preview:large' },
      ],
      [
        'meta',
        { name: 'googlebot', content: 'index, follow, max-snippet:150, max-image-preview:large' },
      ],
      [
        'meta',
        { name: 'bingbot', content: 'index, follow, max-snippet:150, max-image-preview:large' },
      ],
      ['meta', { name: 'format-detection', content: 'telephone=no' }],
      ['meta', { name: 'color-scheme', content: 'light dark' }],
      // Open Graph defaults (overridden per page via frontmatter)
      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:locale', content: 'en_US' }],
      ['meta', { property: 'og:site_name', content: 'Minepanel' }],
      [
        'meta',
        {
          property: 'og:image',
          content: `${hostname}/cubo.webp`,
        },
      ],
      ['meta', { property: 'og:image:width', content: '512' }],
      ['meta', { property: 'og:image:height', content: '512' }],
      ['meta', { property: 'og:image:alt', content: 'Minepanel Logo' }],
      // Twitter defaults
      ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
      ['meta', { name: 'twitter:site', content: '@Ketbome' }],
      ['meta', { name: 'twitter:creator', content: '@Ketbome' }],
      [
        'meta',
        {
          name: 'twitter:image',
          content: `${hostname}/cubo.webp`,
        },
      ],
      ['meta', { name: 'twitter:image:alt', content: 'Minepanel Logo - Minecraft Server Manager' }],

      // Structured Data: Organization
      [
        'script',
        { type: 'application/ld+json' },
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'Minepanel',
          applicationCategory: 'ServerApplication',
          operatingSystem: 'Linux, macOS, Windows',
          description:
            'Free open source Minecraft server management panel for Java and Bedrock Edition',
          url: hostname,
          sameAs: [
            'https://github.com/Ketbome/minepanel',
            'https://hub.docker.com/r/ketbom/minepanel',
          ],
          author: {
            '@type': 'Person',
            name: 'Ketbome',
            url: 'https://github.com/Ketbome',
          },
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
          softwareVersion: '1.10.8',
          softwareRequirements: 'Docker 20.10+, Docker Compose v2.0+',
          releaseNotes: `${hostname}/roadmap`,
          screenshot: `${hostname}/img/minepanel.png`,
          datePublished: '2024-01-01',
          dateModified: '2026-06-12',
        }),
      ],

      // Analytics: anonymous, cookieless page views via self-hosted Umami.
      [
        'script',
        {
          defer: '',
          src: 'https://umami.ketbome.com/script.js',
          'data-website-id': '52729fa7-57f4-43e9-a142-f3ec0be2f1b6',
        },
      ],
    ],

    // Generate dynamic canonical URLs and merge page-specific meta
    transformHead({ pageData }) {
      const head: HeadConfig[] = [];
      const pagePath = pageData.relativePath
        .replace(/\.md$/, '')
        .replace(/\/index$/, '')
        .replace(/^index$/, '');
      const canonicalPath = pagePath ? `/${pagePath}` : '/';
      const canonicalUrl = `${hostname}${canonicalPath}`;
      const normalizedPagePath = pagePath.toLowerCase();
      const title = pageData.frontmatter.title || pageData.title || 'Minepanel';
      const description =
        pageData.frontmatter.description ||
        'Free open source Minecraft server management panel for Java and Bedrock Edition.';

      head.push(
        ['link', { rel: 'canonical', href: canonicalUrl }],
        ['meta', { property: 'og:url', content: canonicalUrl }],
        ['meta', { property: 'og:title', content: title }],
        ['meta', { property: 'og:description', content: description }],
        ['meta', { name: 'twitter:title', content: title }],
        ['meta', { name: 'twitter:description', content: description }],
        [
          'script',
          {},
          String.raw`(function(){var p=window.location.pathname;if(!p||!p.endsWith('.html'))return;var clean=p==='/'||p==='/index.html'?'/':p.replace(/\.html$/, '');if(clean!==p){window.location.replace(clean+window.location.search+window.location.hash);}})();`,
        ],
      );

      if (normalizedPagePath === 'agents') {
        head.push(
          ['meta', { name: 'robots', content: 'noindex, nofollow' }],
          ['meta', { name: 'googlebot', content: 'noindex, nofollow' }],
        );
      }

      return head;
    },

    cleanUrls: true,

    // The theme is designed dark-only (neo-brutalist terminal aesthetic)
    appearance: 'force-dark',

    themeConfig: {
      // https://vitepress.dev/reference/default-theme-config
      logo: '/cubo.webp',

      nav: [
        { text: 'Home', link: '/' },
        { text: 'Getting Started', link: '/getting-started' },
        { text: 'Guide', link: '/installation' },
        {
          text: 'Resources',
          items: [
            { text: 'Features', link: '/features' },
            { text: 'API Reference', link: '/api' },
            { text: 'Roadmap', link: '/roadmap' },
            { text: 'Architecture', link: '/architecture' },
            { text: 'Development', link: '/development' },
            { text: 'FAQ', link: '/faq' },
          ],
        },
        {
          text: 'Links',
          items: [
            { text: 'GitHub', link: 'https://github.com/Ketbome/minepanel' },
            {
              text: 'Docker Hub',
              link: 'https://hub.docker.com/r/ketbom/minepanel',
            },
            {
              text: 'Report Issue',
              link: 'https://github.com/Ketbome/minepanel/issues',
            },
          ],
        },
      ],

      sidebar: [
        {
          text: 'Getting Started',
          collapsed: false,
          items: [
            { text: 'Introduction', link: '/getting-started' },
            { text: 'Installation', link: '/installation' },
            { text: 'Configuration', link: '/configuration' },
            { text: 'Quick Start', link: '/' },
          ],
        },
        {
          text: 'Server Management',
          collapsed: false,
          items: [
            { text: 'Server Types', link: '/server-types' },
            { text: 'Mods & Plugins', link: '/mods-plugins' },
            { text: 'Features', link: '/features' },
            { text: 'Backups', link: '/features#backups' },
            { text: 'Player Management', link: '/features#player-management' },
          ],
        },
        {
          text: 'Administration',
          collapsed: false,
          items: [
            { text: 'Networking', link: '/networking' },
            { text: 'Single Sign-On (SSO)', link: '/sso' },
            { text: 'Administration', link: '/administration' },
            { text: 'Troubleshooting', link: '/troubleshooting' },
            { text: 'FAQ', link: '/faq' },
          ],
        },
        {
          text: 'Development',
          collapsed: false,
          items: [
            { text: 'API Reference', link: '/api' },
            { text: 'Architecture', link: '/architecture' },
            { text: 'Storage & Scaling', link: '/storage-scaling' },
            { text: 'Development', link: '/development' },
            { text: 'Roadmap', link: '/roadmap' },
          ],
        },
      ],
      // Sugerencia de internacionalización futura
      // locales: {
      //   root: { label: 'English', lang: 'en' },
      //   es: { label: 'Español', lang: 'es' },
      // },

      socialLinks: [
        { icon: 'github', link: 'https://github.com/Ketbome/minepanel' },
        { icon: 'docker', link: 'https://hub.docker.com/r/ketbom/minepanel' },
      ],

      footer: {
        message: 'Released under the MIT License. · Anonymous, cookieless analytics (self-hosted Umami).',
        copyright: 'Copyright © 2024-2026 Ketbome',
      },

      editLink: {
        pattern: 'https://github.com/Ketbome/minepanel/edit/main/doc/:path',
        text: 'Edit this page on GitHub',
      },

      search: {
        provider: 'local',
        options: {
          translations: {
            button: {
              buttonText: 'Search',
              buttonAriaLabel: 'Search',
            },
            modal: {
              displayDetails: 'Display detailed list',
              resetButtonTitle: 'Reset search',
              backButtonTitle: 'Close search',
              noResultsText: 'No results for',
              footer: {
                selectText: 'to select',
                selectKeyAriaLabel: 'enter',
                navigateText: 'to navigate',
                navigateUpKeyAriaLabel: 'up arrow',
                navigateDownKeyAriaLabel: 'down arrow',
                closeText: 'to close',
                closeKeyAriaLabel: 'escape',
              },
            },
          },
        },
      },

      outline: {
        level: [2, 3],
        label: 'On this page',
      },
    },

    lastUpdated: true,

    markdown: {
      lineNumbers: true,
      image: {
        lazyLoading: true,
      },
      theme: 'github-dark',
    },

    ignoreDeadLinks: [
      // Ignore localhost links
      /^http:\/\/localhost/,
      /^https:\/\/localhost/,
      // Ignore local IP addresses
      /^http:\/\/127\.0\.0\.1/,
      /^http:\/\/192\.168\./,
    ],

    sitemap: {
      hostname: 'https://minepanel.ketbome.com',
      lastmodDateOnly: false,
      transformItems: (items) => {
        const normalizedPath = (rawUrl: string) => {
          if (!rawUrl) return '/';

          try {
            const parsed = new URL(rawUrl, `${hostname}/`);
            return parsed.pathname.replace(/\/+$/, '') || '/';
          } catch {
            return rawUrl.replace(/\/+$/, '') || '/';
          }
        };

        const priorities: Record<string, number> = {
          '/': 1,
          '/getting-started': 0.95,
          '/installation': 0.95,
          '/configuration': 0.9,
          '/features': 0.9,
          '/server-types': 0.85,
          '/networking': 0.85,
          '/troubleshooting': 0.85,
        };

        const changefreqMap: Record<string, string> = {
          '/': 'weekly',
          '/getting-started': 'weekly',
          '/installation': 'weekly',
          '/configuration': 'weekly',
          '/features': 'weekly',
        };

        const filteredItems = items.filter((item) => {
          const path = normalizedPath(item.url).toLowerCase();
          return !path.startsWith('/agents') && path !== '/404';
        });

        return filteredItems.map((item) => {
          const path = normalizedPath(item.url).toLowerCase();
          const priority = priorities[path] ?? 0.7;
          const changefreq = changefreqMap[path] ?? 'monthly';

          return {
            ...item,
            priority,
            changefreq,
          };
        });
      },
    },

    mermaid: {
      theme: 'dark',
    },

    vite: {
      plugins: [llmstxt()],
      build: {
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
          },
        } as any,
        cssCodeSplit: true,
        assetsInlineLimit: 4096,
      },
      optimizeDeps: {
        exclude: ['@vueuse/core'],
      },
      ssr: {
        noExternal: ['vitepress-plugin-mermaid'],
      },
    },
    transformHtml: (code) => {
      return code;
    },
  }),
);

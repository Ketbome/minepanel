import { defineConfig, HeadConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

const hostname = "https://minepanel.ketbome.com";

// https://vitepress.dev/reference/site-config
export default withMermaid(
  defineConfig({
    title: "Minepanel",
    description:
      "Free open source Minecraft server management panel with Docker. Self-hosted alternative to Pterodactyl and Aternos. Web UI for Paper, Forge, Fabric, Spigot servers.",

    head: [
      ["link", { rel: "icon", href: "/favicon.ico" }],
      ["link", { rel: "manifest", href: "/manifest.json" }],
      ["link", { rel: "apple-touch-icon", href: "/cubo.webp" }],
      ["meta", { name: "theme-color", content: "#3eaf7c" }],
      ["meta", { name: "apple-mobile-web-app-capable", content: "yes" }],
      ["meta", { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" }],
      [
        "meta",
        {
          name: "keywords",
          content:
            "minecraft server manager, minecraft server panel, minecraft docker, minecraft control panel, pterodactyl alternative, aternos alternative, self hosted minecraft, minecraft web panel, paper server manager, forge server manager, fabric server manager, free minecraft server hosting, minecraft dashboard",
        },
      ],
      ["meta", { name: "author", content: "Ketbome" }],
      ["meta", { name: "robots", content: "index, follow" }],
      // Open Graph defaults (overridden per page via frontmatter)
      ["meta", { property: "og:type", content: "website" }],
      ["meta", { property: "og:locale", content: "en" }],
      ["meta", { property: "og:site_name", content: "Minepanel" }],
      [
        "meta",
        {
          property: "og:image",
          content: `${hostname}/cubo.webp`,
        },
      ],
      ["meta", { property: "og:image:width", content: "512" }],
      ["meta", { property: "og:image:height", content: "512" }],
      ["meta", { property: "og:image:alt", content: "Minepanel Logo" }],
      // Twitter defaults
      ["meta", { name: "twitter:card", content: "summary_large_image" }],
      [
        "meta",
        {
          name: "twitter:image",
          content: `${hostname}/cubo.webp`,
        },
      ],
    ],

    // Generate dynamic canonical URLs and merge page-specific meta
    transformHead({ pageData }) {
      const head: HeadConfig[] = [];
      const pagePath = pageData.relativePath.replace(/\.md$/, "").replace(/index$/, "");
      const canonicalUrl = `${hostname}/${pagePath}`;

      head.push(["link", { rel: "canonical", href: canonicalUrl }]);
      head.push(["meta", { property: "og:url", content: canonicalUrl }]);

      // Use page title/description for Twitter if not set in frontmatter
      if (pageData.frontmatter.title) {
        head.push(["meta", { name: "twitter:title", content: pageData.frontmatter.title }]);
      }
      if (pageData.frontmatter.description) {
        head.push(["meta", { name: "twitter:description", content: pageData.frontmatter.description }]);
      }

      return head;
    },

    themeConfig: {
      // https://vitepress.dev/reference/default-theme-config
      logo: "/cubo.webp",

      nav: [
        { text: "Home", link: "/" },
        { text: "Getting Started", link: "/getting-started" },
        { text: "Guide", link: "/installation" },
        {
          text: "Resources",
          items: [
            { text: "Features", link: "/features" },
            { text: "Roadmap", link: "/roadmap" },
            { text: "Architecture", link: "/architecture" },
            { text: "API Reference", link: "/api" },
            { text: "Development", link: "/development" },
            { text: "FAQ", link: "/faq" },
          ],
        },
        {
          text: "Links",
          items: [
            { text: "GitHub", link: "https://github.com/Ketbome/minepanel" },
            {
              text: "Docker Hub",
              link: "https://hub.docker.com/r/ketbom/minepanel",
            },
            {
              text: "Report Issue",
              link: "https://github.com/Ketbome/minepanel/issues",
            },
          ],
        },
      ],

      sidebar: [
        {
          text: "🚀 Getting Started",
          collapsed: false,
          items: [
            { text: "Introduction", link: "/getting-started" },
            { text: "Installation", link: "/installation" },
            { text: "Configuration", link: "/configuration" },
          ],
        },
        {
          text: "⚙️ Server Management",
          collapsed: false,
          items: [
            { text: "Server Types", link: "/server-types" },
            { text: "Mods & Plugins", link: "/mods-plugins" },
          ],
        },
        {
          text: "🔧 Administration",
          collapsed: false,
          items: [
            { text: "Networking", link: "/networking" },
            { text: "Administration", link: "/administration" },
            { text: "Troubleshooting", link: "/troubleshooting" },
          ],
        },
        {
          text: "📖 Resources",
          collapsed: false,
          items: [
            { text: "Features", link: "/features" },
            { text: "Roadmap", link: "/roadmap" },
            { text: "Architecture", link: "/architecture" },
            { text: "Development", link: "/development" },
            { text: "FAQ", link: "/faq" },
          ],
        },
      ],

      socialLinks: [
        { icon: "github", link: "https://github.com/Ketbome/minepanel" },
        { icon: "docker", link: "https://hub.docker.com/r/ketbom/minepanel" },
      ],

      footer: {
        message: "Released under the MIT License.",
        copyright: "Copyright © 2024 Ketbome",
      },

      editLink: {
        pattern: "https://github.com/Ketbome/minepanel/edit/main/doc/:path",
        text: "Edit this page on GitHub",
      },

      search: {
        provider: "local",
        options: {
          translations: {
            button: {
              buttonText: "Search",
              buttonAriaLabel: "Search",
            },
            modal: {
              displayDetails: "Display detailed list",
              resetButtonTitle: "Reset search",
              backButtonTitle: "Close search",
              noResultsText: "No results for",
              footer: {
                selectText: "to select",
                selectKeyAriaLabel: "enter",
                navigateText: "to navigate",
                navigateUpKeyAriaLabel: "up arrow",
                navigateDownKeyAriaLabel: "down arrow",
                closeText: "to close",
                closeKeyAriaLabel: "escape",
              },
            },
          },
        },
      },

      outline: {
        level: [2, 3],
        label: "On this page",
      },
    },

    lastUpdated: true,

    markdown: {
      lineNumbers: true,
      theme: {
        light: "github-light",
        dark: "github-dark",
      },
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
      hostname: "https://minepanel.ketbome.com",
    },

    // Mermaid configuration
    mermaid: {
      theme: "dark",
    },
  })
);

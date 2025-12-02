import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Minepanel Documentation",
  description:
    "Modern Minecraft Server Management Panel - Complete documentation and guides",

  head: [
    ["link", { rel: "icon", href: "/favicon.ico" }],
    ["meta", { name: "theme-color", content: "#3eaf7c" }],
    ["meta", { name: "og:type", content: "website" }],
    ["meta", { name: "og:locale", content: "en" }],
    [
      "meta",
      {
        name: "og:title",
        content: "Minepanel | Modern Minecraft Server Management",
      },
    ],
    [
      "meta",
      {
        name: "og:description",
        content:
          "Manage multiple Minecraft servers with a beautiful web interface using Docker",
      },
    ],
    ["meta", { name: "og:site_name", content: "Minepanel" }],
  ],

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
});

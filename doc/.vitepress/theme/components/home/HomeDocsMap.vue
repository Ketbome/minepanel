<script setup>
const pages = [
  { path: './getting-started', title: 'Getting started', desc: 'Requirements, first run, and your first server.', link: '/getting-started' },
  { path: './installation', title: 'Installation', desc: 'Docker Compose setup for local, LAN, and production.', link: '/installation' },
  { path: './server-types', title: 'Server types', desc: 'Paper, Forge, Fabric, Purpur, Spigot, and Bedrock.', link: '/server-types' },
  { path: './networking', title: 'Networking', desc: 'Hostname routing, ports, proxies, and SSL.', link: '/networking' },
  { path: './api', title: 'API reference', desc: 'REST endpoints for automation and integrations.', link: '/api' },
  { path: './troubleshooting', title: 'Troubleshooting', desc: 'Common failures and how to read the logs.', link: '/troubleshooting' },
];
</script>

<template>
  <section class="mp-docsmap" aria-label="Documentation map">
    <div class="mp-docsmap-head" data-gsap="reveal">
      <h2 class="mp-h2">Read the manual</h2>
      <span class="mp-tag">[ 04 / DOCS ]</span>
    </div>
    <div class="mp-docsmap-grid">
      <a v-for="p in pages" :key="p.link" class="mp-docsmap-card" :href="p.link" data-gsap="card">
        <span class="mp-tag">{{ p.path }}</span>
        <span class="mp-docsmap-title">{{ p.title }}</span>
        <span class="mp-docsmap-desc">{{ p.desc }}</span>
        <span class="mp-docsmap-arrow" aria-hidden="true">→</span>
      </a>
    </div>
  </section>
</template>

<style scoped>
.mp-docsmap {
  max-width: 1200px;
  margin: 0 auto;
  padding: 96px 40px;
}

.mp-docsmap-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 48px;
  flex-wrap: wrap;
}

.mp-docsmap-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.mp-docsmap-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--mp-bg-elev);
  border: 2px solid var(--mp-border);
  padding: 24px 22px 22px;
  color: var(--mp-text);
  transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}

.mp-docsmap-card:hover {
  border-color: var(--mp-acid);
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0 rgba(157, 255, 63, 0.25);
}

.mp-docsmap-title {
  font-weight: 800;
  font-size: 18px;
  text-transform: uppercase;
  letter-spacing: -0.01em;
}

.mp-docsmap-desc {
  font-size: 14px;
  line-height: 1.55;
  color: var(--mp-muted);
  text-wrap: pretty;
}

.mp-docsmap-arrow {
  position: absolute;
  top: 20px;
  right: 20px;
  color: var(--mp-dim);
  font-family: var(--mp-font-mono);
  transition: color 0.15s ease;
}

.mp-docsmap-card:hover .mp-docsmap-arrow {
  color: var(--mp-acid);
}

@media (max-width: 900px) {
  .mp-docsmap {
    padding: 64px 24px;
  }

  .mp-docsmap-grid {
    grid-template-columns: 1fr;
  }
}
</style>

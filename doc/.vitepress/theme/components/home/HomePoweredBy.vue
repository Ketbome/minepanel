<script setup>
const deps = [
  { name: 'docker-minecraft-server', role: 'Java Edition servers', url: 'https://github.com/itzg/docker-minecraft-server' },
  { name: 'docker-minecraft-bedrock-server', role: 'Bedrock Edition servers', url: 'https://github.com/itzg/docker-minecraft-bedrock-server' },
  { name: 'docker-mc-backup', role: 'Automatic backups', url: 'https://github.com/itzg/docker-mc-backup' },
  { name: 'mc-router', role: 'Proxy routing by hostname', url: 'https://github.com/itzg/mc-router' },
];
</script>

<template>
  <section class="mp-band" aria-label="Powered by">
    <div class="mp-powered" data-gsap="reveal">
      <div class="mp-powered-copy">
        <span class="mp-tag">[ 03 / POWERED BY ]</span>
        <h2 class="mp-h2">Built on proven open source</h2>
        <p>
          Minepanel stands on top of the amazing projects by
          <a href="https://github.com/itzg" target="_blank" rel="noopener">itzg</a>.
        </p>
        <div class="mp-powered-stack">Next.js · NestJS · TypeScript · Docker</div>
      </div>
      <div class="mp-powered-grid">
        <a v-for="d in deps" :key="d.name" class="mp-dep" :href="d.url" target="_blank" rel="noopener">
          <span class="mp-tag">{{ d.name }}</span>
          <span class="mp-dep-role">{{ d.role }}</span>
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.mp-band {
  border-top: 2px solid var(--mp-border);
  background: var(--mp-bg-panel);
}

.mp-powered {
  max-width: 1200px;
  margin: 0 auto;
  padding: 80px 40px;
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 56px;
}

.mp-powered-copy {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.mp-powered-copy p {
  color: var(--mp-muted);
  line-height: 1.6;
  margin: 0;
}

.mp-powered-copy a {
  color: var(--mp-acid);
}

.mp-powered-copy a:hover {
  color: var(--mp-acid-soft);
}

.mp-powered-stack {
  font-family: var(--mp-font-mono);
  font-size: 13px;
  color: var(--mp-dim);
  margin-top: 8px;
}

.mp-powered-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.mp-dep {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--mp-bg);
  border: 2px solid var(--mp-border);
  padding: 22px;
  color: var(--mp-text);
  transition: border-color 0.15s ease;
}

.mp-dep:hover {
  border-color: var(--mp-acid);
}

.mp-dep .mp-tag {
  overflow-wrap: anywhere;
}

.mp-dep-role {
  font-size: 14px;
  color: var(--mp-muted);
}

@media (max-width: 900px) {
  .mp-powered {
    grid-template-columns: 1fr;
    gap: 32px;
    padding: 56px 24px;
  }

  .mp-powered-grid {
    grid-template-columns: 1fr;
  }
}
</style>

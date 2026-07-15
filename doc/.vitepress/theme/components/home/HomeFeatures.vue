<script setup>
const features = [
  { num: '/01', title: 'Java + Bedrock', desc: 'Run both editions from the same dashboard with edition-specific controls.' },
  { num: '/02', title: 'Docker-first', desc: 'Each server is isolated, easy to restart, and simple to migrate.' },
  { num: '/03', title: 'World & files', desc: 'Upload worlds, edit configs, and manage folders without leaving the UI.' },
  { num: '/04', title: 'Live monitoring', desc: 'Track status, resources, and errors in real time while players are connected.' },
  { num: '/05', title: 'Backups', desc: 'Schedule backups and recover quickly when testing goes wrong.' },
  { num: '/06', title: 'Networking', desc: 'Hostname routing for Java or direct UDP ports for Bedrock servers.' },
];
</script>

<template>
  <section class="mp-features" aria-label="Features">
    <div class="mp-features-head" data-gsap="reveal">
      <h2 class="mp-h2 is-big">Everything an admin needs</h2>
      <span class="mp-tag">[ 02 / FEATURES ]</span>
    </div>
    <div class="mp-features-grid">
      <article v-for="f in features" :key="f.num" class="mp-feature" data-gsap="card">
        <span class="mp-tag">{{ f.num }}</span>
        <h3>{{ f.title }}</h3>
        <p>{{ f.desc }}</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.mp-features {
  max-width: 1200px;
  margin: 0 auto;
  padding: 96px 40px;
}

.mp-features-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 48px;
  flex-wrap: wrap;
}

.mp-h2.is-big {
  font-size: clamp(40px, 5vw, 64px);
  line-height: 0.95;
  max-width: 640px;
}

.mp-features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 2px solid var(--mp-border);
}

.mp-feature {
  padding: 32px 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  border-right: 2px solid var(--mp-border);
  border-bottom: 2px solid var(--mp-border);
  margin: -1px;
  transition: background-color 0.15s ease;
}

.mp-feature:hover {
  background: var(--mp-bg-elev);
}

.mp-feature h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.01em;
  text-transform: uppercase;
  color: var(--mp-text);
}

.mp-feature p {
  margin: 0;
  color: var(--mp-muted);
  line-height: 1.6;
  font-size: 15px;
  text-wrap: pretty;
}

@media (max-width: 900px) {
  .mp-features {
    padding: 64px 24px;
  }

  .mp-features-grid {
    grid-template-columns: 1fr;
  }
}
</style>

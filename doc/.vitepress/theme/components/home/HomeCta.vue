<template>
  <section class="mp-cta-band" aria-label="Call to action">
    <div class="mp-cta" data-gsap="reveal">
      <h2 class="mp-cta-title">Own your<br /><span>server.</span></h2>
      <a class="mp-btn-acid is-big" href="/getting-started">DEPLOY NOW →</a>
      <div class="mp-cta-links">
        <a href="https://github.com/Ketbome/minepanel" target="_blank" rel="noopener">github</a>
        <a href="https://hub.docker.com/r/ketbom/minepanel" target="_blank" rel="noopener">docker hub</a>
        <a href="https://github.com/Ketbome/minepanel/issues" target="_blank" rel="noopener">issues</a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.mp-cta-band {
  border-top: 2px solid var(--mp-border);
}

.mp-cta {
  max-width: 1200px;
  margin: 0 auto;
  padding: 110px 40px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
}

.mp-cta-title {
  font-family: var(--mp-font-display);
  font-size: clamp(48px, 7vw, 92px);
  margin: 0;
  line-height: 0.95;
  text-transform: uppercase;
  letter-spacing: -0.02em;
  color: var(--mp-text);
}

.mp-cta-title span {
  color: var(--mp-acid);
}

.mp-cta-links {
  display: flex;
  gap: 24px;
  font-family: var(--mp-font-mono);
  font-size: 13px;
}

.mp-cta-links a {
  color: var(--mp-muted);
  transition: color 0.15s ease;
}

.mp-cta-links a:hover {
  color: var(--mp-text);
}

@media (max-width: 768px) {
  .mp-cta {
    padding: 72px 24px;
  }
}
</style>

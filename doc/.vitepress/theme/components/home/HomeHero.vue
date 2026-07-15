<template>
  <header class="mp-hero" aria-label="Minepanel intro">
    <div class="mp-hero-copy" data-gsap="hero-copy">
      <div class="mp-hero-badge">
        <span class="mp-hero-badge-dot" aria-hidden="true"></span>
        <span>v-latest · open source · self-hosted</span>
      </div>
      <h1 class="mp-hero-title">
        <span>Your servers.</span>
        <span class="is-acid">Your rules.</span>
        <span class="is-outline">Zero cost.</span>
      </h1>
      <p class="mp-hero-lead">
        Java &amp; Bedrock Edition in one panel. Free, self-hosted, Docker-based Minecraft server
        management — the Pterodactyl / Aternos alternative you actually own.
      </p>
      <div class="mp-hero-actions">
        <a class="mp-btn-acid" href="/getting-started">GET STARTED →</a>
        <a class="mp-btn-ghost" href="https://hub.docker.com/r/ketbom/minepanel" target="_blank" rel="noopener">DOCKER HUB</a>
      </div>
    </div>

    <div class="mp-hero-terminal" data-gsap="hero-terminal">
      <div class="mp-term">
        <div class="mp-term-bar">
          <span class="mp-term-path">~/minepanel</span>
          <span class="mp-term-live">● LIVE</span>
        </div>
        <div class="mp-term-body">
          <div><span class="mp-term-prompt">$</span> docker compose up -d</div>
          <div class="mp-term-dim">[+] Running 3/3</div>
          <div><span class="mp-term-prompt">✔</span> minepanel-backend&nbsp;&nbsp;Started</div>
          <div><span class="mp-term-prompt">✔</span> minepanel-frontend&nbsp;Started</div>
          <div><span class="mp-term-prompt">✔</span> minepanel-db&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Started</div>
          <div><span class="mp-term-prompt">$</span> <span class="mp-term-cursor" aria-hidden="true"></span></div>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.mp-hero {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 40px 72px;
  position: relative;
}

.mp-hero-copy {
  display: flex;
  flex-direction: column;
  gap: 28px;
  position: relative;
  z-index: 2;
}

.mp-hero-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--mp-font-mono);
  font-size: 13px;
  font-weight: 500;
  color: var(--mp-acid);
}

.mp-hero-badge-dot {
  width: 10px;
  height: 10px;
  background: var(--mp-acid);
}

.mp-hero-title {
  font-family: var(--mp-font-display);
  font-size: clamp(56px, 9vw, 118px);
  line-height: 0.92;
  margin: 0;
  letter-spacing: -0.02em;
  text-transform: uppercase;
  color: var(--mp-text);
}

.mp-hero-title span {
  display: block;
}

.mp-hero-title .is-acid {
  color: var(--mp-acid);
}

.mp-hero-title .is-outline {
  color: transparent;
  -webkit-text-stroke: 2px var(--mp-border-strong);
}

.mp-hero-lead {
  font-size: 20px;
  line-height: 1.55;
  color: var(--mp-muted);
  margin: 0;
  max-width: 520px;
  text-wrap: pretty;
}

.mp-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  margin-top: 4px;
}

.mp-hero-terminal {
  position: relative;
  margin-top: -40px;
  margin-left: auto;
  width: min(560px, 90%);
  transform: rotate(1.5deg);
  z-index: 1;
}

.mp-term {
  background: var(--mp-bg-elev);
  border: 2px solid var(--mp-border-strong);
  box-shadow: 10px 10px 0 rgba(157, 255, 63, 0.15);
  overflow: hidden;
}

.mp-term-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 2px solid var(--mp-border);
  background: var(--mp-bg-panel);
  font-family: var(--mp-font-mono);
  font-size: 12px;
}

.mp-term-path {
  color: var(--mp-dim);
}

.mp-term-live {
  color: var(--mp-acid);
}

.mp-term-body {
  padding: 20px 22px 24px;
  font-family: var(--mp-font-mono);
  font-size: 14px;
  line-height: 2;
  color: var(--mp-muted);
  background-image: repeating-linear-gradient(
    0deg,
    rgba(157, 255, 63, 0.02) 0px,
    rgba(157, 255, 63, 0.02) 1px,
    transparent 1px,
    transparent 4px
  );
  animation: mp-scan 6s linear infinite;
}

.mp-term-prompt {
  color: var(--mp-acid);
}

.mp-term-dim {
  color: var(--mp-dim);
}

.mp-term-cursor {
  display: inline-block;
  width: 9px;
  height: 17px;
  background: var(--mp-acid);
  vertical-align: text-bottom;
  animation: mp-blink 1.1s steps(1) infinite;
}

@keyframes mp-blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}

@keyframes mp-scan {
  0% { background-position: 0 0; }
  100% { background-position: 0 8px; }
}

@media (max-width: 768px) {
  .mp-hero {
    padding: 32px 24px 56px;
  }

  .mp-hero-terminal {
    margin-top: 24px;
    width: 100%;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mp-term-body,
  .mp-term-cursor {
    animation: none;
  }
}
</style>

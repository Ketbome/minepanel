<template>
  <section class="terminal-wrap" aria-label="Installation command demo">
    <div class="terminal" role="img" aria-label="Terminal animation showing docker compose up -d">
      <div class="terminal-bar">
        <span class="label">~/minepanel-install</span>
        <span class="status">● LIVE</span>
      </div>

      <div class="terminal-body">
        <p class="line command">
          <span class="prompt">$</span>
          <span class="typed">docker compose up -d</span>
        </p>
        <p class="line output out-1">[+] Running 3/3</p>
        <p class="line output out-2"> ✔ Container minepanel-backend   Started</p>
        <p class="line output out-3"> ✔ Container minepanel-frontend  Started</p>
        <p class="line output out-4"> ✔ Container minepanel-db        Started</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.terminal-wrap {
  margin: 24px 0 10px;
}

.terminal {
  border: 2px solid var(--mp-border-strong);
  border-radius: 0;
  overflow: hidden;
  box-shadow: var(--mp-shadow-acid);
  background: var(--mp-bg-elev);
}

.terminal-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--mp-bg-panel);
  border-bottom: 2px solid var(--mp-border);
}

.label {
  color: var(--mp-dim);
  font: 400 12px var(--mp-font-mono);
}

.status {
  color: var(--mp-acid);
  font: 700 12px var(--mp-font-mono);
}

.terminal-body {
  padding: 14px 16px 16px;
  color: var(--mp-muted);
  font: 400 15px/1.55 var(--mp-font-mono);
  background-image: repeating-linear-gradient(
    0deg,
    rgba(157, 255, 63, 0.02) 0px,
    rgba(157, 255, 63, 0.02) 1px,
    transparent 1px,
    transparent 4px
  );
}

.line {
  margin: 0;
  white-space: pre-wrap;
}

.command {
  display: flex;
  align-items: center;
  gap: 10px;
}

.prompt {
  color: var(--mp-acid);
  font-weight: 700;
}

.typed {
  overflow: hidden;
  white-space: nowrap;
  width: 0;
  border-right: 2px solid var(--mp-acid);
  color: var(--mp-text);
  animation:
    typing 2.2s steps(20, end) 0.2s forwards,
    blink 0.75s step-end infinite;
}

.output {
  opacity: 0;
  transform: translateY(4px);
  animation: reveal 0.35s ease forwards;
}

.out-1 {
  margin-top: 10px;
  color: var(--mp-dim);
  animation-delay: 2.6s;
}

.out-2 {
  animation-delay: 2.95s;
}

.out-3 {
  animation-delay: 3.25s;
}

.out-4 {
  animation-delay: 3.55s;
}

@keyframes typing {
  to {
    width: 20ch;
  }
}

@keyframes blink {
  50% {
    border-right-color: transparent;
  }
}

@keyframes reveal {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .terminal-body {
    font-size: 13px;
  }

  .label {
    font-size: 10px;
  }
}
</style>

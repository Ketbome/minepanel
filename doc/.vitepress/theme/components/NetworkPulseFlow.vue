<template>
  <section class="network-flow" aria-label="HTTPS request flow">
    <div class="canvas">
      <div class="node user">User</div>
      <div class="node proxy">Proxy / SSL</div>
      <div class="node frontend">Frontend :3000</div>
      <div class="node backend">Backend :8091</div>

      <div class="link l1"><span class="pulse"></span></div>
      <div class="link l2"><span class="pulse"></span></div>
      <div class="link l3"><span class="pulse"></span></div>
    </div>
  </section>
</template>

<style scoped>
.network-flow {
  margin: 14px 0 18px;
}

.canvas {
  position: relative;
  border: 2px solid var(--mp-border-strong);
  border-radius: 0;
  background: var(--mp-bg-panel);
  background-image: linear-gradient(rgba(157, 255, 63, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(157, 255, 63, 0.03) 1px, transparent 1px);
  background-size: 24px 24px;
  box-shadow: var(--mp-shadow-acid);
  min-height: 250px;
  overflow: hidden;
}

.node {
  position: absolute;
  z-index: 2;
  border: 2px solid var(--mp-border-strong);
  border-radius: 0;
  background: var(--mp-bg);
  padding: 10px 12px;
  font: 700 11px var(--mp-font-mono);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--mp-text);
}

.user {
  left: 8%;
  top: 50%;
  transform: translateY(-50%);
}

.proxy {
  left: 36%;
  top: 50%;
  transform: translateY(-50%);
}

.frontend {
  right: 9%;
  top: 30%;
}

.backend {
  right: 9%;
  bottom: 30%;
}

.link {
  position: absolute;
  z-index: 1;
  height: 4px;
  background: rgba(157, 255, 63, 0.18);
  border-radius: 0;
  overflow: hidden;
}

.l1 {
  left: 20%;
  top: 50%;
  width: 17%;
  transform: translateY(-50%);
}

.l2 {
  left: 50%;
  top: 35%;
  width: 34%;
}

.l3 {
  left: 50%;
  bottom: 35%;
  width: 34%;
}

.pulse {
  position: absolute;
  inset: 0 auto 0 -20%;
  width: 20%;
  background: linear-gradient(90deg, rgba(157, 255, 63, 0), rgba(157, 255, 63, 0.95));
  animation: move 2.2s linear infinite;
}

.l2 .pulse,
.l3 .pulse {
  animation-delay: 0.35s;
}

@keyframes move {
  to {
    left: 100%;
  }
}

@media (max-width: 900px) {
  .canvas {
    min-height: 320px;
  }

  .user,
  .proxy,
  .frontend,
  .backend {
    left: 50%;
    right: auto;
    transform: translateX(-50%);
  }

  .user {
    top: 14%;
  }

  .proxy {
    top: 38%;
  }

  .frontend {
    top: 64%;
  }

  .backend {
    top: 84%;
  }

  .link {
    width: 4px;
    height: 42px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(157, 255, 63, 0.18);
  }

  .l1 {
    top: 22%;
  }

  .l2 {
    top: 47%;
  }

  .l3 {
    top: 70%;
    bottom: auto;
  }

  .pulse {
    inset: -20% 0 auto 0;
    width: 100%;
    height: 20%;
    background: linear-gradient(180deg, rgba(157, 255, 63, 0), rgba(157, 255, 63, 0.95));
    animation-name: move-vertical;
  }

  @keyframes move-vertical {
    to {
      top: 100%;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .pulse {
    animation: none;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    opacity: 0.45;
  }
}
</style>

// theme-without-fonts: skips VitePress's bundled Inter (we load Archivo/JetBrains Mono)
import { defineAsyncComponent, h } from 'vue';
import DefaultTheme from 'vitepress/theme-without-fonts';
import CounterButton from './components/CounterButton.vue';
import GitHubStars from './components/GitHubStars.vue';
import TerminalInstall from './components/TerminalInstall.vue';
import TerminalCommand from './components/TerminalCommand.vue';
import TerminalSequence from './components/TerminalSequence.vue';
import EnvPresetTabs from './components/EnvPresetTabs.vue';
import NetworkPulseFlow from './components/NetworkPulseFlow.vue';
import HomeLanding from './components/home/HomeLanding.vue';
import './style.css';

export default {
  ...DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'nav-bar-content-after': () => h(GitHubStars),
    });
  },
  enhanceApp(ctx) {
    const { app } = ctx;
    app.component('CounterButton', CounterButton);
    app.component('TerminalInstall', TerminalInstall);
    app.component('TerminalCommand', TerminalCommand);
    app.component('TerminalSequence', TerminalSequence);
    app.component('EnvPresetTabs', EnvPresetTabs);
    app.component('NetworkPulseFlow', NetworkPulseFlow);
    app.component('HomeLanding', HomeLanding);
    app.component(
      'Mermaid',
      defineAsyncComponent(() => import('vitepress-plugin-mermaid/Mermaid.vue')),
    );
    if (DefaultTheme.enhanceApp) {
      DefaultTheme.enhanceApp(ctx);
    }
  },
};

// theme-without-fonts: skips VitePress's bundled Inter (we load Archivo/JetBrains Mono)
import DefaultTheme from 'vitepress/theme-without-fonts';
import CounterButton from './components/CounterButton.vue';
import TerminalInstall from './components/TerminalInstall.vue';
import TerminalCommand from './components/TerminalCommand.vue';
import TerminalSequence from './components/TerminalSequence.vue';
import EnvPresetTabs from './components/EnvPresetTabs.vue';
import NetworkPulseFlow from './components/NetworkPulseFlow.vue';
import HomeLanding from './components/home/HomeLanding.vue';
import './style.css';

export default {
  ...DefaultTheme,
  enhanceApp(ctx) {
    const { app } = ctx;
    app.component('CounterButton', CounterButton);
    app.component('TerminalInstall', TerminalInstall);
    app.component('TerminalCommand', TerminalCommand);
    app.component('TerminalSequence', TerminalSequence);
    app.component('EnvPresetTabs', EnvPresetTabs);
    app.component('NetworkPulseFlow', NetworkPulseFlow);
    app.component('HomeLanding', HomeLanding);
    if (DefaultTheme.enhanceApp) {
      DefaultTheme.enhanceApp(ctx);
    }
  },
};

import DefaultTheme from 'vitepress/theme';
import CounterButton from './components/CounterButton.vue';

export default {
  ...DefaultTheme,
  enhanceApp(ctx) {
    const { app } = ctx;
    app.component('CounterButton', CounterButton);
    if (DefaultTheme.enhanceApp) {
      DefaultTheme.enhanceApp(ctx);
    }
  },
};

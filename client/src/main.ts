import { createApp } from 'vue';

void (async () => {
  const isReferencePreview = window.location.pathname === '/dev/wavy-cubes-reference';

  if (isReferencePreview) {
    const { default: WavyCubesReferencePage } = await import('./pages/WavyCubesReferencePage.vue');
    createApp(WavyCubesReferencePage).mount('#app');
  } else {
    await import('./styles.css');
    const { default: App } = await import('./App.vue');
    createApp(App).mount('#app');
  }
})();

let loader;

// Client-only loader: gsap is imported dynamically so SSR never touches it,
// and ScrollTrigger is registered exactly once per session.
export function loadGsap() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (!loader) {
    loader = Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
      ([gsapModule, stModule]) => {
        const gsap = gsapModule.gsap || gsapModule.default;
        const ScrollTrigger = stModule.ScrollTrigger || stModule.default;
        gsap.registerPlugin(ScrollTrigger);
        return { gsap, ScrollTrigger };
      },
    );
  }
  return loader;
}

import next from 'eslint-config-next';

const eslintConfig = [
  ...next,
  {
    // Next.js 16 ships the React Compiler-aware react-hooks rules as errors.
    // The existing codebase predates them (data-fetch-on-mount patterns), so
    // they are kept off here to preserve the pre-upgrade lint baseline.
    // Revisit as a dedicated cleanup, not as part of dependency upgrades.
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
];

export default eslintConfig;

import nextVitals from 'eslint-config-next/core-web-vitals';

export default [
  {
    ignores: ['node_modules/**', '.next/**', 'out/**', 'build/**', 'dist/**', 'coverage/**'],
  },
  ...nextVitals,
  {
    rules: {
      'no-unused-vars': ['warn'],
      'react/react-in-jsx-scope': 'off',
      'react/no-unescaped-entities': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
];

const config = {
  'src/**/*.{ts,tsx}': ['eslint --max-warnings=0', 'prettier --write'],
  'test/**/*.{ts,tsx}': ['eslint --max-warnings=0', 'prettier --write'],
  'docs/**/*.{ts,tsx}': ['prettier --write'],
};

export default config;

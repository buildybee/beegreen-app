# Configuration Files

This folder contains all the configuration files for development tools to keep the root directory clean.

## Files

- **`eslint.config.js`** - ESLint linting rules for React Native/Expo
- **`prettier.config.js`** - Code formatting rules
- **`lint-staged.config.js`** - Staged files linting configuration
- **`typescript.config.json`** - TypeScript compiler options

## Root References

The root-level config files are minimal and reference these files:
- `.eslintrc.js` → `./config/eslint.config.js`
- `.prettierrc.js` → `./config/prettier.config.js`
- `.lintstagedrc.js` → `./config/lint-staged.config.js`
- `tsconfig.json` → `./config/typescript.config.json`

## Benefits

✅ **Clean root directory**  
✅ **Centralized configuration**  
✅ **Easy to maintain**  
✅ **Tool compatibility maintained** 
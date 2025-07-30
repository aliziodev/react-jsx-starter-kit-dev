# Laravel + React JSX Starter Kit - Development Repository

## Introduction

This is the **development repository** for the Laravel + React JSX Starter Kit template. This repository is used to:

1. **Sync with upstream** `laravel/react-starter-kit` (TypeScript version)
2. **Convert TypeScript to JavaScript/JSX** for broader accessibility
3. **Generate the public template** at `aliziodev/react-jsx-starter-kit`

## Template Overview

The generated template provides a robust, modern starting point for building Laravel applications with a React frontend using [Inertia](https://inertiajs.com), but using **JavaScript/JSX instead of TypeScript**.

Inertia allows you to build modern, single-page React applications using classic server-side routing and controllers. This lets you enjoy the frontend power of React combined with the incredible backend productivity of Laravel and lightning-fast Vite compilation.

The generated template utilizes React 19, **JavaScript/JSX**, Tailwind, and the [shadcn/ui](https://ui.shadcn.com) and [radix-ui](https://www.radix-ui.com) component libraries.

## Development Workflow

This repository uses an automated CI/CD workflow to:

### 🔄 Sync Process
1. **Daily sync** from `laravel/react-starter-kit` (upstream)
2. **Automatic conversion** of TypeScript files to JavaScript/JSX
3. **Template generation** in the `output/` directory
4. **Deployment** to `aliziodev/react-jsx-starter-kit` (public template)

### 🛠️ Manual Operations

**Run conversion locally:**
```bash
# Test the workflow
node scripts/test-workflow.js

# Run conversion
node scripts/run-conversion.js
```

**Trigger CI/CD manually:**
- Go to GitHub Actions → "Sync Upstream and Deploy JSX Template"
- Click "Run workflow"

### 📁 Directory Structure
- `resources/js/` - Source TypeScript files (synced from upstream)
- `scripts/` - Conversion and workflow scripts
- `output/` - Generated JSX template (ignored in git)
- `docs/` - Development documentation

### 🎯 Template Repository
The public template is available at: **[aliziodev/react-jsx-starter-kit](https://github.com/aliziodev/react-jsx-starter-kit)**

## Official Documentation

Documentation for all Laravel starter kits can be found on the [Laravel website](https://laravel.com/docs/starter-kits).

## Contributing

Thank you for considering contributing to our starter kit! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## License

The Laravel + React starter kit is open-sourced software licensed under the MIT license.

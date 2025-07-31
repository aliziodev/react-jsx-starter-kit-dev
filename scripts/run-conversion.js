#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import { glob } from 'glob';
import path from 'path';
// ESM module setup for __dirname if needed
// import { fileURLToPath } from 'url';
// const __filename = fileURLToPath(import.meta.url);

class UnifiedConverter {
    constructor() {
        this.sourceDir = path.resolve('resources/js');
        this.outputDir = path.resolve('output');
        this.jsOutputDir = path.join(this.outputDir, 'js');
        this.tsconfigPath = path.resolve('tsconfig.temp.json');
    }

    // Common utilities
    ensureDirectory(dir) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    checkDependencies() {
        try {
            execSync('npx -p typescript tsc --version', { stdio: 'pipe' });
            console.log('✅ TypeScript compiler is available');
            return true;
        } catch {
            console.error('❌ TypeScript compiler not found');
            return false;
        }
    }

    // TypeScript compilation setup
    createTempTsConfig() {
        const config = {
            compilerOptions: {
                jsx: 'preserve',
                target: 'ES2020',
                lib: ['ES2020', 'DOM', 'DOM.Iterable'],
                allowJs: true,
                skipLibCheck: true,
                esModuleInterop: true,
                allowSyntheticDefaultImports: true,
                strict: false,
                forceConsistentCasingInFileNames: false,
                noEmit: false,
                module: 'ESNext',
                moduleResolution: 'node',
                resolveJsonModule: true,
                isolatedModules: true,
                noEmitOnError: false,
                declaration: false,
                sourceMap: false,
                baseUrl: '.',
                paths: {
                    '@/*': ['./resources/js/*'],
                },
                outDir: this.jsOutputDir,
                rootDir: this.sourceDir,
                noImplicitAny: false,
                noImplicitReturns: false,
                noImplicitThis: false,
                noUnusedLocals: false,
                noUnusedParameters: false,
            },
            include: [this.sourceDir],
            exclude: ['node_modules', 'output', '**/*.d.ts'],
        };

        fs.writeFileSync(this.tsconfigPath, JSON.stringify(config, null, 2));
    }

    // TypeScript to JavaScript conversion
    convertTypeScriptFiles() {
        try {
            execSync(`npx tsc -p "${this.tsconfigPath}" --noEmitOnError false --skipLibCheck`, { stdio: 'pipe', encoding: 'utf8' });
            console.log('✅ TypeScript compilation completed successfully');
            return true;
        } catch (err) {
            const outputExists = fs.existsSync(this.jsOutputDir) && fs.readdirSync(this.jsOutputDir).length > 0;

            if (outputExists) {
                return true;
            }

            console.error(`❌ Conversion failed: ${err.message}`);
            try {
                console.log('🔄 Retrying with permissive settings...');
                execSync(`npx tsc -p "${this.tsconfigPath}" --noEmitOnError false --skipLibCheck --noImplicitAny false`, {
                    stdio: 'pipe',
                    encoding: 'utf8',
                });
                console.log('✅ TypeScript compilation completed with permissive settings');
                return true;
            } catch (retryErr) {
                const retryOutputExists = fs.existsSync(this.jsOutputDir) && fs.readdirSync(this.jsOutputDir).length > 0;

                if (retryOutputExists) {
                    console.log('⚠️  TypeScript compilation had errors but files were generated successfully');
                    return true;
                }

                console.error(`❌ Retry also failed: ${retryErr.message}`);
                return false;
            }
        }
    }

    // File processing
    async processJavaScriptFiles() {
        const files = await glob(`${this.jsOutputDir}/**/*.{js,jsx}`);
        for (const file of files) {
            try {
                const original = fs.readFileSync(file, 'utf8');

                if (file.endsWith('.js') && original.match(/<\w[\s>/]/)) {
                    const newName = file.replace(/\.js$/, '.jsx');
                    fs.renameSync(file, newName);
                    console.log(`📝 Renamed: ${path.basename(file)} → ${path.basename(newName)}`);
                }
            } catch (err) {
                console.error(`❌ Error processing ${file}: ${err.message}`);
            }
        }
    }

    async updateFileReferences() {
        const filesToUpdate = [path.join(this.jsOutputDir, 'app.jsx'), path.join(this.jsOutputDir, 'ssr.jsx')];

        for (const file of filesToUpdate) {
            if (fs.existsSync(file)) {
                try {
                    let content = fs.readFileSync(file, 'utf8');

                    content = content.replace(/\.tsx/g, '.jsx');

                    fs.writeFileSync(file, content);
                    console.log(`   🔄 Updated file references in: ${path.basename(file)}`);
                } catch (err) {
                    console.error(`   ❌ Error updating references in ${file}: ${err.message}`);
                }
            }
        }
    }

    // Configuration file conversion
    convertViteConfig() {
        const sourceFile = path.resolve('vite.config.ts');
        const outputFile = path.join(this.outputDir, 'vite.config.js');

        if (!fs.existsSync(sourceFile)) {
            console.error('❌ vite.config.ts not found');
            return false;
        }

        let content = fs.readFileSync(sourceFile, 'utf8');

        content = content
            .replace(/import\s+type\s+[^;]+;/g, '')
            .replace(/import\s*\{[^}]*type[^}]*\}\s*from\s*[''][^'']+['']/g, '')
            .replace(/resources\/js\/app\.tsx/g, 'output/js/app.jsx')
            .replace(/resources\/js\/ssr\.tsx/g, 'output/js/ssr.jsx')
            .replace(/^\s*\n/gm, '');

        fs.writeFileSync(outputFile, content);
        console.log(`✅ Converted: vite.config.ts → ${path.basename(outputFile)}`);
        return true;
    }

    convertBladeTemplate() {
        const sourceFile = path.resolve('resources/views/app.blade.php');
        const outputViewsDir = path.join(this.outputDir, 'views');
        const outputFile = path.join(outputViewsDir, 'app.blade.php');

        if (!fs.existsSync(sourceFile)) {
            console.error('❌ app.blade.php not found');
            return false;
        }

        this.ensureDirectory(outputViewsDir);

        let content = fs.readFileSync(sourceFile, 'utf8');

        content = content.replace(
            /@vite\(\['resources\/js\/app\.tsx',\s*"resources\/js\/pages\/\{\$page\['component'\]\}\.tsx"\]\)/g,
            "@vite(['output/js/app.jsx', \"output/js/pages/{$page['component']}.jsx\"])",
        );

        fs.writeFileSync(outputFile, content);
        console.log(`✅ Converted: app.blade.php → views/${path.basename(outputFile)}`);
        return true;
    }

    // Statistics and cleanup
    async generateStats() {
        const sources = await glob(`${this.sourceDir}/**/*.{ts,tsx}`);
        const jsOutputs = await glob(`${this.jsOutputDir}/**/*.{js,jsx}`);
        const configOutputs = fs.existsSync(path.join(this.outputDir, 'vite.config.js')) ? 1 : 0;
        const viewOutputs = fs.existsSync(path.join(this.outputDir, 'views/app.blade.php')) ? 1 : 0;

        console.log('\n📊 Conversion Statistics:');
        console.log(`   TypeScript source files: ${sources.length}`);
        console.log(`   JavaScript output files: ${jsOutputs.length}`);
        console.log(`   Configuration files: ${configOutputs}`);
        console.log(`   Template files: ${viewOutputs}`);
        console.log(`   Total output files: ${jsOutputs.length + configOutputs + viewOutputs}`);
    }

    cleanup() {
        if (fs.existsSync(this.tsconfigPath)) {
            fs.rmSync(this.tsconfigPath);
        }
    }

    // Copy entire project structure
    copyProjectStructure() {
        console.log('\n📁 Copying project structure...');

        const excludeDirs = ['output', 'node_modules', 'scripts', 'vendor', 'templates', 'storage/logs', '.git'];
        const excludeFiles = ['composer.lock', '.env', 'workflow-test-report.json'];

        this.copyProjectFiles('.', this.outputDir, excludeDirs, excludeFiles);

        // Handle .github/workflows specially - copy specific workflows
        const workflowsSource = path.resolve('.github/workflows');
        const workflowsTarget = path.join(this.outputDir, '.github/workflows');

        if (fs.existsSync(workflowsSource)) {
            this.ensureDirectory(workflowsTarget);

            const allowedWorkflows = ['lint.yml', 'tests.yml'];
            for (const workflow of allowedWorkflows) {
                const sourceFile = path.join(workflowsSource, workflow);
                const targetFile = path.join(workflowsTarget, workflow);

                if (fs.existsSync(sourceFile)) {
                    fs.copyFileSync(sourceFile, targetFile);
                    console.log(`   ✅ Copied: .github/workflows/${workflow}`);
                }
            }
        }

        // Copy auto-release.yml from templates to output
        const templateWorkflowSource = path.resolve('templates/workflows/auto-release.yml');
        const templateWorkflowTarget = path.join(workflowsTarget, 'auto-release.yml');

        if (fs.existsSync(templateWorkflowSource)) {
            this.ensureDirectory(workflowsTarget);
            fs.copyFileSync(templateWorkflowSource, templateWorkflowTarget);
            console.log('   ✅ Copied: .github/workflows/auto-release.yml (from template)');
        }

        console.log('   ✅ Project structure copied');
    }

    copyProjectFiles(source, target, excludeDirs, excludeFiles) {
        const items = fs.readdirSync(source);

        for (const item of items) {
            if (excludeDirs.includes(item) || excludeFiles.includes(item)) {
                continue;
            }

            // Skip .github directory here, we handle it specially
            if (item === '.github') {
                continue;
            }

            const sourcePath = path.join(source, item);
            const targetPath = path.join(target, item);

            if (fs.statSync(sourcePath).isDirectory()) {
                this.ensureDirectory(targetPath);
                this.copyProjectFiles(sourcePath, targetPath, excludeDirs, excludeFiles);
            } else {
                fs.copyFileSync(sourcePath, targetPath);
            }
        }
    }

    copyDirectory(source, target) {
        if (!fs.existsSync(target)) {
            fs.mkdirSync(target, { recursive: true });
        }

        const items = fs.readdirSync(source);
        for (const item of items) {
            const sourcePath = path.join(source, item);
            const targetPath = path.join(target, item);

            if (fs.statSync(sourcePath).isDirectory()) {
                this.copyDirectory(sourcePath, targetPath);
            } else {
                fs.copyFileSync(sourcePath, targetPath);
            }
        }
    }

    updateOutputEslintConfig() {
        const outputEslintConfig = path.join(this.outputDir, 'eslint.config.js');

        if (fs.existsSync(outputEslintConfig)) {
            let content = fs.readFileSync(outputEslintConfig, 'utf8');

            // Remove any 'output' related entries from ignores array
            content = content.replace(
                /ignores:\s*\[([^\]]*)]/,
                (match, ignoresList) => {
                    // Split the ignores list and filter out any 'output' related entries
                    let newIgnores = ignoresList
                        .split(',')
                        .map(item => item.trim())
                        .filter(item => {
                            // Remove empty items and any item containing 'output'
                            return item &&
                                   !item.includes("'output'") &&
                                   !item.includes('"output"') &&
                                   !item.includes("'output/") &&
                                   !item.includes('"output/');
                        })
                        .join(', ');

                    return `ignores: [${newIgnores}]`;
                }
            );

            fs.writeFileSync(outputEslintConfig, content);
            console.log('   ✅ Updated: eslint.config.js (removed output from ignores)');
        }
    }

    // Main execution
    async run() {
        console.log('🚀 Unified TypeScript to JavaScript Converter Started');
        console.log(`📂 Source: ${this.sourceDir}`);
        console.log(`📁 Output: ${this.outputDir}`);

        // Validation
        if (!this.checkDependencies()) {
            console.error('❌ Dependencies check failed');
            return;
        }
        if (!fs.existsSync(this.sourceDir)) {
            console.error('❌ Source directory not found');
            return;
        }

        // Setup - Clean output directory completely
        if (fs.existsSync(this.outputDir)) {
            fs.rmSync(this.outputDir, { recursive: true, force: true });
        }
        this.ensureDirectory(this.outputDir);
        this.ensureDirectory(this.jsOutputDir);

        // Copy entire project structure first
        this.copyProjectStructure();

        // Update eslint.config.js in output to remove 'output' from ignores
        this.updateOutputEslintConfig();

        this.createTempTsConfig();

        // Convert TypeScript files
        console.log('\n🔄 Converting TypeScript files...');
        if (!this.convertTypeScriptFiles()) {
            console.error('❌ TypeScript conversion failed');
            return;
        }

        // Process JavaScript files
        console.log('\n🧹 Processing JavaScript files...');
        await this.processJavaScriptFiles();
        await this.updateFileReferences();

        // Replace resources/js in output with converted JSX files
        console.log('\n🔄 Replacing resources/js with converted JSX files...');
        const outputResourcesJs = path.join(this.outputDir, 'resources/js');
        if (fs.existsSync(outputResourcesJs)) {
            fs.rmSync(outputResourcesJs, { recursive: true, force: true });
        }
        this.copyDirectory(this.jsOutputDir, outputResourcesJs);

        // Update vite.config.ts to vite.config.js in output
        console.log('\n⚙️  Converting configuration files...');
        const outputViteConfigTs = path.join(this.outputDir, 'vite.config.ts');
        const outputViteConfigJs = path.join(this.outputDir, 'vite.config.js');

        if (fs.existsSync(outputViteConfigTs)) {
            let content = fs.readFileSync(outputViteConfigTs, 'utf8');

            // Convert TypeScript to JavaScript
            content = content
                .replace(/import\s+type\s+[^;]+;/g, '')
                .replace(/import\s*\{[^}]*type[^}]*\}\s*from\s*[''][^'']+['']/g, '')
                .replace(/resources\/js\/app\.tsx/g, 'resources/js/app.jsx')
                .replace(/resources\/js\/ssr\.tsx/g, 'resources/js/ssr.jsx')
                .replace(/^\s*\n/gm, '');

            // Fix __dirname for ESM environment
            if (content.includes('__dirname')) {
                // Add necessary imports if not already present
                if (!content.includes('fileURLToPath')) {
                    content = content.replace(
                        /(import\s+\{[^}]*\}\s+from\s+['"]node:path['"];?)/,
                        '$1\nimport { fileURLToPath, URL } from \'node:url\';'
                    );
                }
                // Replace __dirname with ESM equivalent
                content = content.replace(
                    /__dirname/g,
                    'fileURLToPath(new URL(\'.\', import.meta.url))'
                );
            }

            fs.writeFileSync(outputViteConfigJs, content);
            fs.rmSync(outputViteConfigTs);
            console.log('   ✅ Converted: vite.config.ts → vite.config.js');
        }

        // Update app.blade.php in output
        const outputBladeFile = path.join(this.outputDir, 'resources/views/app.blade.php');
        if (fs.existsSync(outputBladeFile)) {
            let content = fs.readFileSync(outputBladeFile, 'utf8');

            content = content.replace(
                /@vite\(\['resources\/js\/app\.tsx',\s*"resources\/js\/pages\/\{\$page\['component'\]\}\.tsx"\]\)/g,
                "@vite(['resources/js/app.jsx', \"resources/js/pages/{$page['component']}.jsx\"])",
            );

            fs.writeFileSync(outputBladeFile, content);
            console.log('   ✅ Updated: resources/views/app.blade.php');
        }

        // Remove TypeScript config files from output
        const tsConfigFiles = ['tsconfig.json', 'tsconfig.node.json'];
        for (const file of tsConfigFiles) {
            const filePath = path.join(this.outputDir, file);
            if (fs.existsSync(filePath)) {
                fs.rmSync(filePath);
                console.log(`   🗑️  Removed: ${file}`);
            }
        }

        // Remove types directory from output
        const typesDir = path.join(this.outputDir, 'resources/js/types');
        if (fs.existsSync(typesDir)) {
            fs.rmSync(typesDir, { recursive: true, force: true });
            console.log('   🗑️  Removed: resources/js/types directory');
        }

        // Update package.json in output
        const outputPackageJson = path.join(this.outputDir, 'package.json');
        if (fs.existsSync(outputPackageJson)) {
            const packageJson = JSON.parse(fs.readFileSync(outputPackageJson, 'utf8'));

            // Update name and description for JSX template
            if (packageJson.name && packageJson.name.includes('react-starter-kit')) {
                packageJson.name = packageJson.name.replace('react-starter-kit', 'react-jsx-starter-kit');
            }

            if (packageJson.description) {
                packageJson.description = packageJson.description.replace('TypeScript', 'JavaScript/JSX');
            }

            // Remove TypeScript dependencies
            if (packageJson.devDependencies) {
                delete packageJson.devDependencies['typescript'];
                delete packageJson.devDependencies['@types/node'];
                delete packageJson.devDependencies['@types/react'];
                delete packageJson.devDependencies['@types/react-dom'];
            }

            fs.writeFileSync(outputPackageJson, JSON.stringify(packageJson, null, 2));
            console.log('   ✅ Updated: package.json for JSX template');
        }

        // Update composer.json in output
        const outputComposerJson = path.join(this.outputDir, 'composer.json');
        if (fs.existsSync(outputComposerJson)) {
            const composerJson = JSON.parse(fs.readFileSync(outputComposerJson, 'utf8'));

            // Update name for JSX template
            composerJson.name = 'aliziodev/react-jsx-starter-kit';

            fs.writeFileSync(outputComposerJson, JSON.stringify(composerJson, null, 4));
            console.log('   ✅ Updated: composer.json for JSX template');
        }

        // Update components.json in output
        const outputComponentsJson = path.join(this.outputDir, 'components.json');
        if (fs.existsSync(outputComponentsJson)) {
            const componentsJson = JSON.parse(fs.readFileSync(outputComponentsJson, 'utf8'));

            // Update tsx to false for JSX template
            componentsJson.tsx = false;

            fs.writeFileSync(outputComponentsJson, JSON.stringify(componentsJson, null, 4));
            console.log('   ✅ Updated: components.json for JSX template');
        }

        // Update README.md in output for template
        const outputReadme = path.join(this.outputDir, 'README.md');
        if (fs.existsSync(outputReadme)) {
            const templateReadme = `# Laravel + React JSX Starter Kit

## Introduction

Our React JSX starter kit provides a robust, modern starting point for building Laravel applications with a React frontend using [Inertia](https://inertiajs.com), using **JavaScript/JSX instead of TypeScript** for broader accessibility.

Inertia allows you to build modern, single-page React applications using classic server-side routing and controllers. This lets you enjoy the frontend power of React combined with the incredible backend productivity of Laravel and lightning-fast Vite compilation.

This React starter kit utilizes React 19, **JavaScript/JSX**, Tailwind, and the [shadcn/ui](https://ui.shadcn.com) and [radix-ui](https://www.radix-ui.com) component libraries.

> **Note:** This template is automatically generated from [aliziodev/react-jsx-starter-kit-dev](https://github.com/aliziodev/react-jsx-starter-kit-dev) based on the original Laravel React starter kit repository. The conversion process transforms TypeScript files to JavaScript/JSX for broader accessibility.

## Usage

\`\`\`bash
laravel new my-app --using=aliziodev/react-jsx-starter-kit
\`\`\`

## Official Documentation

Documentation for all Laravel starter kits can be found on the [Laravel website](https://laravel.com/docs/starter-kits).

## Contributing

Thank you for considering contributing to our starter kit! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## License

The Laravel + React JSX starter kit is open-sourced software licensed under the MIT license.
`;

            fs.writeFileSync(outputReadme, templateReadme);
            console.log('   ✅ Updated: README.md for JSX template');
        }

        // Remove temporary files from output
        const tempFiles = [
            path.join(this.outputDir, 'tsconfig.temp.json'),
            path.join(this.outputDir, 'js'), // Remove the separate js directory
        ];

        for (const tempFile of tempFiles) {
            if (fs.existsSync(tempFile)) {
                if (fs.statSync(tempFile).isDirectory()) {
                    fs.rmSync(tempFile, { recursive: true, force: true });
                } else {
                    fs.rmSync(tempFile);
                }
                console.log(`   🗑️  Removed temporary: ${path.basename(tempFile)}`);
            }
        }

        // Final steps
        await this.generateStats();
        this.cleanup();

        console.log('\n✅ Complete JSX template generated successfully');
        console.log('\n📋 Output directory structure:');
        console.log('   • Same as laravel/react-starter-kit');
        console.log('   • resources/js/ contains converted JSX files');
        console.log('   • resources/views/app.blade.php updated for JSX');
        console.log('   • vite.config.js (converted from .ts)');
        console.log('   • package.json updated for JSX template');
        console.log('   • TypeScript config files removed');
        console.log('\n🚀 Ready for deployment to template repository!');
    }
}

const converter = new UnifiedConverter();
converter.run().catch(console.error);

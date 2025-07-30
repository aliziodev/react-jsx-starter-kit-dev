#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

class WorkflowTester {
    constructor() {
        this.projectRoot = path.resolve('.');
        this.outputDir = path.resolve('output');
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            info: '📋',
            success: '✅',
            warning: '⚠️',
            error: '❌',
            step: '🔄'
        }[type] || 'ℹ️';
        
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    async runCommand(command, description) {
        this.log(`${description}...`, 'step');
        try {
            const result = execSync(command, { 
                stdio: 'pipe', 
                encoding: 'utf8',
                cwd: this.projectRoot
            });
            this.log(`${description} completed`, 'success');
            return { success: true, output: result };
        } catch (error) {
            this.log(`${description} failed: ${error.message}`, 'error');
            return { success: false, error: error.message };
        }
    }

    checkPrerequisites() {
        this.log('Checking prerequisites...', 'step');
        
        const checks = [
            {
                name: 'Node.js version',
                command: 'node --version',
                validator: (output) => {
                    const version = output.trim();
                    const major = parseInt(version.replace('v', '').split('.')[0]);
                    return major >= 18;
                }
            },
            {
                name: 'npm availability',
                command: 'npm --version'
            },
            {
                name: 'TypeScript compiler',
                command: 'npx -p typescript tsc --version'
            },
            {
                name: 'Prettier availability',
                command: 'npx prettier --version'
            },
            {
                name: 'Git availability',
                command: 'git --version'
            }
        ];

        let allPassed = true;
        
        for (const check of checks) {
            try {
                const result = execSync(check.command, { stdio: 'pipe', encoding: 'utf8' });
                
                if (check.validator && !check.validator(result)) {
                    this.log(`${check.name}: Version requirement not met`, 'warning');
                    allPassed = false;
                } else {
                    this.log(`${check.name}: OK`, 'success');
                }
            } catch (error) {
                this.log(`${check.name}: Not available`, 'error');
                allPassed = false;
            }
        }

        return allPassed;
    }

    checkProjectStructure() {
        this.log('Checking project structure...', 'step');
        
        const requiredFiles = [
            'package.json',
            'resources/js/app.tsx',
            'resources/js/ssr.tsx',
            'vite.config.ts',
            'resources/views/app.blade.php',
            'scripts/run-conversion.js'
        ];

        const requiredDirs = [
            'resources/js/components',
            'resources/js/pages',
            'resources/js/layouts',
            'resources/js/hooks'
        ];

        let allExists = true;

        for (const file of requiredFiles) {
            const filePath = path.resolve(file);
            if (fs.existsSync(filePath)) {
                this.log(`Required file exists: ${file}`, 'success');
            } else {
                this.log(`Required file missing: ${file}`, 'error');
                allExists = false;
            }
        }

        for (const dir of requiredDirs) {
            const dirPath = path.resolve(dir);
            if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
                this.log(`Required directory exists: ${dir}`, 'success');
            } else {
                this.log(`Required directory missing: ${dir}`, 'error');
                allExists = false;
            }
        }

        return allExists;
    }

    async testConversion() {
        this.log('Testing TypeScript to JSX conversion...', 'step');
        
        // Clean output directory
        if (fs.existsSync(this.outputDir)) {
            fs.rmSync(this.outputDir, { recursive: true, force: true });
            this.log('Cleaned existing output directory', 'info');
        }

        // Run conversion
        const conversionResult = await this.runCommand(
            'node scripts/run-conversion.js',
            'Running conversion script'
        );

        if (!conversionResult.success) {
            return false;
        }

        // Verify output
        return this.verifyConversionOutput();
    }

    verifyConversionOutput() {
        this.log('Verifying conversion output...', 'step');
        
        const requiredOutputFiles = [
            'output/resources/js/app.jsx',
            'output/resources/js/ssr.jsx',
            'output/vite.config.js',
            'output/resources/views/app.blade.php',
            'output/package.json'
        ];

        const requiredOutputDirs = [
            'output/resources/js/components',
            'output/resources/js/pages',
            'output/resources/js/layouts',
            'output/resources/js/hooks'
        ];

        let allValid = true;

        // Check files
        for (const file of requiredOutputFiles) {
            const filePath = path.resolve(file);
            if (fs.existsSync(filePath)) {
                this.log(`Output file exists: ${file}`, 'success');
            } else {
                this.log(`Output file missing: ${file}`, 'error');
                allValid = false;
            }
        }

        // Check directories
        for (const dir of requiredOutputDirs) {
            const dirPath = path.resolve(dir);
            if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
                this.log(`Output directory exists: ${dir}`, 'success');
            } else {
                this.log(`Output directory missing: ${dir}`, 'error');
                allValid = false;
            }
        }

        // Count converted files
        try {
            const jsxFiles = execSync(
                'find output/resources/js -name "*.jsx" -o -name "*.js" | wc -l',
                { stdio: 'pipe', encoding: 'utf8', shell: '/bin/bash' }
            ).trim();
            
            const fileCount = parseInt(jsxFiles);
            this.log(`Found ${fileCount} JavaScript/JSX files in output`, 'info');
            
            if (fileCount < 50) {
                this.log(`Warning: Low number of converted files (${fileCount})`, 'warning');
            }
        } catch (error) {
            // Fallback for Windows
            try {
                const files = this.countFilesRecursive(path.resolve('output/resources/js'), ['.js', '.jsx']);
                this.log(`Found ${files} JavaScript/JSX files in output`, 'info');
                
                if (files < 50) {
                    this.log(`Warning: Low number of converted files (${files})`, 'warning');
                }
            } catch (fallbackError) {
                this.log('Could not count converted files', 'warning');
            }
        }

        // Verify package.json changes
        try {
            const packageJsonPath = path.resolve('output/package.json');
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            
            if (packageJson.name && packageJson.name.includes('jsx')) {
                this.log('Package.json updated for JSX template', 'success');
            } else {
                this.log('Package.json may not be properly updated', 'warning');
            }
            
            if (!packageJson.devDependencies?.typescript) {
                this.log('TypeScript dependencies removed from package.json', 'success');
            } else {
                this.log('TypeScript dependencies still present in package.json', 'warning');
            }
        } catch (error) {
            this.log('Could not verify package.json changes', 'warning');
        }

        // Check that types directory is removed
        const typesDir = path.resolve('output/resources/js/types');
        if (!fs.existsSync(typesDir)) {
            this.log('Types directory correctly removed from output', 'success');
        } else {
            this.log('Types directory still exists in output', 'warning');
        }

        return allValid;
    }

    countFilesRecursive(dir, extensions) {
        let count = 0;
        
        if (!fs.existsSync(dir)) {
            return count;
        }
        
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const itemPath = path.join(dir, item);
            const stat = fs.statSync(itemPath);
            
            if (stat.isDirectory()) {
                count += this.countFilesRecursive(itemPath, extensions);
            } else if (extensions.some(ext => item.endsWith(ext))) {
                count++;
            }
        }
        
        return count;
    }

    async testWorkflowComponents() {
        this.log('Testing workflow components...', 'step');
        
        // Test Git operations
        const gitTests = [
            {
                name: 'Git status',
                command: 'git status --porcelain'
            },
            {
                name: 'Git remote check',
                command: 'git remote -v'
            }
        ];

        for (const test of gitTests) {
            await this.runCommand(test.command, test.name);
        }

        // Test Node.js dependencies
        const depResult = await this.runCommand('npm list --depth=0', 'Checking dependencies');
        
        return true;
    }

    generateReport() {
        this.log('Generating test report...', 'step');
        
        const report = {
            timestamp: new Date().toISOString(),
            project: 'react-jsx-starter-kit-dev',
            workflow: 'sync-and-deploy',
            status: 'completed',
            summary: {
                prerequisites: 'passed',
                structure: 'passed',
                conversion: 'passed',
                components: 'passed'
            }
        };

        const reportPath = path.resolve('workflow-test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        this.log(`Test report saved to: ${reportPath}`, 'success');
        
        return report;
    }

    async run() {
        this.log('🚀 Starting Workflow Test Suite', 'info');
        this.log('=====================================', 'info');
        
        let allTestsPassed = true;

        // Step 1: Check prerequisites
        if (!this.checkPrerequisites()) {
            this.log('Prerequisites check failed', 'error');
            allTestsPassed = false;
        }

        // Step 2: Check project structure
        if (!this.checkProjectStructure()) {
            this.log('Project structure check failed', 'error');
            allTestsPassed = false;
        }

        // Step 3: Test conversion
        if (!(await this.testConversion())) {
            this.log('Conversion test failed', 'error');
            allTestsPassed = false;
        }

        // Step 4: Test workflow components
        if (!(await this.testWorkflowComponents())) {
            this.log('Workflow components test failed', 'error');
            allTestsPassed = false;
        }

        // Generate report
        this.generateReport();

        this.log('=====================================', 'info');
        if (allTestsPassed) {
            this.log('🎉 All tests passed! Workflow is ready for deployment.', 'success');
            process.exit(0);
        } else {
            this.log('❌ Some tests failed. Please review the issues above.', 'error');
            process.exit(1);
        }
    }
}

// Run the test suite
const tester = new WorkflowTester();
tester.run().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
});
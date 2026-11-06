#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const { startServer } = require('../server/index');
const { createSampleAidlcStructure } = require('../server/mockDataGenerator');
const fs = require('fs');

program
  .name('aidlc-dashboard')
  .description('Interactive Visualizer & Control Plane for awslabs/aidlc-workflows and Antigravity')
  .version('1.0.0')
  .option('-p, --port <number>', 'Port to run the dashboard server on', '3300')
  .option('-w, --workspace <path>', 'Workspace directory path containing aidlc/ directory', process.cwd())
  .option('--no-open', 'Do not automatically open the browser')
  .option('--demo', 'Auto-generate sample AI-DLC intent structure in workspace');

program.parse(process.argv);
const options = program.opts();

const workspaceRoot = path.resolve(options.workspace);
const port = parseInt(options.port, 10) || 3300;
const autoOpen = options.open !== false;

if (options.demo) {
  console.log('Generating demo AI-DLC intent structure...');
  createSampleAidlcStructure(workspaceRoot);
  // Demo data is intentionally file-backed. Production workspaces use the
  // real `aidlc engine` control path by default.
  process.env.AIDLC_DASHBOARD_FILE_MODE = '1';
}

startServer(port, workspaceRoot, autoOpen);

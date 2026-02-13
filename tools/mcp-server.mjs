#!/usr/bin/env node

/**
 * MCP Server for yet-another-habit-app monorepo.
 *
 * Exposes build, test, lint, migrate, and E2E commands as MCP tools so that
 * Claude Code (or any MCP client) can invoke them directly.
 *
 * Protocol: JSON-RPC 2.0 over stdio (one JSON message per line).
 */

import { execSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── Tool definitions ───────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'build_all',
    description: 'Lint and build all workspaces (root `npm run build`).',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'build_workspace',
    description: 'Build a single workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          enum: ['applications/backend', 'applications/mobile', 'libraries/shared-types'],
          description: 'The workspace to build.',
        },
      },
      required: ['workspace'],
      additionalProperties: false,
    },
  },
  {
    name: 'lint_all',
    description: 'Run lint:fix across all workspaces.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'lint_workspace',
    description: 'Lint a single workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          enum: ['applications/backend', 'applications/mobile', 'libraries/shared-types'],
        },
        fix: { type: 'boolean', description: 'Auto-fix issues (default true).' },
      },
      required: ['workspace'],
      additionalProperties: false,
    },
  },
  {
    name: 'test_unit',
    description: 'Run Jest unit/component tests for the mobile app.',
    inputSchema: {
      type: 'object',
      properties: {
        watch: { type: 'boolean', description: 'Run in watch mode.' },
        testPathPattern: { type: 'string', description: 'Filter tests by file path pattern.' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'test_e2e',
    description: 'Run Maestro E2E tests against the Android emulator.',
    inputSchema: {
      type: 'object',
      properties: {
        flow: {
          type: 'string',
          description: 'Specific flow file to run (e.g. "login.yaml"). Omit to run all flows.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'migrate',
    description: 'Run database migrations for the backend.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['latest', 'rollback', 'make', 'reset'],
          description: 'Migration action.',
        },
        name: { type: 'string', description: 'Migration name (only for "make" action).' },
      },
      required: ['action'],
      additionalProperties: false,
    },
  },
  {
    name: 'typecheck',
    description: 'Run TypeScript type checking for the mobile app (tsc -noEmit).',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
];

// ─── Command execution ──────────────────────────────────────────────────────

function run(cmd, opts = {}) {
  try {
    const output = execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf-8',
      timeout: 300_000, // 5 min
      stdio: ['pipe', 'pipe', 'pipe'],
      ...opts,
    });
    return { success: true, output: output.trim() };
  } catch (err) {
    return {
      success: false,
      output: (err.stdout || '') + '\n' + (err.stderr || ''),
      exitCode: err.status,
    };
  }
}

function handleTool(name, args = {}) {
  switch (name) {
    case 'build_all':
      return run('npm run build');

    case 'build_workspace':
      return run(`npm --workspace ${args.workspace} run build`);

    case 'lint_all':
      return run('npm run lint:fix');

    case 'lint_workspace': {
      const script = args.fix === false ? 'lint' : 'lint:fix';
      return run(`npm --workspace ${args.workspace} run ${script}`);
    }

    case 'test_unit': {
      const parts = ['npm', '--workspace', 'applications/mobile', 'run', 'test', '--'];
      if (args.watch) parts.push('--watch');
      if (args.testPathPattern) parts.push('--testPathPattern', args.testPathPattern);
      parts.push('--no-coverage');
      return run(parts.join(' '));
    }

    case 'test_e2e': {
      const maestro = `${process.env.HOME || process.env.USERPROFILE}/.maestro/bin/maestro`;
      if (args.flow) {
        return run(`"${maestro}" test .maestro/${args.flow}`);
      }
      return run(`"${maestro}" test .maestro/`);
    }

    case 'migrate': {
      const ws = 'applications/backend';
      switch (args.action) {
        case 'latest':
          return run(`npm --workspace ${ws} run migrate`);
        case 'rollback':
          return run(`npm --workspace ${ws} run migrate:rollback`);
        case 'make':
          if (!args.name) return { success: false, output: 'Migration name is required for "make".' };
          return run(`npm --workspace ${ws} run migrate:make -- ${args.name}`);
        case 'reset':
          return run(`npm --workspace ${ws} run db:reset`);
        default:
          return { success: false, output: `Unknown migration action: ${args.action}` };
      }
    }

    case 'typecheck':
      return run('npm --workspace applications/mobile run build');

    default:
      return { success: false, output: `Unknown tool: ${name}` };
  }
}

// ─── JSON-RPC 2.0 stdio transport ──────────────────────────────────────────

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

function handleRequest(req) {
  const { id, method, params } = req;

  switch (method) {
    case 'initialize':
      return send({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: {
            name: 'yet-another-habit-app',
            version: '1.0.0',
          },
        },
      });

    case 'notifications/initialized':
      // No response needed for notifications
      return;

    case 'tools/list':
      return send({
        jsonrpc: '2.0',
        id,
        result: { tools: TOOLS },
      });

    case 'tools/call': {
      const { name, arguments: args } = params;
      const result = handleTool(name, args);
      return send({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: result.output || '(no output)' }],
          isError: !result.success,
        },
      });
    }

    default:
      return send({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      });
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

const rl = createInterface({ input: process.stdin, terminal: false });

rl.on('line', (line) => {
  try {
    const req = JSON.parse(line);
    handleRequest(req);
  } catch {
    send({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error' },
    });
  }
});

import { tool } from '@opencode-ai/plugin';

export const PlaywrightRunner = async ({
  project,
  client,
  $,
  directory,
  worktree,
}) => {
  const runPlaywright = async (options = {}) => {
    const { testName, headed = false, updateSnapshots = false } = options;

    let command = 'npx playwright test';

    if (testName) {
      command += ` --grep "${testName}"`;
    }

    if (headed) {
      command += ' --headed';
    }

    if (updateSnapshots) {
      command += ' --update-snapshots';
    }

    await client.app.log({
      body: { level: 'info', message: `Running Playwright tests: ${command}` },
    });

    const result = await $`${command} 2>&1`.catch(() => ({
      exitCode: 1,
      stdout: '',
      stderr: 'Playwright test run failed',
    }));

    if (result.exitCode !== 0) {
      await client.app.log({
        body: { level: 'error', message: `Playwright tests failed` },
      });
      return `Tests failed. Output:\n${result.stdout}\n${result.stderr}`;
    }

    await client.app.log({
      body: { level: 'info', message: 'Playwright tests passed!' },
    });
    return `Tests passed!\n${result.stdout}`;
  };

  const openPlaywrightUI = async () => {
    await client.app.log({
      body: { level: 'info', message: 'Opening Playwright UI...' },
    });

    const result = await $`npx playwright test --ui 2>&1`.catch(() => ({
      exitCode: 1,
      stdout: '',
      stderr: 'Failed to open Playwright UI',
    }));

    if (result.exitCode !== 0) {
      await client.app.log({
        body: { level: 'error', message: 'Failed to open Playwright UI' },
      });
      return 'Failed to open Playwright UI';
    }

    return 'Playwright UI closed';
  };

  return {
    tool: {
      run_tests: tool({
        description: 'Run Playwright E2E tests',
        args: {
          name: tool.schema.string().optional(),
          headed: tool.schema.boolean().optional(),
          'update-snapshots': tool.schema.boolean().optional(),
        },
        async execute(args) {
          return await runPlaywright({
            testName: args.name,
            headed: args.headed,
            updateSnapshots: args['update-snapshots'],
          });
        },
      }),
      open_ui: tool({
        description: 'Open Playwright UI for interactive test debugging',
        args: {},
        async execute() {
          return await openPlaywrightUI();
        },
      }),
    },
  };
};

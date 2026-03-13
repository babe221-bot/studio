export const LintCheck = async ({
  project,
  client,
  $,
  directory,
  worktree,
}) => {
  const isCheckableFile = (path) => {
    return (
      path.endsWith('.ts') ||
      path.endsWith('.tsx') ||
      path.endsWith('.js') ||
      path.endsWith('.jsx')
    );
  };

  const isSrcFile = (path) => {
    return (
      path.startsWith('src/') ||
      path.startsWith('./src/') ||
      path.startsWith('backend/') ||
      path.startsWith('./backend/')
    );
  };

  const lastCheck = { time: 0 };
  const COOLDOWN_MS = 5000;

  return {
    'file.edited': async ({ filePath }) => {
      if (!isCheckableFile(filePath) || !isSrcFile(filePath)) return;

      const now = Date.now();
      if (now - lastCheck.time < COOLDOWN_MS) return;
      lastCheck.time = now;

      await client.app.log({
        body: { level: 'info', message: `Running lint and typecheck...` },
      });

      const lintResult = await $`npm run lint 2>&1`.catch(() => ({
        exitCode: 1,
        stdout: '',
        stderr: 'Lint command failed',
      }));
      const typecheckResult = await $`npm run typecheck 2>&1`.catch(() => ({
        exitCode: 1,
        stdout: '',
        stderr: 'Typecheck command failed',
      }));

      const hasErrors =
        lintResult.exitCode !== 0 || typecheckResult.exitCode !== 0;

      if (hasErrors) {
        await client.app.log({
          body: {
            level: 'error',
            message: `Lint/Typecheck failed. Lint: ${lintResult.exitCode === 0 ? 'OK' : 'FAILED'}, Typecheck: ${typecheckResult.exitCode === 0 ? 'OK' : 'FAILED'}`,
          },
        });
      } else {
        await client.app.log({
          body: { level: 'info', message: `Lint and typecheck passed!` },
        });
      }
    },
  };
};

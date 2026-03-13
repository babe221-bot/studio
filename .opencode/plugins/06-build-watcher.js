export const BuildWatcher = async ({
  project,
  client,
  $,
  directory,
  worktree,
}) => {
  let buildRunning = false;
  let buildTimeout = null;

  return {
    'file.edited': async ({ filePath }) => {
      const isFrontendFile = (path) => {
        return (
          path.startsWith('src/') ||
          path.startsWith('./src/') ||
          path.startsWith('components/') ||
          path.startsWith('./components/') ||
          path.includes('next.config') ||
          path.includes('tailwind.config')
        );
      };

      if (!isFrontendFile(filePath)) return;

      if (buildRunning) {
        if (buildTimeout) clearTimeout(buildTimeout);
      }

      buildTimeout = setTimeout(async () => {
        if (buildRunning) return;
        buildRunning = true;

        await client.app.log({
          body: {
            level: 'info',
            message: 'Running Next.js build to check for errors...',
          },
        });

        const result = await $`npm run build 2>&1`.catch(() => ({
          exitCode: 1,
          stdout: '',
          stderr: 'Build failed',
        }));

        if (result.exitCode !== 0) {
          await client.app.log({
            body: {
              level: 'error',
              message: `Build failed! Check errors above.`,
            },
          });
        } else {
          await client.app.log({
            body: { level: 'info', message: 'Build completed successfully!' },
          });
        }

        buildRunning = false;
      }, 30000);
    },
  };
};

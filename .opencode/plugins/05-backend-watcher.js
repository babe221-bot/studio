export const BackendWatcher = async ({
  project,
  client,
  $,
  directory,
  worktree,
}) => {
  const isBackendFile = (path) => {
    return (
      path.startsWith('backend/') ||
      path.startsWith('./backend/') ||
      path.endsWith('.py')
    );
  };

  let isRestarting = false;
  const RESTART_COOLDOWN_MS = 10000;
  let lastRestart = 0;

  const restartBackend = async () => {
    const now = Date.now();
    if (now - lastRestart < RESTART_COOLDOWN_MS || isRestarting) return;
    isRestarting = true;
    lastRestart = now;

    await client.app.log({
      body: {
        level: 'info',
        message: 'Backend file changed, restarting server...',
      },
    });

    try {
      await $`taskkill /F /IM uvicorn.exe 2>&1`.catch(() => {});
      await $`cd backend && ..\\.venv\\Scripts\\uvicorn.exe app.main:app --reload &`;
      await client.app.log({
        body: { level: 'info', message: 'Backend server restarted!' },
      });
    } catch (error) {
      await client.app.log({
        body: {
          level: 'error',
          message: `Failed to restart backend: ${error.message}`,
        },
      });
    } finally {
      isRestarting = false;
    }
  };

  return {
    'file.edited': async ({ filePath }) => {
      if (isBackendFile(filePath)) {
        await restartBackend();
      }
    },
  };
};

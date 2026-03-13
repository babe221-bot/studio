export const GitNotifications = async ({
  project,
  client,
  $,
  directory,
  worktree,
}) => {
  const sendNotification = async (title, message) => {
    try {
      await $`powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $balloon = [System.Windows.Forms.NotifyIcon]::new; $balloon.Icon = [System.Drawing.SystemIcons]::Info; $balloon.BalloonTipTitle = '${title}'; $balloon.BalloonTipText = '${message}'; $balloon.Visible = $true; $balloon.ShowBalloonTip(3000); Start-Sleep -Seconds 3; $balloon.Dispose()"`;
    } catch {
      await client.app.log({
        body: { level: 'info', message: `${title}: ${message}` },
      });
    }
  };

  return {
    'session.idle': async () => {
      await sendNotification('OpenCode', 'Session completed!');
    },
    'session.error': async ({ event }) => {
      await sendNotification(
        'OpenCode Error',
        event.error?.message || 'An error occurred'
      );
    },
    'session.updated': async ({ event }) => {
      if (event.status === 'thinking') {
        await client.app.log({
          body: { level: 'debug', message: 'Session thinking...' },
        });
      }
    },
  };
};

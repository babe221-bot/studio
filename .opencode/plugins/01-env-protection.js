export const EnvProtection = async ({
  project,
  client,
  $,
  directory,
  worktree,
}) => {
  return {
    'tool.execute.before': async (input, output) => {
      if (input.tool === 'read') {
        const filePath = output.args?.filePath || '';
        if (
          filePath.includes('.env') ||
          filePath.endsWith('.env.local') ||
          filePath.endsWith('.env.example')
        ) {
          throw new Error(
            'Security: Reading .env files is not allowed. Use .env.example for reference instead.'
          );
        }
      }
    },
  };
};

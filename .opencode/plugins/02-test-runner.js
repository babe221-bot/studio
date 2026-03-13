export const TestRunner = async ({
  project,
  client,
  $,
  directory,
  worktree,
}) => {
  const isTestFile = (path) => {
    return (
      path.includes('.test.') ||
      path.includes('.spec.') ||
      path.endsWith('.test.ts') ||
      path.endsWith('.test.tsx') ||
      path.endsWith('.spec.ts') ||
      path.endsWith('.spec.tsx')
    );
  };

  const isSrcFile = (path) => {
    return path.startsWith('src/') || path.startsWith('./src/');
  };

  return {
    'file.edited': async ({ filePath }) => {
      if (isTestFile(filePath)) {
        await client.app.log({
          body: {
            level: 'info',
            message: `Test file edited: ${filePath}, running tests...`,
          },
        });
        const result = await $`npm test 2>&1`;
        await client.app.log({
          body: {
            level: result.exitCode === 0 ? 'info' : 'warn',
            message: `Tests completed: ${result.exitCode === 0 ? 'Passed' : 'Failed'}`,
          },
        });
      } else if (isSrcFile(filePath)) {
        const testFile = filePath.replace(/(\.ts|\.tsx)$/, '.test.$1');
        const testFileExists = await $`test -f ${testFile} && echo "exists"`
          .then((r) => r.stdout.includes('exists'))
          .catch(() => false);
        if (testFileExists) {
          await client.app.log({
            body: {
              level: 'info',
              message: `Source file edited, running associated tests...`,
            },
          });
          const result = await $`npm test -- ${testFile} 2>&1`;
          await client.app.log({
            body: {
              level: result.exitCode === 0 ? 'info' : 'warn',
              message: `Tests completed: ${result.exitCode === 0 ? 'Passed' : 'Failed'}`,
            },
          });
        }
      }
    },
  };
};

import { tool } from '@opencode-ai/plugin';

export const MigrationHelper = async ({
  project,
  client,
  $,
  directory,
  worktree,
}) => {
  const runMigration = async (migrationName) => {
    await client.app.log({
      body: {
        level: 'info',
        message: `Running Supabase migration: ${migrationName}`,
      },
    });

    const supabaseDir = 'supabase';
    const migrationsDir = `${supabaseDir}/migrations`;

    const result =
      await $`cd ${supabaseDir} && npx supabase db push --db-url ${process.env.SUPABASE_DB_URL || 'local'} 2>&1`.catch(
        () => ({
          exitCode: 1,
          stdout: '',
          stderr: 'Migration failed. Make sure SUPABASE_DB_URL is set.',
        })
      );

    if (result.exitCode !== 0) {
      await client.app.log({
        body: { level: 'error', message: `Migration failed: ${result.stderr}` },
      });
      return `Migration failed: ${result.stderr}`;
    }

    await client.app.log({
      body: { level: 'info', message: 'Migration completed successfully!' },
    });
    return 'Migration completed successfully!';
  };

  const createMigration = async (migrationName, description) => {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .split('.')[0];
    const filename = `${timestamp}_${migrationName}.sql`;
    const filepath = `supabase/migrations/${filename}`;

    const template = `-- ${description}\n\n-- Add your migration SQL here\n-- Example:\n-- CREATE TABLE IF NOT EXISTS example (\n--   id SERIAL PRIMARY KEY,\n--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n-- );\n`;

    await $`mkdir -p supabase/migrations`;
    await $`echo ${template} > ${filepath}`;

    await client.app.log({
      body: { level: 'info', message: `Created migration: ${filepath}` },
    });
    return `Created migration file: ${filepath}`;
  };

  return {
    tool: {
      run_migration: tool({
        description: 'Run Supabase database migrations',
        args: {
          name: tool.schema.string().optional(),
        },
        async execute(args) {
          return await runMigration(args.name || 'default');
        },
      }),
      create_migration: tool({
        description: 'Create a new Supabase migration file',
        args: {
          name: tool.schema.string(),
          description: tool.schema.string().optional(),
        },
        async execute(args) {
          return await createMigration(
            args.name,
            args.description || 'New migration'
          );
        },
      }),
    },
  };
};

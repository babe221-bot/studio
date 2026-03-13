import { tool } from '@opencode-ai/plugin';

export const ComponentGenerator = async ({
  project,
  client,
  $,
  directory,
  worktree,
}) => {
  const generateComponent = async (name, options = {}) => {
    const {
      withStorybook = false,
      withTest = true,
      isUiComponent = false,
    } = options;

    const componentDir = isUiComponent ? 'src/components/ui' : 'src/components';
    const pascalName =
      name.charAt(0).toUpperCase() +
      name.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    const kebabName = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

    const files = [];

    const componentContent = `import { type FC } from 'react';

interface ${pascalName}Props {
  className?: string;
}

export const ${pascalName}: FC<${pascalName}Props> = ({ className }) => {
  return (
    <div className={className}>
      ${pascalName} component
    </div>
  );
};
`;

    const indexContent = `export { ${pascalName} } from './${pascalName}';
`;

    files.push({
      path: `${componentDir}/${kebabName}/${pascalName}.tsx`,
      content: componentContent,
    });
    files.push({
      path: `${componentDir}/${kebabName}/index.ts`,
      content: indexContent,
    });

    if (withTest) {
      const testContent = `import { render, screen } from '@testing-library/react';
import { ${pascalName} } from './${pascalName}';

describe('${pascalName}', () => {
  it('renders correctly', () => {
    render(<${pascalName} />);
    expect(screen.getByText('${pascalName} component')).toBeInTheDocument();
  });
});
`;
      files.push({
        path: `${componentDir}/${kebabName}/${pascalName}.test.tsx`,
        content: testContent,
      });
    }

    if (withStorybook) {
      const storyContent = `import type { Meta, StoryObj } from '@storybook/react';
import { ${pascalName} } from './${pascalName}';

const meta = {
  title: 'Components/${pascalName}',
  component: ${pascalName},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ${pascalName}>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
`;
      files.push({
        path: `${componentDir}/${kebabName}/${pascalName}.stories.tsx`,
        content: storyContent,
      });
    }

    for (const file of files) {
      await $`mkdir -p ${file.path.split('/').slice(0, -1).join('/')}`;
      await $`echo '${file.content.replace(/'/g, "''")}' > ${file.path}`;
    }

    await client.app.log({
      body: { level: 'info', message: `Created component: ${pascalName}` },
    });
    return `Created ${files.length} files for component: ${pascalName}`;
  };

  return {
    tool: {
      create_component: tool({
        description:
          'Create a new React component with optional test and Storybook files',
        args: {
          name: tool.schema.string(),
          'with-storybook': tool.schema.boolean().optional(),
          'with-test': tool.schema.boolean().optional(),
          'ui-component': tool.schema.boolean().optional(),
        },
        async execute(args) {
          return await generateComponent(args.name, {
            withStorybook: args['with-storybook'],
            withTest: args['with-test'] !== false,
            isUiComponent: args['ui-component'],
          });
        },
      }),
    },
  };
};

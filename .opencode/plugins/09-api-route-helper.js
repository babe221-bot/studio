import { tool } from '@opencode-ai/plugin';

export const ApiRouteHelper = async ({
  project,
  client,
  $,
  directory,
  worktree,
}) => {
  const generateApiRoute = async (routePath, options = {}) => {
    const {
      method = 'GET',
      withAuth = false,
      withValidation = false,
    } = options;

    const routeParts = routePath.startsWith('/')
      ? routePath.slice(1).split('/')
      : routePath.split('/');
    const fileName = routeParts[routeParts.length - 1];
    const apiDir = 'src/app/api';
    const fullDir = `${apiDir}/${routeParts.slice(0, -1).join('/')}`;

    const pascalName =
      fileName.charAt(0).toUpperCase() +
      fileName.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    const routeFileName = routeParts.length > 1 ? `[${fileName}]` : fileName;

    let content = `import { NextResponse } from 'next/server';
`;

    if (withAuth) {
      content += `import { createClient } from '@/utils/supabase/server';
`;
    }

    if (withValidation) {
      content += `import { z } from 'zod';
`;
    }

    const validationSchema = withValidation
      ? `
const ${pascalName}Schema = z.object({
  // Define your validation schema here
});
`
      : '';

    content += validationSchema;

    const handlerBody = `
export async function ${method.toLowerCase()}(request: Request) {
  try {
    ${
      withAuth
        ? `const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
`
        : ''
    }
    ${
      method.toUpperCase() === 'GET'
        ? `const { searchParams } = new URL(request.url);
    // const param = searchParams.get('param');
    
    return NextResponse.json({ message: 'Success', data: [] });`
        : ''
    }
    ${
      method.toUpperCase() === 'POST'
        ? `const body = await request.json();
    ${withValidation ? `const validated = ${pascalName}Schema.parse(body);` : ''}
    // Process the request
    return NextResponse.json({ message: 'Created', data: body });`
        : ''
    }
    ${
      method.toUpperCase() === 'PUT' || method.toUpperCase() === 'PATCH'
        ? `const body = await request.json();
    ${withValidation ? `const validated = ${pascalName}Schema.parse(body);` : ''}
    // Process the request
    return NextResponse.json({ message: 'Updated', data: body });`
        : ''
    }
    ${
      method.toUpperCase() === 'DELETE'
        ? `// Process the request
    return NextResponse.json({ message: 'Deleted' });`
        : ''
    }
    ${
      withAuth
        ? `
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}`
        : `
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}`
    }
`;

    content += handlerBody;

    const fullPath = `${fullDir}/${routeFileName}/route.ts`;
    await $`mkdir -p ${fullDir}/${routeFileName}`;
    await $`echo '${content.replace(/'/g, "''")}' > ${fullPath}`;

    await client.app.log({
      body: { level: 'info', message: `Created API route: /api/${routePath}` },
    });
    return `Created API route: /api/${routePath} at ${fullPath}`;
  };

  return {
    tool: {
      create_api_route: tool({
        description:
          'Create a new Next.js API route with optional auth and validation',
        args: {
          path: tool.schema.string(),
          method: tool.schema
            .enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
            .optional(),
          'with-auth': tool.schema.boolean().optional(),
          'with-validation': tool.schema.boolean().optional(),
        },
        async execute(args) {
          return await generateApiRoute(args.path, {
            method: args.method || 'GET',
            withAuth: args['with-auth'],
            withValidation: args['with-validation'],
          });
        },
      }),
    },
  };
};

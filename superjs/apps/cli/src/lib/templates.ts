/**
 * Project templates for `superjs init <template>`. Each template is a flat list
 * of files (relative path + content) scaffolded into the current directory.
 * Existing files are never overwritten. The `.sjs` sources are starter shapes,
 * not type-checked against their (uninstalled) dependencies.
 */

export interface TemplateFile { readonly path: string; readonly content: string; }

export const TEMPLATE_NAMES = ['node-cli', 'fastify-api', 'workers-api', 'lambda-handler'] as const;
export type TemplateName = (typeof TEMPLATE_NAMES)[number];

const config = (target: string): string =>
  `${JSON.stringify({ language: '1.0', compilerOptions: { strict: true, target, outDir: 'dist' } }, null, 2)}\n`;

const pkg = (obj: unknown): string => `${JSON.stringify(obj, null, 2)}\n`;

const TEMPLATES: Record<TemplateName, TemplateFile[]> = {
  'node-cli': [
    { path: 'superjs.config.json', content: config('ES2022') },
    { path: 'package.json', content: pkg({
      name: 'my-cli', version: '0.1.0', type: 'module', bin: { 'my-cli': 'dist/main.js' },
      scripts: { build: 'superjs build src --out-dir dist', start: 'node dist/main.js' },
    }) },
    { path: 'src/main.sjs', content:
`function main(argv: string[]): number {
  const name = argv.length > 0 ? argv[0] : "world";
  console.log("hello, " + name);
  return 0;
}

main(process.argv.slice(2));
` },
    { path: 'README.md', content: '# my-cli\n\n```sh\nsuperjs build src --out-dir dist\nnode dist/main.js\n```\n' },
  ],
  'fastify-api': [
    { path: 'superjs.config.json', content: config('ES2022') },
    { path: 'package.json', content: pkg({
      name: 'my-api', version: '0.1.0', type: 'module',
      scripts: { build: 'superjs build src --out-dir dist', start: 'node dist/server.js' },
      dependencies: { fastify: '^4', zod: '^3', pino: '^9' },
    }) },
    { path: 'src/server.sjs', content:
`import Fastify from "fastify";

const app = Fastify({ logger: true });

app.get("/health", async () => {
  return { status: "ok" };
});

const start = async (): Promise<void> => {
  await app.listen({ port: 3000 });
};

start();
` },
    { path: 'README.md', content: '# my-api\n\nFastify + zod + pino starter.\n\n```sh\nsuperjs build src --out-dir dist && node dist/server.js\n```\n' },
  ],
  'workers-api': [
    { path: 'superjs.config.json', content: config('ESNext') },
    { path: 'package.json', content: pkg({
      name: 'my-worker', version: '0.1.0', type: 'module',
      scripts: { build: 'superjs build src --out-dir dist', dev: 'wrangler dev' },
      devDependencies: { wrangler: '^3' },
    }) },
    { path: 'src/worker.sjs', content:
`export default {
  async fetch(request: Request, env: dynamic): Promise<Response> {
    return new Response("hello from workers");
  },
};
` },
    { path: 'wrangler.toml', content: 'name = "my-worker"\nmain = "dist/worker.js"\ncompatibility_date = "2024-01-01"\n' },
    { path: 'README.md', content: '# my-worker\n\nCloudflare Workers starter.\n\n```sh\nsuperjs build src --out-dir dist && wrangler dev\n```\n' },
  ],
  'lambda-handler': [
    { path: 'superjs.config.json', content: config('ES2022') },
    { path: 'package.json', content: pkg({
      name: 'my-lambda', version: '0.1.0', type: 'module',
      scripts: { build: 'superjs build src --out-dir dist' },
    }) },
    { path: 'src/handler.sjs', content:
`export async function handler(event: dynamic): Promise<dynamic> {
  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
}
` },
    { path: 'README.md', content: '# my-lambda\n\nAWS Lambda handler starter. Entry: `dist/handler.handler`.\n' },
  ],
};

export function templateFiles(name: TemplateName): TemplateFile[] {
  return TEMPLATES[name];
}

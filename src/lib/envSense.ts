import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);

/**
 * Finds the project diretory from the current file
 */
async function findProjectDir(fileName: string): Promise<string | null> {
  const dir = path.dirname(fileName);

  if (fs.existsSync(dir + '/package.json')) {
    return dir;
  } else {
    return dir === '/' ? null : await findProjectDir(dir);
  }
}

/**
 * Checks to see if the project is using dotenv in its dependencies
 */
async function isDotenvInDeps(projectDir: string): Promise<boolean> {
  const packageFile = await readFile(
    path.resolve(projectDir, 'package.json'),
    'utf-8',
  );
  const { dependencies, devDependencies } = JSON.parse(packageFile);
  return (
    (dependencies && (dependencies.dotenv || dependencies.next)) ||
    (devDependencies && devDependencies.dotenv)
  );
}

async function provideCompletionItems(
  document: vscode.TextDocument,
  position: vscode.Position,
) {
  const eol = document.eol.toString();

  const linePrefix = document
    .lineAt(position)
    .text.substr(0, position.character);

  if (!linePrefix.endsWith('process.env.')) {
    return undefined;
  }

  const projectDir = await findProjectDir(document.fileName);
  if (projectDir === null) {
    return undefined;
  }

  const vars = Object.entries(process.env);

  if (projectDir && (await isDotenvInDeps(projectDir))) {
    const fileContent = await readFile(`${projectDir}/.env`, {
      encoding: 'utf8',
    });

    fileContent
      .split(eol)
      // filter out comments
      .filter(line => !line.trim().startsWith('#'))
      .forEach(envvarLitteral => {
        const lineVars = envvarLitteral.trim().split('=');

        return vars.push([lineVars[0], lineVars[1]]);
      });
  }

  return vars.map(envvar => {
    const completion = new vscode.CompletionItem(
      envvar[0],
      vscode.CompletionItemKind.Variable,
    );
    completion.documentation = envvar[1];

    return completion;
  });
}

export default { provideCompletionItems };

import * as vscode from 'vscode';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { EOL } from 'os';
import envFileNames from './envFileNames';
import parseDotEnv from './parseDotEnv';

const readFile = promisify(fs.readFile);
const readDir = promisify(fs.readdir);

// Finds the project diretory from the current file
async function findProjectDir(): Promise<string | undefined> {
  const docUri = vscode.window.activeTextEditor?.document.uri;
  if (!docUri) {
    return undefined;
  }

  return vscode.workspace.getWorkspaceFolder(docUri)?.uri.fsPath;
}

// Checks to see if the project is using dotenv in its dependencies
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

// A function to filter out all the files that aren't .env files
function isDotEnvFile(fileName: string): boolean {
  if (fileName.endsWith('.env')) {
    return true;
  } else if (envFileNames.includes(fileName)) {
    return true;
  } else {
    return false;
  }
}

// Collects all the .env files in the project
async function getDotEnvFiles(projectDir: string) {
  const fileNames = (await readDir(projectDir))
    // Checks if the file is a .env file
    .filter(isDotEnvFile);

  const files = fileNames.map(fileName => {
    return fs.readFileSync(path.resolve(projectDir, fileName), 'utf-8');
  });

  return files;
}

async function provideCompletionItems(
  document: vscode.TextDocument,
  position: vscode.Position,
): Promise<vscode.CompletionList<vscode.CompletionItem> | undefined> {
  const linePrefix = document
    .lineAt(position)
    .text.substr(0, position.character);

  if (!linePrefix.endsWith('process.env.')) {
    return undefined;
  }

  const projectDir = await findProjectDir();
  if (!projectDir) {
    return undefined;
  }

  const hideDefaults = vscode.workspace
    .getConfiguration('envSense')
    .get<boolean>('ignoreDefaults');

  const vars: [string, string | undefined][] = hideDefaults
    ? []
    : Object.entries(process.env);

  if (projectDir && (await isDotenvInDeps(projectDir))) {
    await parseDotEnv((await getDotEnvFiles(projectDir)).join(EOL), vars);
  }

  const completions = new vscode.CompletionList<vscode.CompletionItem>(
    vars.map(envvar => {
      const completion = new vscode.CompletionItem(
        envvar[0],
        vscode.CompletionItemKind.Field,
      );
      completion.documentation = envvar[1];
      // Stops the value going to the bottom so it is more inline with the actual values
      completion.sortText = `a${envvar[0]}`;

      return completion;
    }),
  );

  return completions;
}

export default { provideCompletionItems };

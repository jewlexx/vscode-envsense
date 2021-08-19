import * as vscode from 'vscode';

import varProvider from './lib/envSense';

export function activate(context: vscode.ExtensionContext) {
  console.log('Env Sense initialized');
  const jSense = vscode.languages.registerCompletionItemProvider(
    { scheme: 'file', language: 'javascript' },
    varProvider,
    '.',
  );
  const tSense = vscode.languages.registerCompletionItemProvider(
    { scheme: 'file', language: 'typescript' },
    varProvider,
    '.',
  );
  context.subscriptions.push(jSense, tSense);
}

// this method is called when your extension is deactivated
export function deactivate() {}

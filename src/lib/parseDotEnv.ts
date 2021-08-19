import { EOL } from 'os';

export default async function parseDotEnv(
  file: string,
  ogArray: [string, string | undefined][],
): Promise<void> {
  const lines = file.split(EOL).filter(line => !line.trim().startsWith('#'));

  for (let i = 0; i < lines.length; i++) {
    const lineVars = lines[i].trim().split('=');

    ogArray.push([lineVars[0], lineVars[1]]);
  }
}

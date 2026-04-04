import simpleGit from 'simple-git';

export interface GitInfo {
  branch: string | null;
  commit: string | null;
  log: Array<{
    hash: string;
    date: string;
    message: string;
    author_name: string;
    author_email: string;
  }>;
  remoteUrl: string | null;
  tags: string[];
}

export async function getGitInfo(): Promise<GitInfo> {
  try {
    const git = simpleGit();
    const [branch, log, remotes, tags] = await Promise.all([
      git.revparse(['--abbrev-ref', 'HEAD']),
      git.log({ maxCount: 10 }),
      git.getRemotes(true),
      git.tags(),
    ]);
    return {
      branch: branch.trim(),
      commit: log.latest?.hash ?? null,
      log: log.all as GitInfo['log'],
      remoteUrl: remotes[0]?.refs?.fetch ?? null,
      tags: tags.all,
    };
  } catch {
    return { branch: null, commit: null, log: [], remoteUrl: null, tags: [] };
  }
}

/*
 * Publish the site to GitHub Pages: build it, then commit dist/ as the only content of the gh-pages branch and push.
 * Run with `npm run deploy` from a clean working tree.
 */
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit' });
const out = (cmd) => execSync(cmd).toString().trim();

run('npm run build');
const sha = out('git rev-parse --short HEAD');
const dir = mkdtempSync(join(tmpdir(), 'elif-pages-'));
const hasBranch = out('git ls-remote --heads origin gh-pages') !== '';
try {
  if (hasBranch) {
    run('git fetch origin gh-pages');
    run(`git worktree add -f "${dir}" origin/gh-pages`);
    run('git checkout -B gh-pages', dir);
  } else {
    run(`git worktree add -f --detach "${dir}"`);
    run('git checkout --orphan gh-pages', dir);
  }
  for (const f of readdirSync(dir)) if (f !== '.git') rmSync(join(dir, f), { recursive: true, force: true });
  cpSync('dist', dir, { recursive: true });
  /* no Jekyll processing on GitHub's side: serve the files as they are */
  writeFileSync(join(dir, '.nojekyll'), '');
  run('git add -A', dir);
  run(`git commit -m "deploy ${sha}"`, dir);
  run('git push -f origin gh-pages', dir);
} finally {
  run(`git worktree remove -f "${dir}"`);
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
}
console.log('Published: https://elifnurdemir.github.io/elif/');

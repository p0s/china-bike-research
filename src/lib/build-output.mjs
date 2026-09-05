import fs from 'node:fs';
import path from 'node:path';

/** Stage output separately. A failed render, budget or link check preserves dist. */
export function createBuildOutput(root) {
  const destination = path.resolve(root, 'dist');
  const directory = fs.mkdtempSync(path.join(root, '.dist-stage-'));
  let finished = false;
  return {
    directory, destination,
    discard() {
      if (!finished) fs.rmSync(directory, { recursive: true, force: true });
    },
    publish() {
      if (finished) throw new Error('This build output has already been published.');
      let backup;
      if (fs.existsSync(destination)) {
        backup = fs.mkdtempSync(path.join(root, '.dist-previous-'));
        fs.rmdirSync(backup);
        fs.renameSync(destination, backup);
      }
      try { fs.renameSync(directory, destination); }
      catch (error) {
        if (backup) {
          try { fs.renameSync(backup, destination); }
          catch (restoreError) {
            throw new AggregateError([error, restoreError], `Publish failed. Previous output is preserved at ${backup}; restore it manually.`);
          }
        }
        throw error;
      }
      finished = true;
      if (backup) {
        try { fs.rmSync(backup, { recursive: true, force: true }); }
        catch { console.warn(`Build published; could not remove previous-output backup: ${backup}`); }
      }
    },
  };
}

/** Resolve only an internal route inside this exact deployment and output root. */
export function internalRouteTarget(root, base, pathname) {
  let local;
  try { local = decodeURIComponent(pathname); } catch { return null; }
  if (/[\u0000-\u001f\u007f\\]/.test(local)) return null;
  if (base) {
    if (local !== base && !local.startsWith(`${base}/`)) return null;
    local = local.slice(base.length) || '/';
  }
  if (!local.startsWith('/')) return null;
  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, `.${local}`, ...(local.endsWith('/') ? ['index.html'] : []));
  const relative = path.relative(resolvedRoot, target);
  return relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative) ? null : target;
}

const healthyClassifications = new Set(['healthy']);
const allClassifications = new Set(['healthy', 'host-blocked', 'wrong-content-type', 'broken', 'unreachable']);

export function remoteImageResources(image) {
  if (image?.hosting?.mode !== 'remote') return [];
  return image.hosting.variants?.length
    ? image.hosting.variants.map((variant) => ({ id: `${image.id}:${variant.purpose}`, url: variant.url }))
    : [{ id: image.id, url: image.hosting.remote_url }];
}

export function imageHealthIsFreshAndHealthy(image, asOf) {
  const check = image?.health_check;
  if (image?.hosting?.mode !== 'remote' || !check || !/^\d{4}-\d{2}-\d{2}$/.test(asOf)) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(check.checked_at) || check.checked_at > asOf) return false;
  const ageDays = (Date.parse(`${asOf}T00:00:00Z`) - Date.parse(`${check.checked_at}T00:00:00Z`)) / 86_400_000;
  if (ageDays < 0 || ageDays > 30) return false;

  const current = remoteImageResources(image);
  if (!current.length || !Array.isArray(check.resources) || check.resources.length !== current.length) return false;
  const byId = new Map(check.resources.map((resource) => [resource.target_id, resource]));
  return current.every((target) => {
    const result = byId.get(target.id);
    return result?.url === target.url && healthyClassifications.has(result.classification)
      && typeof result.content_type === 'string' && result.content_type.toLowerCase().startsWith('image/')
      && Number.isInteger(result.status) && result.status >= 200 && result.status < 400;
  });
}

export function validateImageHealthCheck(image) {
  const errors = [];
  if (image.health_check === undefined) return errors;
  const check = image.health_check;
  if (!check || typeof check !== 'object' || Array.isArray(check)) return [`image ${image.id}: health_check must be an object`];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(check.checked_at ?? '') || Number.isNaN(Date.parse(`${check.checked_at}T00:00:00Z`))) {
    errors.push(`image ${image.id}: invalid health_check.checked_at`);
  }
  if (!Array.isArray(check.resources)) {
    errors.push(`image ${image.id}: health_check.resources must be an array`);
    return errors;
  }
  const allowed = new Map(remoteImageResources(image).map((target) => [target.id, target.url]));
  const seen = new Set();
  for (const result of check.resources) {
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      errors.push(`image ${image.id}: invalid health-check resource`);
      continue;
    }
    if (typeof result.target_id !== 'string' || !allowed.has(result.target_id) || allowed.get(result.target_id) !== result.url) {
      errors.push(`image ${image.id}: health-check resource does not match a current remote URL`);
    }
    if (seen.has(result.target_id)) errors.push(`image ${image.id}: duplicate health-check target ${result.target_id}`);
    seen.add(result.target_id);
    if (!allClassifications.has(result.classification)) errors.push(`image ${image.id}: invalid health-check classification`);
    if (result.status !== undefined && (!Number.isInteger(result.status) || result.status < 100 || result.status > 599)) {
      errors.push(`image ${image.id}: invalid health-check HTTP status`);
    }
    if (result.content_type !== undefined && typeof result.content_type !== 'string') {
      errors.push(`image ${image.id}: invalid health-check content_type`);
    }
  }
  return errors;
}

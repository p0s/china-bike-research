const DENIED = { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' };
const bound = new WeakSet();

export function clearGoogleCookies(win) {
  for (const part of String(win.document.cookie ?? '').split(';')) {
    const name = part.trim().split('=')[0];
    if (name !== '_ga' && !/^_ga_[A-Z0-9]+$/.test(name)) continue;
    const expiry = `${name}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; Secure; SameSite=Lax`;
    win.document.cookie = expiry;
    win.document.cookie = `${expiry}; Domain=chinesebikes.xyz`;
  }
}

export function stopAnalytics(win) {
  win.p0sAnalyticsStopped = true;
  const id = win.p0sGa4MeasurementId;
  if (/^G-[A-Z0-9]{5,20}$/.test(id ?? '')) win[`ga-disable-${id}`] = true;
  if (typeof win.gtag === 'function') win.gtag('consent', 'update', { ...DENIED });
}

export function bindAnalyticsChoices(win) {
  const doc = win?.document;
  if (!doc?.addEventListener || bound.has(doc)) return;
  bound.add(doc);
  if (doc.querySelector('[data-analytics-cleared]')) clearGoogleCookies(win);
  doc.addEventListener('submit', async event => {
    const form = event.target;
    if (!form?.matches?.('form[data-analytics-choice]')) return;
    const action = new URL(form.action, win.location.origin);
    if (action.origin !== win.location.origin || !['/analytics/opt-in', '/analytics/opt-out'].includes(action.pathname)) return;
    event.preventDefault();
    const optingOut = action.pathname === '/analytics/opt-out';
    if (optingOut) stopAnalytics(win);
    const buttons = [...form.parentElement.querySelectorAll('button')];
    buttons.forEach(button => { button.disabled = true; });
    try {
      const response = await win.fetch(action.pathname + (action.searchParams.get('lang') === 'de' ? '?lang=de' : ''), {
        method: 'POST', credentials: 'same-origin', cache: 'no-store', referrerPolicy: 'no-referrer'
      });
      if (!response.ok) throw new Error('Preference not saved');
      if (optingOut) clearGoogleCookies(win);
      // The cookie is saved before reloading. Preserve the comparison URL and
      // let the edge decide eligibility before either collector can run.
      win.location.reload();
    } catch {
      const status = doc.querySelector('[data-analytics-choice-status]');
      if (status) {
        status.textContent = doc.documentElement.lang.startsWith('zh')
          ? '无法保存偏好，请重试。' : doc.documentElement.lang === 'de' ? 'Ihre Auswahl konnte nicht gespeichert werden. Bitte erneut versuchen.' : 'Could not save your preference. Please try again.';
        status.hidden = false;
      }
      buttons.forEach(button => { button.disabled = false; });
    }
  });
}

bindAnalyticsChoices(globalThis.window);

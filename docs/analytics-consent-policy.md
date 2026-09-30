# Optional analytics choices

Reviewed 2026-09-30. This is the site's operational policy for its current GA4
and Umami implementation, not a complete assessment of every country's law.

The site offers a small banner with equally visible **Allow analytics** and
**No thanks** buttons where prior choice is required by this policy. No Google
library, GA identifier, GA event, or Umami event is allowed before that choice.
The footer's Privacy link opens the same permanent Allow/Opt out controls.
Declining is remembered for one year; allowing is remembered for 180 days in a
host-only, HttpOnly preference cookie. DNT, GPC and an explicit opt-out prevail
even when consent has previously been given. A failed choice request never
enables analytics. Forms also work without JavaScript.

## Regional scope and rationale

| Region | Current implementation policy | Basis and limits |
| --- | --- | --- |
| EU/EEA: EU 27 plus Iceland, Liechtenstein and Norway | Prior choice | Non-essential GA cookies do not fit a narrow exempt audience-measurement configuration. [CNIL analytics guidance](https://www.cnil.fr/en/sheet-ndeg16-use-analytics-your-websites-and-applications) describes the exemption's limits. |
| United Kingdom | Prior choice for this GA setup | The statistical-purposes exception is limited to aggregate statistics, with safeguards and an easy objection. This tag's pseudonymous visitor/session identifiers and browser detail do not establish that exemption. [ICO exceptions guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-exceptions/) |
| Mainland China | Prior choice, including the disclosed Google overseas processing | The site targets people buying bicycles in China; PIPL can apply to overseas analysis of people in China (Article 3). Applicable overseas transfers require separate informed consent (Article 39). Consent alone does not establish every transfer or localization requirement. [PIPL scope](https://en.spp.gov.cn/2021-12/29/c_948419.htm), [transfer provisions](https://en.spp.gov.cn/2021-12/29/c_948419_2.htm) |
| Turkey | Prior choice for this non-essential analytics | The regulator's decision requires active opt-in for applicable non-essential analytics cookies without another lawful basis. [KVKK decision 2024/1361](https://www.kvkk.gov.tr/Icerik/8884/2024-1361) |
| Switzerland | Prior choice conservatively | Swiss rules do not impose a blanket prior-consent requirement on every analytics cookie. The policy avoids relying on that distinction for this Google setup. [FDPIC cookie guidance](https://www.edoeb.admin.ch/dam/en/sd-web/brLL9rM3ny9d/Leitfaden%20des%20ED%C3%96B%20betreffend%20Datenbearbeitungen%20mittels%20Cookies%20und%20%C3%A4hnlichen%20Technologien%20mit%20Anhang%20A%20V.%201.1%20vom%2022.01.2025%20EN.pdf) |
| Listed European territories | Prior choice conservatively | AX, GF, GP, MQ, RE, YT, MF, GI, GG, JE and IM follow the stricter policy; this is not a claim that identical laws apply to all of them. |
| Unknown or invalid location | Prior choice | A missing location must not silently permit tracking; the banner still makes allowing easy. |
| Other detected countries | Automatic analytics, with permanent opt-out | This preserves the requested existing behavior. Absence from this list does not prove no local obligations apply. Revisit the policy if audience, processing or laws change. |

Only Cloudflare's trusted `request.cf.country` selects the regional policy.
Client headers, URL parameters, language and previous GA cookies cannot bypass
it. The consent cookie permits analytics after a visitor changes region, unless
another privacy exclusion applies. Cacheable assets remain unchanged; eligible
HTML and config responses cannot be shared between visitors.

## Tag ordering and opt-out

Cloudflare's injected `/sitedelivery/` bootstrap can execute before the site's
asynchronous module. The HTML CSP blocks it. The site queues all-denied consent
defaults synchronously, obtains an eligible config, grants analytics only, and
then inserts the explicit `/sitedelivery/js?id=...` library. Advertising consent
stays denied. No cookieless Google pings are intentionally sent before consent.
[Google's ordering guidance](https://developers.google.com/tag-platform/security/guides/consent)
requires defaults before measurement commands.

Opt-out disables the current tag before saving the choice, suppresses late
collection/session callbacks, expires server cookies, and clears Google cookies
after the response. Reloading retains the current comparison URL. The excluded
document/config also clears residual identifiers so an old page's lifecycle
event cannot leave a cookie active on the new page.

Google's **0% consent rate detected** diagnostic can remain because
`ad_user_data` is always denied. It is not a reason to grant advertising consent.
[Google's diagnostic explanation](https://support.google.com/tagmanager/answer/14681508?hl=en-GB)
distinguishes this from the actionable late-default warning. After a correction,
console diagnostics can take [48–72 hours](https://support.google.com/analytics/answer/14275483?hl=en)
to refresh; live tag behavior is checked immediately.

## Verification

`tests/analytics-consent.test.mjs` covers the trusted-country boundary, unknown
location, stale identifiers, every server event/config route, choices, overriding
privacy signals, startup ordering and late callbacks. `tests/ga4.test.mjs`
covers one tag/page view, client/session matching and collection transport.
Before delivery, run the repository's `npm run check`. After deployment, verify
the actual gateway library and collection response, consent order, first
opt-out cookie cleanup and re-enabling in a disposable research context.
Regional unit/fixture proof is separate from a real visitor's Cloudflare country.

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
| Switzerland | Automatic limited analytics, with permanent opt-out | The policy uses the ordinary notice/opt-out approach for this expected, limited site analytics: no advertising, cross-site identity or sensitive profiling. This is an implementation judgment, not a blanket exemption for every Google setup. Reassess if provider reuse, processing purposes or risk change. [FDPIC cookie guidance](https://www.edoeb.admin.ch/dam/en/sd-web/brLL9rM3ny9d/Leitfaden%20des%20ED%C3%96B%20betreffend%20Datenbearbeitungen%20mittels%20Cookies%20und%20%C3%A4hnlichen%20Technologien%20mit%20Anhang%20A%20V.%201.1%20vom%2022.01.2025%20EN.pdf) |
| Listed European territories | Prior choice conservatively | AX, GF, GP, MQ, RE, YT, MF, GI, GG, JE and IM follow the stricter policy; this is not a claim that identical laws apply to all of them. |
| Unknown or invalid location | Automatic analytics, with permanent opt-out | User-selected default. Missing location alone does not require a banner. DNT, GPC and explicit opt-out still prevail. Unknown country sentinels are omitted from analytics payloads. |
| Other detected countries | Automatic analytics, with permanent opt-out | This preserves the requested existing behavior. Absence from this list does not prove no local obligations apply. Revisit the policy if audience, processing or laws change. |

Only Cloudflare's trusted `request.cf.country` selects the regional policy.
Client headers, URL parameters, language and previous GA cookies cannot bypass
it. The consent cookie permits analytics after a visitor changes region, unless
another privacy exclusion applies. Cacheable assets remain unchanged; eligible
HTML and config responses cannot be shared between visitors.

The UK statistical exception also requires aggregate-only results, prompt
aggregation and no unnecessary retention of individual-level information. The
current GA4 event retention and visitor/session joins do not establish these
conditions; removing advertising alone does not establish the exception.

## Tag ordering and opt-out

Cloudflare's injected `/sitedelivery/` bootstrap can execute before the site's
asynchronous module. The HTML CSP blocks it. Each allowed HTML response gives only the site theme and GA module a fresh CSP
nonce; the injected gateway commands and bootstrap receive none. The site queues
all-denied consent defaults synchronously, obtains an eligible config, grants
analytics only, and then inserts a nonce-bearing `/sitedelivery/` library. The
managed gateway serves its configured tag at this root; `/sitedelivery/js` is
unsupported and returns 400. Advertising consent
stays denied. No cookieless Google pings are intentionally sent before consent.
[Google's ordering guidance](https://developers.google.com/tag-platform/security/guides/consent)
requires defaults before measurement commands.

Opt-out disables the current tag and browser action requests before saving the choice, suppresses late
collection/session callbacks, expires server cookies, and clears Google cookies
after the response. Reloading retains the current comparison URL. The excluded
document/config also clears residual identifiers so an old page's lifecycle
event cannot leave a cookie active on the new page.

Optional action loading keeps at most 20 public event contexts in document memory
for five seconds. Deferred actions recheck the current stop flag, DNT and GPC;
failed loading, expiry and departure discard them. Failed preference saving keeps
the current document stopped. Product actions include allowlisted catalog offer
links as well as marked model-page sources, with the actual page attribution;
delivery-policy and general reference links are excluded.

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

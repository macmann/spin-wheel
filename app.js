<script>
/**
 * Spin-to-Win with consent + AdSense prep (merged version)
 * - Stores a 2-hour cooldown per spin in localStorage
 * - Shows a consent banner; only loads ads after acceptance
 * - Supports both Auto Ads (script in <head>) and manual footer slots
 */

const COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours
const results = ['10 MMK', '20 MMK', 'Try again', '50 MMK'];

const consentBanner = document.getElementById('consent-banner');
const acceptBtn = document.getElementById('accept-consent');
const prepareBtn = document.getElementById('prepare-btn');
const spinBtn = document.getElementById('spin-btn');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const footerAd = document.getElementById('footer-ad');

let nextEligibleAt = parseInt(localStorage.getItem('nextEligibleAt') || '0', 10);

/**
 * Initialize AdSense.
 * Works in two modes:
 * 1) Auto Ads: you already placed the async script in <head> with ?client=... → we just push.
 * 2) Manual footer slots: we read client/slot IDs from localStorage and configure <ins> tags.
 *
 * Returns true if ads are initialized and footer can be shown; false if not ready.
 */
function initAdsense() {
  // Always ensure global array exists to avoid errors.
  window.adsbygoogle = window.adsbygoogle || [];

  // Try manual configuration from localStorage (optional).
  const client = localStorage.getItem('adsenseClientId');      // e.g., "ca-pub-xxxxxxxxxxxxxxxx"
  const mobile = localStorage.getItem('adSlotMobileId');       // e.g., "1234567890"
  const desktop = localStorage.getItem('adSlotDesktopId');     // e.g., "0987654321"

  // If an AdSense client is provided, load the script (idempotent) and prepare footer slots.
  if (client) {
    if (!window.__adsenseScriptLoaded) {
      const s = document.createElement('script');
      s.async = true;
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
      s.crossOrigin = 'anonymous';
      document.head.appendChild(s);
      window.__adsenseScriptLoaded = true;
    }

    const mobileIns = document.querySelector('#footer-ad ins.mobile');
    const desktopIns = document.querySelector('#footer-ad ins.desktop');

    if (mobileIns && mobile) {
      mobileIns.setAttribute('data-ad-client', client);
      mobileIns.setAttribute('data-ad-slot', mobile);
    }
    if (desktopIns && desktop) {
      desktopIns.setAttribute('data-ad-client', client);
      desktopIns.setAttribute('data-ad-slot', desktop);
    }

    // Request fill for configured slots.
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (_) {}
    return true;
  }

  // If no client in storage, we may still be using Auto Ads via <head> script. Push a request.
  try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (_) {}

  // If Auto Ads is used, footer may or may not be needed; return true to allow showing it if present.
  return true;
}

function checkConsent() {
  if (localStorage.getItem('consentAccepted')) {
    consentBanner && (consentBanner.style.display = 'none');
    const ok = initAdsense();
    if (footerAd) footerAd.style.display = ok ? '' : 'none';
  } else {
    if (footerAd) footerAd.style.display = 'none';
  }
}

acceptBtn?.addEventListener('click', () => {
  localStorage.setItem('consentAccepted', 'true');
  if (consentBanner) consentBanner.style.display = 'none';
  const ok = initAdsense();
  if (footerAd) footerAd.style.display = ok ? '' : 'none';
});

function format(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600).toString().padStart(2, '0');
  const m = Math.floor((total % 3600) / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function updateUI() {
  const now = Date.now();
  if (now < nextEligibleAt) {
    const remaining = nextEligibleAt - now;
    statusEl && (statusEl.textContent = `Come back in: ${format(remaining)}`);
    if (prepareBtn) prepareBtn.style.display = 'none';
    if (spinBtn) {
      spinBtn.disabled = true;
      spinBtn.setAttribute('aria-disabled', 'true');
    }
  } else {
    statusEl && (statusEl.textContent = 'Ready to spin!');
    if (prepareBtn) prepareBtn.style.display = '';
    if (spinBtn) {
      spinBtn.disabled = true; // must press "Prepare" first
      spinBtn.setAttribute('aria-disabled', 'true');
    }
  }
}

prepareBtn?.addEventListener('click', () => {
  prepareBtn.disabled = true;
  prepareBtn.setAttribute('aria-disabled', 'true');

  // Trigger an ad request (Auto Ads or manual slot) before allowing spin.
  try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (_) {}

  // Minor hash change to help SPA routers/analytics differentiate a pre-spin step.
  location.hash = '#pre-spin' + Date.now();

  let counter = 3;
  (function countdown() {
    statusEl && (statusEl.textContent = `Preparing your reward experience... ${counter}`);
    if (counter === 0) {
      if (spinBtn) {
        spinBtn.disabled = false;
        spinBtn.setAttribute('aria-disabled', 'false');
      }
      statusEl && (statusEl.textContent = 'Ready! Press Spin Now.');
    } else {
      counter--;
      setTimeout(countdown, 1000);
    }
  })();
});

spinBtn?.addEventListener('click', () => {
  if (spinBtn.disabled) return;
  const prize = results[Math.floor(Math.random() * results.length)];
  resultEl && (resultEl.textContent = `Result: ${prize}`);
  nextEligibleAt = Date.now() + COOLDOWN_MS;
  localStorage.setItem('nextEligibleAt', String(nextEligibleAt));
  spinBtn.disabled = true;
  spinBtn.setAttribute('aria-disabled', 'true');
  if (prepareBtn) prepareBtn.style.display = 'none';
  updateUI();
});

setInterval(updateUI, 1000);
updateUI();
checkConsent();

/*
  TODO: Replace AdSense pre-spin with Google Ad Manager (GAM) Rewarded:
  1) <script async src="https://securepubads.g.doubleclick.net/tag/js/gpt.js"></script>
  2) googletag.defineOutOfPageSlot('/NETWORK_CODE/game_spin_rewarded', googletag.enums.OutOfPageFormat.REWARDED)
  3) On rewardedSlotGranted → allow spin (enable button)
  This yields a GUARANTEED rewarded ad before the spin.
*/
</script>

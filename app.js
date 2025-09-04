const COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours
const results = ['10 MMK', '20 MMK', 'Try again', '50 MMK'];

const consentBanner = document.getElementById('consent-banner');
const acceptBtn = document.getElementById('accept-consent');
const prepareBtn = document.getElementById('prepare-btn');
const spinBtn = document.getElementById('spin-btn');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
let nextEligibleAt = parseInt(localStorage.getItem('nextEligibleAt') || '0', 10);

function initAdsense() {
  const client = localStorage.getItem('adsenseClientId');
  const mobile = localStorage.getItem('adSlotMobileId');
  const desktop = localStorage.getItem('adSlotDesktopId');
  if (!client) return false;

  if (!window.adsenseLoaded) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
    s.crossOrigin = 'anonymous';
    document.head.appendChild(s);
    window.adsenseLoaded = true;
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

  window.adsbygoogle = window.adsbygoogle || [];
  window.adsbygoogle.push({});
  return true;
}

function checkConsent() {
  const footer = document.getElementById('footer-ad');
  if (localStorage.getItem('consentAccepted')) {
    consentBanner.style.display = 'none';
    if (!initAdsense()) {
      footer.style.display = 'none';
    }
  } else {
    footer.style.display = 'none';
  }
}

acceptBtn.addEventListener('click', () => {
  localStorage.setItem('consentAccepted', 'true');
  consentBanner.style.display = 'none';
  const footer = document.getElementById('footer-ad');
  if (initAdsense()) {
    footer.style.display = '';
  }
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
    statusEl.textContent = `Come back in: ${format(remaining)}`;
    prepareBtn.style.display = 'none';
    spinBtn.disabled = true;
    spinBtn.setAttribute('aria-disabled', 'true');
  } else {
    statusEl.textContent = 'Ready to spin!';
    prepareBtn.style.display = '';
    spinBtn.disabled = true;
    spinBtn.setAttribute('aria-disabled', 'true');
  }
}

prepareBtn.addEventListener('click', () => {
  prepareBtn.disabled = true;
  prepareBtn.setAttribute('aria-disabled', 'true');
  if (window.adsbygoogle) {
    (adsbygoogle = window.adsbygoogle || []).push({});
  }
  location.hash = '#pre-spin' + Date.now();
  let counter = 3;
  function countdown() {
    statusEl.textContent = `Preparing your reward experience... ${counter}`;
    if (counter === 0) {
      spinBtn.disabled = false;
      spinBtn.setAttribute('aria-disabled', 'false');
      statusEl.textContent = 'Ready! Press Spin Now.';
    } else {
      counter--;
      setTimeout(countdown, 1000);
    }
  }
  countdown();
});

spinBtn.addEventListener('click', () => {
  if (spinBtn.disabled) return;
  const prize = results[Math.floor(Math.random() * results.length)];
  resultEl.textContent = `Result: ${prize}`;
  nextEligibleAt = Date.now() + COOLDOWN_MS;
  localStorage.setItem('nextEligibleAt', nextEligibleAt.toString());
  spinBtn.disabled = true;
  spinBtn.setAttribute('aria-disabled', 'true');
  prepareBtn.style.display = 'none';
  updateUI();
});

setInterval(updateUI, 1000);
updateUI();
checkConsent();

// TODO: Replace AdSense pre-spin with Google Ad Manager (GAM) Rewarded:
// 1) Load GPT: <script async src="https://securepubads.g.doubleclick.net/tag/js/gpt.js"></script>
// 2) defineOutOfPageSlot('/NETWORK_CODE/game_spin_rewarded', googletag.enums.OutOfPageFormat.REWARDED)
// 3) On rewardedSlotGranted → call startSpin()
// This provides a GUARANTEED pre-spin ad experience.

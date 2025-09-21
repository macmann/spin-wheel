const COOLDOWN_MS = 2 * 60 * 60 * 1000; // two hours
const results = ['10 bonus points', 'Editorial shout-out', 'Try again tomorrow', '50 bonus points'];

const consentBanner = document.getElementById('consent-banner');
const acceptBtn = document.getElementById('accept-consent');
const prepareBtn = document.getElementById('prepare-btn');
const spinBtn = document.getElementById('spin-btn');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const adDemo = document.getElementById('ad-demo');
const navToggle = document.querySelector('.nav-toggle');
const navList = document.getElementById('primary-nav');
const yearEl = document.getElementById('year');
const contactForm = document.querySelector('.contact-form');

function readStorage(key) {
  try {
    return window.localStorage?.getItem(key) ?? null;
  } catch (error) {
    console.debug('Storage read skipped', error);
    return null;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage?.setItem(key, value);
  } catch (error) {
    console.debug('Storage write skipped', error);
  }
}

let nextEligibleAt = parseInt(readStorage('nextEligibleAt') || '0', 10);

if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}

if (navToggle && navList) {
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    navList.classList.toggle('nav-open', !expanded);
  });

  navList.addEventListener('click', (event) => {
    const link = event.target instanceof HTMLElement ? event.target.closest('a') : null;
    if (link) {
      navToggle.setAttribute('aria-expanded', 'false');
      navList.classList.remove('nav-open');
    }
  });

  document.addEventListener('click', (event) => {
    if (!navList.contains(event.target) && !navToggle.contains(event.target)) {
      navToggle.setAttribute('aria-expanded', 'false');
      navList.classList.remove('nav-open');
    }
  });
}

if (contactForm) {
  const response = document.createElement('p');
  response.className = 'form-response';
  response.setAttribute('aria-live', 'polite');
  contactForm.append(response);

  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    response.textContent = 'Thank you for reaching out. A specialist will contact you within one business day.';
    contactForm.reset();
  });
}

function toggleAdVisibility(show) {
  if (adDemo) {
    adDemo.dataset.visible = show ? 'true' : 'false';
    adDemo.setAttribute('aria-hidden', show ? 'false' : 'true');
  }
}

toggleAdVisibility(false);

function initAdsense() {
  window.adsbygoogle = window.adsbygoogle || [];

  const env = window.ENV || {};
  const client = env.ADSENSE_CLIENT_ID || readStorage('adsenseClientId');
  const mobile = env.AD_SLOT_MOBILE_ID || readStorage('adSlotMobileId');
  const desktop = env.AD_SLOT_DESKTOP_ID || readStorage('adSlotDesktopId');
  let ready = false;

  if (client) {
    if (!window.__adsenseScriptLoaded) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
      window.__adsenseScriptLoaded = true;
    }

    const mobileIns = adDemo?.querySelector('ins.mobile');
    const desktopIns = adDemo?.querySelector('ins.desktop');

    if (mobileIns && mobile) {
      mobileIns.setAttribute('data-ad-client', client);
      mobileIns.setAttribute('data-ad-slot', mobile);
    }

    if (desktopIns && desktop) {
      desktopIns.setAttribute('data-ad-client', client);
      desktopIns.setAttribute('data-ad-slot', desktop);
    }

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      console.warn('AdSense push rejected', error);
    }

    ready = true;
  } else if (window.__adsenseScriptLoaded) {
    ready = true;
  }

  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch (error) {
    console.debug('AdSense auto push skipped', error);
  }

  return ready;
}

function checkConsent() {
  if (readStorage('consentAccepted')) {
    if (consentBanner) {
      consentBanner.style.display = 'none';
    }
    const ready = initAdsense();
    toggleAdVisibility(ready);
  } else {
    toggleAdVisibility(false);
  }
}

acceptBtn?.addEventListener('click', () => {
  writeStorage('consentAccepted', 'true');
  if (consentBanner) {
    consentBanner.style.display = 'none';
  }
  const ready = initAdsense();
  toggleAdVisibility(ready);
});

function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((total % 3600) / 60).toString().padStart(2, '0');
  const seconds = (total % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function updateUI() {
  const now = Date.now();
  if (now < nextEligibleAt) {
    const remaining = nextEligibleAt - now;
    if (statusEl) {
      statusEl.textContent = `Next spin available in ${formatDuration(remaining)}.`;
    }
    if (prepareBtn) {
      prepareBtn.disabled = true;
      prepareBtn.setAttribute('aria-disabled', 'true');
    }
    if (spinBtn) {
      spinBtn.disabled = true;
      spinBtn.setAttribute('aria-disabled', 'true');
    }
  } else {
    if (statusEl) {
      statusEl.textContent = 'Ready to prepare today\'s reward experience.';
    }
    if (prepareBtn) {
      prepareBtn.disabled = false;
      prepareBtn.setAttribute('aria-disabled', 'false');
    }
    if (spinBtn) {
      spinBtn.disabled = true;
      spinBtn.setAttribute('aria-disabled', 'true');
    }
  }
}

prepareBtn?.addEventListener('click', () => {
  prepareBtn.disabled = true;
  prepareBtn.setAttribute('aria-disabled', 'true');

  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch (error) {
    console.debug('AdSense request skipped', error);
  }

  let counter = 3;
  const runCountdown = () => {
    if (statusEl) {
      statusEl.textContent = `Preparing your spin experience… ${counter}`;
    }
    if (counter === 0) {
      if (spinBtn) {
        spinBtn.disabled = false;
        spinBtn.setAttribute('aria-disabled', 'false');
      }
      if (statusEl) {
        statusEl.textContent = 'All set. Press “Spin now” to continue.';
      }
    } else {
      counter -= 1;
      setTimeout(runCountdown, 1000);
    }
  };

  runCountdown();
});

spinBtn?.addEventListener('click', () => {
  if (spinBtn.disabled) {
    return;
  }

  const prize = results[Math.floor(Math.random() * results.length)];
  if (resultEl) {
    resultEl.textContent = `Result: ${prize}`;
  }

  nextEligibleAt = Date.now() + COOLDOWN_MS;
  writeStorage('nextEligibleAt', String(nextEligibleAt));

  spinBtn.disabled = true;
  spinBtn.setAttribute('aria-disabled', 'true');
  if (prepareBtn) {
    prepareBtn.disabled = true;
    prepareBtn.setAttribute('aria-disabled', 'true');
  }

  updateUI();
});

setInterval(updateUI, 1000);
updateUI();
checkConsent();

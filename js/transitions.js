(function () {
  const STORAGE_KEY = 'eventease_transition_state';
  const ROUTES = new Set(['index.html', 'about.html', 'services.html', 'contact.html', 'login.html', 'register.html', 'app.html', 'settings.html']);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function readState() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function writeState(state) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      // Ignore storage failures in private browsing or locked environments.
    }
  }

  function clearState() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      // Ignore storage failures.
    }
  }

  function getRectFromElement(element) {
    if (!element) {
      return {
        left: 0,
        top: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }

    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      width: Math.max(rect.width, 120),
      height: Math.max(rect.height, 52),
    };
  }

  function buildShell(originElement, direction) {
    const shell = document.createElement('div');
    shell.className = 'page-transition-shell ' + direction;

    const rect = getRectFromElement(originElement);
    const radius = originElement
      ? getComputedStyle(originElement).borderRadius || '24px'
      : '0px';

    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;
    shell.style.setProperty('--origin-x', originX + 'px');
    shell.style.setProperty('--origin-y', originY + 'px');

    if (direction === 'reverse') {
      shell.style.left = '0';
      shell.style.top = '0';
      shell.style.width = '100vw';
      shell.style.height = '100vh';
      shell.style.borderRadius = '0px';
    } else {
      shell.style.left = rect.left + 'px';
      shell.style.top = rect.top + 'px';
      shell.style.width = rect.width + 'px';
      shell.style.height = rect.height + 'px';
      shell.style.borderRadius = radius;
    }

    shell.setAttribute('aria-hidden', 'true');
    document.body.appendChild(shell);

    requestAnimationFrame(function () {
      shell.classList.add('is-active');

      if (direction === 'reverse') {
        shell.style.left = rect.left + 'px';
        shell.style.top = rect.top + 'px';
        shell.style.width = rect.width + 'px';
        shell.style.height = rect.height + 'px';
        shell.style.borderRadius = radius;
      } else {
        shell.style.left = '0';
        shell.style.top = '0';
        shell.style.width = '100vw';
        shell.style.height = '100vh';
        shell.style.borderRadius = '0px';
      }
    });

    return shell;
  }

  function beginTransition(targetUrl, originElement, direction) {
    if (!targetUrl) {
      return;
    }

    if (reduced || !document.body) {
      window.location.href = targetUrl;
      return;
    }

    const shell = buildShell(originElement, direction);
    document.body.classList.add('page-transitioning');

    writeState({
      direction,
      targetUrl,
      pageType: targetUrl.includes('app.html') ? 'dashboard' : 'auth',
    });

    window.setTimeout(function () {
      window.location.href = targetUrl;
    }, 420);

    window.setTimeout(function () {
      shell.remove();
    }, 900);
  }

  function applyEntryAnimation() {
    const state = readState();
    if (!state) {
      return;
    }

    clearState();

    document.body.classList.add(
      'page-entering',
      state.direction === 'reverse' ? 'page-reverse' : 'page-forward'
    );

    const content = document.querySelector('.auth-shell, .app-main, .hero, .page-hero');
    if (content) {
      content.classList.add('transition-content');
    }
  }

  function bindLinks() {
    document.querySelectorAll('a[href]').forEach(function (link) {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }

      if (link.target === '_blank' || link.hasAttribute('download')) {
        return;
      }

      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) {
          return;
        }

        const filename = url.pathname.split('/').pop();
        if (!ROUTES.has(filename)) {
          return;
        }

        const currentName = window.location.pathname.split('/').pop();
        if (filename === currentName && url.search === window.location.search && url.hash === window.location.hash) {
          return;
        }

        link.addEventListener('click', function (event) {
          if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
          }

          event.preventDefault();
          const direction = filename === 'index.html' ? 'reverse' : (filename === currentName ? 'reverse' : 'forward');
          beginTransition(url.href, link, direction);
        });
      } catch (error) {
        // Ignore malformed URLs.
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    applyEntryAnimation();
    bindLinks();
  });

  window.EventEaseTransitions = {
    navigate: beginTransition,
    reduced,
  };
})();

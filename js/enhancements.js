/* EventEase enhancements: onboarding, offline badge, budget alerts, undo delete,
   empty states, install prompt, keyboard shortcuts, print report, RSVP inbox merge, templates */
(function () {
  const S = window.EventEaseStore;
  const ONBOARD_KEY = 'eventease_onboarded_v1';
  const UNDO_MS = 6000;

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function toast(msg, opts) {
    opts = opts || {};
    const d = document.createElement('div');
    d.className = 'toast ee-toast' + (opts.action ? ' ee-toast-action' : '');
    d.setAttribute('role', 'status');
    d.setAttribute('aria-live', 'polite');
    const span = document.createElement('span');
    span.textContent = msg;
    d.appendChild(span);
    if (opts.action && opts.onAction) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ee-toast-btn';
      b.textContent = opts.action;
      b.onclick = () => {
        opts.onAction();
        d.remove();
      };
      d.appendChild(b);
    }
    document.body.appendChild(d);
    setTimeout(() => {
      try {
        d.remove();
      } catch (e) {}
    }, opts.ms || 4000);
    return d;
  }

  /* ---------- Offline badge ---------- */
  function offlineBadge() {
    let el = document.getElementById('eeOfflineBadge');
    if (!el) {
      el = document.createElement('div');
      el.id = 'eeOfflineBadge';
      el.className = 'ee-offline-badge';
      el.hidden = true;
      el.textContent = 'Offline — changes stay on this device';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    const sync = () => {
      el.hidden = navigator.onLine;
    };
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    sync();
  }

  /* ---------- Install prompt ---------- */
  function installPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      window.__eeInstall = e;
      if (sessionStorage.getItem('ee_install_dismissed')) return;
      setTimeout(() => {
        if (!window.__eeInstall) return;
        toast('Install EventEase on your home screen?', {
          action: 'Install',
          ms: 12000,
          onAction: async () => {
            try {
              window.__eeInstall.prompt();
              await window.__eeInstall.userChoice;
            } catch (x) {}
            window.__eeInstall = null;
          }
        });
        setTimeout(() => sessionStorage.setItem('ee_install_dismissed', '1'), 1000);
      }, 8000);
    });
  }

  /* ---------- Onboarding ---------- */
  function onboarding() {
    if (!S || !S.currentUser()) return;
    if (localStorage.getItem(ONBOARD_KEY)) return;
    if (S.scoped('events').length > 0) {
      localStorage.setItem(ONBOARD_KEY, '1');
      return;
    }
    const w = document.createElement('div');
    w.className = 'ee-onboard-overlay';
    w.innerHTML =
      '<div class="ee-onboard-card" role="dialog" aria-labelledby="eeOnboardTitle">' +
      '<p class="eyebrow">WELCOME</p>' +
      '<h2 id="eeOnboardTitle">Plan your first event in 3 steps</h2>' +
      '<ol class="ee-onboard-steps">' +
      '<li><strong>Create an event</strong> — name, date, budget</li>' +
      '<li><strong>Add guests</strong> — share an invite & track RSVPs</li>' +
      '<li><strong>Track budget & tasks</strong> — stay on plan</li>' +
      '</ol>' +
      '<div class="ee-onboard-actions">' +
      '<button type="button" class="btn btn-primary" id="eeOnboardGo">Create first event</button>' +
      '<button type="button" class="btn" id="eeOnboardSkip">Skip for now</button>' +
      '</div></div>';
    document.body.appendChild(w);
    const close = () => {
      localStorage.setItem(ONBOARD_KEY, '1');
      w.remove();
    };
    document.getElementById('eeOnboardSkip').onclick = close;
    document.getElementById('eeOnboardGo').onclick = () => {
      close();
      document.querySelector('[data-view-target="events"]')?.click();
      setTimeout(() => {
        const name = document.getElementById('eventName');
        if (name) {
          name.focus();
          name.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    };
  }

  /* ---------- Merge RSVP inbox ---------- */
  function mergeRsvps() {
    if (!S || !S.currentUser()) return;
    let box = [];
    try {
      box = JSON.parse(localStorage.getItem('eventease_rsvp_inbox') || '[]');
    } catch (e) {
      return;
    }
    if (!Array.isArray(box) || !box.length) return;
    const email = S.currentUser().email;
    const events = S.scoped('events');
    let applied = 0;
    const remain = [];
    box.forEach((r) => {
      if (r.hostEmail && r.hostEmail !== email) {
        remain.push(r);
        return;
      }
      const ev =
        (r.eventId && events.find((e) => e.id === r.eventId)) ||
        events.find((e) => (e.name || '') === (r.eventName || ''));
      if (!ev) {
        remain.push(r);
        return;
      }
      const exists = S.scoped('guests').some(
        (g) => g.eventId === ev.id && (g.name || '').toLowerCase() === (r.name || '').toLowerCase()
      );
      if (!exists) {
        S.add('guests', {
          eventId: ev.id,
          name: r.name,
          email: r.email || '',
          status: r.status || 'Accepted',
          fromRsvp: true
        });
        applied++;
      }
    });
    try {
      localStorage.setItem('eventease_rsvp_inbox', JSON.stringify(remain));
    } catch (e) {}
    if (applied) {
      toast(applied + ' RSVP' + (applied > 1 ? 's' : '') + ' added from invitations');
      document.dispatchEvent(new Event('ee:render'));
    }
  }

  /* ---------- Budget alerts ---------- */
  function budgetAlerts() {
    if (!S || !S.currentUser()) return;
    const host = document.getElementById('budgetAlertHost') || document.querySelector('.app-main');
    if (!host) return;
    let bar = document.getElementById('eeBudgetAlert');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'eeBudgetAlert';
      bar.className = 'ee-budget-alert';
      bar.setAttribute('role', 'alert');
      bar.hidden = true;
      host.insertBefore(bar, host.firstChild);
    }
    const events = S.scoped('events');
    const expenses = S.scoped('expenses');
    const over = [];
    const warn = [];
    events.forEach((ev) => {
      const planned = Number(ev.budget) || 0;
      if (planned <= 0) return;
      const spent = expenses
        .filter((x) => x.eventId === ev.id)
        .reduce((s, x) => s + (Number(x.amount) || 0), 0);
      const pct = spent / planned;
      if (pct >= 1) over.push({ name: ev.name, pct, spent, planned });
      else if (pct >= 0.8) warn.push({ name: ev.name, pct, spent, planned });
    });
    if (!over.length && !warn.length) {
      bar.hidden = true;
      bar.textContent = '';
      return;
    }
    bar.hidden = false;
    if (over.length) {
      bar.className = 'ee-budget-alert ee-budget-alert-over';
      bar.textContent =
        'Budget exceeded: ' +
        over.map((x) => x.name + ' (' + Math.round(x.pct * 100) + '%)').join(', ');
    } else {
      bar.className = 'ee-budget-alert ee-budget-alert-warn';
      bar.textContent =
        'Budget warning (over 80%): ' +
        warn.map((x) => x.name + ' (' + Math.round(x.pct * 100) + '%)').join(', ');
    }
  }

  /* ---------- Undo delete (hooks window.EEUndo) ---------- */
  window.EEUndo = {
    last: null,
    capture(eventId) {
      if (!S) return null;
      const ev = S.db().events.find((e) => e.id === eventId);
      if (!ev) return null;
      const snap = {
        event: { ...ev },
        guests: S.db().guests.filter((g) => g.eventId === eventId).map((x) => ({ ...x })),
        tasks: S.db().tasks.filter((g) => g.eventId === eventId).map((x) => ({ ...x })),
        expenses: S.db().expenses.filter((g) => g.eventId === eventId).map((x) => ({ ...x })),
        venues: S.db().venues.filter((g) => g.eventId === eventId).map((x) => ({ ...x })),
        schedule: (S.db().schedule || []).filter((g) => g.eventId === eventId).map((x) => ({ ...x })),
        reminders: (S.db().reminders || []).filter((g) => g.eventId === eventId).map((x) => ({ ...x }))
      };
      this.last = snap;
      return snap;
    },
    restore() {
      if (!this.last || !S) return;
      const d = S.db();
      const s = this.last;
      const id = s.event && s.event.id;
      if (id && d.events.some((e) => e.id === id)) {
        this.last = null;
        toast('Event already present');
        return;
      }
      d.events.push(s.event);
      ['guests', 'tasks', 'expenses', 'venues', 'schedule', 'reminders'].forEach((k) => {
        if (!d[k]) d[k] = [];
        (s[k] || []).forEach((row) => {
          if (!d[k].some((x) => x.id === row.id)) d[k].push(row);
        });
      });
      S.save(d);
      this.last = null;
      document.dispatchEvent(new Event('ee:render'));
      toast('Event restored');
    }
  };

  /* ---------- Keyboard shortcuts ---------- */
  function shortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'n' || e.key === 'N') {
        document.querySelector('[data-view-target="events"]')?.click();
        setTimeout(() => document.getElementById('eventName')?.focus(), 200);
      }
      if (e.key === '/') {
        e.preventDefault();
        const s = document.getElementById('eventSearch') || document.querySelector('input[type="search"]');
        if (s) s.focus();
      }
    });
  }

  /* ---------- Print / summary report ---------- */
  window.EEReport = {
    print(eventId) {
      if (!S) return;
      const ev = S.scoped('events').find((e) => e.id === eventId);
      if (!ev) return toast('Event not found');
      const guests = S.scoped('guests').filter((g) => g.eventId === eventId);
      const tasks = S.scoped('tasks').filter((t) => t.eventId === eventId);
      const expenses = S.scoped('expenses').filter((x) => x.eventId === eventId);
      const spent = expenses.reduce((s, x) => s + (Number(x.amount) || 0), 0);
      const planned = Number(ev.budget) || 0;
      const rem = planned - spent;
      const w = window.open('', '_blank');
      if (!w) return toast('Allow pop-ups to print');
      const rowsG = guests
        .map(
          (g) =>
            '<tr><td>' +
            escHtml(g.name) +
            '</td><td>' +
            escHtml(g.status) +
            '</td><td>' +
            escHtml(g.email) +
            '</td></tr>'
        )
        .join('');
      const rowsT = tasks
        .map(
          (tk) =>
            '<tr><td>' +
            escHtml(tk.title) +
            '</td><td>' +
            escHtml(tk.priority) +
            '</td><td>' +
            escHtml(tk.status) +
            '</td></tr>'
        )
        .join('');
      const rowsE = expenses
        .map(
          (x) =>
            '<tr><td>' +
            escHtml(x.title || x.item) +
            '</td><td>₹' +
            (Number(x.amount) || 0).toLocaleString('en-IN') +
            '</td></tr>'
        )
        .join('');
      w.document.write(
        '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' +
          escHtml(ev.name || 'Event') +
          ' — summary</title><style>body{font-family:system-ui;padding:24px;color:#1a0a30}h1{margin:0 0 8px}table{border-collapse:collapse;width:100%;margin:12px 0}td,th{border:1px solid #ccc;padding:8px;text-align:left}section{margin:20px 0}</style></head><body>' +
          '<h1>' +
          escHtml(ev.name) +
          '</h1><p>' +
          escHtml(ev.type) +
          ' · ' +
          escHtml(ev.date) +
          ' · ' +
          escHtml(ev.location) +
          '</p>' +
          '<section><h2>Budget</h2><p>Planned: ₹' +
          planned.toLocaleString('en-IN') +
          ' · Spent: ₹' +
          spent.toLocaleString('en-IN') +
          ' · ' +
          (rem >= 0
            ? 'Remaining: ₹' + rem.toLocaleString('en-IN')
            : 'Over budget by: ₹' + Math.abs(rem).toLocaleString('en-IN')) +
          '</p></section>' +
          '<section><h2>Guests (' +
          guests.length +
          ')</h2><table><tr><th>Name</th><th>Status</th><th>Email</th></tr>' +
          rowsG +
          '</table></section>' +
          '<section><h2>Tasks (' +
          tasks.length +
          ')</h2><table><tr><th>Task</th><th>Priority</th><th>Status</th></tr>' +
          rowsT +
          '</table></section>' +
          '<section><h2>Expenses</h2><table><tr><th>Item</th><th>Amount</th></tr>' +
          rowsE +
          '</table></section>' +
          '<script>window.print()<\\/script></body></html>'
      );
      w.document.close();
    }
  };

  /* ---------- Templates on Events view ---------- */
  function templatesBar() {
    const form = document.getElementById('eventForm') || document.querySelector('.event-form');
    if (!form || document.getElementById('eeTemplates')) return;
    const bar = document.createElement('div');
    bar.id = 'eeTemplates';
    bar.className = 'ee-templates';
    bar.innerHTML =
      '<span class="ee-templates-label">Quick start:</span>' +
      ['Birthday', 'Wedding', 'College fest', 'Conference', 'Party']
        .map((t) => '<button type="button" class="btn btn-small" data-template="' + t + '">' + t + '</button>')
        .join('');
    form.parentNode.insertBefore(bar, form);
    bar.querySelectorAll('[data-template]').forEach((btn) => {
      btn.onclick = () => {
        const t = btn.getAttribute('data-template');
        const name = document.getElementById('eventName');
        const type = document.getElementById('eventType') || document.querySelector('#eventForm select');
        const budget = document.getElementById('eventBudget');
        if (name && !name.value) name.value = t;
        if (type) {
          const opt = [...type.options].find((o) => o.value.toLowerCase().includes(t.split(' ')[0].toLowerCase()) || o.text.toLowerCase().includes(t.split(' ')[0].toLowerCase()));
          if (opt) type.value = opt.value;
        }
        if (budget && !budget.value) {
          const defaults = { Birthday: 25000, Wedding: 500000, 'College fest': 200000, Conference: 150000, Party: 40000 };
          budget.value = defaults[t] || 30000;
        }
        name?.focus();
        toast('Template applied — fill date & location, then create');
      };
    });
  }

  /* ---------- Wire delete undo into existing flow via capture ---------- */
  document.addEventListener(
    'click',
    (e) => {
      const b = e.target.closest('[data-delete-event]');
      if (!b || !window.EEUndo) return;
      const id = b.dataset.deleteEvent;
      if (id) window.EEUndo.capture(id);
    },
    true
  );

  /* ---------- Init ---------- */
  function init() {
    offlineBadge();
    installPrompt();
    shortcuts();
    if (document.body.classList.contains('app-page') || location.pathname.includes('app')) {
      onboarding();
      mergeRsvps();
      budgetAlerts();
      templatesBar();
      document.addEventListener('ee:render', () => {
        budgetAlerts();
        templatesBar();
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

(function () {

    const S = window.EventEaseStore;

    const user = S.currentUser();

    // Not logged in -> login page
    if (!user) {
        window.location.replace('login.html');
        return;
    }

    const $ = id => document.getElementById(id);

    /*
     * =====================================================
     * USER INFORMATION
     * =====================================================
     */

    const firstName =
        user.name.trim().split(/\s+/)[0] || 'User';

    const initial =
        user.name.trim().charAt(0).toUpperCase() || 'E';

    if ($('userName')) {
        $('userName').textContent = user.name;
    }

    if ($('welcomeTitle')) {
        $('welcomeTitle').textContent =
            'Welcome, ' + firstName + '.';
    }

    if ($('userAvatar')) {
        $('userAvatar').textContent = initial;
    }

    if ($('dropdownAvatar')) {
        $('dropdownAvatar').textContent = initial;
    }

    if ($('dropdownUserName')) {
        $('dropdownUserName').textContent = user.name;
    }


    /*
     * =====================================================
     * ACCOUNT DROPDOWN
     * =====================================================
     */

    const accountMenu =
        $('accountMenu');

    const accountTrigger =
        $('accountTrigger');

    const accountDropdown =
        $('accountDropdown');


    function closeAccountMenu() {

        if (!accountMenu) return;

        accountMenu.classList.remove('open');

        if (accountTrigger) {
            accountTrigger.setAttribute(
                'aria-expanded',
                'false'
            );
        }

        if (accountDropdown) {
            accountDropdown.setAttribute(
                'aria-hidden',
                'true'
            );
        }
    }


    function toggleAccountMenu(event) {

        event.preventDefault();
        event.stopPropagation();

        if (!accountMenu) return;

        const isOpen =
            accountMenu.classList.toggle('open');

        if (accountTrigger) {
            accountTrigger.setAttribute(
                'aria-expanded',
                String(isOpen)
            );
        }

        if (accountDropdown) {
            accountDropdown.setAttribute(
                'aria-hidden',
                String(!isOpen)
            );
        }
    }


    if (accountTrigger) {

        accountTrigger.addEventListener(
            'click',
            toggleAccountMenu
        );

    }


    /*
     * Clicking outside closes the menu.
     */

    document.addEventListener(
        'click',
        function (event) {

            if (
                accountMenu &&
                !accountMenu.contains(event.target)
            ) {
                closeAccountMenu();
            }

        }
    );


    /*
     * ESC closes the menu.
     */

    document.addEventListener(
        'keydown',
        function (event) {

            if (event.key === 'Escape') {
                closeAccountMenu();
            }

        }
    );


    /*
     * =====================================================
     * LOGOUT
     * =====================================================
     *
     * IMPORTANT:
     * ONLY #logoutBtn clears the session.
     */

    const logoutBtn =
        $('logoutBtn');

    if (logoutBtn) {

        logoutBtn.addEventListener(
            'click',
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                closeAccountMenu();

                S.clearSession();

                window.location.replace(
                    'index.html'
                );

            }
        );

    }

    /*
     * =====================================================
     * REST OF YOUR EXISTING APP.JS
     * =====================================================
     */

    let selectedEvent = null;
    window.EEApp = { select(id){ selectedEvent = id; render(); }, selected(){ return selectedEvent; } };

    function fmt(n) {
    return "₹" + Number(n || 0).toLocaleString("en-IN");
  }
  function events() {
    return S.scoped("events");
  }
  function buildAreaChart(values, colors) {
    const width = 300;
    const height = 120;
    const padding = 12;
    const maxVal = Math.max(1, ...values);
    const step = (width - padding * 2) / Math.max(1, values.length - 1);

    const points = values.map((value, index) => {
      const x = padding + index * step;
      const y = height - padding - (value / maxVal) * (height - padding * 2);
      return [x, y];
    });

    const line = points
      .map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`)
      .join(' ');

    const area = `${line} L ${points[points.length - 1][0]} ${height - padding} L ${points[0][0]} ${height - padding} Z`;

    const fills = colors
      .map((color, index) => {
        const start = index === 0 ? 0.12 : 0.45;
        return `<path d="${area}" fill="${color}" opacity="${start}" />`;
      })
      .join('');

    return `
      <defs>
        <linearGradient id="chartFillBudget" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#F171FF" stop-opacity="0.38"/>
          <stop offset="100%" stop-color="#F171FF" stop-opacity="0.05"/>
        </linearGradient>
        <linearGradient id="chartFillTasks" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#F171FF" stop-opacity="0.38"/>
          <stop offset="100%" stop-color="#F171FF" stop-opacity="0.05"/>
        </linearGradient>
        <linearGradient id="chartFillGuests" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#8785FF" stop-opacity="0.38"/>
          <stop offset="100%" stop-color="#8785FF" stop-opacity="0.05"/>
        </linearGradient>
      </defs>
      <path d="${area}" fill="url(#chartFill${colors[0].includes('F08A8C') ? 'Budget' : colors[0].includes('B65E8C') ? 'Tasks' : 'Guests'})" opacity="0.9"/>
      <path d="${line}" fill="none" stroke="${colors[0]}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${fills}
    `;
  }

  function renderCharts(ev, gu, ta, ex) {
    const totalBudget = ev.reduce((a, x) => a + (+x.budget || 0), 0);
    const spent = ex.reduce((a, x) => a + (+x.amount || 0), 0);
    const totalTasks = ta.length || 1;
    const tasksDone = ta.filter((x) => x.status === 'Completed').length;
    const totalGuests = gu.length || 1;
    const guestsAccepted = gu.filter((x) => x.status === 'Accepted').length;

    const budgetValues = [Math.min(spent, totalBudget || spent || 1), Math.max((totalBudget || 0) - spent, 0), Math.min(spent * 0.3, totalBudget || spent || 1)];
    const taskValues = [tasksDone, totalTasks - tasksDone, Math.max(totalTasks - tasksDone, 0) * 0.25];
    const guestValues = [guestsAccepted, totalGuests - guestsAccepted, Math.max(totalGuests - guestsAccepted, 0) * 0.2];

    $('budgetChartTitle').textContent = fmt(spent);
    $('taskChartTitle').textContent = `${tasksDone} / ${totalTasks}`;
    $('guestChartTitle').textContent = `${guestsAccepted} / ${totalGuests}`;

    $('budgetChartSvg').innerHTML = buildAreaChart(budgetValues, ['#F171FF', '#8785FF', '#270A57']);
    $('taskChartSvg').innerHTML = buildAreaChart(taskValues, ['#8785FF', '#F171FF', '#270A57']);
    $('guestChartSvg').innerHTML = buildAreaChart(guestValues, ['#8785FF', '#8785FF', '#270A57']);
  }

  function renderOverview(ev, gu, ta, ex) {
    const now = new Date();
    const upcoming = ev.filter(x => x.date && new Date(x.date) >= now && x.status !== 'Cancelled')
      .sort((a,b) => new Date(a.date) - new Date(b.date));
    const totalGuests = gu.reduce((a,x) => a + (+x.count || 1), 0);
    const planned = ev.reduce((a,x) => a + (+x.budget || 0), 0);
    const spent = ex.reduce((a,x) => a + (+x.amount || 0), 0);
    const done = ta.filter(x => x.status === 'Completed').length;
    const percent = ta.length ? Math.round(done / ta.length * 100) : 0;

    const set = (id, value) => { if ($(id)) $(id).textContent = value; };
    set('overviewEvents', ev.length);
    set('overviewUpcoming', upcoming.length);
    set('overviewGuests', totalGuests);
    set('overviewBudget', fmt(Math.max(0, planned - spent)));
    set('overviewTaskPercent', percent + '%');
    set('overviewTaskDone', done + ' completed');
    set('overviewTaskTotal', ta.length + ' total');
    set('overviewPlanned', fmt(planned));
    set('overviewSpent', fmt(spent));
    set('overviewRemaining', fmt(Math.max(0, planned - spent)));

    const bar = $('overviewTaskBar');
    if (bar) bar.style.width = percent + '%';

    const list = $('overviewEventsList');
    if (list) {
      list.innerHTML = upcoming.length ? upcoming.slice(0, 4).map(x => {
        const date = new Date(x.date);
        const formatted = Number.isNaN(date.getTime()) ? 'No date' : date.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
        return `<div class="overview-event-item" role="button" tabindex="0" data-ws-open="${x.id}" style="cursor:pointer"><div><strong>${esc(x.name)}</strong><span>${esc(x.type || 'Event')} · ${esc(x.location || 'Location not added')}</span></div><time>${formatted}</time></div>`;
      }).join('') : '<div class="empty empty-compact"><div class="empty-title">No upcoming events</div><p>Create an event to see it here.</p></div>';
    }
  }

  function render() {
    const ev = events(),
      gu = S.scoped("guests"),
      ta = S.scoped("tasks"),
      ex = S.scoped("expenses");
    $("statEvents").textContent = ev.length;
    $("statUpcoming").textContent = ev.filter(
      (x) => x.date && new Date(x.date) >= new Date() && x.status !== "Cancelled" && x.status !== "Archived",
    ).length;
    $("statGuests").textContent = gu.reduce((a, x) => a + (+x.count || 1), 0);
    const budget = ev.reduce((a, x) => a + (+x.budget || 0), 0),
      spent = ex.reduce((a, x) => a + (+x.amount || 0), 0);
    $("statBudget").textContent = fmt(Math.max(0, budget - spent));
    if ($("dashTotalBudget")) $("dashTotalBudget").textContent = fmt(budget);
    if ($("budgetUsed")) $("budgetUsed").textContent = fmt(spent);
    if ($("budgetRemaining")) $("budgetRemaining").textContent = fmt(Math.max(0, budget - spent));
    if ($("budgetBar")) $("budgetBar").style.width =
      (budget ? Math.min(100, (spent / budget) * 100) : 0) + "%";
    if (selectedEvent) {
      const sev = ev.filter((x) => x.id === selectedEvent);
      const sgu = gu.filter((x) => x.eventId === selectedEvent);
      const sta = ta.filter((x) => x.eventId === selectedEvent);
      const sex = ex.filter((x) => x.eventId === selectedEvent);
      renderCharts(sev, sgu, sta, sex);
    } else {
      renderCharts(ev, gu, ta, ex);
    }
    renderOverview(ev, gu, ta, ex);
    /* All Events is the default — only clear selection if the event was deleted */
    if (selectedEvent && !ev.some((x) => x.id === selectedEvent))
      selectedEvent = null;

    renderEvents(ev, gu, ta, ex);
    // Dashboard event selector (All Events default)
    const dsel = $("dashEventSelect");
    if (dsel) {
      const cur = selectedEvent || "";
      dsel.innerHTML =
        '<option value="">All Events</option>' +
        ev
          .filter((x) => x.status !== "Archived")
          .map(
            (x) =>
              '<option value="' +
              x.id +
              '"' +
              (x.id === cur ? " selected" : "") +
              ">" +
              esc(x.name) +
              "</option>",
          )
          .join("");
      dsel.value = cur;
    }
    const dlab = $("dashContextLabel");
    if (dlab) {
      if (selectedEvent) {
        const e = ev.find((x) => x.id === selectedEvent);
        dlab.textContent = e
          ? "Showing insights for " + e.name
          : "Showing insights for All Events";
      } else {
        dlab.textContent = "Showing insights for All Events";
      }
    }
    document.dispatchEvent(new Event('ee:render'));
  }
  const EV_ICON = (t) => {
    t = (t || "").toLowerCase();
    if (/wedding|marriage|engagement/.test(t)) return "💍";
    if (/birthday|bday/.test(t)) return "🎂";
    if (/conference|seminar|workshop|summit|corporate|meetup|hackathon/.test(t)) return "🎤";
    if (/college|fest|university/.test(t)) return "🎓";
    if (/party|celebration|anniversary/.test(t)) return "🎊";
    return "🎉";
  };
  const EV_COVER = (t) => {
    t = (t || "").toLowerCase();
    if (/wedding|marriage|engagement/.test(t)) return "cover-wedding";
    if (/birthday|bday/.test(t)) return "cover-birthday";
    if (/conference|seminar|workshop|summit|corporate|meetup|hackathon/.test(t)) return "cover-corporate";
    if (/college|fest|university/.test(t)) return "cover-college";
    if (/party|celebration|anniversary/.test(t)) return "cover-party";
    return "cover-default";
  };
  function renderEvents(ev, gu, ta, ex) {
    gu = gu || S.scoped("guests");
    ta = ta || S.scoped("tasks");
    ex = ex || S.scoped("expenses");
    const showArchived = $("eventsList").dataset.showArchived === "1";
    const archivedCount = ev.filter((x) => x.status === "Archived").length;
    const q = (($("eventsSearch") && $("eventsSearch").value) || "").trim().toLowerCase();
    const fStatus = ($("eventsFilterStatus") && $("eventsFilterStatus").value) || "";
    const fType = ($("eventsFilterType") && $("eventsFilterType").value) || "";
    const sort = ($("eventsSort") && $("eventsSort").value) || "date-asc";
    let visible = ev.filter((x) => showArchived || x.status !== "Archived");
    if (q) visible = visible.filter((x) => (x.name || "").toLowerCase().includes(q) || (x.location || "").toLowerCase().includes(q) || (x.type || "").toLowerCase().includes(q));
    if (fStatus) visible = visible.filter((x) => (x.status || "Planning") === fStatus);
    if (fType) visible = visible.filter((x) => (x.type || "").toLowerCase().includes(fType.toLowerCase()));
    visible = visible.slice().sort((a, b) => {
      if (sort === "name") return (a.name || "").localeCompare(b.name || "");
      if (sort === "budget") return (+b.budget || 0) - (+a.budget || 0);
      if (sort === "date-desc") return (b.date || "").localeCompare(a.date || "");
      return (a.date || "").localeCompare(b.date || "");
    });
    const toggleHtml =
      archivedCount > 0
        ? `<button type="button" class="tiny-btn ev-archived-toggle" id="toggleArchived">${showArchived ? "Hide" : "Show"} archived (${archivedCount})</button>`
        : "";
    $("eventsToggleWrap") && ($("eventsToggleWrap").innerHTML = toggleHtml);
    $("eventsList").innerHTML = visible.length
      ? `<div class="ev-grid">` +
        visible
          .map((x) => {
            const g = gu.filter((q) => q.eventId === x.id),
              t = ta.filter((q) => q.eventId === x.id),
              e = ex.filter((q) => q.eventId === x.id);
            const guestCount = x.guestTarget || g.length;
            const done = t.filter((q) => q.status === "Completed").length;
            const spent = e.reduce((a, q) => a + (+q.amount || 0), 0);
            const status = x.status || "Planning";
            const taskPct = t.length ? Math.round((done / t.length) * 100) : 0;
            const loc = x.location ? ` · 📍 ${esc(x.location)}` : "";
            const timeStr = x.time ? ` · ${esc(x.time)}${x.endTime ? " – " + esc(x.endTime) : ""}` : "";
            const dateLabel = x.date ? esc(window.EESettings ? EESettings.fmtDate(x.date + "T00:00") : x.date) : "No date";
            const budgetLabel = "₹" + (x.budget || 0).toLocaleString("en-IN");
            const spentLabel = spent ? " · spent ₹" + spent.toLocaleString("en-IN") : "";
            return `<article class="ev-card" data-event-id="${x.id}">
              <div class="ev-card-cover ${EV_COVER(x.type)}" role="img" aria-label="${esc(x.type || "Event")} cover">
                <span class="ev-card-cover-icon" aria-hidden="true">${EV_ICON(x.type)}</span>
                <span class="ev-card-type">${esc(x.type || "Event")}</span>
              </div>
              <div class="ev-card-body">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
                  <h3 class="ev-card-title">${esc(x.name)}</h3>
                  <span class="status-pill ${status.toLowerCase()}">${esc(status)}</span>
                </div>
                <div class="ev-card-meta">
                  <span>${dateLabel}${timeStr}</span>
                  ${x.location ? `<span>📍 ${esc(x.location)}</span>` : ""}
                </div>
                <div class="ev-card-stats">
                  <div class="ev-stat"><strong>${guestCount}</strong><span>Guests</span></div>
                  <div class="ev-stat"><strong>${done}/${t.length || 0}</strong><span>Tasks</span></div>
                  <div class="ev-stat"><strong>${budgetLabel}</strong><span>Budget</span></div>
                </div>
                <div class="ev-card-progress" aria-label="${taskPct}% tasks complete"><span style="width:${taskPct}%"></span></div>
                <div class="ev-card-actions">
                  <button type="button" class="btn btn-small btn-primary" data-ws-open="${x.id}">Open</button>
                  <button type="button" class="btn btn-small" data-ws-open="${x.id}" data-ws-tab="settings">Edit</button>
                  <button type="button" class="btn btn-small" data-share="${x.id}">Share</button>
                  <button type="button" class="btn btn-small" data-ws-open="${x.id}" data-ws-tab="guests">Guests</button>
                  <button type="button" class="btn btn-small danger-btn" data-delete-event="${x.id}">Delete</button>
                </div>
              </div>
            </article>`;
          })
          .join("") +
        `</div>`
      : `<div class="empty empty-events">
        <div class="empty-visual" aria-hidden="true">✦</div>
        <div class="empty-title">No events yet</div>
        <p>Create your first event to plan guests, tasks, venue and budget in one place.</p>
        <button type="button" class="btn btn-primary btn-small" id="emptyCreateEvent">+ Create Event</button>
      </div>`;
    if ($("toggleArchived"))
      $("toggleArchived").onclick = () => {
        $("eventsList").dataset.showArchived = showArchived ? "0" : "1";
        renderEvents(ev, gu, ta, ex);
      };
    if ($("emptyCreateEvent"))
      $("emptyCreateEvent").onclick = () => {
        if (typeof openEventModal === "function") openEventModal();
      };
    document.querySelectorAll("[data-select]").forEach(
      (b) =>
        (b.onclick = () => {
          selectedEvent = b.dataset.select;
          render();
        }),
    );
    /* delete handled by delegated listener */
  }
  function esc(v) {
    return String(v ?? "").replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[m],
    );
  }
  if ($("newEventBtn")) {
    $("newEventBtn").onclick = () => {
      setActiveView && setActiveView("events");
      if (typeof openEventModal === "function") openEventModal();
    };
  }

  if ($("eventForm")) {
    $("eventForm").onsubmit = (e) => {
      e.preventDefault();

      const name = $("eventName").value.trim();
      const type = $("eventType").value.trim() || "Party";
      const date = $("eventDate").value || "";
      const budget = Number($("eventBudget").value || 0);

      if (!name) {
        $("eventName").focus();
        alert("Please enter an event name.");
        return;
      }
      if (budget < 0) {
        alert("Budget cannot be negative.");
        $("eventBudget")?.focus();
        return;
      }
      if (date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const d = new Date(date + "T00:00:00");
        if (d < today && !confirm("This date is in the past. Create event anyway?")) {
          $("eventDate")?.focus();
          return;
        }
      }

      const location = ($("eventLocation") && $("eventLocation").value.trim()) || "";
      const created = S.add("events", {
        name,
        type,
        date,
        budget,
        location,
        status: "Planning",
      });

      if (window.EEFeatures) window.EEFeatures.afterCreate(created);
      selectedEvent = created.id;
      e.target.reset();
      if ($("eventType")) $("eventType").value = "Party";
      if (typeof closeEventModal === "function") closeEventModal();
      const toast = document.createElement("div");
      toast.className = "toast";
      toast.setAttribute("role", "status");
      toast.textContent = "Event created successfully.";
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3500);
      render();
    };
  }

  $("seedBtn").onclick = () => {
    if (events().length) return alert("You already have events.");
    const e = S.add("events", {
      name: "Annual College Fest",
      type: "Conference",
      date: "2026-10-12",
      budget: 85000,
      location: "Kozhikode",
      status: "Planning",
    });
    S.add("events", {
      name: "Friends Birthday",
      type: "Birthday",
      date: "2026-11-08",
      budget: 25000,
      location: "Calicut",
      status: "Planning",
    });
    S.add("guests", {
      name: "Aarav",
      status: "Accepted",
      count: 2,
      eventId: e.id,
    });
    S.add("guests", {
      name: "Sara",
      status: "Pending",
      count: 1,
      eventId: e.id,
    });
    S.add("tasks", {
      title: "Book venue",
      priority: "High",
      status: "Completed",
      eventId: e.id,
    });
    S.add("tasks", {
      title: "Send invitations",
      priority: "Medium",
      status: "Todo",
      eventId: e.id,
    });
    S.add("expenses", { name: "Venue advance", amount: 18000, eventId: e.id });
    render();
  };
  const viewButtons = document.querySelectorAll('[data-view-target]');
  const viewPanels = document.querySelectorAll('[data-view-panel]');

  function setActiveView(name) {
    viewButtons.forEach((button) => {
      const isActive = button.dataset.viewTarget === name;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
      // Keep top horizontal nav item visible on mobile
      if (isActive && button.classList.contains('nav-view-btn') && button.scrollIntoView) {
        try {
          button.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
        } catch (e) {
          button.scrollIntoView(false);
        }
      }
    });

    // Bottom nav (may be added after initial query — re-sync)
    document.querySelectorAll('.mb-nav-item').forEach((button) => {
      const isActive = button.dataset.viewTarget === name;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

    viewPanels.forEach((panel) => {
      panel.classList.toggle('active', panel.dataset.viewPanel === name);
    });

    // Body class for layout padding when bottom nav is present
    document.body.classList.toggle('has-mobile-nav', true);

    document.dispatchEvent(new CustomEvent('ee:view', { detail: name }));
  }

  const overviewNewEventBtn = $('overviewNewEventBtn');
  if (overviewNewEventBtn) {
    overviewNewEventBtn.addEventListener('click', () => {
      setActiveView('events');
      closeAccountMenu();
      setTimeout(() => { if (typeof openEventModal === 'function') openEventModal(); }, 80);
    });
  }

  viewButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      setActiveView(button.dataset.viewTarget);
      closeAccountMenu();
    });
  });
  document.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-view-target]');
    if (!btn) return;
    // Avoid double-handling nav buttons already bound
    if (btn.classList.contains('nav-view-btn') || btn.classList.contains('account-link') || btn.classList.contains('mb-nav-item')) return;
    event.preventDefault();
    setActiveView(btn.dataset.viewTarget);
    closeAccountMenu();
  });

  const homeBrand = $('homeBrand');
  if (homeBrand) homeBrand.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    setActiveView('overview');
    closeAccountMenu();
    window.scrollTo(0, 0);
  }, true);

  setActiveView('overview');

  Object.assign(window.EEApp, {
    setView: setActiveView,
    openWorkspace(id, tab) {
      selectedEvent = id;
      render();
      setActiveView('workspace');
      closeAccountMenu();
      document.dispatchEvent(new CustomEvent('ee:ws-open', { detail: { id, tab: tab || 'overview' } }));
    },
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ws-open]');
    if (b) {
      e.preventDefault();
      EEApp.openWorkspace(b.dataset.wsOpen, b.dataset.wsTab);
    }
  });

  document.addEventListener("click", (e) => {
    const pb = e.target.closest("[data-print-event]");
    if (pb && window.EEReport) { EEReport.print(pb.dataset.printEvent); }
  });
  /* Delegated delete so Dashboard cards and Events cards both work */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-delete-event]');
    if (!b) return;
    e.preventDefault();
    const eventId = b.dataset.deleteEvent;
    const evObj = events().find((x) => x.id === eventId);
    const name = evObj ? evObj.name : "this event";
    const w = document.createElement("div");
    w.className = "set-modal";
    w.innerHTML = '<div class="set-dialog" role="alertdialog" aria-modal="true"><h3>Delete this event?</h3><p>Delete "' + esc(name) + '" and all associated guests, tasks, expenses, venue, schedule and reminders? You can Undo for a few seconds.</p><div class="set-links"><button type="button" class="btn" data-x>Cancel</button><button type="button" class="btn btn-dark" data-ok>Delete Event</button></div></div>';
    const close = () => w.remove();
    w.querySelector("[data-x]").onclick = close;
    w.onclick = (ev) => { if (ev.target === w) close(); };
    w.querySelector("[data-ok]").onclick = () => {
      close();
      if (window.EEUndo) EEUndo.capture(eventId);
      ["guests", "tasks", "expenses", "venues", "schedule", "reminders"].forEach((list) => {
        S.scoped(list).filter((x) => x.eventId === eventId).forEach((x) => S.remove(list, x.id));
      });
      S.remove("events", eventId);
      if (selectedEvent === eventId) selectedEvent = null;
      const toast = document.createElement("div");
      toast.className = "toast ee-toast-action";
      toast.setAttribute("role", "status");
      toast.innerHTML = "<span>Event deleted.</span>";
      const undoBtn = document.createElement("button");
      undoBtn.type = "button";
      undoBtn.className = "ee-toast-btn";
      undoBtn.textContent = "Undo";
      undoBtn.onclick = () => {
        if (window.EEUndo) EEUndo.restore();
        toast.remove();
      };
      toast.appendChild(undoBtn);
      document.body.appendChild(toast);
      setTimeout(() => { try { toast.remove(); } catch (e) {} }, 6000);
      render();
    };
    document.body.appendChild(w);
  });

  ["eventsSearch", "eventsFilterStatus", "eventsFilterType", "eventsSort"].forEach((id) => {
    const el = $(id);
    if (el) el.addEventListener(id === "eventsSearch" ? "input" : "change", () => renderEvents(events()));
  });
  function openEventModal() {
    const modal = $("eventCreateModal");
    if (!modal) return;
    modal.hidden = false;
    modal.classList.add("is-open");
    setTimeout(() => $("eventName")?.focus(), 50);
  }
  function closeEventModal() {
    const modal = $("eventCreateModal");
    if (!modal) return;
    modal.classList.remove("is-open");
    setTimeout(() => { modal.hidden = true; }, 200);
  }
  if ($("eventsCreateFocus")) {
    $("eventsCreateFocus").onclick = openEventModal;
  }
  if ($("eventModalClose")) $("eventModalClose").onclick = closeEventModal;
  if ($("eventModalCancel")) $("eventModalCancel").onclick = closeEventModal;
  if ($("eventCreateModal")) {
    $("eventCreateModal").addEventListener("click", (e) => {
      if (e.target === $("eventCreateModal")) closeEventModal();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && $("eventCreateModal") && !$("eventCreateModal").hidden) closeEventModal();
  });
  if ($("newEventBtn")) {
    $("newEventBtn").onclick = () => {
      setActiveView("events");
      setTimeout(() => { if (typeof openEventModal === "function") openEventModal(); }, 80);
    };
  }

  if ($("dashEventSelect")) {
    $("dashEventSelect").addEventListener("change", function () {
      selectedEvent = this.value || null;
      render();
    });
  }

  render();
})();

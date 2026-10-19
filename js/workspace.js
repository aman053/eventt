/* EventEase per-event workspace. Opened via "Open Event"; everything here is scoped to one event only. */
(function () {
  const S = window.EventEaseStore;
  if (!S) return;
  const $ = (id) => document.getElementById(id);
  const root = $("wsOverview");
  if (!root) return;
  const T = (k) => (window.EEI18n ? EEI18n.t(k) : k);
  const fmtD = (d) => (window.EESettings ? EESettings.fmtDate(d) : d);
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m],
    );
  const EV_ICON = (t) => {
    t = (t || "").toLowerCase();
    if (/wedding|marriage|engagement/.test(t)) return "💍";
    if (/birthday|bday/.test(t)) return "🎂";
    if (/conference|seminar|workshop|summit|corporate|meetup|hackathon/.test(t)) return "🎤";
    if (/college|fest|university/.test(t)) return "🎓";
    return "🎉";
  };
  let openId = null;

  const ev = () => S.scoped("events").find((e) => e.id === openId);
  const guests = () => S.scoped("guests").filter((g) => g.eventId === openId);
  const tasks = () => S.scoped("tasks").filter((t) => t.eventId === openId);
  const expenses = () => S.scoped("expenses").filter((x) => x.eventId === openId);
  const venue = () => S.scoped("venues").find((v) => v.eventId === openId);
  const schedule = () =>
    S.scoped("schedule")
      .filter((s) => s.eventId === openId)
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  function toast(m) {
    const d = document.createElement("div");
    d.className = "toast";
    d.setAttribute("role", "status");
    d.textContent = m;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 3500);
  }
  function confirmBox(title, msg, ok, fn) {
    const w = document.createElement("div");
    w.className = "set-modal";
    w.innerHTML =
      '<div class="set-dialog" role="alertdialog" aria-modal="true" aria-labelledby="wsCT"><h3 id="wsCT"></h3><p></p><div class="set-links"><button type="button" class="btn" data-x>Cancel</button><button type="button" class="btn btn-primary" data-ok></button></div></div>';
    w.querySelector("h3").textContent = title;
    w.querySelector("p").textContent = msg;
    w.querySelector("[data-ok]").textContent = ok;
    const close = () => {
      w.remove();
      document.removeEventListener("keydown", esc);
    };
    const esc = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", esc);
    w.querySelector("[data-x]").onclick = close;
    w.onclick = (e) => {
      if (e.target === w) close();
    };
    w.querySelector("[data-ok]").onclick = () => {
      close();
      fn();
    };
    document.body.appendChild(w);
    w.querySelector("[data-x]").focus();
  }

  /* ---------- header + tab switching ---------- */
  function header() {
    const e = ev();
    if (!e) return;
    $("wsIcon").textContent = EV_ICON(e.type);
    $("wsName").textContent = e.name;
    $("wsMeta").textContent =
      [e.date ? fmtD(e.date + "T00:00") : "No date", e.type || "Event", e.location || ""]
        .filter(Boolean)
        .join(" · ");
    const p = $("wsStatusPill");
    p.textContent = e.status || "Planning";
    p.className = "pill ev-status ev-status-" + (e.status || "Planning").toLowerCase();
  }
  function showTab(name) {
    document.querySelectorAll("#wsTabs [data-ws-target]").forEach((b) => {
      b.classList.toggle("active", b.dataset.wsTarget === name);
      b.setAttribute("aria-pressed", String(b.dataset.wsTarget === name));
    });
    document.querySelectorAll("#wsPanels .ws-panel").forEach((p) => {
      p.classList.toggle("active", p.dataset.wsPanel === name);
    });
    if (name === "guests") renderGuests();
    else if (name === "tasks") renderTasks();
    else if (name === "budget") renderBudget();
    else if (name === "venue") renderVenue();
    else if (name === "schedule") renderSchedule();
    else if (name === "reminders") renderWsReminders();
    else if (name === "invitations") renderInvitations();
    else if (name === "settings") fillEditForm();
    else renderOverview();
  }
  document.querySelectorAll("#wsTabs [data-ws-target]").forEach((b) => {
    b.onclick = () => showTab(b.dataset.wsTarget);
  });
  document.querySelectorAll("#wsQuickActions [data-ws-target]").forEach((b) => {
    b.onclick = () => {
      showTab(b.dataset.wsTarget);
      if (b.dataset.wsTarget === "budget") {
        setTimeout(() => {
          const form = $("wsExpenseForm");
          if (form) {
            form.hidden = false;
            $("wsExpenseName")?.focus();
          }
        }, 50);
      }
      if (b.dataset.wsTarget === "guests") setTimeout(() => $("wsGuestName")?.focus(), 50);
      if (b.dataset.wsTarget === "tasks") setTimeout(() => $("wsTaskTitle")?.focus(), 50);
    };
  });
  if ($("wsQaDelete")) {
    $("wsQaDelete").onclick = () => {
      if ($("wsDelete")) $("wsDelete").click();
    };
  }
  if ($("wsQaShare")) {
    $("wsQaShare").onclick = () => {
      if (openId && window.EEShare) window.EEShare.open(openId);
      else if (openId) {
        const b = document.createElement("button");
        b.setAttribute("data-share", openId);
        b.hidden = true;
        document.body.appendChild(b);
        b.click();
        b.remove();
      }
    };
  }
  $("wsBack").onclick = () => {
    if (window.EEApp) EEApp.setView("events");
  };
  document.addEventListener("ee:ws-open", (e) => {
    openId = e.detail.id;
    header();
    showTab(e.detail.tab || "overview");
  });
  document.addEventListener("ee:render", () => {
    if (!openId || !ev()) return;
    header();
    const active = document.querySelector("#wsTabs .active");
    showTab(active ? active.dataset.wsTarget : "overview");
  });

  /* ---------- overview ---------- */
  function renderOverview() {
    const e = ev();
    if (!e) return;
    const g = guests(),
      t = tasks(),
      x = expenses(),
      v = venue(),
      sc = schedule();
    const acc = g.filter((q) => q.status === "Accepted").length;
    const done = t.filter((q) => q.status === "Completed").length;
    const spent = x.reduce((a, q) => a + (+q.amount || 0), 0);
    const remaining = Math.max(0, (+e.budget || 0) - spent);
    const pc = (a, b) => (b ? Math.min(100, Math.round((a / b) * 100)) : 0);
    const meter = (l, v2, p) =>
      '<div class="dash-meter"><small><span>' +
      l +
      "</span><span>" +
      v2 +
      '</span></small><div class="dash-bar"><i style="width:' +
      p +
      '%"></i></div></div>';
    root.innerHTML =
      '<div class="dash-grid">' +
      '<article class="dash-card dash-focus"><span class="eyebrow">GUESTS</span><h2>' +
      (e.guestTarget || g.length) +
      " expected</h2><p>" +
      acc +
      " of " +
      g.length +
      ' RSVP\'d confirmed guests logged.</p><div class="dash-meters">' +
      meter(T("Guests"), acc + " / " + g.length, pc(acc, g.length)) +
      "</div></article>" +
      '<article class="dash-card"><span class="eyebrow">TASKS</span><h2>' +
      done +
      " / " +
      t.length +
      "</h2><p>Task checklist progress for this event.</p>" +
      meter(T("Tasks"), done + " / " + t.length, pc(done, t.length)) +
      "</article>" +
      '<article class="dash-card"><span class="eyebrow">BUDGET</span><h2>₹' +
      remaining.toLocaleString("en-IN") +
      " remaining</h2><p>₹" +
      spent.toLocaleString("en-IN") +
      " spent of ₹" +
      (+e.budget || 0).toLocaleString("en-IN") +
      "</p>" +
      meter(T("Budget"), "₹" + spent.toLocaleString("en-IN"), pc(spent, e.budget || 1)) +
      "</article>" +
      '<article class="dash-card"><span class="eyebrow">VENUE</span><h2>' +
      esc(v ? v.name || "Saved" : "Not set") +
      "</h2><p>" +
      (v ? esc(v.city || "") + (v.capacity ? " · Capacity " + v.capacity : "") : "Add venue details in the Venue tab.") +
      "</p></article>" +
      "</div>" +
      '<article class="dash-card dash-wide"><span class="eyebrow">UPCOMING SCHEDULE</span><h2>Day-of timeline</h2>' +
      (sc.length
        ? '<div class="ws-timeline">' +
          sc
            .slice(0, 5)
            .map(
              (s) =>
                '<div class="ws-time-item"><span class="ws-time">' +
                esc(s.time || "") +
                "</span><span>" +
                esc(s.title) +
                "</span></div>",
            )
            .join("") +
          "</div>"
        : "<p>No schedule items yet — add them in the Schedule tab.</p>") +
      "</article>";
  }

  /* ---------- guests ---------- */
  function renderGuests() {
    const g = guests();
    $("wsGuestList").innerHTML = g.length
      ? g
          .map(
            (x) =>
              `<div class="guest-item"><div><strong>${esc(x.name)}</strong><small>${esc([x.category, x.contact].filter(Boolean).join(" · "))}</small></div><span class="pill" data-ws-guest-cycle="${x.id}">${esc(x.status)}</span><button type="button" class="tiny-btn" data-ws-guest-del="${x.id}">×</button></div>`,
          )
          .join("")
      : `<div class="empty empty-compact"><div class="empty-visual" aria-hidden="true">👥</div><div class="empty-title">No guests yet</div><p>Add guests to track RSVPs for this event.</p></div>`;
    document.querySelectorAll("[data-ws-guest-cycle]").forEach(
      (b) =>
        (b.onclick = () => {
          const x = g.find((q) => q.id === b.dataset.wsGuestCycle);
          const order = ["Pending", "Accepted", "Declined"];
          const next = order[(order.indexOf(x.status) + 1) % order.length];
          S.update("guests", x.id, { status: next });
          renderGuests();
          document.dispatchEvent(new Event("ee:render"));
        }),
    );
    document.querySelectorAll("[data-ws-guest-del]").forEach(
      (b) =>
        (b.onclick = () => {
          S.remove("guests", b.dataset.wsGuestDel);
          renderGuests();
          toast("Guest removed.");
          document.dispatchEvent(new Event("ee:render"));
        }),
    );
  }
  $("wsGuestForm").onsubmit = (e) => {
    e.preventDefault();
    if (!openId) return;
    const name = $("wsGuestName").value.trim();
    if (!name) return;
    S.add("guests", {
      eventId: openId,
      name,
      contact: $("wsGuestContact").value.trim(),
      category: $("wsGuestCategory").value,
      status: $("wsGuestStatus").value,
    });
    e.target.reset();
    renderGuests();
    toast("Guest added successfully.");
    document.dispatchEvent(new Event("ee:render"));
  };

  /* ---------- tasks ---------- */
  function renderTasks() {
    const t = tasks();
    $("wsTaskList").innerHTML = t.length
      ? t
          .map(
            (x) =>
              `<div class="task-item"><div><span class="${x.status === "Completed" ? "task-done" : ""}">${esc(x.title)}</span><small>${esc([x.assignee, x.due, x.priority].filter(Boolean).join(" · "))}</small></div><span><button type="button" class="tiny-btn" data-ws-task="${x.id}">${x.status === "Completed" ? "↺" : "✓"}</button><button type="button" class="tiny-btn" data-ws-task-del="${x.id}">×</button></span></div>`,
          )
          .join("")
      : `<div class="empty empty-compact"><div class="empty-visual" aria-hidden="true">✓</div><div class="empty-title">No tasks yet</div><p>Break the event into actionable tasks.</p></div>`;
    document.querySelectorAll("[data-ws-task]").forEach(
      (b) =>
        (b.onclick = () => {
          const x = t.find((q) => q.id === b.dataset.wsTask);
          S.update("tasks", x.id, { status: x.status === "Completed" ? "Todo" : "Completed" });
          renderTasks();
          document.dispatchEvent(new Event("ee:render"));
        }),
    );
    document.querySelectorAll("[data-ws-task-del]").forEach(
      (b) =>
        (b.onclick = () => {
          S.remove("tasks", b.dataset.wsTaskDel);
          renderTasks();
          toast("Task removed.");
          document.dispatchEvent(new Event("ee:render"));
        }),
    );
  }
  $("wsTaskForm").onsubmit = (e) => {
    e.preventDefault();
    if (!openId) return;
    const title = $("wsTaskTitle").value.trim();
    if (!title) return;
    S.add("tasks", {
      eventId: openId,
      title,
      assignee: $("wsTaskAssignee").value.trim(),
      due: $("wsTaskDue").value,
      priority: $("wsTaskPriority").value,
      status: "Todo",
    });
    e.target.reset();
    renderTasks();
    toast("Task added successfully.");
    document.dispatchEvent(new Event("ee:render"));
  };

  /* ---------- budget ---------- */
  function resetExpenseForm() {
    const f = $("wsExpenseForm");
    if (!f) return;
    f.reset();
    if ($("wsExpenseEditId")) $("wsExpenseEditId").value = "";
    if ($("wsExpenseSubmit")) $("wsExpenseSubmit").textContent = "Add Expense";
    if ($("wsExpenseError")) { $("wsExpenseError").hidden = true; $("wsExpenseError").textContent = ""; }
    f.hidden = true;
  }
  function showExpenseForm(editItem) {
    const f = $("wsExpenseForm");
    if (!f) return;
    f.hidden = false;
    if ($("wsExpenseError")) { $("wsExpenseError").hidden = true; $("wsExpenseError").textContent = ""; }
    if (editItem) {
      $("wsExpenseName").value = editItem.name || "";
      $("wsExpenseAmount").value = editItem.amount || "";
      $("wsExpenseCategory").value = editItem.category || "Other";
      $("wsExpenseDate").value = editItem.date || "";
      $("wsExpenseNotes").value = editItem.notes || "";
      $("wsExpenseEditId").value = editItem.id;
      $("wsExpenseSubmit").textContent = "Save Changes";
    } else {
      f.reset();
      $("wsExpenseEditId").value = "";
      $("wsExpenseSubmit").textContent = "Add Expense";
      if ($("wsExpenseDate") && !$("wsExpenseDate").value) {
        $("wsExpenseDate").value = new Date().toISOString().slice(0, 10);
      }
    }
    $("wsExpenseName")?.focus();
  }
  function renderBudget() {
    const e = ev(),
      x = expenses();
    const spent = x.reduce((a, q) => a + (+q.amount || 0), 0),
      budget = +e.budget || 0,
      remaining = Math.max(0, budget - spent),
      pct = budget ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
    if ($("wsBudgetTotal")) $("wsBudgetTotal").textContent = "₹" + budget.toLocaleString("en-IN");
    $("wsBudgetUsed").textContent = "₹" + spent.toLocaleString("en-IN");
    $("wsBudgetRemaining").textContent = "₹" + remaining.toLocaleString("en-IN");
    if ($("wsBudgetPct")) $("wsBudgetPct").textContent = pct + "%";
    $("wsBudgetBar").style.width = pct + "%";
    $("wsExpenseList").innerHTML = x.length
      ? x
          .map(
            (q) =>
              `<div class="expense-item">
                <div class="expense-main"><strong>${esc(q.name)}</strong>
                  <small>${esc([q.category, q.date ? (window.EESettings ? EESettings.fmtDate(q.date + "T00:00") : q.date) : "", q.notes].filter(Boolean).join(" · "))}</small>
                </div>
                <div class="expense-side">
                  <strong>₹${(+q.amount || 0).toLocaleString("en-IN")}</strong>
                  <button type="button" class="tiny-btn" data-ws-exp-edit="${q.id}" aria-label="Edit expense">Edit</button>
                  <button type="button" class="tiny-btn danger" data-ws-exp-del="${q.id}" aria-label="Delete expense">Delete</button>
                </div>
              </div>`,
          )
          .join("")
      : `<div class="empty empty-compact"><div class="empty-visual" aria-hidden="true">₹</div><div class="empty-title">No expenses yet</div><p>Track spending against your budget.</p><button type="button" class="btn btn-small btn-primary" id="wsEmptyAddExp">+ Add Expense</button></div>`;
    document.querySelectorAll("[data-ws-exp-del]").forEach(
      (b) =>
        (b.onclick = () => {
          confirmBox("Delete this expense?", "This will update spending and remaining budget for this event.", "Delete", () => {
            S.remove("expenses", b.dataset.wsExpDel);
            renderBudget();
            toast("Expense deleted successfully.");
            document.dispatchEvent(new Event("ee:render"));
          });
        }),
    );
    document.querySelectorAll("[data-ws-exp-edit]").forEach(
      (b) =>
        (b.onclick = () => {
          const item = x.find((q) => q.id === b.dataset.wsExpEdit);
          if (item) showExpenseForm(item);
        }),
    );
    if ($("wsEmptyAddExp")) $("wsEmptyAddExp").onclick = () => showExpenseForm();
  }
  if ($("wsAddExpenseBtn")) $("wsAddExpenseBtn").onclick = () => showExpenseForm();
  if ($("wsExpenseCancel")) $("wsExpenseCancel").onclick = () => resetExpenseForm();
  $("wsExpenseForm").onsubmit = (e) => {
    e.preventDefault();
    if (!openId) return;
    const name = $("wsExpenseName").value.trim();
    const amount = Number($("wsExpenseAmount").value);
    const err = $("wsExpenseError");
    if (!name) {
      if (err) { err.textContent = "Expense name is required."; err.hidden = false; }
      $("wsExpenseName").focus();
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      if (err) { err.textContent = "Enter a valid amount (0 or greater)."; err.hidden = false; }
      $("wsExpenseAmount").focus();
      return;
    }
    const patch = {
      name,
      category: $("wsExpenseCategory").value,
      amount,
      date: $("wsExpenseDate") ? $("wsExpenseDate").value : "",
      notes: $("wsExpenseNotes") ? $("wsExpenseNotes").value.trim() : "",
    };
    const editId = $("wsExpenseEditId") && $("wsExpenseEditId").value;
    if (editId) {
      S.update("expenses", editId, patch);
      toast("Expense updated successfully.");
    } else {
      S.add("expenses", { eventId: openId, ...patch });
      toast("Expense added successfully.");
    }
    resetExpenseForm();
    renderBudget();
    document.dispatchEvent(new Event("ee:render"));
  };

  /* ---------- venue ---------- */
  function renderVenue() {
    const v = venue();
    $("wsVenueView").innerHTML = v
      ? `<strong>${esc(v.name || "Venue")}</strong><br>${esc(v.city || "")}${v.capacity ? " · Capacity " + v.capacity : ""}<br>${esc(v.contact || "")}${v.notes ? "<br><small>" + esc(v.notes) + "</small>" : ""}`
      : "No venue saved for this event yet.";
    if (v) {
      $("wsVenueName").value = v.name || "";
      $("wsVenueCity").value = v.city || "";
      $("wsVenueCapacity").value = v.capacity || "";
      $("wsVenueContact").value = v.contact || "";
      $("wsVenueNotes").value = v.notes || "";
    }
  }
  $("wsVenueForm").onsubmit = (e) => {
    e.preventDefault();
    if (!openId) return;
    const patch = {
      name: $("wsVenueName").value,
      city: $("wsVenueCity").value,
      capacity: Number($("wsVenueCapacity").value) || 0,
      contact: $("wsVenueContact").value,
      notes: $("wsVenueNotes").value,
    };
    const old = venue();
    if (old) S.update("venues", old.id, patch);
    else S.add("venues", { eventId: openId, ...patch });
    renderVenue();
    toast("Venue saved");
  };

  /* ---------- schedule ---------- */
  function renderSchedule() {
    const s = schedule();
    $("wsScheduleList").innerHTML = s.length
      ? s
          .map(
            (x) =>
              `<div class="ws-time-item"><span class="ws-time">${esc(x.time || "")}</span><span>${esc(x.title)}</span><button type="button" class="tiny-btn" data-ws-sch-del="${x.id}">×</button></div>`,
          )
          .join("")
      : `<div class="empty empty-compact"><div class="empty-visual" aria-hidden="true">⏱</div><div class="empty-title">No schedule yet</div><p>Add timed activities for the day of the event.</p></div>`;
    document.querySelectorAll("[data-ws-sch-del]").forEach(
      (b) =>
        (b.onclick = () => {
          S.remove("schedule", b.dataset.wsSchDel);
          renderSchedule();
        }),
    );
  }
  $("wsScheduleForm").onsubmit = (e) => {
    e.preventDefault();
    if (!openId) return;
    S.add("schedule", {
      eventId: openId,
      time: $("wsScheduleTime").value,
      title: $("wsScheduleTitle").value.trim(),
    });
    e.target.reset();
    renderSchedule();
  };


  function renderWsReminders() {
    const list = $("wsRemList");
    if (!list || !openId) return;
    const items = S.scoped("reminders").filter((r) => r.eventId === openId)
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    list.innerHTML = items.length
      ? items.map((r) =>
          `<div class="task-item"><div><span class="${r.completed ? "task-done" : ""}">${esc(r.title)}</span><small>${esc([r.date, r.time, r.notes].filter(Boolean).join(" · "))}</small></div><span><button type="button" class="tiny-btn" data-ws-rem-toggle="${r.id}">${r.completed ? "↺" : "✓"}</button><button type="button" class="tiny-btn" data-ws-rem-del="${r.id}">×</button></span></div>`
        ).join("")
      : `<div class="empty empty-compact"><div class="empty-visual" aria-hidden="true">🔔</div><div class="empty-title">No reminders</div><p>Set reminders so nothing slips through.</p></div>`;
    list.querySelectorAll("[data-ws-rem-toggle]").forEach((b) => {
      b.onclick = () => {
        const r = S.scoped("reminders").find((x) => x.id === b.dataset.wsRemToggle);
        if (!r) return;
        S.update("reminders", r.id, { completed: !r.completed });
        renderWsReminders();
        document.dispatchEvent(new Event("ee:render"));
      };
    });
    list.querySelectorAll("[data-ws-rem-del]").forEach((b) => {
      b.onclick = () => {
        S.remove("reminders", b.dataset.wsRemDel);
        renderWsReminders();
        toast("Reminder deleted.");
        document.dispatchEvent(new Event("ee:render"));
      };
    });
  }
  document.addEventListener("click", (e) => {
    if (e.target.id === "wsRemAdd" || e.target.closest("#wsRemAdd")) {
      const f = $("wsRemForm");
      if (f) { f.hidden = false; $("wsRemTitle") && $("wsRemTitle").focus(); }
    }
    if (e.target.id === "wsRemFormCancel") {
      if ($("wsRemForm")) $("wsRemForm").hidden = true;
    }
  });
  document.addEventListener("submit", (e) => {
    if (e.target.id !== "wsRemForm") return;
    e.preventDefault();
    if (!openId) return;
    const title = $("wsRemTitle") && $("wsRemTitle").value.trim();
    const date = $("wsRemDate") && $("wsRemDate").value;
    if (!title || !date) return;
    S.add("reminders", {
      eventId: openId,
      title,
      date,
      time: ($("wsRemTime") && $("wsRemTime").value) || "",
      notes: ($("wsRemNotes") && $("wsRemNotes").value.trim()) || "",
      completed: false,
    });
    e.target.reset();
    e.target.hidden = true;
    renderWsReminders();
    toast("Reminder added.");
    document.dispatchEvent(new Event("ee:render"));
  });

  function inviteLink() {
    const e = ev();
    if (!e) return "";
    try {
      const payload = btoa(unescape(encodeURIComponent(JSON.stringify({
        n: e.name, t: e.type, d: e.date, tm: e.time, l: e.location,
        h: (S.currentUser() && S.currentUser().name) || "",
      }))));
      return location.origin + location.pathname.replace(/[^/]*$/, "invite.html") + "?e=" + encodeURIComponent(payload);
    } catch (err) {
      return location.origin + "/invite.html";
    }
  }
  function drawQr(text, canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const size = canvas.width;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => ctx.drawImage(img, 0, 0, size, size);
    img.src = "https://api.qrserver.com/v1/create-qr-code/?size=" + size + "x" + size + "&data=" + encodeURIComponent(text);
  }
  function renderInvitations() {
    const e = ev();
    if (!e) return;
    const prev = $("wsInvitePreview");
    if (prev) {
      prev.innerHTML = "<strong>" + esc(e.name) + "</strong><br>" +
        esc([e.type, e.date, e.time, e.location].filter(Boolean).join(" · ")) +
        "<br><small>Hosted by " + esc((S.currentUser() && S.currentUser().name) || "EventEase") + "</small>";
    }
    const link = inviteLink();
    drawQr(link, $("wsInviteQr"));
    const shareBtn = $("wsInviteShare");
    if (shareBtn) shareBtn.onclick = () => { if (window.EEShare) EEShare.open(openId); };
    const copyBtn = $("wsInviteCopy");
    if (copyBtn) copyBtn.onclick = async () => {
      try { await navigator.clipboard.writeText(link); toast("Invitation link copied."); }
      catch (err) { toast("Copy failed — link: " + link); }
    };
    const mapsBtn = $("wsInviteMaps");
    if (mapsBtn) mapsBtn.onclick = () => {
      window.open("https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(e.location || e.name), "_blank", "noopener");
    };
    const qrDl = $("wsInviteQrDl");
    if (qrDl) qrDl.onclick = () => {
      const c = $("wsInviteQr");
      if (!c) return;
      const a = document.createElement("a");
      a.href = c.toDataURL("image/png");
      a.download = (e.name || "invite") + "-qr.png";
      a.click();
    };
  }

  /* ---------- settings: edit / duplicate / archive / delete ---------- */
  function fillEditForm() {
    const e = ev();
    if (!e) return;
    $("wsEditName").value = e.name || "";
    $("wsEditType").value = e.type || "";
    $("wsEditDate").value = e.date || "";
    $("wsEditStart").value = e.time || "";
    $("wsEditEnd").value = e.endTime || "";
    if ($("wsEditLocation")) $("wsEditLocation").value = e.location || "";
    $("wsEditBudget").value = e.budget || "";
    $("wsEditDesc").value = e.description || "";
    $("wsEditStatus").value = e.status || "Planning";
  }
  if ($("wsEditCancel")) {
    $("wsEditCancel").onclick = () => {
      showTab("overview");
    };
  }
  $("wsEditForm").onsubmit = (e) => {
    e.preventDefault();
    if (!openId) return;
    const name = $("wsEditName").value.trim();
    if (!name) {
      $("wsEditName").focus();
      return;
    }
    S.update("events", openId, {
      name,
      type: $("wsEditType").value.trim() || "Party",
      date: $("wsEditDate").value,
      time: $("wsEditStart").value,
      endTime: $("wsEditEnd").value,
      location: $("wsEditLocation") ? $("wsEditLocation").value.trim() : "",
      budget: Number($("wsEditBudget").value) || 0,
      description: $("wsEditDesc").value,
      status: $("wsEditStatus").value,
    });
    header();
    toast("Event updated successfully.");
    document.dispatchEvent(new Event("ee:render"));
    showTab("overview");
  };
  $("wsDuplicate").onclick = () => {
    const e = ev();
    if (!e) return;
    const clone = S.add("events", {
      name: e.name + " (copy)",
      type: e.type,
      date: e.date,
      time: e.time,
      endTime: e.endTime,
      budget: e.budget,
      description: e.description,
      location: e.location,
      status: "Planning",
    });
    guests().forEach((g) => S.add("guests", { eventId: clone.id, name: g.name, contact: g.contact, category: g.category, status: g.status }));
    tasks().forEach((t) => S.add("tasks", { eventId: clone.id, title: t.title, assignee: t.assignee, due: t.due, priority: t.priority, status: "Todo" }));
    expenses().forEach((x) => S.add("expenses", { eventId: clone.id, name: x.name, category: x.category, amount: x.amount }));
    const v = venue();
    if (v) S.add("venues", { eventId: clone.id, name: v.name, city: v.city, capacity: v.capacity, contact: v.contact, notes: v.notes });
    schedule().forEach((s) => S.add("schedule", { eventId: clone.id, time: s.time, title: s.title }));
    toast("Event duplicated");
    if (window.EEApp) EEApp.openWorkspace(clone.id, "overview");
  };
  $("wsArchive").onclick = () => {
    if (!openId) return;
    const e = ev();
    const archiving = e.status !== "Archived";
    S.update("events", openId, { status: archiving ? "Archived" : "Planning" });
    header();
    fillEditForm();
    toast(archiving ? "Event archived" : "Event restored");
    document.dispatchEvent(new Event("ee:render"));
  };
  $("wsDelete").onclick = () => {
    const e = ev();
    if (!e) return;
    confirmBox(
      "Delete " + e.name + "?",
      "This permanently deletes this event and everything in it — its guests, tasks, expenses, venue and schedule. Other events are not affected.",
      "Delete event",
      () => {
        const id = openId;
        ["guests", "tasks", "expenses", "venues", "schedule"].forEach((list) => {
          S.scoped(list)
            .filter((x) => x.eventId === id)
            .forEach((x) => S.remove(list, x.id));
        });
        S.remove("events", id);
        openId = null;
        toast("Event deleted successfully.");
        if (window.EEApp) EEApp.setView("events");
        document.dispatchEvent(new Event("ee:render"));
      },
    );
  };
})();

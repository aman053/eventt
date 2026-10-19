/* EventEase Reminders management — All Events default, calendar-aware */
(function () {
  function localISODate(d) {
    d = d || new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  const S = window.EventEaseStore;
  if (!S) return;
  const $ = (id) => document.getElementById(id);
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (m) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m],
    );
  let selected = ""; // "" = All Events
  let editId = null;

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
      '<div class="set-dialog" role="alertdialog" aria-modal="true"><h3></h3><p></p><div class="set-links"><button type="button" class="btn" data-x>Cancel</button><button type="button" class="btn btn-dark" data-ok></button></div></div>';
    w.querySelector("h3").textContent = title;
    w.querySelector("p").textContent = msg;
    w.querySelector("[data-ok]").textContent = ok;
    const close = () => w.remove();
    w.querySelector("[data-x]").onclick = close;
    w.onclick = (e) => {
      if (e.target === w) close();
    };
    w.querySelector("[data-ok]").onclick = () => {
      close();
      fn();
    };
    document.body.appendChild(w);
  }
  function events() {
    return S.scoped("events").filter((e) => e.status !== "Archived");
  }
  function eventName(id) {
    return events().find((e) => e.id === id)?.name || "Event";
  }
  function fillSelector() {
    const sel = $("reminderEventSelect");
    if (!sel) return;
    sel.innerHTML =
      '<option value="">All Events</option>' +
      events()
        .map(
          (e) =>
            '<option value="' +
            e.id +
            '"' +
            (e.id === selected ? " selected" : "") +
            ">" +
            esc(e.name) +
            "</option>",
        )
        .join("");
    sel.value = selected || "";
  }
  function list() {
    let r = S.scoped("reminders");
    if (selected) r = r.filter((x) => x.eventId === selected);
    return r.slice().sort((a, b) => {
      const da = (a.date || "") + (a.time || "");
      const db = (b.date || "") + (b.time || "");
      return da.localeCompare(db);
    });
  }
  function render() {
    const root = $("remindersWorkspace");
    if (!root) return;
    fillSelector();
    const label = $("reminderContextLabel");
    if (label)
      label.textContent = selected
        ? "Reminders for " + eventName(selected)
        : "Reminders for All Events";
    const items = list();
    const formEvOpts =
      '<option value="">Select event…</option>' +
      events()
        .map((e) => '<option value="' + e.id + '">' + esc(e.name) + "</option>")
        .join("");
    root.innerHTML =
      '<form id="reminderForm" class="expense-form reminder-form" aria-label="Create or edit reminder">' +
      '<select id="remEvent" required aria-label="Event">' +
      formEvOpts +
      "</select>" +
      '<input id="remTitle" required placeholder="Reminder title">' +
      '<input id="remDate" type="date" required aria-label="Date">' +
      '<input id="remTime" type="time" aria-label="Time">' +
      '<input id="remNotes" placeholder="Notes (optional)">' +
      '<div class="expense-form-actions">' +
      '<button type="button" class="btn btn-small" id="remCancel" hidden>Cancel edit</button>' +
      '<button type="submit" class="btn btn-small btn-primary" id="remSave">Save Reminder</button></div></form>' +
      '<div class="reminder-list">' +
      (items.length
        ? items
            .map((r) => {
              const done = r.completed ? " completed" : "";
              return (
                '<article class="reminder-item' +
                done +
                '"><div><strong>' +
                esc(r.title) +
                "</strong><small>" +
                esc(eventName(r.eventId)) +
                " · " +
                esc(r.date || "") +
                (r.time ? " · " + esc(r.time) : "") +
                (r.notes ? " · " + esc(r.notes) : "") +
                '</small></div><div class="reminder-actions">' +
                '<button type="button" class="tiny-btn" data-rem-toggle="' +
                r.id +
                '">' +
                (r.completed ? "↺" : "✓") +
                "</button>" +
                '<button type="button" class="tiny-btn" data-rem-edit="' +
                r.id +
                '">Edit</button>' +
                '<button type="button" class="tiny-btn danger" data-rem-del="' +
                r.id +
                '">Delete</button></div></article>'
              );
            })
            .join("")
        : '<div class="empty empty-compact"><div class="empty-visual" aria-hidden="true">🔔</div><div class="empty-title">No reminders yet</div><p>Create a reminder above to stay on track.</p></div>') +
      "</div>";

    if (selected) $("remEvent").value = selected;
    $("reminderForm").onsubmit = (e) => {
      e.preventDefault();
      const eventId = $("remEvent").value;
      const title = $("remTitle").value.trim();
      const date = $("remDate").value;
      if (!eventId || !title || !date) {
        toast("Event, title and date are required.");
        return;
      }
      const patch = {
        eventId,
        title,
        date,
        time: $("remTime").value || "",
        notes: $("remNotes").value.trim(),
        completed: false,
      };
      if (editId) {
        S.update("reminders", editId, patch);
        toast("Reminder updated.");
        editId = null;
      } else {
        S.add("reminders", patch);
        toast("Reminder created.");
      }
      document.dispatchEvent(new Event("ee:render"));
      render();
    };
    $("remCancel").onclick = () => {
      editId = null;
      $("reminderForm").reset();
      $("remCancel").hidden = true;
      $("remSave").textContent = "Save Reminder";
    };
    root.querySelectorAll("[data-rem-toggle]").forEach((b) => {
      b.onclick = () => {
        const r = S.scoped("reminders").find((x) => x.id === b.dataset.remToggle);
        if (!r) return;
        S.update("reminders", r.id, { completed: !r.completed });
        document.dispatchEvent(new Event("ee:render"));
        render();
      };
    });
    root.querySelectorAll("[data-rem-edit]").forEach((b) => {
      b.onclick = () => {
        const r = S.scoped("reminders").find((x) => x.id === b.dataset.remEdit);
        if (!r) return;
        editId = r.id;
        $("remEvent").value = r.eventId;
        $("remTitle").value = r.title || "";
        $("remDate").value = r.date || "";
        $("remTime").value = r.time || "";
        $("remNotes").value = r.notes || "";
        $("remCancel").hidden = false;
        $("remSave").textContent = "Save Changes";
        $("remTitle").focus();
      };
    });
    root.querySelectorAll("[data-rem-del]").forEach((b) => {
      b.onclick = () => {
        confirmBox("Delete this reminder?", "This cannot be undone.", "Delete", () => {
          S.remove("reminders", b.dataset.remDel);
          toast("Reminder deleted.");
          document.dispatchEvent(new Event("ee:render"));
          render();
        });
      };
    });
  }
  function upcoming(limit, eventId) {
    const today = localISODate();
    let r = S.scoped("reminders").filter((x) => !x.completed && x.date && x.date >= today);
    if (eventId) r = r.filter((x) => x.eventId === eventId);
    return r
      .sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")))
      .slice(0, limit || 8);
  }
  function init() {
    const sel = $("reminderEventSelect");
    if (sel)
      sel.onchange = () => {
        selected = sel.value || "";
        render();
      };
    document.addEventListener("ee:render", () => {
      if (document.querySelector('[data-view-panel="reminders"].active')) render();
    });
    document.addEventListener("ee:view", (e) => {
      if (e.detail === "reminders") render();
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  window.EEReminders = { render, upcoming, select(id) { selected = id || ""; render(); } };
})();

(function () {
  const KEY = "eventease_db_v1";
  const SESSION = "eventease_session_v1";
  const seed = () => ({
    users: [],
    events: [],
    guests: [],
    tasks: [],
    expenses: [],
    venues: [],
    schedule: [],
    reminders: [],
  });
  function db() {
    let d;
    try {
      d = JSON.parse(localStorage.getItem(KEY)) || seed();
    } catch {
      d = seed();
    }
    const s = seed();
    for (const k in s) if (!Array.isArray(d[k])) d[k] = s[k];
    return d;
  }
  function save(x) {
    localStorage.setItem(KEY, JSON.stringify(x));
    return x;
  }
  function id(p) {
    return (
      p +
      "_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 7)
    );
  }
  function bk() {
    try {
      const v = sessionStorage.getItem(SESSION);
      if (v) return v;
    } catch {}
    const m = document.cookie.match(new RegExp(SESSION + "=([^;]+)"));
    return m ? decodeURIComponent(m[1]) : null;
  }
  function currentUser() {
    const email = localStorage.getItem(SESSION) || bk();
    return db().users.find((u) => u.email === email) || null;
  }
  function setSession(email) {
    localStorage.setItem(SESSION, email);
    try {
      sessionStorage.setItem(SESSION, email);
    } catch {}
    document.cookie =
      SESSION +
      "=" +
      encodeURIComponent(email) +
      ";path=/;max-age=31536000;SameSite=Lax";
  }
  function clearSession() {
    localStorage.removeItem(SESSION);
    try {
      sessionStorage.removeItem(SESSION);
    } catch {}
    document.cookie = SESSION + "=;path=/;max-age=0";
  }
  function uid() {
    return currentUser()?.email || null;
  }
  function scoped(list) {
    const e = db();
    const u = uid();
    return e[list].filter((x) => x.userEmail === u);
  }
  function add(list, obj) {
    const d = db();
    d[list].push({
      ...obj,
      id: id(list.slice(0, -1)),
      userEmail: uid(),
      createdAt: new Date().toISOString(),
    });
    save(d);
    return d[list][d[list].length - 1];
  }
  function update(list, itemId, patch) {
    const d = db();
    const i = d[list].findIndex((x) => x.id === itemId && x.userEmail === uid());
    if (i < 0) return null;
    d[list][i] = { ...d[list][i], ...patch, updatedAt: new Date().toISOString() };
    save(d);
    return d[list][i];
  }
  function remove(list, itemId) {
    const d = db();
    d[list] = d[list].filter((x) => !(x.id === itemId && x.userEmail === uid()));
    save(d);
  }
  /** Structured AI context for the signed-in user (up to maxEvents). No passwords/secrets. */
  function aiContext(maxEvents) {
    maxEvents = maxEvents || 20;
    const user = currentUser();
    if (!user) return null;
    const events = scoped("events")
      .filter((e) => e.status !== "Archived")
      .slice(0, maxEvents);
    return {
      userName: user.name,
      eventCount: scoped("events").length,
      events: events.map((e) => {
        const guests = scoped("guests").filter((g) => g.eventId === e.id);
        const tasks = scoped("tasks").filter((t) => t.eventId === e.id);
        const expenses = scoped("expenses").filter((x) => x.eventId === e.id);
        const venue = scoped("venues").find((v) => v.eventId === e.id);
        const schedule = scoped("schedule").filter((s) => s.eventId === e.id);
        const reminders = scoped("reminders").filter((r) => r.eventId === e.id);
        const spent = expenses.reduce((a, x) => a + (+x.amount || 0), 0);
        const budget = +e.budget || 0;
        return {
          id: e.id,
          name: e.name,
          type: e.type,
          date: e.date,
          time: e.time,
          endTime: e.endTime,
          location: e.location,
          status: e.status,
          budget,
          spent,
          remaining: Math.max(0, budget - spent),
          description: e.description,
          guests: {
            total: guests.length,
            accepted: guests.filter((g) => g.status === "Accepted").length,
            pending: guests.filter((g) => g.status === "Pending").length,
            declined: guests.filter((g) => g.status === "Declined").length,
            names: guests.slice(0, 30).map((g) => ({ name: g.name, status: g.status })),
          },
          tasks: {
            total: tasks.length,
            done: tasks.filter((t) => t.status === "Completed").length,
            open: tasks
              .filter((t) => t.status !== "Completed")
              .slice(0, 20)
              .map((t) => t.title),
          },
          expenses: expenses.slice(0, 30).map((x) => ({
            name: x.name,
            amount: +x.amount || 0,
            category: x.category,
            date: x.date,
          })),
          venue: venue
            ? { name: venue.name, city: venue.city, capacity: venue.capacity }
            : null,
          schedule: schedule.slice(0, 15).map((s) => ({ time: s.time, title: s.title })),
          reminders: reminders
            .filter((r) => !r.completed)
            .slice(0, 15)
            .map((r) => ({ title: r.title, date: r.date, time: r.time })),
        };
      }),
    };
  }
  window.EventEaseStore = {
    db,
    save,
    id,
    currentUser,
    setSession,
    clearSession,
    uid,
    scoped,
    add,
    update,
    remove,
    aiContext,
  };
})();

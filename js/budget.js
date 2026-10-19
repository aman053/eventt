/* EventEase global Budget workspace — All Events default, per-event expenses */
(function () {
  const S = window.EventEaseStore;
  if (!S) return;
  const $ = (id) => document.getElementById(id);
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (m) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m],
    );
  const fmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
  let selected = ""; // "" = All Events

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
  function fillSelector() {
    const sel = $("budgetEventSelect");
    if (!sel) return;
    const cur = selected;
    sel.innerHTML =
      '<option value="">All Events</option>' +
      events()
        .map(
          (e) =>
            '<option value="' +
            e.id +
            '"' +
            (e.id === cur ? " selected" : "") +
            ">" +
            esc(e.name) +
            "</option>",
        )
        .join("");
    sel.value = cur || "";
  }

  function render() {
    const root = $("budgetWorkspace");
    if (!root) return;
    fillSelector();
    const all = events();
    const label = $("budgetContextLabel");
    if (!selected) {
      if (label) label.textContent = "Showing budget for All Events";
      const planned = all.reduce((a, e) => a + (+e.budget || 0), 0);
      const spent = S.scoped("expenses").reduce((a, x) => a + (+x.amount || 0), 0);
      const rem = planned - spent; const over = rem < 0;
      const pct = planned ? Math.min(100, Math.round((spent / planned) * 100)) : 0;
      root.innerHTML =
        '<div class="budget-summary-cards">' +
        '<div class="budget-sum-card"><small>Events</small><strong>' +
        all.length +
        "</strong></div>" +
        '<div class="budget-sum-card"><small>Total planned</small><strong>' +
        fmt(planned) +
        "</strong></div>" +
        '<div class="budget-sum-card"><small>Total spent</small><strong>' +
        fmt(spent) +
        "</strong></div>" +
        '<div class="budget-sum-card"><small>' + (over ? 'Over budget' : 'Remaining') + '</small><strong>' +
        fmt(over ? Math.abs(rem) : rem) +
        "</strong></div>" +
        "</div>" +
        '<div class="budget-meter"><div class="meter"><span style="width:' +
        pct +
        '%"></span></div></div>' +
        (over ? '<p class="budget-hint budget-over-hint">Spending exceeds planned budget by ' + fmt(Math.abs(rem)) + '.</p>' : '') +
        '<p class="budget-hint">Select an event above to edit its budget or manage expenses.</p>' +
        (all.length
          ? '<div class="budget-event-breakdown">' +
            all
              .map((e) => {
                const ex = S.scoped("expenses").filter((x) => x.eventId === e.id);
                const s = ex.reduce((a, x) => a + (+x.amount || 0), 0);
                const b = +e.budget || 0;
                return (
                  '<article class="budget-row glass-row"><div><strong>' +
                  esc(e.name) +
                  "</strong><small>" +
                  esc(e.type || "") +
                  '</small></div><div class="budget-row-nums"><span>' +
                  fmt(b) +
                  '</span><span class="muted">spent ' +
                  fmt(s) +
                  "</span><span>" +
                  (b - s < 0 ? fmt(Math.abs(b - s)) + ' over' : fmt(b - s) + ' left') +
                  "</span></div>" +
                  '<button type="button" class="btn btn-small" data-budget-pick="' +
                  e.id +
                  '">Manage</button></article>'
                );
              })
              .join("") +
            "</div>"
          : '<div class="empty empty-compact"><div class="empty-title">No events yet</div><p>Create an event to start tracking budget.</p></div>');
      root.querySelectorAll("[data-budget-pick]").forEach((b) => {
        b.onclick = () => {
          selected = b.dataset.budgetPick;
          $("budgetEventSelect").value = selected;
          render();
        };
      });
      return;
    }

    const ev = all.find((e) => e.id === selected);
    if (!ev) {
      selected = "";
      render();
      return;
    }
    if (label) label.textContent = "Showing budget for " + ev.name;
    const expenses = S.scoped("expenses").filter((x) => x.eventId === selected);
    const spent = expenses.reduce((a, x) => a + (+x.amount || 0), 0);
    const budget = +ev.budget || 0;
    const rem = budget - spent;
    const over = rem < 0;
    const pct = budget ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
    root.innerHTML =
      '<div class="budget-summary-cards">' +
      '<div class="budget-sum-card"><small>Budget</small><strong id="bwBudget">' +
      fmt(budget) +
      "</strong></div>" +
      '<div class="budget-sum-card"><small>Spent</small><strong>' +
      fmt(spent) +
      "</strong></div>" +
      '<div class="budget-sum-card"><small>' + (over ? 'Over budget' : 'Remaining') + '</small><strong>' +
      fmt(over ? Math.abs(rem) : rem) +
      "</strong></div>" +
      '<div class="budget-sum-card"><small>Progress</small><strong>' +
      pct +
      "%</strong></div>" +
      "</div>" +
      (over ? '<p class="budget-hint budget-over-hint">You are over budget by ' + fmt(Math.abs(rem)) + '.</p>' : '') +
      '<div class="budget-meter"><div class="meter"><span style="width:' +
      pct +
      '%"></span></div></div>' +
      '<div class="budget-actions-row">' +
      '<button type="button" class="btn btn-small" id="bwEditBudget">Edit Budget</button>' +
      '<button type="button" class="btn btn-primary btn-small" id="bwAddExpense">+ Add Expense</button>' +
      "</div>" +
      '<div id="bwEditPanel" class="expense-form" hidden>' +
      "<label>New budget (₹)<input type=\"number\" id=\"bwNewBudget\" min=\"0\" step=\"0.01\" value=\"" +
      budget +
      '"></label>' +
      '<div class="expense-form-actions"><button type="button" class="btn btn-small" id="bwEditCancel">Cancel</button>' +
      '<button type="button" class="btn btn-small btn-primary" id="bwEditSave">Save Budget</button></div></div>' +
      '<div id="bwExpenseForm" class="expense-form" hidden>' +
      '<input id="bwExpName" required placeholder="Expense name">' +
      '<input id="bwExpAmount" type="number" min="0" step="0.01" required placeholder="Amount (₹)">' +
      '<select id="bwExpCat"><option>Venue</option><option>Catering</option><option>Decor</option><option>Photography</option><option>Entertainment</option><option>Food</option><option>Other</option></select>' +
      '<input id="bwExpDate" type="date">' +
      '<input id="bwExpNotes" placeholder="Notes (optional)">' +
      '<input type="hidden" id="bwExpEditId" value="">' +
      '<div class="expense-form-actions"><button type="button" class="btn btn-small" id="bwExpCancel">Cancel</button>' +
      '<button type="button" class="btn btn-small btn-primary" id="bwExpSave">Add Expense</button></div>' +
      '<p class="form-error" id="bwExpError" hidden></p></div>' +
      '<h3 class="budget-section-title">Expenses</h3>' +
      '<div id="bwExpenseList" class="expense-list">' +
      (expenses.length
        ? expenses
            .map(
              (q) =>
                '<div class="expense-item"><div class="expense-main"><strong>' +
                esc(q.name) +
                "</strong><small>" +
                esc(
                  [q.category, q.date, q.notes].filter(Boolean).join(" · "),
                ) +
                '</small></div><div class="expense-side"><strong>' +
                fmt(q.amount) +
                '</strong><button type="button" class="tiny-btn" data-bw-edit="' +
                q.id +
                '">Edit</button><button type="button" class="tiny-btn danger" data-bw-del="' +
                q.id +
                '">Delete</button></div></div>',
            )
            .join("")
        : '<div class="empty empty-compact"><div class="empty-title">No expenses yet</div><p>Add expenses to see spending against budget.</p></div>') +
      "</div>";

    $("bwEditBudget").onclick = () => {
      $("bwEditPanel").hidden = false;
      $("bwExpenseForm").hidden = true;
    };
    $("bwEditCancel").onclick = () => {
      $("bwEditPanel").hidden = true;
    };
    $("bwEditSave").onclick = () => {
      const v = Number($("bwNewBudget").value);
      if (!Number.isFinite(v) || v < 0) {
        toast("Enter a valid budget amount.");
        return;
      }
      S.update("events", selected, { budget: v });
      toast("Budget updated successfully.");
      document.dispatchEvent(new Event("ee:render"));
      render();
    };
    $("bwAddExpense").onclick = () => {
      $("bwExpenseForm").hidden = false;
      $("bwEditPanel").hidden = true;
      $("bwExpEditId").value = "";
      $("bwExpSave").textContent = "Add Expense";
      $("bwExpName").value = "";
      $("bwExpAmount").value = "";
      $("bwExpDate").value = new Date().toISOString().slice(0, 10);
      $("bwExpNotes").value = "";
      $("bwExpName").focus();
    };
    $("bwExpCancel").onclick = () => {
      $("bwExpenseForm").hidden = true;
    };
    $("bwExpSave").onclick = () => {
      const name = $("bwExpName").value.trim();
      const amount = Number($("bwExpAmount").value);
      const err = $("bwExpError");
      if (!name) {
        err.textContent = "Expense name is required.";
        err.hidden = false;
        return;
      }
      if (!Number.isFinite(amount) || amount < 0) {
        err.textContent = "Enter a valid amount.";
        err.hidden = false;
        return;
      }
      err.hidden = true;
      const patch = {
        name,
        amount,
        category: $("bwExpCat").value,
        date: $("bwExpDate").value,
        notes: $("bwExpNotes").value.trim(),
      };
      const editId = $("bwExpEditId").value;
      if (editId) {
        S.update("expenses", editId, patch);
        toast("Expense updated successfully.");
      } else {
        S.add("expenses", { eventId: selected, ...patch });
        toast("Expense added successfully.");
      }
      document.dispatchEvent(new Event("ee:render"));
      render();
    };
    root.querySelectorAll("[data-bw-edit]").forEach((b) => {
      b.onclick = () => {
        const q = expenses.find((x) => x.id === b.dataset.bwEdit);
        if (!q) return;
        $("bwExpenseForm").hidden = false;
        $("bwExpEditId").value = q.id;
        $("bwExpName").value = q.name || "";
        $("bwExpAmount").value = q.amount || "";
        $("bwExpCat").value = q.category || "Other";
        $("bwExpDate").value = q.date || "";
        $("bwExpNotes").value = q.notes || "";
        $("bwExpSave").textContent = "Save Changes";
      };
    });
    root.querySelectorAll("[data-bw-del]").forEach((b) => {
      b.onclick = () => {
        confirmBox("Delete this expense?", "Spending and remaining budget will update.", "Delete", () => {
          S.remove("expenses", b.dataset.bwDel);
          toast("Expense deleted successfully.");
          document.dispatchEvent(new Event("ee:render"));
          render();
        });
      };
    });
  }

  function init() {
    const sel = $("budgetEventSelect");
    if (sel)
      sel.onchange = () => {
        selected = sel.value || "";
        render();
      };
    document.addEventListener("ee:render", () => {
      if (document.querySelector('[data-view-panel="budget"].active')) render();
      else fillSelector();
    });
    document.addEventListener("ee:view", (e) => {
      if (e.detail === "budget") render();
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  window.EEBudget = {
    render,
    select(id) {
      selected = id || "";
      render();
    },
  };
})();
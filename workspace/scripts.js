/* ============================================
   Nexus CRM — app logic
   ============================================ */

(function () {
  "use strict";

  var STORAGE_KEY = "nexus.crm.contacts.v1";

  /* ---------- Elements ---------- */
  var navItems = Array.prototype.slice.call(document.querySelectorAll(".nav__item"));
  var navCount = document.getElementById("navCount");
  var viewTitle = document.getElementById("viewTitle");
  var viewSub = document.getElementById("viewSub");
  var searchInput = document.getElementById("searchInput");
  var addBtn = document.getElementById("addContactBtn");

  var contactsView = document.getElementById("contactsView");
  var pipelineView = document.getElementById("pipelineView");
  var contactRows = document.getElementById("contactRows");
  var emptyState = document.getElementById("emptyState");
  var emptyTitle = emptyState.querySelector(".empty__title");
  var emptyText = emptyState.querySelector(".empty__text");
  var countLabel = document.getElementById("countLabel");
  var filterButtons = Array.prototype.slice.call(document.querySelectorAll(".filter"));
  var board = document.getElementById("board");

  var statTotal = document.getElementById("statTotal");
  var statTotalSub = document.getElementById("statTotalSub");
  var statLeads = document.getElementById("statLeads");
  var statLeadsSub = document.getElementById("statLeadsSub");
  var statCustomers = document.getElementById("statCustomers");
  var statCustomersSub = document.getElementById("statCustomersSub");
  var statPipeline = document.getElementById("statPipeline");
  var statPipelineSub = document.getElementById("statPipelineSub");
  var healthText = document.getElementById("healthText");
  var meterFill = document.getElementById("meterFill");

  var modal = document.getElementById("modal");
  var modalCard = modal.querySelector(".modal__card");
  var modalTitle = document.getElementById("modalTitle");
  var modalSub = document.getElementById("modalSub");
  var modalClose = document.getElementById("modalClose");
  var form = document.getElementById("contactForm");
  var formError = document.getElementById("formError");
  var saveBtn = document.getElementById("saveBtn");
  var fName = document.getElementById("fName");
  var fCompany = document.getElementById("fCompany");
  var fEmail = document.getElementById("fEmail");
  var fPhone = document.getElementById("fPhone");
  var fStatus = document.getElementById("fStatus");
  var fValue = document.getElementById("fValue");
  var toastEl = document.getElementById("toast");

  /* ---------- State ---------- */
  var STATUSES = [
    { key: "lead", label: "Lead" },
    { key: "active", label: "Active" },
    { key: "customer", label: "Customer" }
  ];
  var STATUS_LABEL = { lead: "Lead", active: "Active", customer: "Customer" };
  var AVATAR_COLORS = ["#3b5bdb", "#0ca678", "#e8590c", "#9c36b5", "#1c7ed6", "#c2255c", "#5c6b8a"];

  var contacts = [];
  var currentView = "contacts";
  var activeFilter = "all";
  var query = "";
  var editingId = null;
  var toastTimer = null;
  var lastFocused = null;

  var moneyFmt;
  try {
    moneyFmt = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    });
  } catch (err) {
    moneyFmt = null;
  }

  /* ---------- Helpers ---------- */
  function money(n) {
    var num = Number(n) || 0;
    if (moneyFmt) return moneyFmt.format(num);
    return "$" + Math.round(num);
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function svgIcon(paths, width) {
    var wrap = document.createElement("span");
    wrap.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' +
      (width || 2) +
      '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      paths +
      "</svg>";
    return wrap.firstChild;
  }

  function initials(name) {
    var parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function avatarColor(name) {
    var sum = 0;
    var str = String(name || "");
    for (var i = 0; i < str.length; i++) sum += str.charCodeAt(i);
    return AVATAR_COLORS[sum % AVATAR_COLORS.length];
  }

  function uid() {
    return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function statusIndex(key) {
    for (var i = 0; i < STATUSES.length; i++) {
      if (STATUSES[i].key === key) return i;
    }
    return 0;
  }

  function focusQuietly(node) {
    if (!node || typeof node.focus !== "function") return;
    try {
      node.focus({ preventScroll: true });
    } catch (err) {
      node.focus();
    }
  }

  /* ---------- Persistence ---------- */
  function normalize(raw) {
    if (!raw || typeof raw !== "object") return null;
    var name = typeof raw.name === "string" ? raw.name.trim() : "";
    if (!name) return null;
    var status = STATUS_LABEL[raw.status] ? raw.status : "lead";
    return {
      id: typeof raw.id === "string" && raw.id ? raw.id : uid(),
      name: name.slice(0, 60),
      company: typeof raw.company === "string" ? raw.company.slice(0, 60) : "",
      email: typeof raw.email === "string" ? raw.email.slice(0, 80) : "",
      phone: typeof raw.phone === "string" ? raw.phone.slice(0, 30) : "",
      status: status,
      value: Math.max(0, Number(raw.value) || 0)
    };
  }

  function loadContactList() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return null;
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(normalize).filter(Boolean);
    } catch (err) {
      return null;
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
    } catch (err) {
      /* storage unavailable — keep working in memory */
    }
  }

  function seedContacts() {
    return [
      { id: uid(), name: "Amelia Hart", company: "Lumen Studio", email: "amelia@lumen.io", phone: "+1 555 0142", status: "lead", value: 4200 },
      { id: uid(), name: "Marcus Chen", company: "Northwind Labs", email: "marcus@northwind.co", phone: "+1 555 0198", status: "active", value: 12800 },
      { id: uid(), name: "Priya Nair", company: "Brightline Co", email: "priya@brightline.com", phone: "+1 555 0177", status: "customer", value: 24500 },
      { id: uid(), name: "Diego Alvarez", company: "Kite & Co", email: "diego@kiteco.com", phone: "+1 555 0123", status: "lead", value: 6800 },
      { id: uid(), name: "Sofia Rossi", company: "Vela Health", email: "sofia@velahealth.io", phone: "+1 555 0155", status: "active", value: 15200 }
    ];
  }

  /* ---------- Derived data ---------- */
  function stats() {
    var total = contacts.length;
    var leads = contacts.filter(function (c) { return c.status === "lead"; });
    var actives = contacts.filter(function (c) { return c.status === "active"; });
    var customers = contacts.filter(function (c) { return c.status === "customer"; });

    function sum(arr) {
      return arr.reduce(function (acc, c) { return acc + c.value; }, 0);
    }

    return {
      total: total,
      leads: leads.length,
      leadValue: sum(leads),
      customers: customers.length,
      customerValue: sum(customers),
      openCount: leads.length + actives.length,
      openValue: sum(leads) + sum(actives)
    };
  }

  function visibleContacts() {
    var q = query.trim().toLowerCase();
    return contacts.filter(function (c) {
      if (activeFilter !== "all" && c.status !== activeFilter) return false;
      if (!q) return true;
      var haystack = [c.name, c.company, c.email, c.phone].join(" ").toLowerCase();
      return haystack.indexOf(q) !== -1;
    });
  }

  /* ---------- Render: stats ---------- */
  function renderStats() {
    var s = stats();

    statTotal.textContent = String(s.total);
    statTotalSub.textContent = s.total === 1 ? "contact in your workspace" : "contacts in your workspace";

    statLeads.textContent = String(s.leads);
    statLeadsSub.textContent = money(s.leadValue) + " potential";

    statCustomers.textContent = String(s.customers);
    statCustomersSub.textContent = money(s.customerValue) + " closed value";

    statPipeline.textContent = money(s.openValue);
    statPipelineSub.textContent =
      s.openCount + (s.openCount === 1 ? " deal in progress" : " deals in progress");

    navCount.textContent = String(s.total);

    var pct = s.total ? Math.round((s.customers / s.total) * 100) : 0;
    meterFill.style.width = pct + "%";
    healthText.textContent = s.total
      ? pct + "% of contacts converted to customers."
      : "Add contacts to start tracking.";
  }

  /* ---------- Render: contacts ---------- */
  function renderContacts() {
    var items = visibleContacts();
    var s = stats();

    contactRows.innerHTML = "";

    items.forEach(function (c) {
      var row = el("div", "row row--body");
      row.dataset.id = c.id;

      /* person */
      var person = el("div", "cell cell--person");
      var avatar = el("span", "avatar", initials(c.name));
      avatar.style.background = avatarColor(c.name);
      var info = el("div", "person__info");
      info.appendChild(el("p", "person__name", c.name));
      var metaBits = [c.company, c.email].filter(Boolean);
      info.appendChild(
        el("p", "person__meta", metaBits.length ? metaBits.join(" · ") : "No company or email yet")
      );
      person.appendChild(avatar);
      person.appendChild(info);

      /* status */
      var statusCell = el("div", "cell cell--status");
      var pill = el("span", "pill", STATUS_LABEL[c.status]);
      pill.dataset.status = c.status;
      statusCell.appendChild(pill);

      /* value */
      var valueCell = el("div", "cell cell--value", money(c.value));

      /* actions */
      var actions = el("div", "cell cell--actions");

      var editBtn = el("button", "icon-btn");
      editBtn.type = "button";
      editBtn.setAttribute("aria-label", "Edit " + c.name);
      editBtn.appendChild(
        svgIcon('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>', 1.9)
      );
      editBtn.addEventListener("click", function () { openModal(c); });

      var delBtn = el("button", "icon-btn icon-btn--danger");
      delBtn.type = "button";
      delBtn.setAttribute("aria-label", "Delete " + c.name);
      delBtn.appendChild(
        svgIcon(
          '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>',
          1.9
        )
      );
      delBtn.addEventListener("click", function () { deleteContact(c.id); });

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      row.appendChild(person);
      row.appendChild(statusCell);
      row.appendChild(valueCell);
      row.appendChild(actions);
      contactRows.appendChild(row);
    });

    /* empty state */
    if (!items.length) {
      emptyState.classList.add("is-visible");
      if (!contacts.length) {
        emptyTitle.textContent = "No contacts yet";
        emptyText.textContent = "Add your first contact to start building your pipeline.";
      } else if (query.trim()) {
        emptyTitle.textContent = "No matches";
        emptyText.textContent = "Nothing matched \u201c" + query.trim() + "\u201d. Try a different search term.";
      } else {
        emptyTitle.textContent = "Nothing in this stage";
        emptyText.textContent = "Switch the filter or move a contact into this stage.";
      }
    } else {
      emptyState.classList.remove("is-visible");
    }

    countLabel.textContent =
      items.length + " of " + s.total + (s.total === 1 ? " contact" : " contacts");
  }

  /* ---------- Render: pipeline board ---------- */
  function renderBoard() {
    board.innerHTML = "";

    STATUSES.forEach(function (stage, index) {
      var items = contacts.filter(function (c) { return c.status === stage.key; });

      var col = el("div", "column");
      col.dataset.status = stage.key;

      var head = el("div", "column__head");
      head.appendChild(el("span", "column__dot"));
      head.appendChild(el("span", "column__title", stage.label));
      head.appendChild(el("span", "column__count", String(items.length)));
      col.appendChild(head);

      var listWrap = el("div", "column__list");

      if (!items.length) {
        listWrap.appendChild(el("p", "column__empty", "No contacts in this stage yet"));
      }

      items.forEach(function (c) {
        var card = el("article", "deal");

        card.appendChild(el("p", "deal__name", c.name));
        card.appendChild(el("p", "deal__company", c.company || c.email || "No company"));

        var foot = el("div", "deal__foot");
        foot.appendChild(el("span", "deal__value", money(c.value)));

        var moves = el("div", "deal__moves");

        var back = el("button", "move-btn");
        back.type = "button";
        back.setAttribute("aria-label", "Move " + c.name + " back a stage");
        back.disabled = index === 0;
        back.appendChild(svgIcon('<path d="M15 18l-6-6 6-6"/>', 2.4));
        back.addEventListener("click", function () { moveStage(c.id, -1); });

        var next = el("button", "move-btn");
        next.type = "button";
        next.setAttribute("aria-label", "Move " + c.name + " forward a stage");
        next.disabled = index === STATUSES.length - 1;
        next.appendChild(svgIcon('<path d="M9 18l6-6-6-6"/>', 2.4));
        next.addEventListener("click", function () { moveStage(c.id, 1); });

        moves.appendChild(back);
        moves.appendChild(next);

        foot.appendChild(moves);
        card.appendChild(foot);
        listWrap.appendChild(card);
      });

      col.appendChild(listWrap);

      var total = items.reduce(function (acc, c) { return acc + c.value; }, 0);
      var footWrap = el("div", "column__foot");
      footWrap.appendChild(el("span", null, "Stage total"));
      footWrap.appendChild(el("strong", null, money(total)));
      col.appendChild(footWrap);

      board.appendChild(col);
    });
  }

  /* ---------- Render all ---------- */
  function renderAll() {
    renderStats();
    renderContacts();
    renderBoard();
  }

  /* ---------- Actions ---------- */
  function moveStage(id, direction) {
    contacts = contacts.map(function (c) {
      if (c.id !== id) return c;
      var idx = statusIndex(c.status) + direction;
      if (idx < 0) idx = 0;
      if (idx > STATUSES.length - 1) idx = STATUSES.length - 1;
      return {
        id: c.id,
        name: c.name,
        company: c.company,
        email: c.email,
        phone: c.phone,
        status: STATUSES[idx].key,
        value: c.value
      };
    });
    persist();
    renderAll();
  }

  function deleteContact(id) {
    var target = contacts.filter(function (c) { return c.id === id; })[0];
    contacts = contacts.filter(function (c) { return c.id !== id; });
    persist();
    renderAll();
    if (target) showToast(target.name + " removed");
  }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("is-visible");
    }, 2400);
  }

  /* ---------- Scroll lock (no layout shift) ---------- */
  function lockScroll() {
    var root = document.documentElement;
    var gap = window.innerWidth - root.clientWidth;
    if (gap > 0) {
      document.body.style.paddingRight = gap + "px";
    }
    root.classList.add("is-scroll-locked");
  }

  function unlockScroll() {
    document.documentElement.classList.remove("is-scroll-locked");
    document.body.style.paddingRight = "";
  }

  /* ---------- Modal ---------- */
  function openModal(contact) {
    lastFocused = document.activeElement;
    editingId = contact ? contact.id : null;
    formError.classList.remove("is-visible");
    fName.classList.remove("is-invalid");
    fEmail.classList.remove("is-invalid");

    if (contact) {
      modalTitle.textContent = "Edit contact";
      modalSub.textContent = "Update details for " + contact.name + ".";
      saveBtn.textContent = "Save changes";
      fName.value = contact.name;
      fCompany.value = contact.company;
      fEmail.value = contact.email;
      fPhone.value = contact.phone;
      fStatus.value = contact.status;
      fValue.value = contact.value ? String(contact.value) : "";
    } else {
      modalTitle.textContent = "New contact";
      modalSub.textContent = "Add someone to your workspace.";
      saveBtn.textContent = "Save contact";
      form.reset();
      fStatus.value = "lead";
    }

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    lockScroll();
    modalCard.scrollTop = 0;

    /* Wait for the first painted frame before focusing, so the
       caret + focus ring don't fight the entry animation. */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (modal.classList.contains("is-open")) focusQuietly(fName);
      });
    });
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    unlockScroll();
    editingId = null;

    if (lastFocused && typeof lastFocused.focus === "function") {
      focusQuietly(lastFocused);
    }
    lastFocused = null;
  }

  function fail(message, field) {
    formError.textContent = message;
    formError.classList.add("is-visible");
    if (field) {
      field.classList.add("is-invalid");
      focusQuietly(field);
    }
  }

  /* ---------- View switching ---------- */
  function switchView(view) {
    currentView = view;
    contactsView.classList.toggle("is-active", view === "contacts");
    pipelineView.classList.toggle("is-active", view === "pipeline");

    navItems.forEach(function (btn) {
      btn.classList.toggle("is-active", btn.dataset.view === view);
    });

    if (view === "pipeline") {
      viewTitle.textContent = "Pipeline";
      viewSub.textContent = "Move deals forward as they progress.";
    } else {
      viewTitle.textContent = "Contacts";
      viewSub.textContent = "Your workspace at a glance.";
    }
  }

  /* ---------- Events ---------- */
  navItems.forEach(function (btn) {
    btn.addEventListener("click", function () { switchView(btn.dataset.view); });
  });

  searchInput.addEventListener("input", function () {
    query = searchInput.value;
    renderContacts();
  });

  filterButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      activeFilter = btn.dataset.filter;
      filterButtons.forEach(function (b) {
        var isActive = b === btn;
        b.classList.toggle("is-active", isActive);
        b.setAttribute("aria-selected", isActive ? "true" : "false");
      });
      renderContacts();
    });
  });

  addBtn.addEventListener("click", function () { openModal(null); });
  modalClose.addEventListener("click", closeModal);

  Array.prototype.slice.call(document.querySelectorAll("[data-close]")).forEach(function (node) {
    node.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    formError.classList.remove("is-visible");
    fName.classList.remove("is-invalid");
    fEmail.classList.remove("is-invalid");

    var name = fName.value.trim();
    var email = fEmail.value.trim();

    if (!name) {
      fail("Please enter a name for this contact.", fName);
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      fail("That email address doesn't look right.", fEmail);
      return;
    }

    var payload = {
      name: name,
      company: fCompany.value.trim(),
      email: email,
      phone: fPhone.value.trim(),
      status: STATUS_LABEL[fStatus.value] ? fStatus.value : "lead",
      value: Math.max(0, Number(fValue.value) || 0)
    };

    if (editingId) {
      contacts = contacts.map(function (c) {
        if (c.id !== editingId) return c;
        return {
          id: c.id,
          name: payload.name.slice(0, 60),
          company: payload.company.slice(0, 60),
          email: payload.email.slice(0, 80),
          phone: payload.phone.slice(0, 30),
          status: payload.status,
          value: payload.value
        };
      });
      showToast(payload.name + " updated");
    } else {
      contacts.unshift({
        id: uid(),
        name: payload.name.slice(0, 60),
        company: payload.company.slice(0, 60),
        email: payload.email.slice(0, 80),
        phone: payload.phone.slice(0, 30),
        status: payload.status,
        value: payload.value
      });
      showToast(payload.name + " added");
    }

    persist();
    closeModal();
    renderAll();
  });

  /* ---------- Boot ---------- */
  var stored = loadContactList();
  if (stored === null) {
    contacts = seedContacts();
    persist();
  } else {
    contacts = stored;
  }

  renderAll();
  switchView("contacts");
})();

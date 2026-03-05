document.addEventListener("DOMContentLoaded", function() {
  var menuBtns = document.querySelectorAll(".menu-btn");
  var pages = document.querySelectorAll(".page");
  var form = document.getElementById("registrationForm");
  var blockSelect = document.getElementById("block");
  var apartmentInput = document.getElementById("apartmentNo");
  var residentTypeSelect = document.getElementById("residentType");
  var nameSurnameInput = document.getElementById("nameSurname");
  var submitBtn = document.getElementById("submitBtn");
  var btnText = submitBtn.querySelector(".btn-text");
  var btnLoading = submitBtn.querySelector(".btn-loading");
  var messageDiv = document.getElementById("message");
  var filterBlock = document.getElementById("filterBlock");
  var totalCount = document.getElementById("totalCount");
  var listContainer = document.getElementById("registrationsList");
  var allRegistrations = [];
  menuBtns.forEach(function(btn) {
    btn.addEventListener("click", function() {
      var t = btn.getAttribute("data-page");
      menuBtns.forEach(function(b) { b.classList.remove("active"); });
      btn.classList.add("active");
      pages.forEach(function(p) { p.classList.remove("active"); });
      document.getElementById("page-" + t).classList.add("active");
      if (t === "list") { loadRegistrations(); }
    });
  });

  [blockSelect, apartmentInput, residentTypeSelect, nameSurnameInput].forEach(function(el) {
    el.addEventListener("input", function() { el.classList.remove("error"); hideMessage(); });
    el.addEventListener("change", function() { el.classList.remove("error"); hideMessage(); });
  });

  form.addEventListener("submit", function(e) {
    e.preventDefault();
    clearErrors(); hideMessage();
    var hasError = false;
    if (!blockSelect.value) { blockSelect.classList.add("error"); hasError = true; }
    var aptNo = parseInt(apartmentInput.value, 10);
    if (!apartmentInput.value || isNaN(aptNo) || aptNo < 1) { apartmentInput.classList.add("error"); hasError = true; }
    if (!residentTypeSelect.value) { residentTypeSelect.classList.add("error"); hasError = true; }
    if (!nameSurnameInput.value.trim() || nameSurnameInput.value.trim().length < 3) { nameSurnameInput.classList.add("error"); hasError = true; }
    if (hasError) { showMessage("Lutfen tum alanlari doldurunuz.", "error"); return; }
    setLoading(true);
    fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ block: blockSelect.value, apartmentNo: aptNo, residentType: residentTypeSelect.value, nameSurname: nameSurnameInput.value.trim() })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) { showMessage(data.message, "success"); form.reset(); }
      else { showMessage(data.message, "error"); }
    })
    .catch(function() { showMessage("Baglanti hatasi.", "error"); })
    .finally(function() { setLoading(false); });
  });

  filterBlock.addEventListener("change", function() { renderList(); });

  var exportBtn = document.getElementById("exportBtn");
  exportBtn.addEventListener("click", function() {
    var filter = filterBlock.value;
    var url = "/api/export-excel";
    if (filter) { url += "?block=" + filter; }
    window.location.href = url;
  });

  function loadRegistrations() {
    listContainer.textContent = "Yukleniyor...";
    fetch("/api/registrations")
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.success) { allRegistrations = data.data; renderList(); }
        else { listContainer.textContent = "Veriler yuklenemedi."; }
      })
      .catch(function() { listContainer.textContent = "Baglanti hatasi."; });
  }

  function renderList() {
    var filter = filterBlock.value;
    var filtered = allRegistrations;
    if (filter) { filtered = allRegistrations.filter(function(r) { return r.block === filter; }); }
    totalCount.textContent = filtered.length;
    if (filtered.length === 0) {
      listContainer.textContent = filter ? filter + " Blok icin kayit bulunamadi." : "Henuz kayit bulunmuyor.";
      return;
    }
    var tbl = document.createElement("table");
    tbl.className = "reg-table";
    var thead = document.createElement("thead");
    var hr = document.createElement("tr");
    ["#", "Blok", "Daire No", "Oturum Sekli", "Tarih"].forEach(function(t) {
      var th = document.createElement("th");
      th.textContent = t;
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    tbl.appendChild(thead);
    var tbody = document.createElement("tbody");
    filtered.forEach(function(r, i) {
      var tr = document.createElement("tr");
      var td1 = document.createElement("td");
      td1.textContent = i + 1;
      tr.appendChild(td1);
      var td2 = document.createElement("td");
      var strong = document.createElement("strong");
      strong.textContent = r.block;
      td2.appendChild(strong);
      tr.appendChild(td2);
      var td3 = document.createElement("td");
      td3.textContent = r.apartment_no;
      tr.appendChild(td3);
      var td4 = document.createElement("td");
      var sp = document.createElement("span");
      sp.className = "badge " + (r.resident_type === "Ev Sahibi" ? "badge-owner" : "badge-tenant");
      sp.textContent = r.resident_type;
      td4.appendChild(sp);
      tr.appendChild(td4);
      var td5 = document.createElement("td");
      var dt = new Date(r.created_at);
      td5.textContent = dt.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
      tr.appendChild(td5);
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
    listContainer.innerHTML = "";
    listContainer.appendChild(tbl);
  }

  function showMessage(text, type) { messageDiv.textContent = text; messageDiv.className = "message " + type; }
  function hideMessage() { messageDiv.className = "message hidden"; }
  function clearErrors() { document.querySelectorAll(".error").forEach(function(el) { el.classList.remove("error"); }); }
  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    btnText.className = isLoading ? "btn-text hidden" : "btn-text";
    btnLoading.className = isLoading ? "btn-loading" : "btn-loading hidden";
  }
});
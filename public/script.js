document.addEventListener("DOMContentLoaded", function () {
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

  menuBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var targetPage = btn.getAttribute("data-page");
      menuBtns.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      pages.forEach(function (p) { p.classList.remove("active"); });
      document.getElementById("page-" + targetPage).classList.add("active");
      if (targetPage === "list") { loadRegistrations(); }
    });
  });

  var formFields = [blockSelect, apartmentInput, residentTypeSelect, nameSurnameInput];
  formFields.forEach(function (el) {
    el.addEventListener("input", function () { el.classList.remove("error"); hideMessage(); });
    el.addEventListener("change", function () { el.classList.remove("error"); hideMessage(); });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    clearErrors();
    hideMessage();
    var hasError = false;
    if (!blockSelect.value) { blockSelect.classList.add("error"); hasError = true; }
    var aptNo = parseInt(apartmentInput.value, 10);
    if (!apartmentInput.value || isNaN(aptNo) || aptNo < 1) { apartmentInput.classList.add("error"); hasError = true; }
    if (!residentTypeSelect.value) { residentTypeSelect.classList.add("error"); hasError = true; }
    if (!nameSurnameInput.value.trim() || nameSurnameInput.value.trim().length < 3) { nameSurnameInput.classList.add("error"); hasError = true; }
    if (hasError) { showMessage("Lutfen tum alanlari dogru sekilde doldurunuz.", "error"); return; }
    setLoading(true);
    fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ block: blockSelect.value, apartmentNo: aptNo, residentType: residentTypeSelect.value, nameSurname: nameSurnameInput.value.trim() })
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.success) { showMessage(data.message, "success"); form.reset(); }
      else { showMessage(data.message, "error"); }
    })
    .catch(function () { showMessage("Baglanti hatasi. Lutfen tekrar deneyiniz.", "error"); })
    .finally(function () { setLoading(false); });
  });

  filterBlock.addEventListener("change", function () { renderList(); });

  function loadRegistrations() {
    listContainer.innerHTML = "<p class=\"loading-text\">Yukleniyor...</p>";
    fetch("/api/registrations")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.success) { allRegistrations = data.data; renderList(); }
        else { listContainer.innerHTML = "<p class=\"loading-text\">Veriler yuklenemedi.</p>"; }
      })
      .catch(function () { listContainer.innerHTML = "<p class=\"loading-text\">Baglanti hatasi.</p>"; });
  }

  function renderList() {
    var filter = filterBlock.value;
    var filtered = allRegistrations;
    if (filter) { filtered = allRegistrations.filter(function (r) { return r.block === filter; }); }
    totalCount.textContent = filtered.length;
    if (filtered.length === 0) {
      listContainer.innerHTML = "<div class=\"empty-state\"><div class=\"empty-icon\">&#128237;</div><p>" + (filter ? filter + " Blok icin kayit bulunamadi." : "Henuz kayit bulunmuyor.") + "</p></div>";
      return;
    }
    var html = "<table class=\"reg-table\"><thead><tr><th>#</th><th>Blok</th><th>Daire No</th><th>Oturum Sekli</th><th>Tarih</th></tr></thead><tbody>";
    filtered.forEach(function (r, i) {
      var date = new Date(r.created_at);
      var dateStr = date.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
      var badgeClass = r.resident_type === "Ev Sahibi" ? "badge-owner" : "badge-tenant";
      html += "<tr><td>" + (i + 1) + "</td><td><strong>" + r.block + "</strong></td><td>" + r.apartment_no + "</td><td><span class=\"badge " + badgeClass + "\">" + r.resident_type + "</span></td><td>" + dateStr + "</td></tr>";
    });
    html += "</tbody></table>";
    listContainer.innerHTML = html;
  }

  function showMessage(text, type) { messageDiv.textContent = text; messageDiv.className = "message " + type; }
  function hideMessage() { messageDiv.className = "message hidden"; }
  function clearErrors() { document.querySelectorAll(".error").forEach(function (el) { el.classList.remove("error"); }); }
  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    btnText.className = isLoading ? "btn-text hidden" : "btn-text";
    btnLoading.className = isLoading ? "btn-loading" : "btn-loading hidden";
  }
});
(function () {
  "use strict";

  var input = document.getElementById("search-input");
  var status = document.getElementById("search-status");
  var results = document.getElementById("search-results");
  var typeFilters = document.querySelectorAll(".search-filter");
  var counterFilter = document.getElementById("search-filter-counter");

  var indexData = [];
  var loaded = false;

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function formatTag(format, counter) {
    var out = "";
    if (format === "deep") {
      out += '<span class="format-tag deep-read">Deep Read</span>';
    } else if (format === "brief") {
      out += '<span class="format-tag brief">Brief</span>';
    } else {
      out += '<span class="format-tag">Standard</span>';
    }
    if (counter) {
      out += '<span class="format-tag counter">Counter-Read</span>';
    }
    return out;
  }

  function activeTypes() {
    var active = [];
    typeFilters.forEach(function (cb) {
      if (cb.checked) active.push(cb.value);
    });
    return active;
  }

  function matches(entry, query, types, allowCounter) {
    if (types.indexOf(entry.format) === -1) return false;
    if (entry.counter && !allowCounter) return false;
    if (!query) return true;
    var haystack = (
      entry.title + " " +
      entry.description + " " +
      entry.source + " " +
      entry.partTitle + " " +
      entry.chapterTitle + " " +
      entry.subheading + " " +
      entry.body
    ).toLowerCase();
    var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return terms.every(function (t) { return haystack.indexOf(t) !== -1; });
  }

  function render() {
    if (!loaded) return;
    var query = input.value.trim();
    var types = activeTypes();
    var allowCounter = counterFilter.checked;

    var matched = indexData.filter(function (entry) {
      return matches(entry, query, types, allowCounter);
    });

    if (!query && types.length === 3 && allowCounter) {
      status.textContent = indexData.length + " entries indexed. Start typing to search.";
      results.innerHTML = "";
      return;
    }

    status.textContent = matched.length + (matched.length === 1 ? " result" : " results");

    results.innerHTML = matched.map(function (entry) {
      return (
        '<article class="entry search-result">' +
          formatTag(entry.format, entry.counter) +
          '<span class="stamp">' +
            '<span class="label">Maps to The Performance of Obedience</span>' +
            "Part " + escapeHtml(entry.part) + ": " + escapeHtml(entry.partTitle) +
            " &rarr; Chapter " + escapeHtml(entry.chapter) + ": " + escapeHtml(entry.chapterTitle) +
            (entry.subheading ? " &rarr; " + escapeHtml(entry.subheading) : "") +
          "</span>" +
          '<h2><a href="' + entry.url + '">' + escapeHtml(entry.title) + "</a></h2>" +
          '<p class="source-line">' + escapeHtml(entry.source) + " &middot; " + escapeHtml(entry.date) + "</p>" +
          '<p class="dek">' + escapeHtml(entry.description) + "</p>" +
        "</article>"
      );
    }).join("");
  }

  fetch("/search-index.json")
    .then(function (r) { return r.json(); })
    .then(function (data) {
      indexData = data;
      loaded = true;
      render();
    })
    .catch(function () {
      status.textContent = "Could not load the search index. Try reloading the page.";
    });

  input.addEventListener("input", render);
  typeFilters.forEach(function (cb) { cb.addEventListener("change", render); });
  counterFilter.addEventListener("change", render);
})();
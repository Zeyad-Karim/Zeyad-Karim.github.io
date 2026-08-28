(function () {
  var input = document.querySelector("[data-library-search]");
  var filters = Array.prototype.slice.call(document.querySelectorAll("[data-library-filter]"));
  var cards = Array.prototype.slice.call(document.querySelectorAll("[data-library-card]"));
  var result = document.querySelector("[data-library-result]");
  var empty = document.querySelector("[data-library-empty]");

  if (!input || !result) return;

  function filterCards() {
    var query = input.value.toLowerCase().trim();
    var visible = 0;
    cards.forEach(function (card) {
      var matchesQuery = !query || card.dataset.search.indexOf(query) !== -1;
      var matchesFilters = filters.every(function (filter) {
        var value = filter.value.toLowerCase();
        return !value || card.dataset[filter.dataset.libraryFilter] === value;
      });
      var show = matchesQuery && matchesFilters;
      card.classList.toggle("is-hidden", !show);
      if (show) visible += 1;
    });
    result.textContent = visible + " of " + cards.length + " research notes shown";
    if (empty) empty.classList.toggle("is-hidden", visible !== 0);
  }

  input.addEventListener("input", filterCards);
  filters.forEach(function (filter) { filter.addEventListener("change", filterCards); });
  filterCards();
}());

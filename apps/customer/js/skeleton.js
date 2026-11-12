/* ============================================================
   ABSHER BI - skeleton.js
   Skeleton loaders أنيقة بدل spinners
   ============================================================ */

function skeletonList(count, height) {
  var h = height || 80;
  var items = [];
  for (var i = 0; i < count; i++) {
    items.push(
      '<div class="sk-card" style="height:' + h + 'px">' +
        '<div class="sk-line sk-line-lg"></div>' +
        '<div class="sk-line sk-line-sm"></div>' +
        '<div class="sk-line sk-line-md"></div>' +
      '</div>'
    );
  }
  return '<div class="sk-list">' + items.join('') + '</div>';
}

function skeletonGrid(count) {
  var items = [];
  for (var i = 0; i < count; i++) {
    items.push(
      '<div class="sk-grid-item">' +
        '<div class="sk-image"></div>' +
        '<div class="sk-line sk-line-md"></div>' +
        '<div class="sk-line sk-line-sm"></div>' +
      '</div>'
    );
  }
  return '<div class="sk-grid">' + items.join('') + '</div>';
}

function skeletonProfile() {
  return [
    '<div class="sk-profile">',
      '<div class="sk-circle"></div>',
      '<div style="flex:1">',
        '<div class="sk-line sk-line-lg"></div>',
        '<div class="sk-line sk-line-sm"></div>',
        '<div class="sk-line sk-line-md"></div>',
      '</div>',
    '</div>',
  ].join('');
}

function skeletonStats(count) {
  var items = [];
  for (var i = 0; i < count; i++) {
    items.push(
      '<div class="sk-stat">' +
        '<div class="sk-line sk-line-xl"></div>' +
        '<div class="sk-line sk-line-xs"></div>' +
      '</div>'
    );
  }
  return '<div class="sk-stats">' + items.join('') + '</div>';
}

window.skeletonList = skeletonList;
window.skeletonGrid = skeletonGrid;
window.skeletonProfile = skeletonProfile;
window.skeletonStats = skeletonStats;

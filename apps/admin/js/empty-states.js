/* ============================================================
   ABSHER BI - empty-states.js
   Empty states أنيقة مع إجراءات
   ============================================================ */

function emptyState(opts) {
  var icon = opts.icon || '\uD83D\uDCE6';
  var title = opts.title || 'لا توجد بيانات';
  var description = opts.description || '';
  var actionLabel = opts.actionLabel;
  var actionOnClick = opts.actionOnClick;
  var secondaryActionLabel = opts.secondaryActionLabel;
  var secondaryActionOnClick = opts.secondaryActionOnClick;

  var html = [
    '<div class="empty-state">',
      '<div class="empty-state-icon">' + icon + '</div>',
      '<h3 class="empty-state-title">' + escapeHtml(title) + '</h3>',
  ];

  if (description) {
    html.push('<p class="empty-state-desc">' + escapeHtml(description) + '</p>');
  }

  if (actionLabel && actionOnClick) {
    html.push(
      '<button class="btn btn-primary" type="button" onclick="' + actionOnClick + '">',
        actionLabel,
      '</button>'
    );
  }

  if (secondaryActionLabel && secondaryActionOnClick) {
    html.push(
      '<button class="btn btn-secondary" type="button" style="margin-top:8px" onclick="' + secondaryActionOnClick + '">',
        secondaryActionLabel,
      '</button>'
    );
  }

  html.push('</div>');

  return html.join('');
}

function errorState(opts) {
  var message = opts.message || 'حدث خطأ';
  var retryLabel = opts.retryLabel || 'إعادة المحاولة';
  var retryOnClick = opts.retryOnClick;

  var html = [
    '<div class="empty-state error">',
      '<div class="empty-state-icon">\u26A0\uFE0F</div>',
      '<h3 class="empty-state-title">تعذر التحميل</h3>',
      '<p class="empty-state-desc">' + escapeHtml(message) + '</p>',
  ];

  if (retryOnClick) {
    html.push(
      '<button class="btn btn-secondary" type="button" onclick="' + retryOnClick + '">',
        '\uD83D\uDD04 ' + retryLabel,
      '</button>'
    );
  }

  html.push('</div>');
  return html.join('');
}

window.emptyState = emptyState;
window.errorState = errorState;

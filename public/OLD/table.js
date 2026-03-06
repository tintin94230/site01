export function buildTable(data) {
  if (!data.length) return '<p class="empty">Aucune donnée disponible.</p>';

  const columns = Object.keys(data[0]);

  let html = '<table><thead><tr>';
  columns.forEach(col => html += `<th>${col}</th>`);
  html += '</tr></thead><tbody>';

  data.forEach(row => {
    html += '<tr>';
    columns.forEach(col => {
      html += `<td data-label="${col}">${row[col] ?? ''}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  return html;
}
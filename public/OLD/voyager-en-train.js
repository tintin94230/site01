// voyager-en-train.js

const selectPays = document.getElementById('pays-select');
const infoPaysDiv = document.getElementById('info-pays');
const tableAvantagesDiv = document.getElementById('table-avantages');
const tableinfos_paysDiv = document.getElementById('table-infos-detaillees');

// ===============================
// 🔄 Charger la liste des pays
// ===============================
async function chargerPays() {
  try {
    const res = await fetch('/api/supabasePays');
    if (!res.ok) throw new Error('Erreur réseau');

    const json = await res.json();

    // 🔥 Ici on prend le tableau dans json.data
    const pays = json.data;

    if (!Array.isArray(pays)) {
      throw new Error("Format API invalide : data n'est pas un tableau");
    }

    selectPays.innerHTML = '<option value="">-- Sélectionner --</option>';

    // (optionnel) tri alphabétique
    pays.sort((a, b) => a.nom.localeCompare(b.nom));

    pays.forEach(p => {
      const option = document.createElement('option');
      option.value = p.id;
      option.textContent = `${p.nom} (${p.code_iso})`;
      selectPays.appendChild(option);
    });

  } catch (err) {
    console.error('Erreur récupération pays :', err);
  }
}

// ===============================
// 🧱 Générateur de table premium
// ===============================
function creerTable(columns, data) {

  const table = document.createElement('table');

  // THEAD
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');

  columns.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col.label;
    headRow.appendChild(th);
  });

  thead.appendChild(headRow);
  table.appendChild(thead);

  // TBODY
  const tbody = document.createElement('tbody');

  data.forEach(row => {
    const tr = document.createElement('tr');

    columns.forEach(col => {
      const td = document.createElement('td');

      let value = row[col.key];

      if (value === null || value === undefined || value === 9999) {
        value = '';
      }

      // Format €
      if (col.format === 'euro' && value) {
        value = value + ' €';
      }

      // Format %
      if (col.format === 'percent' && value) {
        value = value + ' %';
      }

      td.textContent = value ?? '';
      td.setAttribute('data-label', col.label);
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  return table;
}

// ===============================
// 🎯 Changement de pays
// ===============================
selectPays.addEventListener('change', async (e) => {

  const paysId = e.target.value;

  infoPaysDiv.innerHTML = '';
  tableAvantagesDiv.innerHTML = '';
  tableinfos_paysDiv.innerHTML = '';

  if (!paysId) return;

  // Loader
  tableAvantagesDiv.innerHTML = '<div class="loader"></div>';
  tableinfos_paysDiv.innerHTML = '<div class="loader"></div>';

  try {

    // ===============================
    // 📌 Infos générales pays
    // ===============================
    const resPays = await fetch(`/api/supabasePays?id=${paysId}`);
    const paysData = await resPays.json();


infoPaysDiv.innerHTML = `
  <p><strong>Nom :</strong> ${paysData.nom}</p>
  <p><strong>Code ISO :</strong> ${paysData.code_iso}</p>
`;
    // ===============================
    // 🚆 Avantages FIP
    // ===============================
    const resAvantages = await fetch(`/api/supabaseAvantages?pays_id=${paysId}`);
    const avantages = await resAvantages.json();

    tableAvantagesDiv.innerHTML = '';

    if (avantages.length > 0) {

      const columns = [
        { key: 'nom', label: 'Transporteur' },
        { key: 'reduction_percent', label: 'Réduction', format: 'percent' },
        { key: 'prix_forfaitaire_2nde', label: 'Forfait 2ème', format: 'euro' }
      ];

      const table = creerTable(columns, avantages);
      tableAvantagesDiv.appendChild(table);

    } else {
      tableAvantagesDiv.innerHTML = '<p>Aucun avantage pour ce pays.</p>';
    }

    // ===============================
    // 📚 Infos détaillées
    // ===============================

    const resInfos = await fetch(`/api/supabaseInfoPays?pays_id=${paysId}`);
    const infos_pays = await resInfos.json();

    tableinfos_paysDiv.innerHTML = '';

    if (infos_pays.length > 0) {

      const columns = [
        { key: 'titre', label: 'Titre' },
        { key: 'description', label: 'Description' }
      ];

      const table = creerTable(columns, infos_pays);
      tableinfos_paysDiv.appendChild(table);

    } else {
      tableinfos_paysDiv.innerHTML = '<p>Aucune info détaillée pour ce pays.</p>';
    }

  } catch (err) {
    console.error('Erreur chargement données pays :', err);

    infoPaysDiv.textContent = 'Erreur chargement infos pays.';
    tableAvantagesDiv.textContent = '';
    tableinfos_paysDiv.textContent = '';
  }
});

// ===============================
chargerPays();
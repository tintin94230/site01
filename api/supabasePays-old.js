import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const tbody = document.querySelector('#table-pays tbody');
let currentPage = 0;
const pageSize = 500;
let currentData = [];

async function chargerPage(page) {
  tbody.innerHTML = '<tr><td colspan="3">⏳ Chargement...</td></tr>';
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('pays')
    .select('*', { count: 'exact' })
    .order('nom', { ascending: true })
    .range(from, to);

  if(error) { tbody.innerHTML='<tr><td colspan="3">❌ Erreur</td></tr>'; console.error(error); return; }

  currentData = data;
  tbody.innerHTML = '';

  if(data.length===0) { tbody.innerHTML='<tr><td colspan="3">Aucun résultat</td></tr>'; return; }

  data.forEach(p => {
    const tr = document.createElement('tr');
    const tdNom = document.createElement('td');
    tdNom.innerHTML = `<input type="text" value="${p.nom}" data-field="nom">`;
    const tdCode = document.createElement('td');
    tdCode.innerHTML = `<input type="text" value="${p.code_iso ?? ''}" data-field="code_iso">`;

    const tdActions = document.createElement('td');
    const btnMod = document.createElement('button');
    btnMod.textContent = 'Modifier';
    btnMod.onclick = () => modifierPays(p.id, tr, btnMod);
    const btnSup = document.createElement('button');
    btnSup.textContent = 'Supprimer';
    btnSup.onclick = () => supprimerPays(p.id);

    tdActions.append(btnMod, btnSup);
    tr.append(tdNom, tdCode, tdActions);
    tbody.appendChild(tr);
  });
}

async function ajouterPays() {
  const nom = document.getElementById('nouveau-nom').value.trim();
  const code = document.getElementById('nouveau-code').value.trim();
  if(!nom) { alert('Nom obligatoire'); return; }

  await supabase.from('pays').insert([{ nom, code_iso: code }]);
  document.getElementById('nouveau-nom').value='';
  document.getElementById('nouveau-code').value='';
  chargerPage(currentPage);
}

async function modifierPays(id, row, btn) {
  const inputs = row.querySelectorAll('input');
  const data = {};
  inputs.forEach(i => { data[i.dataset.field] = i.value.trim(); });
  btn.disabled = true;
  await supabase.from('pays').update(data).eq('id', id);
  btn.disabled = false;
  chargerPage(currentPage);
}

async function supprimerPays(id){
  if(!confirm('Supprimer ce pays ?')) return;
  await supabase.from('pays').delete().eq('id', id);
  chargerPage(currentPage);
}

function nextPage() { currentPage++; chargerPage(currentPage); }
function prevPage() { if(currentPage>0){ currentPage--; chargerPage(currentPage); } }

function exportCSV(){
  const rows = [['Nom','Code ISO']];
  currentData.forEach(p => rows.push([p.nom, p.code_iso ?? '']));
  const blob = new Blob([rows.map(r=>r.join(',')).join('\n')], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `pays_page_${currentPage+1}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

document.addEventListener('DOMContentLoaded', ()=>chargerPage(currentPage));
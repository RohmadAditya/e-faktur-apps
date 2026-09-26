const form = document.querySelector('#invoiceForm');
const itemsBody = document.querySelector('#itemsBody');
const addItemButton = document.querySelector('#addItemBtn');
const resetButton = document.querySelector('#resetBtn');
const printButton = document.querySelector('#printBtn');
const invoiceDate = document.querySelector('#invoiceDate');
const invoiceNumber = document.querySelector('#invoiceNumber');
const invoiceNumberPreview = document.querySelector('#invoiceNumberPreview');
const currencyInput = form.elements.currency;
const includeTaxInput = document.querySelector('#includeTax');
const taxRateInput = document.querySelector('#taxRate');
const subtotalValue = document.querySelector('#subtotalValue');
const taxValue = document.querySelector('#taxValue');
const totalValue = document.querySelector('#totalValue');
const textareas = [...form.querySelectorAll('textarea')];

const printView = document.createElement('article');
printView.className = 'print-invoice';
printView.setAttribute('aria-hidden', 'true');
form.insertAdjacentElement('afterend', printView);

function formatCurrency(value) {
  const currency = currencyInput.value;
  return new Intl.NumberFormat(currency === 'IDR' ? 'id-ID' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'IDR' ? 0 : 2,
    maximumFractionDigits: currency === 'IDR' ? 0 : 2,
  }).format(Math.max(0, value || 0));
}

function getToday() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return '—';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

function getNumber(input) {
  const value = Number.parseFloat(input?.value);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function getText(name, fallback = '—') {
  return String(form.elements[name]?.value || '').trim() || fallback;
}

function resizeTextarea(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function resizeTextareas() {
  textareas.forEach(resizeTextarea);
}

function getTotals() {
  const subtotal = [...itemsBody.querySelectorAll('.item-row')].reduce((sum, row) => {
    return sum + getNumber(row.querySelector('.item-quantity')) * getNumber(row.querySelector('.item-price'));
  }, 0);
  const taxRate = includeTaxInput.checked ? Math.min(100, Math.max(0, getNumber(taxRateInput))) : 0;
  const tax = subtotal * taxRate / 100;
  return { subtotal, taxRate, tax, total: subtotal + tax };
}

function updateRows() {
  const rows = [...itemsBody.querySelectorAll('.item-row')];
  rows.forEach((row, index) => {
    row.querySelector('.row-number').textContent = index + 1;
    const quantity = getNumber(row.querySelector('.item-quantity'));
    const price = getNumber(row.querySelector('.item-price'));
    row.querySelector('.item-amount').textContent = formatCurrency(quantity * price);
  });
}

function updateSummary() {
  const { subtotal, tax, total } = getTotals();
  subtotalValue.textContent = formatCurrency(subtotal);
  taxValue.textContent = formatCurrency(tax);
  totalValue.textContent = formatCurrency(total);
}

function updateTaxControl() {
  taxRateInput.disabled = !includeTaxInput.checked;
  updateSummary();
}

function updateInvoiceNumberPreview() {
  invoiceNumberPreview.textContent = invoiceNumber.value.trim() || '—';
}

function refreshInvoice() {
  updateRows();
  updateSummary();
  updateInvoiceNumberPreview();
}

function createPrintField(label, value) {
  const field = document.createElement('div');
  field.className = 'print-field';
  const fieldLabel = document.createElement('span');
  fieldLabel.textContent = label;
  const fieldValue = document.createElement('strong');
  fieldValue.textContent = value;
  field.append(fieldLabel, fieldValue);
  return field;
}

function createPartyBlock(label, name, identity, address) {
  const block = document.createElement('section');
  block.className = 'print-party';
  const heading = document.createElement('p');
  heading.className = 'print-kicker';
  heading.textContent = label;
  const partyName = document.createElement('h2');
  partyName.textContent = name;
  const partyIdentity = document.createElement('p');
  partyIdentity.className = 'print-party-id';
  partyIdentity.textContent = identity;
  const partyAddress = document.createElement('p');
  partyAddress.className = 'print-party-address';
  partyAddress.textContent = address;
  block.append(heading, partyName, partyIdentity, partyAddress);
  return block;
}

function buildPrintView() {
  refreshInvoice();
  printView.replaceChildren();

  const header = document.createElement('header');
  header.className = 'print-header';
  const titleWrap = document.createElement('div');
  const eyebrow = document.createElement('p');
  eyebrow.className = 'print-eyebrow';
  eyebrow.textContent = 'TAGIHAN JASA';
  const title = document.createElement('h1');
  title.textContent = 'INVOICE';
  titleWrap.append(eyebrow, title);
  const meta = document.createElement('div');
  meta.className = 'print-meta';
  meta.append(
    createPrintField('Nomor invoice', getText('invoiceNumber')),
    createPrintField('Tanggal terbit', formatDate(invoiceDate.value)),
    createPrintField('Mata uang', currencyInput.options[currencyInput.selectedIndex].text),
  );
  header.append(titleWrap, meta);

  const parties = document.createElement('div');
  parties.className = 'print-parties';
  const sellerIdentity = getText('sellerNpwp', 'NIK / NPWP tidak dicantumkan');
  const buyerIdentity = getText('buyerNpwp', 'NPWP tidak dicantumkan');
  parties.append(
    createPartyBlock('DITERBITKAN OLEH', getText('sellerName'), sellerIdentity, getText('sellerAddress')),
    createPartyBlock('DITAGIHKAN KEPADA', getText('buyerName'), buyerIdentity, getText('buyerAddress')),
  );

  const itemSection = document.createElement('section');
  itemSection.className = 'print-items-section';
  const itemTitle = document.createElement('h2');
  itemTitle.className = 'print-section-title';
  itemTitle.textContent = 'Rincian jasa / pekerjaan';
  const table = document.createElement('table');
  table.className = 'print-items-table';
  table.innerHTML = '<thead><tr><th class="print-col-number">No.</th><th>Deskripsi</th><th class="print-col-quantity">Kuantitas</th><th class="print-col-money">Harga satuan</th><th class="print-col-money">Jumlah</th></tr></thead>';
  const tableBody = document.createElement('tbody');
  [...itemsBody.querySelectorAll('.item-row')].forEach((row, index) => {
    const quantity = getNumber(row.querySelector('.item-quantity'));
    const price = getNumber(row.querySelector('.item-price'));
    const printRow = document.createElement('tr');
    [
      String(index + 1),
      row.querySelector('.item-description').value.trim() || '—',
      new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(quantity),
      formatCurrency(price),
      formatCurrency(quantity * price),
    ].forEach((value, columnIndex) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      if (columnIndex >= 2) cell.className = columnIndex === 2 ? 'print-number' : 'print-money';
      printRow.appendChild(cell);
    });
    tableBody.appendChild(printRow);
  });
  table.appendChild(tableBody);
  itemSection.append(itemTitle, table);

  const { subtotal, taxRate, tax, total } = getTotals();
  const closing = document.createElement('div');
  closing.className = 'print-closing';
  const notes = document.createElement('section');
  notes.className = 'print-notes';
  const notesTitle = document.createElement('h2');
  notesTitle.className = 'print-section-title';
  notesTitle.textContent = 'Catatan & pembayaran';
  const notesText = document.createElement('p');
  notesText.textContent = getText('notes', 'Tidak ada catatan tambahan.');
  const terms = document.createElement('p');
  terms.className = 'print-payment-terms';
  terms.innerHTML = '<span>Syarat pembayaran</span>';
  const termsValue = document.createElement('strong');
  termsValue.textContent = getText('paymentTerms');
  terms.appendChild(termsValue);
  notes.append(notesTitle, notesText, terms);

  const summary = document.createElement('section');
  summary.className = 'print-summary';
  const addSummaryLine = (label, value, className = '') => {
    const line = document.createElement('div');
    line.className = `print-summary-line ${className}`.trim();
    const lineLabel = document.createElement('span');
    lineLabel.textContent = label;
    const lineValue = document.createElement('strong');
    lineValue.textContent = value;
    line.append(lineLabel, lineValue);
    summary.appendChild(line);
  };
  addSummaryLine('Subtotal', formatCurrency(subtotal));
  if (includeTaxInput.checked) addSummaryLine(`PPN (${taxRate}%)`, formatCurrency(tax));
  addSummaryLine('Total tagihan', formatCurrency(total), 'print-grand-total');
  closing.append(notes, summary);

  const footer = document.createElement('footer');
  footer.className = 'print-footer';
  const legal = document.createElement('p');
  legal.textContent = includeTaxInput.checked
    ? 'Dokumen invoice jasa yang diterbitkan secara elektronik.'
    : 'Invoice/kwitansi jasa — bukan Faktur Pajak resmi DJP.';
  const thankYou = document.createElement('strong');
  thankYou.textContent = 'Terima kasih atas kepercayaan Anda.';
  footer.append(legal, thankYou);

  printView.append(header, parties, itemSection, closing, footer);
}

function addItem() {
  const row = document.createElement('tr');
  row.className = 'item-row';
  row.innerHTML = `
    <td class="row-number"></td>
    <td><input class="item-description" type="text" placeholder="Nama jasa / pekerjaan" required /></td>
    <td><input class="item-quantity" type="number" min="0" step="0.01" value="1" aria-label="Kuantitas" required /></td>
    <td><input class="item-price" type="number" min="0" step="100" value="0" aria-label="Harga satuan" required /></td>
    <td class="item-amount">Rp 0</td>
    <td class="action-column no-print"><button class="remove-item" type="button" aria-label="Hapus item">&times;</button></td>
  `;
  itemsBody.appendChild(row);
  row.querySelector('.item-description').focus();
  refreshInvoice();
}

function removeItem(button) {
  const rows = itemsBody.querySelectorAll('.item-row');
  if (rows.length === 1) {
    rows[0].querySelector('.item-description').value = '';
    rows[0].querySelector('.item-quantity').value = '1';
    rows[0].querySelector('.item-price').value = '0';
  } else {
    button.closest('.item-row').remove();
  }
  refreshInvoice();
}

function resetInvoice() {
  form.reset();
  invoiceDate.value = getToday();
  itemsBody.innerHTML = `
    <tr class="item-row">
      <td class="row-number">1</td>
      <td><input class="item-description" type="text" placeholder="Contoh: Desain logo" required /></td>
      <td><input class="item-quantity" type="number" min="0" step="0.01" value="1" aria-label="Kuantitas" required /></td>
      <td><input class="item-price" type="number" min="0" step="100" value="0" aria-label="Harga satuan" required /></td>
      <td class="item-amount">Rp 0</td>
      <td class="action-column no-print"><button class="remove-item" type="button" aria-label="Hapus item">&times;</button></td>
    </tr>
  `;
  updateTaxControl();
  resizeTextareas();
  refreshInvoice();
}

invoiceDate.value = getToday();
addItemButton.addEventListener('click', addItem);
printButton.addEventListener('click', () => {
  if (!form.reportValidity()) return;
  buildPrintView();
  window.print();
});
resetButton.addEventListener('click', resetInvoice);
itemsBody.addEventListener('input', refreshInvoice);
itemsBody.addEventListener('click', (event) => {
  const removeButton = event.target.closest('.remove-item');
  if (removeButton) removeItem(removeButton);
});
includeTaxInput.addEventListener('change', updateTaxControl);
taxRateInput.addEventListener('input', updateSummary);
currencyInput.addEventListener('change', refreshInvoice);
invoiceNumber.addEventListener('input', updateInvoiceNumberPreview);
textareas.forEach((textarea) => {
  textarea.addEventListener('input', () => resizeTextarea(textarea));
});
form.addEventListener('submit', (event) => event.preventDefault());
window.addEventListener('beforeprint', buildPrintView);

updateTaxControl();
resizeTextareas();
refreshInvoice();

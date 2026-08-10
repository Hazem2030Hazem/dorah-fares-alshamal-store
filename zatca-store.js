/* ═══════════════════════════════════════════════════════════════
   درة فارس الشمال — زاتكا (المرحلة 1 QR + المرحلة 2 ربط/اعتماد)
   منقول ومُكيَّف من HAZEM-ERP (qr.js / zatca2.js / vat.js):
   • TLV Tags 1-8 + مولّد QR مدمج خفيف (بلا مكتبات).
   • UBL 2.1 XML، UUID v4، سلسلة ICV/PIH (base64 SHA-256).
   • توقيع ECDSA P-256 عبر Web Crypto فقط (المفتاح الخاص JWK في zatca_config).
   • CSR PKCS#10 DER مبني يدوياً بقالب زاتكا (SN=1-..|2-..|3-uuid، UID=الرقم
     الضريبي، title=نوع الحل، subjectAltName dirName) — zatca2.js في المصدر
     لم يتضمن توليد CSR (كان يطلب لصقه يدوياً)، فبنيناه هنا كاملاً بلا مكتبات.
   • الإرسال (compliance/reporting/clearance/production-csid) عبر fetch مباشر
     أو عبر Edge Function وسيطة (edge-function-store-zatca.ts) لتجاوز CORS.
   القسم الأول دوال نقية تعمل في المتصفح و Node (للاختبارات) بلا build step.
   ═══════════════════════════════════════════════════════════════ */
(function (g) {
'use strict';

/* ─── أدوات Base64/UTF-8 آمنة يونيكود ─── */
function _u8(s) {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(String(s));
  return Uint8Array.from(Buffer.from(String(s), 'utf8'));
}
function b64encode(str) { return b64FromBytes(_u8(str)); }
function b64decode(b64) {
  if (typeof atob !== 'undefined') {
    const bin = atob(b64);
    return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
  }
  return Buffer.from(b64, 'base64').toString('utf8');
}
function b64FromBytes(bytes) {
  if (typeof btoa !== 'undefined') {
    let bin = ''; new Uint8Array(bytes).forEach(b => bin += String.fromCharCode(b));
    return btoa(bin);
  }
  return Buffer.from(bytes).toString('base64');
}
function bytesFromB64(b64) {
  if (typeof atob !== 'undefined') {
    const bin = atob(b64); return Uint8Array.from(bin, c => c.charCodeAt(0));
  }
  return Uint8Array.from(Buffer.from(b64, 'base64'));
}

/* ─── ضريبة 15% شاملة (منطق vat.js) ─── */
const VAT_RATE = 0.15;
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
function lineTax(gross, category) {
  gross = Number(gross) || 0;
  if (category === 'standard' || !category) return r2(gross * VAT_RATE / (1 + VAT_RATE));
  return 0;
}
// التحقق من الرقم الضريبي السعودي: 15 رقماً يبدأ وينتهي بـ 3
const isValidVatNumber = (v) => /^3\d{13}3$/.test(String(v || '').trim());

/* ─── XML/UUID/Hash ─── */
function xmlEscape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
}
function uuidV4() {
  const b = new Uint8Array(16);
  if (g.crypto && g.crypto.getRandomValues) g.crypto.getRandomValues(b);
  else { b.set(require('crypto').randomBytes(16)); }
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
}
async function _sha256(bytes) {
  if (g.crypto && g.crypto.subtle) return new Uint8Array(await g.crypto.subtle.digest('SHA-256', bytes));
  const c = require('crypto');
  return Uint8Array.from(c.createHash('sha256').update(Buffer.from(bytes)).digest());
}
async function sha256B64(str) { return b64FromBytes(await _sha256(_u8(str))); }
// PIH الابتدائي لأول فاتورة: base64(SHA-256('')) — قيمة زاتكا الموثقة
const FIRST_PIH = 'NWoiy3O8DJzZGt0KmZlNDY5MzA0OGVkYTJmNWVlNDBkNDkyN2ZiN2QzM2YyNWM5YjE2Njc5OWY2YzY5NjkzYzk=';
function canonicalizeForHash(xml) {
  return String(xml).replace(/<\?xml[^?]*\?>/, '').replace(/>\s+</g, '><').trim();
}
async function computeInvoiceHash(xml) { return sha256B64(canonicalizeForHash(xml)); }

/* ─── TLV (Tags 1-8) ─── */
function tlvEncode(pairs) {
  const out = [];
  pairs.forEach(([tag, val]) => {
    const v = _u8(val);
    if (v.length > 255) throw new Error('TLV value too long (tag ' + tag + ')');
    out.push(tag & 0xff, v.length, ...v);
  });
  return Uint8Array.from(out);
}
// 1 البائع، 2 الرقم الضريبي، 3 التوقيت، 4 الإجمالي شامل، 5 الضريبة،
// 6 هاش الفاتورة، 7 توقيع ECDSA، 8 المفتاح العام
function zatcaTLV({ seller, vat, timestamp, total, tax, hash, signature, pubkey }) {
  const pairs = [[1, seller], [2, vat], [3, timestamp], [4, total], [5, tax]];
  if (hash) pairs.push([6, hash]);
  if (signature) pairs.push([7, signature]);
  if (pubkey) pairs.push([8, pubkey]);
  return b64FromBytes(tlvEncode(pairs));
}

/* ─── رموز زاتكا ─── */
const TAX_SCHEME = { standard: 'S', zero: 'Z', exempt: 'E', out_of_scope: 'O' };
const TYPE_NAME = { standard: '0100000', simplified: '0200000' };
const m2 = (n) => r2(n).toFixed(2);

/* ─── توليد XML الفاتورة (UBL 2.1 / ZATCA subset) ───
   opts: { number, uuid, issueDate, issueTime, docType '388'|'381',
           subType 'standard'|'simplified', icv, pih, seller {name,vat,cr,
           city,district,street,postal,building}, buyer {name,vat}|null,
           lines [{name, qty, price(شامل), tax_category}], billingRef } */
function buildInvoiceXml(opts) {
  const o = opts || {};
  const cur = 'SAR';
  const docType = o.docType === '381' ? '381' : '388';
  const subType = o.subType === 'standard' ? 'standard' : 'simplified';
  const s = o.seller || {};
  const lines = (o.lines || []).map((l, i) => {
    const qty = Number(l.qty) || 0;
    const gross = qty * (Number(l.price) || 0);
    const cat = TAX_SCHEME[l.tax_category] ? l.tax_category : 'standard';
    const tax = lineTax(gross, cat);
    return { id: i + 1, name: l.name || '—', qty, gross, cat, tax,
             net: r2(gross - tax), unitNet: qty ? r2((gross - tax) / qty) : 0 };
  });
  const cats = {};
  lines.forEach(l => {
    const c = cats[l.cat] = cats[l.cat] || { net: 0, tax: 0, pct: l.cat === 'standard' ? 15 : 0 };
    c.net = r2(c.net + l.net); c.tax = r2(c.tax + l.tax);
  });
  const totalNet = r2(lines.reduce((a, l) => a + l.net, 0));
  const totalTax = r2(lines.reduce((a, l) => a + l.tax, 0));
  const totalGross = r2(totalNet + totalTax);

  const partyAddress = (a) => {
    a = a || {};
    return `
        <cac:PostalAddress>
          <cbc:StreetName>${xmlEscape(a.street || '—')}</cbc:StreetName>
          <cbc:BuildingNumber>${xmlEscape(a.building || '0000')}</cbc:BuildingNumber>
          <cbc:CitySubdivisionName>${xmlEscape(a.district || '—')}</cbc:CitySubdivisionName>
          <cbc:CityName>${xmlEscape(a.city || '—')}</cbc:CityName>
          <cbc:PostalZone>${xmlEscape(a.postal || '00000')}</cbc:PostalZone>
          <cac:Country><cbc:IdentificationCode>SA</cbc:IdentificationCode></cac:Country>
        </cac:PostalAddress>`;
  };
  const supplier = `
      <cac:AccountingSupplierParty>
        <cac:Party>${partyAddress(s)}
          <cac:PartyTaxScheme>
            <cbc:CompanyID>${xmlEscape(s.vat || '')}</cbc:CompanyID>
            <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
          </cac:PartyTaxScheme>
          <cac:PartyLegalEntity>
            <cbc:RegistrationName>${xmlEscape(s.name || '')}</cbc:RegistrationName>
            ${s.cr ? `<cbc:CompanyID schemeID="CR">${xmlEscape(s.cr)}</cbc:CompanyID>` : ''}
          </cac:PartyLegalEntity>
        </cac:Party>
      </cac:AccountingSupplierParty>`;
  const b = o.buyer;
  const customer = `
      <cac:AccountingCustomerParty>
        <cac:Party>${partyAddress(b && b.address)}
          ${b && b.vat ? `<cac:PartyTaxScheme>
            <cbc:CompanyID>${xmlEscape(b.vat)}</cbc:CompanyID>
            <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
          </cac:PartyTaxScheme>` : ''}
          <cac:PartyLegalEntity>
            <cbc:RegistrationName>${xmlEscape((b && b.name) || 'عميل نقدي')}</cbc:RegistrationName>
          </cac:PartyLegalEntity>
        </cac:Party>
      </cac:AccountingCustomerParty>`;
  const taxSubtotals = Object.keys(cats).map(cat => `
        <cac:TaxSubtotal>
          <cbc:TaxableAmount currencyID="${cur}">${m2(cats[cat].net)}</cbc:TaxableAmount>
          <cbc:TaxAmount currencyID="${cur}">${m2(cats[cat].tax)}</cbc:TaxAmount>
          <cac:TaxCategory>
            <cbc:ID>${TAX_SCHEME[cat]}</cbc:ID>
            <cbc:Percent>${cats[cat].pct.toFixed(2)}</cbc:Percent>
            <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
          </cac:TaxCategory>
        </cac:TaxSubtotal>`).join('');
  const xmlLines = lines.map(l => `
      <cac:InvoiceLine>
        <cbc:ID>${l.id}</cbc:ID>
        <cbc:InvoicedQuantity unitCode="PCE">${m2(l.qty)}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="${cur}">${m2(l.net)}</cbc:LineExtensionAmount>
        <cac:TaxTotal>
          <cbc:TaxAmount currencyID="${cur}">${m2(l.tax)}</cbc:TaxAmount>
          <cbc:RoundingAmount currencyID="${cur}">${m2(l.gross)}</cbc:RoundingAmount>
        </cac:TaxTotal>
        <cac:Item>
          <cbc:Name>${xmlEscape(l.name)}</cbc:Name>
          <cac:ClassifiedTaxCategory>
            <cbc:ID>${TAX_SCHEME[l.cat]}</cbc:ID>
            <cbc:Percent>${(l.cat === 'standard' ? 15 : 0).toFixed(2)}</cbc:Percent>
            <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
          </cac:ClassifiedTaxCategory>
        </cac:Item>
        <cac:Price>
          <cbc:PriceAmount currencyID="${cur}">${m2(l.unitNet)}</cbc:PriceAmount>
        </cac:Price>
      </cac:InvoiceLine>`).join('');
  const billingRef = (docType === '381' && o.billingRef) ? `
      <cac:BillingReference>
        <cac:InvoiceDocumentReference><cbc:ID>${xmlEscape(o.billingRef)}</cbc:ID></cac:InvoiceDocumentReference>
      </cac:BillingReference>` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${xmlEscape(String(o.number || '1'))}</cbc:ID>
  <cbc:UUID>${xmlEscape(o.uuid || uuidV4())}</cbc:UUID>
  <cbc:IssueDate>${xmlEscape(o.issueDate || new Date().toISOString().slice(0, 10))}</cbc:IssueDate>
  <cbc:IssueTime>${xmlEscape(o.issueTime || '00:00:00')}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="${TYPE_NAME[subType]}">${docType}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${cur}</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>${cur}</cbc:TaxCurrencyCode>
  <cbc:LineCountNumeric>${lines.length}</cbc:LineCountNumeric>${billingRef}
  <cac:AdditionalDocumentReference>
    <cbc:ID>ICV</cbc:ID>
    <cbc:UUID>${Number(o.icv) || 1}</cbc:UUID>
  </cac:AdditionalDocumentReference>
  <cac:AdditionalDocumentReference>
    <cbc:ID>PIH</cbc:ID>
    <cac:Attachment><cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${xmlEscape(o.pih || FIRST_PIH)}</cbc:EmbeddedDocumentBinaryObject></cac:Attachment>
  </cac:AdditionalDocumentReference>
  ${supplier}
  ${customer}
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${cur}">${m2(totalTax)}</cbc:TaxAmount>${taxSubtotals}
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${cur}">${m2(totalNet)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${cur}">${m2(totalNet)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${cur}">${m2(totalGross)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${cur}">${m2(totalGross)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>${xmlLines}
</Invoice>`;
}

/* ─── ECDSA P-256 (Web Crypto) — المفتاح الخاص بصيغة JWK ─── */
async function generateZatcaKeyPair() {
  if (!(g.crypto && g.crypto.subtle)) throw new Error('Web Crypto API غير متاحة');
  const kp = await g.crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const privJwk = await g.crypto.subtle.exportKey('jwk', kp.privateKey);
  const pubSpki = await g.crypto.subtle.exportKey('spki', kp.publicKey);
  return { privateKeyJwk: privJwk, publicKeyB64: b64FromBytes(pubSpki) };
}
async function _importPrivJwk(jwk) {
  return g.crypto.subtle.importKey('jwk', jwk,
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}
async function signInvoiceHash(hashB64, privateKeyJwk) {
  const key = await _importPrivJwk(privateKeyJwk);
  const sig = await g.crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, key, bytesFromB64(hashB64));
  return b64FromBytes(sig);
}
async function verifyInvoiceHash(hashB64, sigB64, publicKeyB64) {
  const key = await g.crypto.subtle.importKey('spki', bytesFromB64(publicKeyB64),
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  return g.crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key,
    bytesFromB64(sigB64), bytesFromB64(hashB64));
}

/* ─── بناء ASN.1 DER يدوياً (للـ CSR — بلا مكتبات) ─── */
function _derLen(n) {
  if (n < 128) return [n];
  const bytes = [];
  while (n) { bytes.unshift(n & 0xff); n >>= 8; }
  return [0x80 | bytes.length, ...bytes];
}
function _der(tag, contentBytes) {
  return Uint8Array.from([tag, ..._derLen(contentBytes.length), ...contentBytes]);
}
const _seq = (...items) => _der(0x30, _concat(items));
const _set = (...items) => _der(0x31, _concat(items));
function _concat(items) {
  const flat = [];
  items.forEach(i => flat.push(...i));
  return Uint8Array.from(flat);
}
const _oid = (bytes) => _der(0x06, Uint8Array.from(bytes));
const _utf8 = (s) => _der(0x0c, _u8(s));
const _printable = (s) => _der(0x13, _u8(s));
const _null = () => Uint8Array.from([0x05, 0x00]);
const _bitstr = (bytes) => _der(0x03, Uint8Array.from([0x00, ...bytes]));
const _expl = (n, inner) => _der(0xa0 + n, inner); // context [n] constructed
// OIDs شائعة
const OID = {
  ecdsaSha256: [0x2a, 0x86, 0x48, 0xce, 0x3d, 0x04, 0x03, 0x02], // 1.2.840.10045.4.3.2
  ecPublicKey: [0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01],       // 1.2.840.10045.2.1
  p256: [0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07],        // 1.2.840.10045.3.1.7
  cn: [0x55, 0x04, 0x03], uid: [0x55, 0x04, 0x0a] /* placeholder، نستخدم أدناه */,
  ou: [0x55, 0x04, 0x0b], o: [0x55, 0x04, 0x0a], c: [0x55, 0x04, 0x06],
  sn: [0x55, 0x04, 0x05], title: [0x55, 0x04, 0x0c],
  postalAddress: [0x55, 0x04, 0x11], businessCategory: [0x55, 0x04, 0x0f],
  uidAttr: [0x09, 0x92, 0x26, 0x89, 0x93, 0xf2, 0x2c, 0x64, 0x01, 0x01], // 0.9.2342.19200300.100.1.1 (userId)
  extensionRequest: [0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x09, 0x0e], // 1.2.840.113549.1.9.14
  subjectAltName: [0x55, 0x1d, 0x11], // 2.5.29.17
};

/* تحويل JWK P-256 إلى بايتات المفتاح العام (غير مضغوط 04||X||Y) */
function _jwkPubPoint(jwk) {
  const x = bytesFromB64(jwk.x.replace(/-/g, '+').replace(/_/g, '/'));
  const y = bytesFromB64(jwk.y.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([0x04, ...x, ...y]);
}

/* بناء CSR PKCS#10 (DER) بقالب زاتكا وتوقيعه بالمفتاح الخاص.
   fields: { cn, org, orgUnit, country, vat, address, invoiceType('1100'...),
             solutionName(=EGS serial 1), serialUuid }
   serial داخل subjectAltName: "1-<solutionName>|2-<invoiceType>|3-<uuid>" */
async function buildCsrB64(fields, privateKeyJwk) {
  const f = fields || {};
  const rdn = (oidBytes, valEnc) => _set(_seq(_oid(oidBytes), valEnc));
  // subject: CN + C + OU + O
  const subject = _seq(
    rdn(OID.cn, _utf8(f.cn || 'Dora Store')),
    rdn(OID.c, _printable(f.country || 'SA')),
    rdn(OID.ou, _utf8(f.orgUnit || f.org || 'Dora')),
    rdn(OID.o, _utf8(f.org || 'Dora'))
  );
  // subjectAltName = dirName Name: SN(serial) + UID(vat) + title + registeredAddress + businessCategory
  const dirName = _seq(
    rdn(OID.sn, _utf8('1-' + (f.solutionName || 'DORA-STORE') +
      '|2-' + (f.invoiceType || '1100') + '|3-' + (f.serialUuid || uuidV4()))),
    rdn(OID.uidAttr, _utf8(f.vat || '')),
    rdn(OID.title, _utf8(f.invoiceType || '1100')),
    rdn(OID.postalAddress, _utf8(f.address || '')),
    rdn(OID.businessCategory, _utf8(f.businessCategory || 'Retail'))
  );
  const sanValue = _seq(_expl(4, dirName)); // [4] directoryName
  const extension = _seq(_oid(OID.subjectAltName), _der(0x04, sanValue)); // OCTET STRING
  const extReq = _seq(
    _oid(OID.extensionRequest),
    _set(_der(0x30, _concat([extension]))) // Extensions ::= SEQUENCE OF Extension
  );
  const pubPoint = _jwkPubPoint(privateKeyJwk);
  const spki = _seq(
    _seq(_oid(OID.ecPublicKey), _oid(OID.p256)),
    _bitstr(pubPoint)
  );
  const cri = _seq(
    _der(0x02, Uint8Array.from([0x00])), // INTEGER 0 (v1)
    subject,
    spki,
    _expl(0, extReq) // [0] Attributes
  );
  const key = await _importPrivJwk(privateKeyJwk);
  const sig = await g.crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, key, cri);
  const csr = _seq(
    cri,
    _seq(_oid(OID.ecdsaSha256)),
    _bitstr(new Uint8Array(sig))
  );
  return b64FromBytes(csr);
}

/* ─── حزمة الإرسال + استدعاء زاتكا ─── */
function buildReportingPayload(xml, invoiceHash, uuid) {
  return { invoiceHash, uuid, invoice: b64encode(xml) };
}
// Basic auth (CSID:secret) أو OTP — رمي TypeError(fetch failed) = CORS غالباً
async function zatcaFetch({ endpoint, csid, secret, otp, payload }) {
  const headers = {
    'Content-Type': 'application/json', 'Accept': 'application/json', 'Accept-Version': 'V2',
  };
  if (otp) headers['OTP'] = String(otp);
  else headers['Authorization'] = 'Basic ' + b64encode((csid || '') + ':' + (secret || ''));
  const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(payload) });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch (e) { /* نص خام */ }
  return { ok: res.ok, status: res.status, body: json || text };
}

/* ─── مولّد QR مدمج (من qr.js — ECC L، قناع 0، إصدارات 1-20) ─── */
const QR_VER = {
  1:{dc:19,ec:7,blocks:[[1,19]],align:[]},2:{dc:34,ec:10,blocks:[[1,34]],align:[6,18]},
  3:{dc:55,ec:15,blocks:[[1,55]],align:[6,22]},4:{dc:80,ec:20,blocks:[[1,80]],align:[6,26]},
  5:{dc:108,ec:26,blocks:[[1,108]],align:[6,30]},6:{dc:136,ec:18,blocks:[[2,68]],align:[6,34]},
  7:{dc:156,ec:20,blocks:[[2,78]],align:[6,22,38]},8:{dc:194,ec:24,blocks:[[2,97]],align:[6,24,42]},
  9:{dc:232,ec:30,blocks:[[2,116]],align:[6,26,46]},
  10:{dc:274,ec:18,blocks:[[2,68],[2,69]],align:[6,28,50]},
  11:{dc:324,ec:20,blocks:[[4,81]],align:[6,30,54]},
  12:{dc:370,ec:24,blocks:[[2,92],[2,93]],align:[6,32,58]},
  13:{dc:428,ec:26,blocks:[[4,107]],align:[6,34,62]},
  14:{dc:461,ec:30,blocks:[[3,115],[1,116]],align:[6,26,46,66]},
  15:{dc:523,ec:22,blocks:[[5,87],[1,88]],align:[6,26,48,70]},
  16:{dc:589,ec:24,blocks:[[5,98],[1,99]],align:[6,26,50,74]},
  17:{dc:647,ec:28,blocks:[[1,107],[5,108]],align:[6,30,54,78]},
  18:{dc:721,ec:30,blocks:[[5,120],[1,121]],align:[6,30,56,82]},
  19:{dc:795,ec:28,blocks:[[3,113],[4,114]],align:[6,30,58,86]},
  20:{dc:861,ec:28,blocks:[[3,107],[5,108]],align:[6,34,62,90]},
};
const QR_FMT_L0 = 0x77c4; // Format Info ECC=L قناع 0
function _qrVersionInfo(v) {
  let rem = v;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >> 11) * 0x1f25);
  return (v << 12) | rem;
}
const GF_EXP = new Uint8Array(512), GF_LOG = new Uint8Array(256);
(function () {
  let x = 1;
  for (let i = 0; i < 255; i++) { GF_EXP[i] = x; GF_LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();
const _gfMul = (a, b) => (a && b) ? GF_EXP[GF_LOG[a] + GF_LOG[b]] : 0;
function _rsGen(n) {
  let poly = [1];
  for (let i = 0; i < n; i++) {
    const np = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) { np[j] ^= _gfMul(poly[j], GF_EXP[i]); np[j + 1] ^= poly[j]; }
    poly = np;
  }
  return poly;
}
function _rsEnc(data, nEc) {
  const gen = _rsGen(nEc).slice(0, nEc).reverse();
  const res = new Array(nEc).fill(0);
  for (const d of data) {
    const factor = d ^ res.shift();
    res.push(0);
    if (factor) for (let i = 0; i < nEc; i++) res[i] ^= _gfMul(gen[i], factor);
  }
  return res;
}
function _qrCodewords(bytes, v) {
  const V = QR_VER[v];
  const bits = [];
  const push = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1); };
  push(0b0100, 4);
  push(bytes.length, v >= 10 ? 16 : 8);
  bytes.forEach(b => push(b, 8));
  push(0, Math.min(4, V.dc * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const data = [];
  for (let i = 0; i < bits.length; i += 8)
    data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  const pads = [0xec, 0x11];
  for (let i = 0; data.length < V.dc; i++) data.push(pads[i % 2]);
  const blocks = [];
  let off = 0;
  V.blocks.forEach(([n, sz]) => {
    for (let i = 0; i < n; i++) {
      const d = data.slice(off, off + sz); off += sz;
      blocks.push({ d, e: _rsEnc(d, V.ec) });
    }
  });
  const out = [];
  const maxD = Math.max(...blocks.map(b => b.d.length));
  for (let i = 0; i < maxD; i++) blocks.forEach(b => { if (i < b.d.length) out.push(b.d[i]); });
  for (let i = 0; i < V.ec; i++) blocks.forEach(b => out.push(b.e[i]));
  return out;
}
function qrMatrix(text) {
  const bytes = Array.from(_u8(text));
  let v = 0;
  for (let i = 1; i <= 20; i++) if (bytes.length <= QR_VER[i].dc - (i >= 10 ? 3 : 2)) { v = i; break; }
  if (!v) throw new Error('QR: النص أطول من السعة المدعومة (إصدار 20-L)');
  const size = 21 + 4 * (v - 1);
  const M = Array.from({ length: size }, () => new Array(size).fill(null));
  const R = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (r, c, val) => { if (r >= 0 && c >= 0 && r < size && c < size) { M[r][c] = val; R[r][c] = true; } };
  const finder = (r0, c0) => {
    for (let dr = -1; dr <= 7; dr++) for (let dc = -1; dc <= 7; dc++) {
      const inPat = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
      const dark = inPat && (dr === 0 || dr === 6 || dc === 0 || dc === 6 ||
        (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
      set(r0 + dr, c0 + dc, inPat ? dark : false);
    }
  };
  finder(0, 0); finder(0, size - 7); finder(size - 7, 0);
  const al = QR_VER[v].align;
  al.forEach(r => al.forEach(c => {
    if (R[r] && R[r][c]) return;
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++)
      set(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
  }));
  for (let i = 8; i < size - 8; i++) {
    if (!R[6][i]) set(6, i, i % 2 === 0);
    if (!R[i][6]) set(i, 6, i % 2 === 0);
  }
  set(size - 8, 8, true);
  for (let i = 0; i <= 8; i++) { if (!R[8][i]) { M[8][i] = false; R[8][i] = true; } if (!R[i][8]) { M[i][8] = false; R[i][8] = true; } }
  for (let i = 0; i < 8; i++) {
    M[8][size - 1 - i] = false; R[8][size - 1 - i] = true;
    M[size - 1 - i][8] = false; R[size - 1 - i][8] = true;
  }
  if (v >= 7) {
    const vi = _qrVersionInfo(v);
    for (let i = 0; i < 18; i++) {
      const bit = (vi >> i) & 1;
      const r = Math.floor(i / 3), c = i % 3;
      set(r, size - 11 + c, !!bit);
      set(size - 11 + c, r, !!bit);
    }
  }
  const cw = _qrCodewords(bytes, v);
  const bits = [];
  cw.forEach(b => { for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1); });
  let bi = 0, upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let i = 0; i < size; i++) {
      const r = upward ? size - 1 - i : i;
      for (const c of [col, col - 1]) {
        if (R[r][c]) continue;
        const bit = bi < bits.length ? bits[bi++] : 0;
        M[r][c] = ((r + c) % 2 === 0) ? !bit : !!bit;
      }
    }
    upward = !upward;
  }
  const fbits = [];
  for (let i = 14; i >= 0; i--) fbits.push((QR_FMT_L0 >> i) & 1);
  const posA = [[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]];
  posA.forEach(([r, c], i) => { M[r][c] = !!fbits[i]; });
  const posB = [];
  for (let i = 0; i < 7; i++) posB.push([size - 1 - i, 8]);
  for (let i = 0; i < 8; i++) posB.push([8, size - 8 + i]);
  posB.forEach(([r, c], i) => { M[r][c] = !!fbits[i]; });
  return M.map(row => row.map(x => !!x));
}
function drawQrToCanvas(canvas, text, scale) {
  scale = scale || 4;
  const M = qrMatrix(text);
  const n = M.length, q = 4, total = (n + q * 2) * scale;
  canvas.width = canvas.height = total;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, total, total);
  ctx.fillStyle = '#000000';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
    if (M[r][c]) ctx.fillRect((c + q) * scale, (r + q) * scale, scale, scale);
  return canvas;
}

/* ─── تصدير القسم النقي (متصفح + Node) ─── */
const ZATCA_PURE = { b64encode, b64decode, b64FromBytes, bytesFromB64,
  VAT_RATE, r2, lineTax, isValidVatNumber, xmlEscape, uuidV4, sha256B64,
  FIRST_PIH, canonicalizeForHash, computeInvoiceHash, tlvEncode, zatcaTLV,
  TAX_SCHEME, TYPE_NAME, buildInvoiceXml, generateZatcaKeyPair,
  signInvoiceHash, verifyInvoiceHash, buildCsrB64, buildReportingPayload,
  zatcaFetch, qrMatrix, drawQrToCanvas };
g.ZATCA = ZATCA_PURE;
if (typeof module !== 'undefined' && module.exports) module.exports = ZATCA_PURE;
})(typeof window !== 'undefined' ? window : globalThis);


/* ═══════════════════════════════════════════════════════════════
   الجزء الثاني — ربط قاعدة البيانات (Supabase) والواجهة (متصفح فقط)
   الجداول تُنشأ عبر store-zatca.sql — تدرّج آمن: لو لم يُنفَّذ الـ SQL
   تظهر رسالة إرشادية بدل كسر اللوحة.
   ═══════════════════════════════════════════════════════════════ */
(function () {
'use strict';
if (typeof document === 'undefined') return; // Node: الدوال النقية فقط
if (typeof supabaseClient === 'undefined' || !supabaseClient) return;

const Z = window.ZATCA;
const $z = (id) => document.getElementById(id);
const _esc = (v) => String(v ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
const _toast = (m, ok) => { if (typeof showToast === 'function') showToast(m, ok === false ? 'error' : 'success'); else alert(m); };

// بيئتا العمل (نفس دومينات zatca2.js): simulation = بوابة المطورين، production = النواة
const ENV_URLS = {
  simulation: {
    compliance: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/compliance',
    complianceInvoice: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/compliance/invoices',
    reporting: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/invoices/reporting/single',
    clearance: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/invoices/clearance/single',
    productionCsid: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/production/csids',
  },
  production: {
    compliance: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/core/compliance',
    complianceInvoice: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/core/compliance/invoices',
    reporting: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/core/invoices/reporting/single',
    clearance: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/core/invoices/clearance/single',
    productionCsid: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/core/production/csids',
  },
};
const ONBOARD_LBL = { new: 'لم يبدأ', keys: 'تم توليد المفاتيح', compliance: 'تم الامتثال', production: 'معتمد للإنتاج ✅' };

let _cfg = null; // صف zatca_config المحمّل

/* ─── تحميل/حفظ إعدادات المنشأة ─── */
async function loadZatcaTab() {
  const warn = $z('zatcaSqlWarn');
  const { data, error } = await supabaseClient.from('zatca_config').select('*').eq('id', 1).maybeSingle();
  if (error) { if (warn) warn.style.display = 'block'; return; }
  if (warn) warn.style.display = 'none';
  _cfg = data || { id: 1 };
  const set = (id, v) => { const el = $z(id); if (el && v != null) el.value = v; };
  set('zcName', _cfg.org_name); set('zcCr', _cfg.cr_number); set('zcVat', _cfg.vat_number);
  set('zcCity', _cfg.city); set('zcDistrict', _cfg.district); set('zcStreet', _cfg.street);
  set('zcPostal', _cfg.postal_code); set('zcBuilding', _cfg.building_no);
  set('zcEnv', _cfg.env || 'simulation'); set('zcProxy', _cfg.proxy_url);
  renderOnboardStatus();
  loadEInvoicesList();
}
window.loadZatcaTab = loadZatcaTab;

function renderOnboardStatus() {
  const el = $z('zcStatus'); if (!el) return;
  const st = (_cfg && _cfg.onboarding_status) || 'new';
  const env = (_cfg && _cfg.env) || 'simulation';
  el.innerHTML = 'البيئة الحالية: <b>' + (env === 'production' ? '🟢 الإنتاج' : '🧪 المحاكاة') + '</b>' +
    ' — حالة الاعتماد: <b>' + (ONBOARD_LBL[st] || st) + '</b>' +
    ((_cfg && _cfg.private_key_jwk) ? ' — المفاتيح: ✅ موجودة' : ' — المفاتيح: ⚠️ غير مولّدة') +
    '<div class="admin-note" style="margin-top:6px">ℹ️ ابدأ بالمحاكاة، وبعد نجاح الامتثال والحصول على شهادة الإنتاج بدّل للإنتاج.</div>';
}

window.saveZatcaConfig = async function () {
  const vat = ($z('zcVat').value || '').trim();
  if (vat && !Z.isValidVatNumber(vat)) return _toast('❌ الرقم الضريبي غير صحيح — يجب 15 رقماً يبدأ وينتهي بـ 3', false);
  const rec = {
    id: 1,
    org_name: $z('zcName').value.trim(), cr_number: $z('zcCr').value.trim(), vat_number: vat,
    city: $z('zcCity').value.trim(), district: $z('zcDistrict').value.trim(),
    street: $z('zcStreet').value.trim(), postal_code: $z('zcPostal').value.trim(),
    building_no: $z('zcBuilding').value.trim(),
    env: $z('zcEnv').value === 'production' ? 'production' : 'simulation',
    proxy_url: $z('zcProxy').value.trim() || null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabaseClient.from('zatca_config').upsert([rec], { onConflict: 'id' });
  if (error) return _toast('❌ خطأ بالحفظ: ' + error.message + ' — هل نفّذت store-zatca.sql؟', false);
  _cfg = Object.assign({}, _cfg, rec);
  try { if (typeof logAudit === 'function') logAudit('حفظ إعدادات زاتكا', 'البيئة: ' + rec.env); } catch (_) {}
  _toast('✅ تم حفظ إعدادات المنشأة');
  renderOnboardStatus();
};

/* ─── وسيط CORS: Edge Function أو fetch مباشر ─── */
async function zatcaApiCall(action, endpoint, opts) {
  const proxy = (_cfg && _cfg.proxy_url) || '';
  if (proxy) {
    const res = await fetch(proxy, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, env: (_cfg.env || 'simulation'),
        csid: opts.csid, secret: opts.secret, otp: opts.otp, payload: opts.payload }),
    });
    const j = await res.json().catch(() => ({}));
    if (j && j.error) throw new Error(j.error);
    return { ok: j.upstreamStatus >= 200 && j.upstreamStatus < 300, status: j.upstreamStatus || 0, body: j.body };
  }
  return Z.zatcaFetch({ endpoint, csid: opts.csid, secret: opts.secret, otp: opts.otp, payload: opts.payload });
}
function showCorsHelp() {
  _toast('⚠️ فشل الاتصال (CORS) — انشر Edge Function (edge-function-store-zatca.ts) وضع رابطها في حقل "وسيط الإرسال" بالإعدادات', false);
}

/* ─── الربط مع منصة فاتورة (Onboarding) ─── */
// الخطوة 1: توليد المفاتيح + CSR وطلب Compliance CSID بالـ OTP
window.zatcaOnboardStep1 = async function () {
  const log = $z('zcOnboardLog');
  const say = (m) => { if (log) log.textContent += '\n' + m; };
  if (log) log.textContent = '⏳ بدء الربط...';
  if (!_cfg || !_cfg.vat_number || !Z.isValidVatNumber(_cfg.vat_number))
    return _toast('❌ احفظ إعدادات المنشأة برقم ضريبي صحيح أولاً', false);
  const otp = ($z('zcOtp').value || '').trim();
  if (!/^\d{6}$/.test(otp)) return _toast('❌ أدخل OTP (6 أرقام) من حسابك في منصة فاتورة', false);
  const env = ENV_URLS[_cfg.env || 'simulation'];
  try {
    say('⏳ توليد مفاتيح ECDSA P-256...');
    const kp = await Z.generateZatcaKeyPair();
    say('⏳ بناء CSR بقالب زاتكا...');
    const csr = await Z.buildCsrB64({
      cn: _cfg.org_name || 'Dora Store', org: _cfg.org_name, orgUnit: _cfg.org_name,
      vat: _cfg.vat_number, address: [_cfg.city, _cfg.street].filter(Boolean).join(' - '),
      invoiceType: '1100', solutionName: 'DORA-STORE', serialUuid: Z.uuidV4(),
      businessCategory: 'Retail',
    }, kp.privateKeyJwk);
    say('⏳ طلب شهادة الامتثال (Compliance CSID)...');
    const res = await zatcaApiCall('compliance', env.compliance, { otp, payload: { csr } });
    const body = res.body || {};
    if (!res.ok || !body.binarySecurityToken) {
      say('❌ فشل الامتثال (HTTP ' + res.status + '): ' + JSON.stringify(body).slice(0, 400));
      return _toast('❌ رفضت زاتكا الطلب — راجع السجل', false);
    }
    const upd = {
      id: 1, private_key_jwk: kp.privateKeyJwk, public_key: kp.publicKeyB64,
      csr, compliance_csid: body.binarySecurityToken, compliance_secret: body.secret || '',
      compliance_request_id: body.requestID != null ? String(body.requestID) : null,
      onboarding_status: 'keys', updated_at: new Date().toISOString(),
    };
    const { error } = await supabaseClient.from('zatca_config').upsert([upd], { onConflict: 'id' });
    if (error) { say('❌ فشل حفظ الشهادة: ' + error.message); return; }
    _cfg = Object.assign({}, _cfg, upd);
    say('✅ تم استلام شهادة الامتثال وحفظها.');
    _toast('✅ تم الربط الأولي — الآن أرسل فواتير الامتثال');
    renderOnboardStatus();
  } catch (e) {
    if (String(e).includes('fetch') || e instanceof TypeError) { say('⚠️ فشل الشبكة/CORS: ' + e); showCorsHelp(); }
    else { say('❌ خطأ: ' + e.message); _toast('❌ ' + e.message, false); }
  }
};

// الخطوة 2: إرسال فواتير امتثال تجريبية (مبسطة/قياسية + إشعار دائن/مدين)
window.zatcaOnboardStep2 = async function () {
  const log = $z('zcOnboardLog');
  const say = (m) => { if (log) log.textContent += '\n' + m; };
  if (log) log.textContent = '⏳ إرسال فواتير الامتثال...';
  if (!_cfg || !_cfg.compliance_csid) return _toast('❌ نفّذ الخطوة 1 أولاً (شهادة الامتثال غير موجودة)', false);
  const env = ENV_URLS[_cfg.env || 'simulation'];
  const seller = _sellerFromCfg();
  const samples = [
    { label: 'فاتورة مبسطة B2C', subType: 'simplified', docType: '388' },
    { label: 'إشعار دائن', subType: 'simplified', docType: '381', billingRef: 'SAMPLE-INV-1' },
    { label: 'إشعار مدين', subType: 'simplified', docType: '383', billingRef: 'SAMPLE-INV-1' },
    { label: 'فاتورة قياسية B2B', subType: 'standard', docType: '388',
      buyer: { name: 'شركة تجريبية', vat: '310122393500003' } },
  ];
  let ok = 0;
  let icv = Number(_cfg.last_icv) || 0;
  let pih = _cfg.last_hash || Z.FIRST_PIH;
  for (const s of samples) {
    try {
      icv++;
      const now = new Date();
      const xml = Z.buildInvoiceXml({
        number: 'C-' + icv, uuid: Z.uuidV4(),
        issueDate: now.toISOString().slice(0, 10), issueTime: now.toISOString().slice(11, 19),
        docType: s.docType === '383' ? '388' : s.docType, // زاتكا تقبل 388/381 — المدين يمر كفاتورة في الامتثال
        subType: s.subType, icv, pih, seller, buyer: s.buyer || null,
        billingRef: s.billingRef,
        lines: [{ name: 'صنف تجريبي', qty: 1, price: 115, tax_category: 'standard' }],
      });
      const hash = await Z.computeInvoiceHash(xml);
      const payload = Z.buildReportingPayload(xml, hash, xml.match(/<cbc:UUID>([^<]+)/)[1]);
      const res = await zatcaApiCall('compliance-invoice', env.complianceInvoice,
        { csid: _cfg.compliance_csid, secret: _cfg.compliance_secret, payload });
      if (res.ok) { say('✅ ' + s.label); ok++; pih = hash; }
      else { say('❌ ' + s.label + ' (HTTP ' + res.status + '): ' + JSON.stringify(res.body).slice(0, 300)); }
    } catch (e) {
      if (e instanceof TypeError) { say('⚠️ CORS عند ' + s.label); showCorsHelp(); return; }
      say('❌ ' + s.label + ': ' + e.message);
    }
  }
  await supabaseClient.from('zatca_config').update({ last_icv: icv, last_hash: pih }).eq('id', 1);
  _cfg.last_icv = icv; _cfg.last_hash = pih;
  if (ok === samples.length) {
    await supabaseClient.from('zatca_config').update({ onboarding_status: 'compliance' }).eq('id', 1);
    _cfg.onboarding_status = 'compliance';
    say('✅ نجحت كل فواتير الامتثال — يمكنك الآن طلب شهادة الإنتاج.');
    _toast('✅ الامتثال ناجح');
  } else {
    say('⚠️ نجح ' + ok + ' من ' + samples.length + ' — راجع الأخطاء قبل طلب شهادة الإنتاج.');
    _toast('⚠️ بعض فواتير الامتثال فشلت — راجع السجل', false);
  }
  renderOnboardStatus();
};

// الخطوة 3: طلب Production CSID
window.zatcaOnboardStep3 = async function () {
  const log = $z('zcOnboardLog');
  const say = (m) => { if (log) log.textContent += '\n' + m; };
  if (log) log.textContent = '⏳ طلب شهادة الإنتاج...';
  if (!_cfg || !_cfg.compliance_csid || !_cfg.compliance_request_id)
    return _toast('❌ أكمل الامتثال أولاً (الخطوتان 1 و2)', false);
  const env = ENV_URLS[_cfg.env || 'simulation'];
  try {
    const res = await zatcaApiCall('production-csid', env.productionCsid, {
      csid: _cfg.compliance_csid, secret: _cfg.compliance_secret,
      payload: { compliance_request_id: _cfg.compliance_request_id },
    });
    const body = res.body || {};
    if (!res.ok || !body.binarySecurityToken) {
      say('❌ فشل طلب شهادة الإنتاج (HTTP ' + res.status + '): ' + JSON.stringify(body).slice(0, 400));
      return _toast('❌ رفضت زاتكا الطلب — راجع السجل', false);
    }
    await supabaseClient.from('zatca_config').update({
      production_csid: body.binarySecurityToken, production_secret: body.secret || '',
      onboarding_status: 'production', updated_at: new Date().toISOString(),
    }).eq('id', 1);
    _cfg = Object.assign({}, _cfg, { production_csid: body.binarySecurityToken,
      production_secret: body.secret || '', onboarding_status: 'production' });
    say('✅ صدرت شهادة الإنتاج — المتجر جاهز للفوترة المعتمدة.');
    _toast('✅ تم الاعتماد الكامل');
    renderOnboardStatus();
  } catch (e) {
    if (e instanceof TypeError) { say('⚠️ CORS'); showCorsHelp(); }
    else say('❌ ' + e.message);
  }
};

function _sellerFromCfg() {
  return {
    name: _cfg.org_name || 'شركة درة فارس الشمال للتجارة', vat: _cfg.vat_number || '',
    cr: _cfg.cr_number || '', city: _cfg.city || '', district: _cfg.district || '',
    street: _cfg.street || '', postal: _cfg.postal_code || '', building: _cfg.building_no || '',
  };
}

/* ─── إصدار فاتورة معتمدة من طلب ─── */
window.zatcaIssueForOrder = async function (orderId) {
  if (!_cfg || !_cfg.id) {
    const { data } = await supabaseClient.from('zatca_config').select('*').eq('id', 1).maybeSingle();
    _cfg = data || null;
  }
  if (!_cfg || !_cfg.vat_number) { showTab('zatca'); return _toast('⚠️ أدخل بيانات المنشأة في تبويب زاتكا أولاً', false); }
  const { data: order, error } = await supabaseClient.from('store_orders').select('*').eq('id', orderId).single();
  if (error || !order) return _toast('❌ تعذر تحميل الطلب', false);
  let items = order.items;
  if (typeof items === 'string') { try { items = JSON.parse(items); } catch (_) { items = null; } }
  const lines = (Array.isArray(items) ? items : []).map(it => ({
    name: it.name || it.title || 'صنف', qty: Number(it.qty || it.quantity) || 1,
    price: Number(it.price) || 0, tax_category: 'standard',
  }));
  // رسوم الشحن كسطر خاضع إن وُجدت
  const shipFee = Number(order.shipping_cost || order.shipping_fee) || 0;
  if (shipFee > 0) lines.push({ name: 'رسوم الشحن والتوصيل', qty: 1, price: shipFee, tax_category: 'standard' });
  if (!lines.length) return _toast('❌ لا توجد أصناف في الطلب', false);

  const isStandard = !!order.buyer_vat; // B2B عند توفر رقم ضريبي للمشتري (حقل مستقبلي)
  const dt = new Date(order.created_at || Date.now());
  const uuid = Z.uuidV4();
  const icv = (Number(_cfg.last_icv) || 0) + 1;
  const pih = _cfg.last_hash || Z.FIRST_PIH;
  const xml = Z.buildInvoiceXml({
    number: String(order.order_number || order.id), uuid,
    issueDate: dt.toISOString().slice(0, 10), issueTime: dt.toISOString().slice(11, 19),
    docType: '388', subType: isStandard ? 'standard' : 'simplified',
    icv, pih, seller: _sellerFromCfg(),
    buyer: isStandard ? { name: order.customer_name, vat: order.buyer_vat }
                      : { name: order.customer_name || 'عميل نقدي' },
    lines,
  });
  const hash = await Z.computeInvoiceHash(xml);
  let signature = null;
  if (_cfg.private_key_jwk) {
    try { signature = await Z.signInvoiceHash(hash, _cfg.private_key_jwk); } catch (_) {}
  }
  const tlv = Z.zatcaTLV({
    seller: _cfg.org_name || 'شركة درة فارس الشمال للتجارة', vat: _cfg.vat_number,
    timestamp: dt.toISOString(),
    total: (lines.reduce((a, l) => a + l.qty * l.price, 0)).toFixed(2),
    tax: (lines.reduce((a, l) => a + Z.lineTax(l.qty * l.price, l.tax_category), 0)).toFixed(2),
    hash, signature, pubkey: _cfg.public_key,
  });
  const rec = {
    order_id: order.id, order_ref: String(order.order_number || order.id), uuid,
    icv, invoice_hash: hash, pih, xml, qr_tlv: tlv, signature,
    public_key: _cfg.public_key || null, doc_type: '388',
    invoice_kind: isStandard ? 'standard' : 'simplified', status: 'draft',
  };
  const { data: saved, error: e2 } = await supabaseClient.from('e_invoices')
    .upsert([rec], { onConflict: 'order_id' }).select('id').single();
  if (e2) return _toast('❌ فشل الحفظ: ' + e2.message + ' — هل نفّذت store-zatca.sql؟', false);
  await supabaseClient.from('zatca_config').update({ last_icv: icv, last_hash: hash }).eq('id', 1);
  _cfg.last_icv = icv; _cfg.last_hash = hash;
  try { if (typeof logAudit === 'function') logAudit('إصدار فاتورة إلكترونية', 'طلب: ' + rec.order_ref + ' — UUID: ' + uuid); } catch (_) {}
  // إرسال فوري إن كان معتمداً
  if (_cfg.onboarding_status === 'production' || _cfg.compliance_csid) {
    await zatcaSubmit(saved.id);
  } else {
    _toast('✅ صدرت الفاتورة (مسودة + QR مرحلة 1) — أكمل الاعتماد للإرسال الرسمي');
  }
  openInvoicePrint(saved.id);
  loadEInvoicesList();
};

/* ─── إرسال لزاتكا (reporting مبسطة / clearance قياسية) ─── */
window.zatcaSubmit = async function (eInvoiceId) {
  const { data: ei, error } = await supabaseClient.from('e_invoices').select('*').eq('id', eInvoiceId).single();
  if (error || !ei) return _toast('❌ الفاتورة غير موجودة', false);
  const useProd = _cfg.env === 'production' && _cfg.production_csid;
  const csid = useProd ? _cfg.production_csid : _cfg.compliance_csid;
  const secret = useProd ? _cfg.production_secret : _cfg.compliance_secret;
  if (!csid || !secret) return _toast('⚠️ لا توجد شهادة CSID — أكمل الربط في تبويب زاتكا', false);
  const env = ENV_URLS[_cfg.env || 'simulation'];
  const isStandard = ei.invoice_kind === 'standard';
  const endpoint = isStandard ? env.clearance : env.reporting;
  const payload = Z.buildReportingPayload(ei.xml, ei.invoice_hash, ei.uuid);
  let result;
  try {
    result = await zatcaApiCall(isStandard ? 'clear' : 'report', endpoint, { csid, secret, payload });
  } catch (e) {
    await supabaseClient.from('e_invoices').update({ status: 'failed', api_response: { network_error: String(e) } }).eq('id', ei.id);
    showCorsHelp(); loadEInvoicesList();
    return;
  }
  const status = result.ok ? (isStandard ? 'cleared' : 'reported') : 'failed';
  await supabaseClient.from('e_invoices').update({ status, api_response: result }).eq('id', ei.id);
  _toast(result.ok ? '✅ أُرسلت الفاتورة واعتُمدت (' + (isStandard ? 'cleared' : 'reported') + ')'
                   : '❌ رفضت زاتكا الفاتورة (HTTP ' + result.status + ')', result.ok);
  loadEInvoicesList();
};

/* ─── سجل الفواتير الإلكترونية ─── */
async function loadEInvoicesList() {
  const tb = $z('zatcaEInvoicesTable'); if (!tb) return;
  const { data, error } = await supabaseClient.from('e_invoices')
    .select('id, order_ref, uuid, icv, invoice_kind, status, created_at, api_response')
    .order('created_at', { ascending: false }).limit(100);
  if (error) { tb.innerHTML = '<tr><td colspan="7">⚠️ تعذر التحميل — نفّذ store-zatca.sql أولاً</td></tr>'; return; }
  const lbl = { draft: 'مسودة', reported: 'مُبلَّغة ✅', cleared: 'مُصدَّقة ✅', failed: 'فاشلة ❌' };
  const col = { draft: '#7A6A5C', reported: '#166534', cleared: '#166534', failed: '#B42318' };
  tb.innerHTML = (data || []).map(e =>
    '<tr><td>' + e.icv + '</td><td><strong>' + _esc(e.order_ref || '—') + '</strong></td>' +
    '<td dir="ltr" style="font-family:monospace;font-size:11px">' + _esc(String(e.uuid || '').slice(0, 13)) + '…</td>' +
    '<td>' + (e.invoice_kind === 'standard' ? 'قياسية B2B' : 'مبسطة B2C') + '</td>' +
    '<td><b style="color:' + (col[e.status] || '#7A6A5C') + '">' + (lbl[e.status] || e.status) + '</b></td>' +
    '<td>' + new Date(e.created_at).toLocaleString('ar-SA') + '</td>' +
    '<td style="white-space:nowrap">' +
      '<button class="btn-view" onclick="openInvoicePrint(\'' + e.id + '\')">🖨️ عرض/طباعة</button> ' +
      (e.status === 'failed' || e.status === 'draft'
        ? '<button class="btn-edit" onclick="zatcaSubmit(\'' + e.id + '\')">' + (e.status === 'failed' ? '🔁 إعادة إرسال' : '📤 إرسال') + '</button>'
        : '') +
    '</td></tr>').join('') || '<tr><td colspan="7">🧾 لا توجد فواتير إلكترونية بعد</td></tr>';
}
window.loadEInvoicesList = loadEInvoicesList;

/* ─── عرض/طباعة الفاتورة مع QR ─── */
window.openInvoicePrint = async function (eInvoiceId) {
  const { data: ei } = await supabaseClient.from('e_invoices').select('*').eq('id', eInvoiceId).single();
  if (!ei) return _toast('❌ الفاتورة غير موجودة', false);
  const w = window.open('', '_blank');
  if (!w) return _toast('⚠️ اسمح بالنوافذ المنبثقة', false);
  w.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>فاتورة ${ei.order_ref}</title>
<style>body{font-family:Tahoma,Arial;max-width:640px;margin:20px auto;padding:20px}
h2{color:#1D4ED8}.row{display:flex;justify-content:space-between;margin:6px 0}
canvas{display:block;margin:16px auto}button{padding:10px 24px;font-size:15px;cursor:pointer}
pre{direction:ltr;text-align:left;font-size:10px;background:#f5f5f5;padding:8px;overflow:auto;max-height:120px}</style></head><body>
<h2>⚡ فاتورة إلكترونية معتمدة — ${(ei.invoice_kind === 'standard' ? 'قياسية B2B' : 'مبسطة B2C')}</h2>
<div class="row"><span>مرجع الطلب:</span><b>${_esc(ei.order_ref)}</b></div>
<div class="row"><span>الرقم التسلسلي (ICV):</span><b>${ei.icv}</b></div>
<div class="row"><span>الحالة:</span><b>${_esc(ei.status)}</b></div>
<div class="row"><span>التاريخ:</span><b>${new Date(ei.created_at).toLocaleString('ar-SA')}</b></div>
<canvas id="q"></canvas>
<pre>${_esc(ei.uuid)}</pre>
<div style="text-align:center"><button onclick="print()">🖨️ طباعة</button></div>
<script src="zatca-store.js"><\/script>
<script>ZATCA.drawQrToCanvas(document.getElementById('q'), ${JSON.stringify(ei.qr_tlv)}, 5);<\/script>
</body></html>`);
  w.document.close();
};

/* ─── زر في بطاقات الطلبات (يُستدعى من admin-v2.js) ─── */
window.zatcaOrderButton = function (o) {
  return '<button class="btn-edit" style="margin-inline-start:6px" onclick="zatcaIssueForOrder(' + o.id + ')">⚡ إصدار فاتورة معتمدة</button>';
};
})();

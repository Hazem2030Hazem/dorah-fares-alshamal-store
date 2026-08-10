/* اختبارات وحدة زاتكا للمتجر (node test-store-zatca.js)
   تتحقق من: TLV بناء (Tags 1-5 و1-8)، التحقق من الرقم الضريبي، بناء XML
   من طلب متجر نموذجي (أسعار شاملة 15%)، سلسلة الهاش ICV/PIH، توقيع/تحقق
   ECDSA P-256، بنية CSR DER المولّد يدوياً، ومصفوفة QR. */
'use strict';
const assert = require('assert');
const Z = require('./zatca-store.js');

let n = 0;
const ok = (name) => { n++; console.log('✓', name); };

(async () => {

// ─── ١) TLV المرحلة الأولى (Tags 1-5) — مطابق لمثال زاتكا المعروف ───
const tlv5 = Z.zatcaTLV({ seller: 'Bobs Records', vat: '310122393500003',
  timestamp: '2022-04-25T15:30:00Z', total: '100.00', tax: '15.00' });
assert.strictEqual(tlv5, 'AQxCb2JzIFJlY29yZHMCDzMxMDEyMjM5MzUwMDAwMwMUMjAyMi0wNC0yNVQxNTozMDowMFoEBjEwMC4wMAUFMTUuMDA=');
ok('TLV Tags 1-5 مطابق للقيمة المرجعية');

// TLV Tags 1-8 (الجيل الثاني)
const tlv8 = Z.zatcaTLV({ seller: 'متجر', vat: '310122393500003',
  timestamp: '2024-01-01T00:00:00Z', total: '115.00', tax: '15.00',
  hash: 'HASH==', signature: 'SIG==', pubkey: 'PUB==' });
const raw = Z.bytesFromB64(tlv8);
const tags = [];
for (let i = 0; i < raw.length; i += 2 + raw[i + 1]) tags.push(raw[i]);
assert.deepStrictEqual(tags, [1, 2, 3, 4, 5, 6, 7, 8]);
ok('TLV Tags 1-8 بالترتيب الصحيح');

// ─── ٢) التحقق من الرقم الضريبي (نفس منطق vat.js) ───
assert.ok(Z.isValidVatNumber('310122393500003'));
assert.ok(Z.isValidVatNumber('300123456789003'));
assert.ok(!Z.isValidVatNumber('310122393500004')); // لا ينتهي بـ 3
assert.ok(!Z.isValidVatNumber('410122393500003')); // لا يبدأ بـ 3
assert.ok(!Z.isValidVatNumber('31012239350003'));  // 14 رقماً
assert.ok(!Z.isValidVatNumber(''));
ok('التحقق من الرقم الضريبي (15 رقماً 3...3)');

// ─── ٣) ضريبة شاملة 15% ───
assert.strictEqual(Z.lineTax(115), 15);
assert.strictEqual(Z.lineTax(100), 13.04);
assert.strictEqual(Z.lineTax(115, 'zero'), 0);
ok('lineTax: الضريبة المستخرجة من السعر الشامل');

// ─── ٤) بناء XML من طلب متجر نموذجي ───
const orderItems = [{ name: 'طابعة HP', price: 575, qty: 1 }, { name: 'كابل HDMI', price: 34.5, qty: 2 }];
const seller = { name: 'شركة درة فارس الشمال للتجارة', vat: '300123456789003', cr: '1010123456',
  city: 'الرياض', district: 'النرجس', street: 'شارع الملك فهد', postal: '13324', building: '1234' };
const lines = orderItems.map(it => ({ name: it.name, qty: it.qty, price: it.price, tax_category: 'standard' }));
lines.push({ name: 'رسوم الشحن والتوصيل', qty: 1, price: 25, tax_category: 'standard' });
const uuid = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const xml = Z.buildInvoiceXml({ number: 'ORD-1001', uuid, issueDate: '2024-05-01',
  issueTime: '12:00:00', docType: '388', subType: 'simplified', icv: 1, pih: Z.FIRST_PIH,
  seller, buyer: { name: 'عميل المتجر' }, lines });
assert.ok(xml.includes('<cbc:UBLVersionID>2.1</cbc:UBLVersionID>'));
assert.ok(xml.includes('<cbc:ProfileID>reporting:1.0</cbc:ProfileID>'));
assert.ok(xml.includes('<cbc:UUID>' + uuid + '</cbc:UUID>'));
assert.ok(xml.includes('<cbc:InvoiceTypeCode name="0200000">388</cbc:InvoiceTypeCode>'));
assert.ok(xml.includes('<cbc:CompanyID>300123456789003</cbc:CompanyID>'));
assert.ok(xml.includes('<cbc:PostalZone>13324</cbc:PostalZone>'));
assert.ok(xml.includes('<cbc:BuildingNumber>1234</cbc:BuildingNumber>'));
assert.ok(xml.includes('<cbc:UUID>1</cbc:UUID>')); // ICV
assert.ok(xml.includes(Z.FIRST_PIH)); // PIH الأول
// الإجماليات: 575 + 69 + 25 = 669 شامل؛ ضريبة = 669×15/115 = 87.26؛ صافي 581.74
assert.ok(xml.includes('<cbc:TaxInclusiveAmount currencyID="SAR">669.00</cbc:TaxInclusiveAmount>'));
assert.ok(xml.includes('<cbc:TaxAmount currencyID="SAR">87.26</cbc:TaxAmount>'));
assert.ok(xml.includes('<cbc:LineExtensionAmount currencyID="SAR">581.74</cbc:LineExtensionAmount>'));
assert.ok(xml.includes('<cbc:LineCountNumeric>3</cbc:LineCountNumeric>'));
ok('XML مبسطة B2C من طلب نموذجي — إجماليات وضريبة صحيحة');

// فاتورة قياسية B2B مع رقم ضريبي للمشتري
const xmlStd = Z.buildInvoiceXml({ number: 'B2B-1', uuid, subType: 'standard', icv: 2,
  pih: 'X', seller, buyer: { name: 'شركة مشترٍ', vat: '310122393500003' }, lines: [lines[0]] });
assert.ok(xmlStd.includes('<cbc:InvoiceTypeCode name="0100000">388</cbc:InvoiceTypeCode>'));
assert.ok(xmlStd.includes('<cbc:CompanyID>310122393500003</cbc:CompanyID>'));
ok('XML قياسية B2B (0100000) مع طرف مشترٍ ضريبي');

// تهريب XML
assert.ok(Z.buildInvoiceXml({ seller: { name: 'أ & ب <ت>' }, lines: [{ name: 'ص', qty: 1, price: 1 }] })
  .includes('أ &amp; ب &lt;ت&gt;'));
ok('تهريب كيانات XML');

// ─── ٥) سلسلة الهاش ICV/PIH ───
const h1 = await Z.computeInvoiceHash(xml);
const xml2 = Z.buildInvoiceXml({ number: 'ORD-1002', uuid: Z.uuidV4(), icv: 2, pih: h1,
  seller, lines: [lines[0]] });
const h2 = await Z.computeInvoiceHash(xml2);
assert.ok(/^[A-Za-z0-9+/]+={0,2}$/.test(h1) && h1 !== h2);
assert.ok(xml2.includes(h1)); // PIH للفاتورة الثانية = هاش الأولى
assert.strictEqual(Z.FIRST_PIH, 'NWoiy3O8DJzZGt0KmZlNDY5MzA0OGVkYTJmNWVlNDBkNDkyN2ZiN2QzM2YyNWM5YjE2Njc5OWY2YzY5NjkzYzk=');
ok('سلسلة الهاش: PIH الثانية = هاش الأولى + PIH الابتدائي ثابت');

// التوحيد الحتمي: نفس المدخلات → نفس الهاش
assert.strictEqual(await Z.computeInvoiceHash(xml), h1);
ok('حتمية الهاش (canonicalize مبسط)');

// ─── ٦) UUID v4 ───
const u = Z.uuidV4();
assert.ok(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(u));
ok('UUID v4 بالصيغة الصحيحة');

// ─── ٧) توقيع ECDSA P-256 (Web Crypto في Node 18+) ───
if (globalThis.crypto && globalThis.crypto.subtle) {
  const kp = await Z.generateZatcaKeyPair();
  assert.ok(kp.privateKeyJwk && kp.privateKeyJwk.kty === 'EC' && kp.privateKeyJwk.crv === 'P-256');
  assert.ok(kp.publicKeyB64);
  const sig = await Z.signInvoiceHash(h1, kp.privateKeyJwk);
  assert.ok(await Z.verifyInvoiceHash(h1, sig, kp.publicKeyB64));
  assert.ok(!(await Z.verifyInvoiceHash(h2, sig, kp.publicKeyB64)));
  ok('توليد مفاتيح ECDSA P-256 + توقيع وتحقق');

  // ─── ٨) CSR DER المبني يدوياً ───
  const csrB64 = await Z.buildCsrB64({ cn: 'درة', vat: '300123456789003',
    address: 'الرياض', invoiceType: '1100', solutionName: 'DORA-STORE',
    serialUuid: u, businessCategory: 'Retail' }, kp.privateKeyJwk);
  const der = Z.bytesFromB64(csrB64);
  assert.strictEqual(der[0], 0x30); // SEQUENCE
  const derStr = Buffer.from(der).toString('latin1');
  assert.ok(derStr.includes('DORA-STORE') && derStr.includes('300123456789003'));
  assert.ok(derStr.includes('Retail'));
  // OID ecdsa-with-SHA256 (1.2.840.10045.4.3.2) موجود في الخوارزمية
  assert.ok(derStr.includes('\x2a\x86\x48\xce\x3d\x04\x03\x02'));
  ok('CSR PKCS#10 DER بقالب زاتكا (SN/UID/title/businessCategory + ECDSA-SHA256)');
} else {
  console.log('— تخطي اختبارات Web Crypto (غير متاحة في هذه البيئة)');
}

// ─── ٩) حزمة الإرسال ───
const payload = Z.buildReportingPayload('<x>فاتورة</x>', h1, u);
assert.strictEqual(payload.invoiceHash, h1);
assert.strictEqual(payload.uuid, u);
assert.strictEqual(Z.b64decode(payload.invoice), '<x>فاتورة</x>');
ok('buildReportingPayload (invoice base64)');

// ─── ١٠) مصفوفة QR ───
const m1 = Z.qrMatrix(tlv5);
assert.strictEqual(m1.length % 4, 1); // حجم QR قياسي: 21+4(v-1)
assert.ok(m1[0][0] === true && m1[0][6] === true && m1[6][0] === true); // finder
const m2 = Z.qrMatrix(tlv8);
assert.ok(m2.length > 21); // TLV موسّع → إصدار أعلى
assert.strictEqual(m2.length % 4, 1);
ok('qrMatrix: أحجام صحيحة وأنماط البحث موجودة');

console.log('\n✅ نجحت كل اختبارات زاتكا المتجر (' + n + ' اختباراً)');
})().catch(e => { console.error('\n❌ فشل الاختبار:', e); process.exit(1); });

// ============================================================
// SITE SETTINGS RUNTIME — إعدادات الموقع العامة وروابط الواتساب
// ============================================================
const DORA_DEFAULT_SITE_SETTINGS = {
  companyName: 'شركة درة فارس الشمال', companyAddress: 'الرياض، المملكة العربية السعودية',
  companyPhone1: '966568717449', companyPhone2: '966545358773', companyEmail: 'info@alshamal-df.com',
  socialTwitter: '', socialInstagram: '',
  socialFacebook: '', socialLinkedin: '',
  whatsappMessage: 'مرحباً شركة درة فارس الشمال،\n\nأرغب في الاستفسار عن:\n- \n- \n\nوشكراً'
};
let doraSiteSettings = { ...DORA_DEFAULT_SITE_SETTINGS, ...(JSON.parse(localStorage.getItem('doraSettings') || '{}')) };

function normalizeDoraPhone(phone){ let p = String(phone || '').replace(/\D/g, ''); if (p.startsWith('05')) p = '966' + p.slice(1); return p || DORA_DEFAULT_SITE_SETTINGS.companyPhone1; }
function formatDoraPhone(phone){ const p = normalizeDoraPhone(phone); if (p.length === 12 && p.startsWith('966')) return `+966 ${p.slice(3,5)} ${p.slice(5,8)} ${p.slice(8)}`; return '+' + p; }
function getDoraSiteSettings(){ return { ...DORA_DEFAULT_SITE_SETTINGS, ...doraSiteSettings }; }
function doraWhatsAppLink(message, phone){ const settings = getDoraSiteSettings(); return 'https://wa.me/' + normalizeDoraPhone(phone || settings.companyPhone2) + '?text=' + encodeURIComponent(message || settings.whatsappMessage); }
function replaceDoraText(search, replacement){
  if (!search || !replacement || search === replacement) return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) { const node = walker.currentNode; if (node.parentElement && ['SCRIPT','STYLE'].includes(node.parentElement.tagName)) continue; if (node.nodeValue.includes(search)) nodes.push(node); }
  nodes.forEach(node => { node.nodeValue = node.nodeValue.split(search).join(replacement); });
}

function applyDoraSettings(settings){
  doraSiteSettings = { ...DORA_DEFAULT_SITE_SETTINGS, ...(settings || {}) };
  localStorage.setItem('doraSettings', JSON.stringify(doraSiteSettings));
  const s = getDoraSiteSettings();
  const phone1 = normalizeDoraPhone(s.companyPhone1);
  const formattedPhone1 = formatDoraPhone(phone1);
  document.querySelectorAll('a[href*="wa.me/"]').forEach(link => {
    try { const url = new URL(link.href); url.pathname = '/' + phone1; const text = url.searchParams.get('text'); if (text && !text.includes('عرض سعر') && !text.includes('استشارة') && !text.includes('منتج:')) { url.searchParams.set('text', s.whatsappMessage); } link.href = url.toString(); } catch(_) {}
  });
  document.querySelectorAll('a[href^="tel:"]').forEach(link => { link.href = 'tel:+' + phone1; if (/\+?\d[\d\s]{7,}/.test(link.textContent)) link.textContent = formattedPhone1; });
  document.querySelectorAll('a[href^="mailto:"]').forEach(link => { link.href = 'mailto:' + s.companyEmail; if (link.textContent.includes('@')) link.textContent = s.companyEmail; });
  function isFakeSocial(u){ return !u || /dorafares/i.test(u); }
  if (!isFakeSocial(s.socialTwitter)) document.querySelectorAll('a[data-social="twitter"]').forEach(a => { a.href = s.socialTwitter; a.target = '_blank'; a.rel = 'noopener'; });
  if (!isFakeSocial(s.socialInstagram)) document.querySelectorAll('a[data-social="instagram"]').forEach(a => { a.href = s.socialInstagram; a.target = '_blank'; a.rel = 'noopener'; });
  if (!isFakeSocial(s.socialFacebook)) document.querySelectorAll('a[data-social="facebook"]').forEach(a => { a.href = s.socialFacebook; a.target = '_blank'; a.rel = 'noopener'; });
  if (!isFakeSocial(s.socialLinkedin)) document.querySelectorAll('a[data-social="linkedin"]').forEach(a => { a.href = s.socialLinkedin; a.target = '_blank'; a.rel = 'noopener'; });
  document.querySelectorAll('a[data-social]').forEach(a => { if (a.getAttribute('href') === '#' || !a.getAttribute('href')) { a.style.opacity = '0.5'; a.style.pointerEvents = 'none'; a.title = 'غير متوفر حالياً'; } });
  document.querySelectorAll('.dora-year').forEach(el => { el.textContent = new Date().getFullYear(); });
  var _cr = s.companyCR || (s.company && s.company.commercial_register) || '';
  var _tax = s.companyTax || (s.company && s.company.tax_number) || '';
  if (_cr) document.querySelectorAll('[data-company="cr"]').forEach(el => { el.textContent = _cr; });
  if (_tax) document.querySelectorAll('[data-company="tax"]').forEach(el => { el.textContent = _tax; });
  var _bar = document.getElementById('doraLegalBar');
  if (_bar && (_cr || _tax)) {
    _bar.innerHTML = _bar.innerHTML
      .replace(/سجل تجاري: [^<]*/, 'سجل تجاري: ' + (_cr || '—'))
      .replace(/الرقم الضريبي: [^<]*/, 'الرقم الضريبي: ' + (_tax || '—'));
  }
  window.DORA_STORE_CLOSED = (s.storeStatus !== 'open');
  document.querySelectorAll('.checkout-btn').forEach(btn => {
    if (window.DORA_STORE_CLOSED) { btn.dataset.closedLabel = '🔒 المتجر تحت التجهيز — قريباً'; btn.dataset.origLabel = btn.dataset.origLabel || btn.innerHTML; btn.innerHTML = btn.dataset.closedLabel; }
    else if (btn.dataset.origLabel) { btn.innerHTML = btn.dataset.origLabel; }
  });
  replaceDoraText(DORA_DEFAULT_SITE_SETTINGS.companyAddress, s.companyAddress);
  replaceDoraText(DORA_DEFAULT_SITE_SETTINGS.companyEmail, s.companyEmail);
  replaceDoraText(formatDoraPhone(DORA_DEFAULT_SITE_SETTINGS.companyPhone1), formattedPhone1);
  replaceDoraText(DORA_DEFAULT_SITE_SETTINGS.companyPhone1, phone1);
}

async function loadDoraSiteSettings(){
  applyDoraSettings(doraSiteSettings);
  try {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      const { data, error } = await supabaseClient.from('site_settings').select('settings').eq('id', 1).maybeSingle();
      if (!error && data?.settings) applyDoraSettings(data.settings);
    }
  } catch (error) { console.warn('تعذر تحميل إعدادات الموقع العامة:', error); }
}

window.getDoraSiteSettings = getDoraSiteSettings;
window.doraWhatsAppLink = doraWhatsAppLink;
window.addEventListener('storage', function(event){ if (event.key === 'doraSettings') applyDoraSettings(JSON.parse(event.newValue || '{}')); });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadDoraSiteSettings);
else loadDoraSiteSettings();

const fs=require('fs');
const els={};
function mkEl(id){return els[id]||(els[id]={id,value:'',checked:false,innerHTML:'',textContent:'',style:{},classList:{add(){},remove(){},toggle(){}}});}
function set(id,v){mkEl(id).value=v;}
global.document={getElementById:mkEl,querySelectorAll:()=>({forEach(){}}),addEventListener(){},createElement:()=>({style:{}}),head:{appendChild(){}},body:{appendChild(){},removeChild(){}}};
global.localStorage={getItem:()=>null,clear(){}};
global.navigator={};
global.location={href:'https://x.com/admin.html'};
let db={settings:{general:{store_name:'متجري',tax_percent:15}}};
function chain(final){
  const o={};
  ['select','eq','order','limit','gte','update','delete'].forEach(m=>{o[m]=()=>chain(final);});
  o.maybeSingle=async()=>final();
  o.then=(res)=>{Promise.resolve(final()).then(res);return{catch(){}};};
  return o;
}
const client={
  auth:{getUser:async()=>({data:{user:null}})},
  from(t){
    return {
      select:()=>chain(async()=>{
        if(t==='site_settings')return{data:{settings:db.settings},error:null};
        return{data:db[t]||[],error:null};
      }),
      insert:async(rows)=>{db[t]=(db[t]||[]).concat(rows.map((r,i)=>({id:(db[t]||[]).length+i+1,...r})));return{error:null};},
      upsert:async(rows)=>{if(t==='site_settings')db.settings=rows[0].settings;return{error:null};},
      update:(rec)=>({eq:async(col,val)=>{(db[t]||[]).forEach(r=>{if(String(r.id)===String(val))Object.assign(r,rec);});return{error:null};}}),
      delete:()=>({eq:async(col,val)=>{db[t]=(db[t]||[]).filter(r=>String(r.id)!==String(val));return{error:null};}})
    };
  }
};
global.window=global; global.supabaseClient=client; global.alert=()=>{};global.confirm=()=>true;
eval(fs.readFileSync('/mnt/agents/work/site/admin-v2.js','utf8'));
(async()=>{
  await loadSettings();
  console.log('loadSettings -> name:',els.setStoreName.value,'| tax:',els.setTaxPercent.value,'| currency:',els.setCurrency.value);
  set('govCR','1010123456'); set('govTaxNumber','300123'); set('govMaroofUrl','https://maroof.sa/x'); set('govNotes','ملاحظة');
  await saveGovDocs({preventDefault(){}});
  console.log('saveGovDocs ->',JSON.stringify(db.settings.gov_docs));
  console.log('merge kept general:',JSON.stringify(db.settings.general));
  mkEl('mktEnabled').checked=true; set('mktWelcomeCoupon','WELCOME10'); set('mktBannerMessage','خصم!');
  await saveMarketing({preventDefault(){}});
  console.log('saveMarketing ->',JSON.stringify(db.settings.marketing),'| general kept:',!!db.settings.general);
  await loadSiteFiles();
  console.log('files -> PDF/APK/manifest:',/DFS_Company_profile/.test(els.siteFilesList.innerHTML),/app-release/.test(els.siteFilesList.innerHTML),/manifest\.json/.test(els.siteFilesList.innerHTML));
  set('bankName','الراجحي'); set('bankAccountNumber','123456'); set('bankIban','SA123'); set('bankSortOrder','1'); mkEl('bankIsActive').checked=true; set('bankAccountId',''); set('bankAccountName','الشركة');
  await saveBankAccount({preventDefault(){}});
  console.log('bank insert ->',JSON.stringify(db.company_bank_accounts));
  await loadBankAccounts();
  console.log('bank render edit/toggle/delete:',/editBankAccount/.test(els.bankAccountsList.innerHTML),/toggleBankAccount/.test(els.bankAccountsList.innerHTML),/deleteBankAccount/.test(els.bankAccountsList.innerHTML));
  await toggleBankAccount(String(db.company_bank_accounts[0].id),true);
  console.log('bank toggled is_active ->',db.company_bank_accounts[0].is_active);
  await deleteBankAccount(String(db.company_bank_accounts[0].id));
  console.log('bank deleted -> count:',(db.company_bank_accounts||[]).length);
  set('paymentMethodId',''); set('pmName','مدى'); set('pmIcon','💳'); set('pmSortOrder','1'); mkEl('pmIsActive').checked=true;
  await savePaymentMethod({preventDefault(){}});
  set('pmName','تحويل بنكي'); set('pmSortOrder','2');
  await savePaymentMethod({preventDefault(){}});
  console.log('payment insert ->',db.payment_methods.length,'methods');
  await loadPaymentMethodsAdmin();
  console.log('payment render move/toggle/edit/delete:',/movePaymentMethod/.test(els.paymentMethodsTable.innerHTML),/togglePaymentMethod/.test(els.paymentMethodsTable.innerHTML),/editPaymentMethod/.test(els.paymentMethodsTable.innerHTML),/deletePaymentMethod/.test(els.paymentMethodsTable.innerHTML));
  await movePaymentMethod(String(db.payment_methods[1].id),-1);
  console.log('after move sort_orders =',db.payment_methods.map(m=>m.sort_order).join(','));
  set('shippingRateId',''); set('shipFromCity','الرياض'); set('shipToCity','جدة'); set('shipWeight','1'); set('shipPrice','25'); set('shipDays','3');
  await saveShippingRate({preventDefault(){}});
  console.log('shipping insert ->',JSON.stringify(db.shipping_rates));
  set('shippingDefaultPrice','30');
  await saveShippingSettings();
  console.log('shipping settings ->',JSON.stringify(db.settings.shipping),'| marketing kept:',!!db.settings.marketing);
  await loadGovDocs();
  console.log('gov badge:',els.govDocsStatus.textContent);
  console.log('SMOKE OK');
})().catch(e=>{console.error('FAIL',e);process.exit(1)});

async function submitServiceRequest(event) {
    event.preventDefault();
    var btn = event.target.querySelector('button[type="submit"]');
    var originalText = btn.textContent;
    btn.textContent = '⏳ جاري الإرسال...';
    btn.disabled = true;

    var payload = {
        service_type: document.getElementById('srServiceType').value,
        customer_name: document.getElementById('srName').value.trim(),
        customer_phone: document.getElementById('srPhone').value.trim(),
        customer_email: document.getElementById('srEmail').value.trim(),
        city: document.getElementById('srCity').value.trim(),
        description: document.getElementById('srDescription').value.trim(),
        status: 'new'
    };

    try {
        var result = await supabaseClient.from('service_requests').insert([payload]);
        if (result.error) throw result.error;
        
        // رفع الصور لو موجودة
        var files = document.getElementById('srImages').files;
        if (files.length > 0) {
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                var path = 'service-requests/' + Date.now() + '-' + file.name;
                await supabaseClient.storage.from('service-images').upload(path, file);
            }
        }
        
        alert('✅ تم إرسال طلب الخدمة بنجاح! سنتواصل معك قريباً');
        event.target.reset();
        document.getElementById('imageCount').textContent = '';
    } catch(e) {
        alert('❌ حدث خطأ: ' + (e.message || 'حاول مرة أخرى'));
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
    return false;
}

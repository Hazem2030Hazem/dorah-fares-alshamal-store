import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';

import 'theme.dart';

/// شاشة المتجر الرئيسية: غلاف WebView احترافي لمنصة درة فارس الشمال
class WebViewScreen extends StatefulWidget {
  const WebViewScreen({super.key});

  @override
  State<WebViewScreen> createState() => _WebViewScreenState();
}

class _WebViewScreenState extends State<WebViewScreen> {
  /// رابط المنصة الرئيسي
  static const String _storeUrl = 'https://www.alshamal-df.com';

  /// دومين المتجر (كل روابطه تُفتح داخل التطبيق)
  static const String _storeDomain = 'alshamal-df.com';

  /// متحكم الـ WebView (واجهة webview_flutter الإصدار 4.x)
  late final WebViewController _controller;

  /// نسبة تحميل الصفحة 0 - 100
  int _progress = 0;

  /// هل يوجد تحميل جارٍ حالياً (لإظهار شريط التقدم)
  bool _isLoading = true;

  /// هل فشل تحميل الصفحة الرئيسية (أوفلاين / خطأ)
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _initController();
  }

  /// إعداد متحكم الـ WebView وتفويض التنقل ثم تحميل المنصة
  void _initController() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(AppColors.navyDark)
      ..setNavigationDelegate(
        NavigationDelegate(
          // تقدّم التحميل: يحرّك شريط التقدم الذهبي أعلى الصفحة
          onProgress: (int progress) {
            setState(() {
              _progress = progress;
            });
          },
          onPageStarted: (String url) {
            setState(() {
              _isLoading = true;
              _hasError = false;
            });
          },
          onPageFinished: (String url) {
            setState(() {
              _isLoading = false;
              _progress = 100;
            });
          },
          // خطأ في التحميل: نظهر شاشة الأوفلاين فقط لو الخطأ في الإطار الرئيسي
          // (أخطاء الصور/السكربتات الفرعية لا نُظهر لها شيئاً)
          onWebResourceError: (WebResourceError error) {
            if (error.isForMainFrame == true) {
              setState(() {
                _hasError = true;
                _isLoading = false;
              });
            }
          },
          // التحكم في وجهة كل رابط قبل فتحه
          onNavigationRequest: _handleNavigationRequest,
        ),
      )
      ..loadRequest(Uri.parse(_storeUrl));
  }

  /// قرار التنقل:
  /// - روابط المتجر (alshamal-df.com) تُفتح داخل التطبيق
  /// - واتساب / اتصال / بريد / خرائط / شبكات اجتماعية تُفتح بتطبيقاتها الخارجية
  Future<NavigationDecision> _handleNavigationRequest(
    NavigationRequest request,
  ) async {
    final Uri? uri = Uri.tryParse(request.url);
    if (uri == null) return NavigationDecision.navigate;

    // روابط غير http/https (tel: mailto: whatsapp: intent: ...) تُفتح خارجياً
    if (uri.scheme != 'http' && uri.scheme != 'https') {
      await _launchExternal(uri);
      return NavigationDecision.prevent;
    }

    final String host = uri.host.toLowerCase();

    // نفس دومين المتجر: تصفح داخلي طبيعي
    if (host == _storeDomain || host.endsWith('.$_storeDomain')) {
      return NavigationDecision.navigate;
    }

    // روابط خارجية (واتساب، خرائط، شبكات اجتماعية، أو أي موقع آخر):
    // تُفتح في المتصفح/التطبيق الخارجي ويبقى المستخدم داخل متجرنا
    await _launchExternal(uri);
    return NavigationDecision.prevent;
  }

  /// فتح رابط في التطبيق الخارجي المناسب (واتساب، الهاتف، البريد، المتصفح...)
  Future<void> _launchExternal(Uri uri) async {
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      // لا يوجد تطبيق قادر على فتح الرابط — نتجاهل بهدوء
    }
  }

  /// زر "إعادة المحاولة" في شاشة الأوفلاين:
  /// يفحص الاتصال أولاً، ثم يعيد التحميل أو ينبّه المستخدم
  Future<void> _retry() async {
    // connectivity_plus 6.x تعيد قائمة بأنواع الاتصال النشطة حالياً
    final List<ConnectivityResult> results =
        await Connectivity().checkConnectivity();
    if (!mounted) return;

    // القائمة فارغة أو تحتوي "none" = لا يوجد اتصال فعلي
    if (results.isEmpty || results.contains(ConnectivityResult.none)) {
      // ما زال الإنترنت مفصولاً: تنبيه سريع أسفل الشاشة
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'ما زال الاتصال بالإنترنت غير متوفر، تحقق من الشبكة وحاول مجدداً',
            style: GoogleFonts.cairo(color: AppColors.white),
          ),
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 3),
        ),
      );
      return;
    }

    // الاتصال متاح: إخفاء شاشة الخطأ وإعادة تحميل المنصة
    setState(() {
      _hasError = false;
      _isLoading = true;
      _progress = 0;
    });
    _controller.reload();
  }

  /// سحب للأسفل لتحديث الصفحة


  /// التعامل مع زر الرجوع في أندرويد:
  /// - لو يوجد صفحات سابقة داخل المتجر: رجوع داخلي
  /// - وإلا: حوار تأكيد خروج أنيق
  Future<bool> _onWillPop() async {
    if (await _controller.canGoBack()) {
      await _controller.goBack();
      return false;
    }
    if (!mounted) return false;
    final bool? shouldExit = await _showExitDialog();
    return shouldExit ?? false;
  }

  /// حوار تأكيد الخروج من التطبيق
  Future<bool?> _showExitDialog() {
    return showDialog<bool>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: AppColors.navyLight,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          title: Text(
            'الخروج من التطبيق',
            textAlign: TextAlign.center,
            style: GoogleFonts.cairo(
              color: AppColors.gold,
              fontWeight: FontWeight.bold,
            ),
          ),
          content: Text(
            'هل تريد الخروج من التطبيق؟',
            textAlign: TextAlign.center,
            style: GoogleFonts.cairo(color: AppColors.white),
          ),
          actionsAlignment: MainAxisAlignment.spaceEvenly,
          actions: [
            // زر البقاء
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: Text(
                'البقاء',
                style: GoogleFonts.cairo(
                  color: AppColors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            // زر الخروج
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.gold,
                foregroundColor: AppColors.navyDark,
              ),
              onPressed: () => Navigator.of(context).pop(true),
              child: Text(
                'خروج',
                style: GoogleFonts.cairo(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    // WillPopScope مستخدم عمداً (توافق أوسع) — تجاهل ملاحظة الإهمال
    // ignore: deprecated_member_use
    return WillPopScope(
      onWillPop: _onWillPop,
      child: Scaffold(
        body: Container(
          decoration: const BoxDecoration(gradient: AppColors.navyGradient),
          child: SafeArea(
            child: Column(
              children: [
                // شريط تقدم التحميل الذهبي (يختفي عند اكتمال التحميل)
                if (_isLoading && !_hasError)
                  LinearProgressIndicator(
                    value: _progress / 100,
                    minHeight: 3,
                    backgroundColor: Colors.transparent,
                    valueColor: const AlwaysStoppedAnimation<Color>(
                      AppColors.goldBright,
                    ),
                  ),
                // المحتوى: المتجر أو شاشة الأوفلاين
                Expanded(
                  child: _hasError ? _buildOfflineView() : _buildWebView(),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// الـ WebView مباشرة بدون أي تغليف — سكرول أصلي ثابت وسلس
  /// (أزلنا السحب-للتحديث: التغليف القديم كان يتعارض مع سكرول الصفحة ويسبب اهتزازها)
  Widget _buildWebView() {
    return WebViewWidget(controller: _controller);
  }

  /// شاشة "لا يوجد اتصال بالإنترنت" مع زر إعادة المحاولة
  Widget _buildOfflineView() {
    return RefreshIndicator(
      color: AppColors.gold,
      backgroundColor: AppColors.navyLight,
      onRefresh: _retry,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: SizedBox(
          height: MediaQuery.of(context).size.height * 0.75,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.wifi_off_rounded,
                size: 90,
                color: AppColors.gold,
              ),
              const SizedBox(height: 20),
              Text(
                'لا يوجد اتصال بالإنترنت',
                style: GoogleFonts.cairo(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: AppColors.white,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'تحقق من اتصالك بالشبكة ثم أعد المحاولة',
                style: GoogleFonts.cairo(
                  fontSize: 14,
                  color: AppColors.whiteSoft,
                ),
              ),
              const SizedBox(height: 28),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.gold,
                  foregroundColor: AppColors.navyDark,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 32,
                    vertical: 12,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(30),
                  ),
                ),
                onPressed: _retry,
                icon: const Icon(Icons.refresh_rounded),
                label: Text(
                  'إعادة المحاولة',
                  style: GoogleFonts.cairo(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

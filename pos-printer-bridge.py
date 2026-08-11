#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
pos-printer-bridge.py — جسر طباعة/دفع محلي لشاشة كاشير المتجر
═══════════════════════════════════════════════════════════════
لماذا؟ المتصفح لا يستطيع فتح اتصال TCP خام مع طابعة شبكة أو جهاز دفع.
هذا السكربت يعمل على جهاز الكاشير نفسه ويستقبل WebSocket من صفحة pos.html
(افتراضياً ws://127.0.0.1:9101) ثم يعيد توجيه البيانات عبر TCP خام إلى
الطابعة/الجهاز على الشبكة (افتراضياً المنفذ 9100 — منفذ RAW القياسي للطابعات).

التشغيل:
    pip install websockets        (مرة واحدة)
    python pos-printer-bridge.py
    python pos-printer-bridge.py --listen 9101

البروتوكول (JSON عبر WebSocket):
  ←  {"type":"ping"}
  →  {"ok":true,"response":"PONG"}

  ←  {"type":"print",  "address":"192.168.1.50", "port":9100, "payload_b64":"<base64 لبايتات ESC/POS>"}
  →  {"ok":true,"response":"SENT <n> bytes"}

  ←  {"type":"payment","address":"192.168.1.60", "port":9100, "timeout":60, "payload":"SALE 125.50 SAR\n"}
  →  {"ok":true,"response":"APPROVED ..."}   (أول رد نصي من الجهاز حتى نهاية السطر/المهلة)

  خطأ: {"ok":false,"error":"السبب"}

ملاحظات:
- لا يوجد تشفير/مصادقة لأنه محلي على 127.0.0.1 فقط — لا تعرّضه على الشبكة
  (غيّر --host بحذر، وعندها أضِف وسيطاً آمناً).
- صفحة pos.html ترسل افتراضياً إلى ws://127.0.0.1:9100 — عدّل «عنوان الجسر»
  من صفحة «⚙️ الأجهزة» إلى ws://127.0.0.1:9101 أو شغّل الجسر بـ --listen 9100
  إن لم يكن منفذ الطابعة 9100 مشغولاً محلياً.
"""

import argparse
import asyncio
import base64
import json
import socket

try:
    import websockets
except ImportError:
    raise SystemExit("ثبّت المكتبة أولاً:  pip install websockets")


async def tcp_send(addr, port, data, expect_reply=False, timeout=30):
    """إرسال بايتات TCP خام، وقراءة رد اختياري (حتى نهاية سطر أو مهلة)."""
    loop = asyncio.get_event_loop()

    def _io():
        with socket.create_connection((addr, port), timeout=10) as s:
            s.sendall(data)
            if not expect_reply:
                return ""
            s.settimeout(timeout)
            buf = b""
            while b"\n" not in buf and len(buf) < 4096:
                chunk = s.recv(1024)
                if not chunk:
                    break
                buf += chunk
            return buf.decode("utf-8", "replace").strip()

    return await loop.run_in_executor(None, _io)


async def handle(ws):
    async for raw in ws:
        try:
            msg = json.loads(raw)
            mtype = msg.get("type")
            if mtype == "ping":
                await ws.send(json.dumps({"ok": True, "response": "PONG"}))
                continue

            addr = msg.get("address")
            port = int(msg.get("port") or 9100)
            if not addr:
                raise ValueError("address مطلوب (IP الطابعة/الجهاز)")

            if mtype == "print":
                data = base64.b64decode(msg.get("payload_b64") or "")
                if not data:
                    raise ValueError("payload_b64 فارغ")
                await tcp_send(addr, port, data)
                await ws.send(json.dumps({"ok": True, "response": "SENT %d bytes" % len(data)}))

            elif mtype == "payment":
                payload = (msg.get("payload") or "").encode("utf-8")
                timeout = int(msg.get("timeout") or 60)
                resp = await tcp_send(addr, port, payload, expect_reply=True, timeout=timeout)
                await ws.send(json.dumps({"ok": True, "response": resp}))

            else:
                raise ValueError("type غير معروف: %r" % mtype)

        except (socket.timeout, TimeoutError):
            await ws.send(json.dumps({"ok": False, "error": "الجهاز لم يرد خلال المهلة"}))
        except (ConnectionRefusedError, OSError) as e:
            await ws.send(json.dumps({"ok": False, "error": "تعذر الاتصال بالجهاز: %s" % e}))
        except Exception as e:  # noqa: BLE001 — جسر محلي: أبلغ الصفحة بأي خطأ
            await ws.send(json.dumps({"ok": False, "error": str(e)}))


async def main(host, port):
    print("═══════════════════════════════════════════════")
    print("  جسر كاشير POS — طباعة شبكية + جهاز دفع")
    print("  يستمع على: ws://%s:%d" % (host, port))
    print("  اضبط عنوان الجسر في pos.html ← ⚙️ الأجهزة")
    print("  للإيقاف: Ctrl+C")
    print("═══════════════════════════════════════════════")
    async with websockets.serve(handle, host, port):
        await asyncio.Future()  # يعمل للأبد


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="POS printer/payment local bridge")
    ap.add_argument("--host", default="127.0.0.1", help="واجهة الاستماع (اتركها 127.0.0.1)")
    ap.add_argument("--listen", type=int, default=9101, help="منفذ WebSocket (افتراضي 9101)")
    args = ap.parse_args()
    try:
        asyncio.run(main(args.host, args.listen))
    except KeyboardInterrupt:
        print("\nتوقف الجسر.")

import { useRef } from 'react';
import { motion } from 'framer-motion';
import QRCode from 'react-qr-code';
import { Download, ExternalLink, QrCode } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function QRCodePage() {
  const menuUrl = `${window.location.origin}/`;
  const qrRef = useRef<HTMLDivElement>(null);

  const downloadQR = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = 1024;
      canvas.height = 1024;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 1024, 1024);
        ctx.drawImage(img, 112, 112, 800, 800);
        const pngFile = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'cool-cafe-qr.png';
        link.href = pngFile;
        link.click();
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">کد QR</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">ساخت کد QR برای منوی دیجیتال</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/30 rounded-2xl flex items-center justify-center mb-4">
              <QrCode className="w-8 h-8 text-brand-700 dark:text-brand-400" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">کد QR منوی دیجیتال</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-sm">
              این کد را چاپ کنید و روی میزها قرار دهید. مشتریان با اسکن کد می‌توانند منو را ببینند و سفارش دهند.
            </p>

            <div ref={qrRef} className="mt-8 p-6 bg-white rounded-2xl shadow-sm border border-zinc-100">
              <QRCode value={menuUrl} size={220} level="H" fgColor="#991b1b" />
            </div>
            <p className="mt-4 text-xs text-zinc-400 font-mono break-all max-w-[300px]" dir="ltr">{menuUrl}</p>

            <div className="flex gap-3 mt-6">
              <Button onClick={downloadQR} icon={<Download className="w-4 h-4" />}>دانلود PNG</Button>
              <Button variant="outline" onClick={() => window.open(menuUrl, '_blank')} icon={<ExternalLink className="w-4 h-4" />}>پیش‌نمایش</Button>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">راهنما</h3>
            <div className="space-y-4">
              {[
                { step: '۱', title: 'دانلود کد', desc: 'روی دکمه دانلود کلیک کنید تا کد QR به صورت تصویر ذخیره شود.' },
                { step: '۲', title: 'چاپ و نصب', desc: 'کد را روی کارت رومیزی، استیکر یا پوستر چاپ کرده و روی میزها قرار دهید.' },
                { step: '۳', title: 'اسکن مشتری', desc: 'مشتریان با دوربین موبایل کد را اسکن کرده و وارد منو می‌شوند.' },
                { step: '۴', title: 'سفارش آنلاین', desc: 'مشتری می‌تواند منو را ببیند، انتخاب کند و سفارش ثبت کند.' },
              ]?.map(item => (
                <div key={item.step} className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 flex items-center justify-center text-xs font-bold flex-shrink-0">{item.step}</span>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.title}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="mt-4">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3">نکات</h3>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li className="flex items-start gap-2"><span className="text-brand-500 mt-0.5">•</span> حداقل اندازه چاپ: ۵×۵ سانتی‌متر</li>
              <li className="flex items-start gap-2"><span className="text-brand-500 mt-0.5">•</span> کنتراست مناسب بین کد و پس‌زمینه</li>
              <li className="flex items-start gap-2"><span className="text-brand-500 mt-0.5">•</span> قبل از چاپ با چند دستگاه تست کنید</li>
              <li className="flex items-start gap-2"><span className="text-brand-500 mt-0.5">•</span> عبارت «برای مشاهده منو اسکن کنید» اضافه کنید</li>
            </ul>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

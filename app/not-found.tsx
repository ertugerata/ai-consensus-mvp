import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h2 className="text-2xl font-bold mb-2">404 - Sayfa Bulunamadı</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-4">
        İstediğiniz sayfa mevcut değil veya taşınmış olabilir.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Ana Sayfaya Dön
      </Link>
    </div>
  );
}

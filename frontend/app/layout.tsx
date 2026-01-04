import ChatInterface from '@/components/ChatInterface';
import './globals.css';

export const metadata = {
  title: 'HAPIE - Hardware-Aware Performance Inference Engine',
  description: 'Local-first AI inference platform with hardware-aware optimization',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}

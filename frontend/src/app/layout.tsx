import type { Metadata } from "next";
import "./globals.scss";
import ThemeProviderWrapper from "@/components/ThemeProviderWrapper";
import jaTranslations from "@/locales/ja.json";

export const metadata: Metadata = {
  title: jaTranslations.common.appName,
  description: jaTranslations.common.appSubtitle,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, padding: 0 }}>
        <ThemeProviderWrapper>
          {children}
        </ThemeProviderWrapper>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Konsekvensnettverk",
  description: "Visualisering av konsekvenser og sammenhenger",
};

// Font: Oslo kommune's own typeface (Oslo Sans) is proprietary, restricted
// to the municipality and its partners - their design manual states "Arial
// shall be the replacement font where Oslo Sans is not available", which is
// exactly this app's situation. body { font-family } in globals.css already
// leads with Arial for that reason - text stays unstyled, only the icon font
// below is loaded.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no">
      <head>
        {/* Icon font only - Arial/system text font stays per the note above.
            Self-hosting via next/font doesn't cover Material Symbols' variable
            fill/weight axes cleanly, so this is a plain stylesheet link. This
            root layout applies to every route, so it's the app-wide
            equivalent of pages/_document.js - safe to ignore the
            no-page-custom-font lint rule below, which predates the app
            router and doesn't recognize that. */}
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link crossOrigin="anonymous" href="https://fonts.gstatic.com" rel="preconnect" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

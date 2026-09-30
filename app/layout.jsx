import "../public/style.css";
export const metadata = {
  metadataBase: new URL("https://mktwrs.com"),
  title: { default: "Mario Kart Tour Time Trial World Records", template: "%s | MKT WRs" },
  description: "Mario Kart Tour Time Trial world records and history. Explore course records, player rankings, lap times, video and image proof, and playable tour durations.",
  icons: { icon: [{ url: "/favicon.png", sizes: "64x64", type: "image/png" }], apple: "/apple-touch-icon.png" },
  openGraph: { siteName: "Mario Kart Tour World Records", type: "website", locale: "en_US", images: [{ url: "/social-card.png", width: 1200, height: 630, alt: "Mario Kart Tour Time Trial World Records" }] },
  twitter: { card: "summary_large_image", images: ["/social-card.png"] },
};
export const viewport = { themeColor: "#2b4794" };
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

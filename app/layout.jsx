import "../public/style.css";
export const metadata = {
  title: "Mario Kart Tour World Records",
  description:
    "Mario Kart Tour Time Trial world record history, players, lap splits and playable tour durations.",
  icons: { icon: "/favicon.svg" },
};
export const viewport = { themeColor: "#3880c8" };
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import Head from 'next/head';
import '../assets/styles/globals.css';
import Navbar from '../components/Navbar';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        {/* Tailwind CDN - correção rápida para desenvolvimento/protótipo */}
        <script src="https://cdn.tailwindcss.com"></script>

        {/* Fonte Inter via Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet" />
      </Head>

      <Navbar />
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
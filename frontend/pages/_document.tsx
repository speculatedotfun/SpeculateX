import { Html, Head, Main, NextScript } from 'next/document';

// This file exists to avoid occasional build-time PageNotFoundError for "/_document"
// in some Next.js setups on Windows. The app router still drives the UI.
export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}



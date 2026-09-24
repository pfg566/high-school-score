import './globals.css';

export const metadata = {
  title: '고등학교 합격선 정보',
  description: '고등학교별 합격선(백분율) 정보 공유 사이트',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <header className="header">
          <a href="/" className="logo">🏫 합격선 정보</a>
          <nav>
            <a href="/">홈</a>
            <a href="/submit">정보 제보</a>
            <a href="/admin">관리자</a>
          </nav>
        </header>
        <main className="container">{children}</main>
        <footer className="footer">© 2025 고등학교 합격선 정보 사이트</footer>
      </body>
    </html>
  );
}

import { describe, it, expect } from 'vitest';
import { cleanHtml } from '../htmlCleaner';

describe('HtmlCleaner', () => {
  it('strips script, style, nav, and header tags and extracts clean text', () => {
    const rawHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>TechCorp Careers</title>
          <style>body { color: red; }</style>
          <script>console.log("analytics");</script>
        </head>
        <body>
          <header><nav><a href="/home">Home</a></nav></header>
          <main>
            <h1>Join TechCorp Engineering</h1>
            <p>We build high scale cloud software.</p>
          </main>
          <footer>Copyright 2026</footer>
        </body>
      </html>
    `;

    const result = cleanHtml(rawHtml, 'https://techcorp.example.com/careers');

    expect(result.title).toBe('TechCorp Careers');
    expect(result.text).toContain('Join TechCorp Engineering');
    expect(result.text).toContain('We build high scale cloud software.');
    expect(result.text).not.toContain('console.log');
    expect(result.text).not.toContain('body { color: red; }');
  });

  it('discovers internal domain links and resolves relative hrefs', () => {
    const rawHtml = `
      <html>
        <body>
          <a href="/about">About Us</a>
          <a href="https://techcorp.example.com/jobs">Jobs</a>
          <a href="https://external-blog.com/post">External Blog</a>
          <a href="mailto:careers@techcorp.example.com">Email Us</a>
        </body>
      </html>
    `;

    const result = cleanHtml(rawHtml, 'https://techcorp.example.com/careers');

    expect(result.links).toContain('https://techcorp.example.com/about');
    expect(result.links).toContain('https://techcorp.example.com/jobs');
    expect(result.links).not.toContain('https://external-blog.com/post');
    expect(result.links).not.toContain('mailto:careers@techcorp.example.com');
  });
});

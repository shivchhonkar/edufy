export function printHtmlDocument(title: string, bodyHtml: string) {
  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  if (!doc) {
    document.body.removeChild(frame);
    return;
  }

  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
  <head>
    <title>${title}</title>
    <style>
      body { font-family: Georgia, 'Times New Roman', serif; color: #111; margin: 24px; }
      h1, h2 { text-align: center; margin: 0 0 8px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
      th { background: #f3f4f6; }
      .muted { color: #555; text-align: center; margin-bottom: 16px; }
      .cert { max-width: 720px; margin: 0 auto; border: 2px solid #111; padding: 32px; }
      @media print { body { margin: 12px; } }
    </style>
  </head>
  <body>${bodyHtml}</body>
</html>`);
  doc.close();

  const cleanup = () => {
    setTimeout(() => {
      if (frame.parentNode) frame.parentNode.removeChild(frame);
    }, 400);
  };

  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    cleanup();
  };
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    cleanup();
  }, 350);
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    // Use hardcoded WhatsApp number (no API call needed)
    const number = '+94719159933';
    const cleaned = String(number).replace(/\D/g,'');

    const btn = document.createElement('a');
    btn.href = `https://wa.me/${cleaned}?text=Hello%20One%20Click%20Computers!`;
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.className = 'whatsapp-float';
    btn.setAttribute('aria-label','Chat on WhatsApp');
    btn.innerHTML = `
      <svg width="34" height="34" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path fill="#fff" d="M27.5 4.5C24.6 1.6 20.6 0 16.4 0 8.9 0 2.8 6.1 2.8 13.6c0 2.4.6 4.7 1.8 6.7L2 30l9.9-2.6c1.9 1 4.1 1.5 6.4 1.5 7.5 0 13.6-6.1 13.6-13.6 0-3.6-1.4-7-4.4-10.8zM16.4 27c-2 0-4-.5-5.7-1.5l-.4-.2-5.8 1.5 1.5-5.6-.2-.4c-1.2-1.9-1.8-4-1.8-6.2C4 7 9.6 1.4 16.4 1.4c3.6 0 6.9 1.4 9.4 3.9 2.6 2.6 4 5.9 3.9 9.4C29.6 21.8 23.9 27 16.4 27zm7-7.6c-.4-.2-2.3-1.1-2.6-1.2-.3-.1-.5-.2-.7.2-.2.4-.8 1.2-1 1.4-.2.3-.4.3-.8.1-.4-.2-1.6-.6-3-1.9-1.1-1-1.9-2.2-2.1-2.5-.2-.4 0-.6.1-.8.1-.2.4-.4.5-.6.2-.2.3-.4.4-.6.1-.2 0-.5 0-.6 0-.2-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.2 3.3 1.4 3.5c.2.3 2.3 3.5 5.6 4.9.8.3 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 2.3-.9 2.6-1.7.3-.8.3-1.5.2-1.7-.1-.2-.4-.3-.8-.5z"/>
      </svg>`;

    // Avoid overlap with local-mode banner
    const banner = document.getElementById('local-mode-banner');
    if (banner) {
      btn.style.bottom = '60px';
    }

    document.body.appendChild(btn);
  } catch (err) {
    console.error('WhatsApp button error:', err);
  }
});

/* HydroLevel landing-page enhancement layer.
 * Content remains editable through config.js. Animation is a presentation
 * layer only; it never changes engineering calculations.
 */
document.addEventListener('DOMContentLoaded', () => {
  const C = window.HYDROLEVEL_CONFIG;
  if (!C) return;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];

  const brandLogo = $('.brand img');
  if (brandLogo) brandLogo.src = C.branding.hydroLogo;
  const footerLogo = $('.footerBrand img');
  if (footerLogo) footerLogo.src = C.branding.hydroLogo;
  const teamLogo = $('.vb');
  if (teamLogo) teamLogo.src = C.branding.teamLogo;

  const d = C.demo;
  const grid = $('.wheelGrid');
  if (grid) {
    grid.innerHTML = `
      <span>FL <b>${d.fl.toFixed(0)} kg</b></span>
      <span>FR <b>${d.fr.toFixed(0)} kg</b></span>
      <span>RL <b>${d.rl.toFixed(0)} kg</b></span>
      <span>RR <b>${d.rr.toFixed(0)} kg</b></span>`;
  }
  const note = $('.demoNote');
  if (note) note.textContent = `${C.demo.label} — values are not real vehicle measurements.`;

  const cards = $$('.people article');
  C.team.forEach((member, i) => {
    const card = cards[i];
    if (!card) return;
    const image = card.querySelector('img');
    const title = card.querySelector('small');
    const name = card.querySelector('h3');
    const paragraphs = card.querySelectorAll('p');
    const links = card.querySelectorAll('a');
    if (image) {
      image.src = member.photo;
      image.onerror = () => { image.src = C.branding.groupPhoto; image.classList.add('photoFallback'); };
    }
    if (title) title.textContent = member.title || member.role || '';
    if (name) name.textContent = member.name;
    if (paragraphs[0]) paragraphs[0].textContent = member.degree;
    if (paragraphs[1]) paragraphs[1].textContent = member.role || '';
    const contact = card.querySelector('.memberContact');
    if (contact) {
      const email = contact.querySelector('a[href^="mailto:"]');
      const phone = contact.querySelector('a[href^="tel:"]');
      if (email) { email.href = 'mailto:' + member.email; email.textContent = member.email; }
      if (phone) { phone.href = 'tel:' + member.phone.replace(/\s+/g, ''); phone.textContent = member.phone; }
    }
    const linkedin = [...links].find(a => a.textContent.includes('LinkedIn'));
    if (linkedin) linkedin.href = member.linkedin;
  });

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    $$('.section,.pipeline article,.people article,.metricGrid div,.graphGrid div').forEach(el => el.classList.add('revealed'));
    return;
  }

  // GSAP is a progressive enhancement. If the CDN is unavailable, the CSS
  // reveal layer still keeps the page usable.
  if (window.gsap) {
    gsap.from('.heroCopy > *', { y: 32, opacity: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out' });
    gsap.from('.vehicleCard', { x: 60, opacity: 0, duration: 1.05, delay: 0.15, ease: 'power3.out' });
    gsap.from('.scan', { scale: 0.6, opacity: 0, duration: 1.4, delay: 0.2, ease: 'power2.out' });
  }

  // Lightweight IntersectionObserver avoids requiring another GSAP plugin.
  const revealTargets = $$('.section,.pipeline article,.people article,.metricGrid div,.graphGrid div');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('revealed');
      observer.unobserve(entry.target);
      if (window.gsap) {
        gsap.fromTo(entry.target,
          { y: 22, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.65, ease: 'power3.out' }
        );
      }
    });
  }, { threshold: 0.12 });
  revealTargets.forEach(el => observer.observe(el));

  // Subtle mouse-parallax on the hero data card.
  const visual = $('.heroVisual');
  const vehicle = $('.vehicleCard');
  if (visual && vehicle && window.gsap) {
    visual.addEventListener('pointermove', (event) => {
      const r = visual.getBoundingClientRect();
      const x = (event.clientX - r.left) / r.width - 0.5;
      const y = (event.clientY - r.top) / r.height - 0.5;
      gsap.to(vehicle, { rotateY: x * 4, rotateX: -y * 3, duration: 0.35, overwrite: true });
    });
    visual.addEventListener('pointerleave', () => {
      gsap.to(vehicle, { rotateY: 0, rotateX: 0, duration: 0.5 });
    });
  }
});

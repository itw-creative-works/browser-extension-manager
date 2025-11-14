// Setup speed
const SCROLL_SPEED_PX_PER_SECOND = 40; // Pixels per second

// Logo scroll animation setup
export default function setupLogoScroll() {
  const scrollTracks = document.querySelectorAll('.logo-scroll-track');

  scrollTracks.forEach(track => {
    if (!track) {
      return;
    }

    // Get original logos
    const originalLogos = Array.from(track.children);
    if (originalLogos.length === 0) {
      return;
    }

    // Calculate total width of original logos
    let totalWidth = 0;
    originalLogos.forEach(logo => {
      totalWidth += logo.getBoundingClientRect().width;
    });

    // Calculate how many sets we need to fill the screen plus extra for smooth scrolling
    const viewportWidth = window.innerWidth;
    const setsNeeded = Math.ceil((viewportWidth * 2.5) / totalWidth);

    // Clone logo sets
    for (let i = 0; i < setsNeeded; i++) {
      originalLogos.forEach(logo => {
        const clone = logo.cloneNode(true);
        track.appendChild(clone);
      });
    }

    // Calculate animation duration based on total width
    // Slower speed for better visibility
    const allLogos = track.children;
    let animationWidth = 0;

    // Calculate width of half the logos (for the 50% translation)
    const halfCount = Math.floor(allLogos.length / 2);
    for (let i = 0; i < halfCount; i++) {
      animationWidth += allLogos[i].getBoundingClientRect().width;
    }

    // Set CSS variables for animation
    const duration = animationWidth / SCROLL_SPEED_PX_PER_SECOND;
    track.style.setProperty('--logo-scroll-duration', `${duration}s`);
    track.style.setProperty('--logo-scroll-distance', `-${animationWidth}px`);

    // Restart animation when it completes to ensure seamless loop
    track.addEventListener('animationiteration', () => {
      // Reset the animation to prevent accumulation of drift
      track.style.animation = 'none';
      track.offsetHeight; // Trigger reflow
      track.style.animation = `scroll-logos var(--logo-scroll-duration, ${duration}s) linear infinite`;
    });
  });

  // Recalculate on window resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      // Reset and recalculate
      scrollTracks.forEach(track => {
        // Remove cloned logos
        const logos = Array.from(track.children);
        const originalCount = logos.length / (Math.ceil(logos.length / 8)); // Estimate original count

        // Keep only estimated original logos
        while (track.children.length > 8) { // Assuming max 8 original logos
          track.removeChild(track.lastChild);
        }
      });

      // Re-run setup
      setupLogoScroll();
    }, 250);
  });
}

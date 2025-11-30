// Terminal typing animation for loader
const TOTAL_LOADER_TIME = 2000; // 2 seconds total

const typeText = (element, text, delay = 50) => {
  return new Promise((resolve) => {
    let i = 0;
    element.textContent = '';
    const interval = setInterval(() => {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
      } else {
        clearInterval(interval);
        resolve();
      }
    }, delay);
  });
};

const runLoaderAnimation = async () => {
  const line1Text = document.querySelector('.terminal-line:first-child .terminal-text');
  const line2Text = document.querySelector('.terminal-line:last-child .terminal-text');
  const cursor = document.querySelector('.terminal-cursor');
  
  if (!line1Text || !line2Text) return;
  
  // Clear initial text
  line1Text.textContent = '';
  line2Text.textContent = '';
  if (cursor) cursor.style.display = 'none';
  
  // Type first line (25ms per char)
  await typeText(line1Text, 'ssh kim@portfolio.dev', 25);
  
  // Small pause between lines
  await new Promise(r => setTimeout(r, 100));
  
  // Type second line (25ms per char)
  await typeText(line2Text, 'loading awesomeness...', 25);
  
  // Show cursor after typing
  if (cursor) cursor.style.display = 'inline';
};

// Start typing animation immediately
document.addEventListener('DOMContentLoaded', runLoaderAnimation);

// Track when loader started
const loaderStart = Date.now();

// Listen for the onload event
window.onload = function () {
  const elapsed = Date.now() - loaderStart;
  const remaining = Math.max(0, TOTAL_LOADER_TIME - elapsed);
  
  // Wait for animation to complete before hiding loader
  setTimeout(() => {
    const loader = document.querySelector(".loader");
    loader.style.opacity = "0";
    loader.style.transition = "opacity 0.3s ease-out";
    
    // Remove from DOM after fade out
    setTimeout(() => {
      loader.style.display = "none";
      
      // Trigger main page animations after loader is gone
      document.body.classList.add('loaded');
    }, 300);
  }, remaining);
};
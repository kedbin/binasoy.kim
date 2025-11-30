const slidesContainer = document.getElementById("slides-container");
const slide = document.querySelector(".slide");
const slides = document.querySelectorAll(".slide");
const aboutLink = document.querySelector("#nav-link-about");
const resumeLink = document.querySelector("#nav-link-resume");
const skillsLink = document.querySelector("#nav-link-certificates");
const profilePictureMobile = document.querySelector(".profile-picture-mobile");

// Check if mobile
const isMobile = () => window.innerWidth <= 500;

// Track if initial content animation is complete
let contentAnimationComplete = false;

// Show/hide profile picture
const showProfilePicture = (show) => {
  if (!isMobile() || !profilePictureMobile) return;
  
  if (show && contentAnimationComplete) {
    profilePictureMobile.classList.add("visible");
  } else {
    profilePictureMobile.classList.remove("visible");
  }
};

// Current active slide index
let currentSlideIndex = 0;

// Mobile slide switching
const showSlide = (index) => {
  currentSlideIndex = index;
  slides.forEach((s, i) => {
    if (i === index) {
      s.classList.add("active-slide");
    } else {
      s.classList.remove("active-slide");
    }
  });

  // Show/hide profile picture on mobile (only on About slide - index 0)
  if (index === 0) {
    showProfilePicture(true);
  } else {
    showProfilePicture(false);
  }
};

// Initialize first slide as active on mobile
if (isMobile()) {
  showSlide(0);
}

// Wait for content animation to complete before showing profile picture
// The content-container has a 3s fadeInAnimation (50% = 1.5s at 0 opacity, then fades in)
// We listen for animationend on the content container
const contentContainer = document.querySelector(".content-container");
if (contentContainer && isMobile()) {
  contentContainer.addEventListener("animationend", () => {
    contentAnimationComplete = true;
    if (currentSlideIndex === 0) {
      showProfilePicture(true);
    }
  }, { once: true });
}

// Handle resize
window.addEventListener("resize", () => {
  if (isMobile()) {
    // Ensure at least one slide is visible
    const hasActive = document.querySelector(".slide.active-slide");
    if (!hasActive) {
      showSlide(0);
    }
  }
});

aboutLink.addEventListener("click", () => {
  if (isMobile()) {
    showSlide(0);
    changeActiveLink(aboutLink);
  } else {
    slidesContainer.scrollLeft = 0;
  }
});

resumeLink.addEventListener("click", () => {
  if (isMobile()) {
    showSlide(1);
    changeActiveLink(resumeLink);
  } else {
    slidesContainer.scrollLeft = slide.clientWidth;
  }
});

skillsLink.addEventListener("click", () => {
  if (isMobile()) {
    showSlide(2);
    changeActiveLink(skillsLink);
  } else {
    slidesContainer.scrollLeft = slide.clientWidth * 2;
  }
});

slidesContainer.addEventListener("scroll", () => {
  if (isMobile()) return;
  
  if (slidesContainer.scrollLeft === 0) {
    changeActiveLink(aboutLink);
  } else if (slidesContainer.scrollLeft >= slide.clientWidth * 2) {
    changeActiveLink(skillsLink);
  } else {
    changeActiveLink(resumeLink);
  }
});

slidesContainer.addEventListener("swiped-right", () => {
  if (slidesContainer.scrollLeft === 0) {
    changeActiveLink(aboutLink);
  } else if (slidesContainer.scrollLeft >= slide.clientWidth * 2) {
    changeActiveLink(skillsLink);
  } else {
    changeActiveLink(resumeLink);
  }
});

changeActiveLink = (activeLink) => {
  const links = document.querySelectorAll(".nav-item");
  links.forEach((link) => {
    link.classList.remove("active");
  });
  activeLink.classList.add("active");
};

// Initial active link highlight (only runs once on page load)
setTimeout(() => {
  // Only set initial active state, don't force slide change
  if (!document.querySelector(".nav-item.active")) {
    changeActiveLink(aboutLink);
  }
}, 4000);
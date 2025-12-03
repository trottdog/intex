// public/js/main.js

document.addEventListener('DOMContentLoaded', function() {
  
  // ==========================================
  // Header scroll effect
  // ==========================================
  const header = document.querySelector('.site-header');
  
  if (header) {
    const updateHeader = () => {
      if (window.scrollY > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    };
    
    window.addEventListener('scroll', updateHeader, { passive: true });
    updateHeader(); // Initial check
  }
  
  // ==========================================
  // Smooth scroll for anchor links
  // ==========================================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
        
        // Update URL without jumping
        history.pushState(null, null, href);
      }
    });
  });
  
  // ==========================================
  // Intersection Observer for animations
  // ==========================================
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };
  
  const animateOnScroll = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-fade-in-up');
        animateOnScroll.unobserve(entry.target);
      }
    });
  }, observerOptions);
  
  // Observe elements with data-animate attribute
  document.querySelectorAll('[data-animate]').forEach(el => {
    el.style.opacity = '0';
    animateOnScroll.observe(el);
  });
  
  // ==========================================
  // Mobile navigation toggle (if needed)
  // ==========================================
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const mobileNav = document.querySelector('.mobile-nav');
  
  if (mobileMenuBtn && mobileNav) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileNav.classList.toggle('active');
      mobileMenuBtn.classList.toggle('active');
      document.body.classList.toggle('menu-open');
    });
  }
  
  // ==========================================
  // Form validation enhancement
  // ==========================================
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', function(e) {
      const requiredFields = form.querySelectorAll('[required]');
      let isValid = true;
      
      requiredFields.forEach(field => {
        if (!field.value.trim()) {
          isValid = false;
          field.classList.add('error');
          
          // Remove error class on input
          field.addEventListener('input', function() {
            this.classList.remove('error');
          }, { once: true });
        }
      });
      
      if (!isValid) {
        e.preventDefault();
        const firstError = form.querySelector('.error');
        if (firstError) {
          firstError.focus();
        }
      }
    });
  });
  
  // ==========================================
  // Flash message auto-dismiss
  // ==========================================
  document.querySelectorAll('.alert').forEach(alert => {
    setTimeout(() => {
      alert.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
      alert.style.opacity = '0';
      alert.style.transform = 'translateY(-10px)';
      
      setTimeout(() => {
        alert.remove();
      }, 300);
    }, 5000);
  });
  
  // ==========================================
  // Dropdown keyboard navigation
  // ==========================================
  document.querySelectorAll('.nav-item').forEach(item => {
    const dropdown = item.querySelector('.nav-dropdown');
    const trigger = item.querySelector('.nav-link');
    
    if (dropdown && trigger) {
      // Handle keyboard navigation
      trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          dropdown.classList.toggle('show');
        }
      });
      
      // Close on escape
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          dropdown.classList.remove('show');
          trigger.focus();
        }
      });
      
      // Close when clicking outside
      document.addEventListener('click', (e) => {
        if (!item.contains(e.target)) {
          dropdown.classList.remove('show');
        }
      });
    }
  });
  
  // ==========================================
  // Lazy loading images
  // ==========================================
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          imageObserver.unobserve(img);
        }
      });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }
  
  // ==========================================
  // Program card hover effect enhancement
  // ==========================================
  document.querySelectorAll('.program-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.querySelector('.program-card-bg img')?.style.setProperty('transform', 'scale(1.08)');
    });
    
    card.addEventListener('mouseleave', function() {
      this.querySelector('.program-card-bg img')?.style.setProperty('transform', 'scale(1)');
    });
  });
  
  // ==========================================
  // Counter animation for stats
  // ==========================================
  function animateCounter(el, target, duration = 2000) {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        el.textContent = target;
        clearInterval(timer);
      } else {
        el.textContent = Math.floor(current);
      }
    }, 16);
  }
  
  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const value = entry.target.textContent;
        const numericValue = parseInt(value.replace(/[^0-9]/g, ''));
        
        if (!isNaN(numericValue) && numericValue > 0) {
          const suffix = value.replace(/[0-9]/g, '');
          entry.target.textContent = '0' + suffix;
          
          animateCounter(entry.target, numericValue);
          
          // Add suffix back after animation
          setTimeout(() => {
            if (!entry.target.textContent.includes(suffix) && suffix) {
              entry.target.textContent += suffix;
            }
          }, 2100);
        }
        
        statsObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  
  document.querySelectorAll('.hero-stat-value, .impact-stat-value').forEach(stat => {
    statsObserver.observe(stat);
  });
  
});

// ==========================================
// Utility functions
// ==========================================

// Debounce function for performance
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle function for scroll events
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

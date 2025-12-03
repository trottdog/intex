/**
 * Ella Rises - Main JavaScript
 * Client-side interactivity and enhancements
 */

(function() {
  'use strict';

  // =====================================================
  // Header Scroll Effect
  // =====================================================
  const header = document.querySelector('.site-header');
  
  if (header) {
    let lastScrollY = window.scrollY;
    
    window.addEventListener('scroll', () => {
      const currentScrollY = window.scrollY;
      
      // Add/remove scrolled class
      if (currentScrollY > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
      
      lastScrollY = currentScrollY;
    }, { passive: true });
  }

  // =====================================================
  // Smooth Scroll for Anchor Links
  // =====================================================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      
      if (targetId === '#') return;
      
      const target = document.querySelector(targetId);
      
      if (target) {
        e.preventDefault();
        
        const headerHeight = header ? header.offsetHeight : 0;
        const targetPosition =
          target.getBoundingClientRect().top +
          window.pageYOffset -
          headerHeight -
          20;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
        
        // Update URL without jumping
        history.pushState(null, null, targetId);
      }
    });
  });

  // =====================================================
  // Intersection Observer for Animations
  // =====================================================
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -50px 0px',
    threshold: 0.1
  };

  const animateOnScroll = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-visible');
        animateOnScroll.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe elements with stagger-children class
  document.querySelectorAll('.stagger-children').forEach(el => {
    animateOnScroll.observe(el);
  });

  // =====================================================
  // Counter Animation for Stats (home + about)
  // =====================================================
  if ('IntersectionObserver' in window) {
    function animateCounter(el, target, duration, suffix = '') {
      const start = 0;
      const startTime = performance.now();
      const isInteger = Number.isInteger(target);

      function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const value = start + (target - start) * progress;

        el.textContent = (isInteger ? Math.round(value) : value.toFixed(1)) + suffix;

        if (progress < 1) {
          requestAnimationFrame(update);
        }
      }

      requestAnimationFrame(update);
    }

    const statsObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        const el = entry.target;
        const target = parseFloat(el.dataset.countTarget || '0');
        const suffix = el.dataset.countSuffix || '';

        if (!isNaN(target)) {
          animateCounter(el, target, 1800, suffix);
        }

        obs.unobserve(el);
      });
    }, {
      threshold: 0.4
    });

    document
      .querySelectorAll('.hero-stat-value, .impact-stat-value')
      .forEach(stat => {
        const originalText = stat.textContent.trim();
        const match = originalText.match(/([\d,.]+)/);

        if (!match) return;

        const numericTarget = parseFloat(match[1].replace(/,/g, ''));
        const suffix = originalText.replace(match[1], '').trim();

        stat.dataset.countTarget = numericTarget;
        stat.dataset.countSuffix = suffix;

        // Start from 0 + suffix so the animation is visible
        if (!isNaN(numericTarget) && numericTarget > 0) {
          stat.textContent = '0' + (suffix ? suffix : '');
        }

        statsObserver.observe(stat);
      });
  }

  // =====================================================
  // Mobile Navigation Toggle (if needed)
  // =====================================================
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const mobileNav = document.querySelector('.mobile-nav');
  
  if (mobileMenuBtn && mobileNav) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileNav.classList.toggle('open');
      mobileMenuBtn.classList.toggle('active');
      document.body.classList.toggle('nav-open');
    });
  }

  // =====================================================
  // Dropdown Accessibility
  // =====================================================
  document.querySelectorAll('.nav-item').forEach(item => {
    const link = item.querySelector('.nav-link');
    const dropdown = item.querySelector('.nav-dropdown');
    
    if (dropdown) {
      // Keyboard navigation
      link.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          dropdown.classList.toggle('show');
        }
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!item.contains(e.target)) {
          dropdown.classList.remove('show');
        }
      });
    }
  });

  // =====================================================
  // Form Validation Helper
  // =====================================================
  window.validateForm = function(form) {
    let isValid = true;
    const requiredFields = form.querySelectorAll('[required]');
    
    requiredFields.forEach(field => {
      const errorEl = field.parentElement.querySelector('.field-error');
      
      if (!field.value.trim()) {
        isValid = false;
        field.classList.add('error');
        if (errorEl) errorEl.textContent = 'This field is required';
      } else {
        field.classList.remove('error');
        if (errorEl) errorEl.textContent = '';
      }
      
      // Email validation
      if (field.type === 'email' && field.value) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(field.value)) {
          isValid = false;
          field.classList.add('error');
          if (errorEl) errorEl.textContent = 'Please enter a valid email';
        }
      }
    });
    
    return isValid;
  };

  // =====================================================
  // Image Lazy Loading Enhancement
  // =====================================================
  if ('loading' in HTMLImageElement.prototype) {
    // Native lazy loading supported
    document.querySelectorAll('img[data-src]').forEach(img => {
      img.src = img.dataset.src;
    });
  } else {
    // Fallback for older browsers
    const lazyImages = document.querySelectorAll('img[data-src]');
    
    const lazyLoad = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.add('loaded');
          lazyLoad.unobserve(img);
        }
      });
    });
    
    lazyImages.forEach(img => lazyLoad.observe(img));
  }

  // =====================================================
  // Copy to Clipboard Helper
  // =====================================================
  window.copyToClipboard = function(text, button) {
    navigator.clipboard.writeText(text).then(() => {
      const originalText = button.textContent;
      button.textContent = 'Copied!';
      button.classList.add('copied');
      
      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('copied');
      }, 2000);
    });
  };

  // =====================================================
  // Print-Friendly Adjustments
  // =====================================================
  window.addEventListener('beforeprint', () => {
    document.body.classList.add('printing');
  });

  window.addEventListener('afterprint', () => {
    document.body.classList.remove('printing');
  });

  // =====================================================
  // Escape Key Handler
  // =====================================================
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // Close any open modals
      document.querySelectorAll('.modal.open').forEach(modal => {
        modal.classList.remove('open');
      });
      
      // Close mobile nav
      if (mobileNav && mobileNav.classList.contains('open')) {
        mobileNav.classList.remove('open');
        mobileMenuBtn.classList.remove('active');
        document.body.classList.remove('nav-open');
      }
    }
  });

  // =====================================================
  // Console Easter Egg
  // =====================================================
  console.log(
    '%c🌸 Ella Rises 🌸',
    'color: #CE325B; font-size: 24px; font-weight: bold;'
  );
  console.log(
    '%cEmpowering young Latinas through heritage & education',
    'color: #3A3F3B; font-size: 14px;'
  );
  console.log(
    '%cLearn more at https://ellarises.org',
    'color: #9AB59D; font-size: 12px;'
  );

})();

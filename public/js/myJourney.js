/**
 * Ella Rises - My Journey JavaScript
 * Client-side interactivity for My Journey pages
 */

(function() {
  'use strict';

  // =====================================================
  // Tab Switching (for events, account pages)
  // =====================================================
  document.querySelectorAll('[data-tab]').forEach(tab => {
    tab.addEventListener('click', function() {
      const targetTab = this.dataset.tab;
      const tabContainer = this.closest('.tabs-container') || this.closest('.profile-tabs')?.parentElement;
      
      if (!tabContainer) return;
      
      // Update active tab button
      const allTabs = tabContainer.querySelectorAll('[data-tab]');
      allTabs.forEach(t => {
        t.classList.remove('tab--active', 'profile-tab--active');
      });
      this.classList.add('tab--active', 'profile-tab--active');
      
      // Update tab content
      const allPanels = tabContainer.querySelectorAll('.tab-content, .tab-panel');
      allPanels.forEach(panel => {
        panel.classList.remove('tab-content--active', 'tab-panel--active');
      });
      
      const targetPanel = document.getElementById('tab-' + targetTab);
      if (targetPanel) {
        targetPanel.classList.add('tab-content--active', 'tab-panel--active');
      }
      
      // Update URL without reload
      const url = new URL(window.location);
      url.searchParams.set('tab', targetTab);
      history.pushState({}, '', url);
    });
  });

  // =====================================================
  // Form Validation
  // =====================================================
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', function(e) {
      let isValid = true;
      const requiredFields = form.querySelectorAll('[required]');
      
      requiredFields.forEach(field => {
        // Remove previous error state
        field.classList.remove('error');
        
        if (!field.value.trim()) {
          isValid = false;
          field.classList.add('error');
          
          // Focus first invalid field
          if (isValid === false) {
            field.focus();
          }
        }
        
        // Email validation
        if (field.type === 'email' && field.value) {
          const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailPattern.test(field.value)) {
            isValid = false;
            field.classList.add('error');
          }
        }
        
        // Password match validation
        if (field.name === 'confirm_password') {
          const password = form.querySelector('[name="new_password"]');
          if (password && field.value !== password.value) {
            isValid = false;
            field.classList.add('error');
            alert('Passwords do not match');
          }
        }
      });
      
      if (!isValid) {
        e.preventDefault();
      }
    });
  });

  // =====================================================
  // File Upload Preview
  // =====================================================
  document.querySelectorAll('input[type="file"]').forEach(input => {
    input.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      
      // Find associated preview container
      const container = this.closest('.upload-area')?.parentElement;
      const preview = container?.querySelector('.upload-preview');
      
      if (preview && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
          preview.style.display = 'block';
          const img = preview.querySelector('img');
          if (img) {
            img.src = e.target.result;
          }
        };
        reader.readAsDataURL(file);
      }
    });
  });

  // =====================================================
  // Drag and Drop Upload
  // =====================================================
  document.querySelectorAll('.upload-area').forEach(area => {
    const input = area.querySelector('input[type="file"]');
    if (!input) return;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      area.addEventListener(eventName, preventDefaults);
    });
    
    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
      area.addEventListener(eventName, () => area.classList.add('dragging'));
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      area.addEventListener(eventName, () => area.classList.remove('dragging'));
    });
    
    area.addEventListener('drop', function(e) {
      const dt = e.dataTransfer;
      const files = dt.files;
      
      if (files.length) {
        input.files = files;
        input.dispatchEvent(new Event('change'));
      }
    });
  });

  // =====================================================
  // Confirmation Dialogs
  // =====================================================
  document.querySelectorAll('[data-confirm]').forEach(element => {
    element.addEventListener('click', function(e) {
      const message = this.dataset.confirm || 'Are you sure?';
      if (!confirm(message)) {
        e.preventDefault();
      }
    });
  });

  // =====================================================
  // Auto-resize Textareas
  // =====================================================
  document.querySelectorAll('textarea').forEach(textarea => {
    textarea.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = this.scrollHeight + 'px';
    });
  });

  // =====================================================
  // Toast Notifications
  // =====================================================
  window.showToast = function(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span>${message}</span>
      <button onclick="this.parentElement.remove()" class="toast-close">&times;</button>
    `;
    
    const container = document.querySelector('.toast-container') || createToastContainer();
    container.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      toast.classList.add('toast--fade');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  };
  
  function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
  }

  // =====================================================
  // Progress Animation
  // =====================================================
  const progressBars = document.querySelectorAll('.milestone-progress-fill, .capacity-fill');
  
  const progressObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.width = entry.target.dataset.width || entry.target.style.width;
        progressObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  
  progressBars.forEach(bar => {
    bar.dataset.width = bar.style.width;
    bar.style.width = '0';
    progressObserver.observe(bar);
  });

  // =====================================================
  // Keyboard Shortcuts
  // =====================================================
  document.addEventListener('keydown', function(e) {
    // Escape to close modals
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.open').forEach(modal => {
        modal.classList.remove('open');
        document.body.style.overflow = '';
      });
    }
    
    // Ctrl/Cmd + S to save forms
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      const activeForm = document.querySelector('form:focus-within');
      if (activeForm) {
        e.preventDefault();
        activeForm.submit();
      }
    }
  });

  // =====================================================
  // Debounce Helper
  // =====================================================
  window.debounce = function(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // =====================================================
  // Copy to Clipboard for Events
  // =====================================================
  window.copyEventLink = function() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      showToast('Link copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Unable to copy link', 'error');
    });
  };

  // =====================================================
  // Initialize on DOM Ready
  // =====================================================
  document.addEventListener('DOMContentLoaded', function() {
    // Add CSS for toasts
    if (!document.querySelector('#toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.textContent = `
        .toast-container {
          position: fixed;
          bottom: 1rem;
          right: 1rem;
          z-index: 2000;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .toast {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          background: var(--color-surface);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-medium);
          font-size: var(--text-sm);
          animation: slideIn 0.3s ease-out;
        }
        
        .toast--success {
          border-left: 4px solid var(--color-accent);
        }
        
        .toast--error {
          border-left: 4px solid var(--color-danger);
        }
        
        .toast--info {
          border-left: 4px solid var(--color-dusty-blue);
        }
        
        .toast--fade {
          opacity: 0;
          transform: translateX(20px);
          transition: all 0.3s ease-out;
        }
        
        .toast-close {
          background: none;
          border: none;
          font-size: 1.25rem;
          color: var(--color-text-muted);
          cursor: pointer;
          line-height: 1;
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .upload-area.dragging {
          border-color: var(--color-primary);
          background: var(--color-primary-soft);
        }
        
        input.error,
        textarea.error,
        select.error {
          border-color: var(--color-danger) !important;
        }
      `;
      document.head.appendChild(style);
    }
  });

})();

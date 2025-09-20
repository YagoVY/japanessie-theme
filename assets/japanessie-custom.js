/**
 * Japanessie Custom JavaScript
 * Optimized functionality for Japanessie website with analytics and performance tracking
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    animationDuration: 300,
    scrollOffset: 80,
    intersectionThreshold: 0.1,
    performanceThresholds: {
      lcp: 2500, // 2.5 seconds
      fid: 100,  // 100ms
      cls: 0.1   // 0.1
    },
    debounceDelay: 250,
    throttleDelay: 100
  };

  // State management
  const state = {
    isMenuOpen: false,
    scrollDepth: 0,
    performanceMetrics: {},
    analyticsQueue: []
  };

  // Utility functions
  const utils = {
    // Debounce function for performance
    debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },

    // Throttle function for scroll events
    throttle(func, limit) {
      let inThrottle;
      return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
          func.apply(context, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    },

    // Check if element is in viewport
    isInViewport(element) {
      const rect = element.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
      );
    },

    // Get scroll depth percentage
    getScrollDepth() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      return Math.round((scrollTop / scrollHeight) * 100);
    },

    // Smooth scroll to element
    smoothScrollTo(target, offset = CONFIG.scrollOffset) {
      const element = typeof target === 'string' ? document.querySelector(target) : target;
      if (!element) return;

      const targetPosition = element.offsetTop - offset;
      const startPosition = window.pageYOffset;
      const distance = targetPosition - startPosition;
      const duration = CONFIG.animationDuration;
      let start = null;

      function animation(currentTime) {
        if (start === null) start = currentTime;
        const timeElapsed = currentTime - start;
        const run = ease(timeElapsed, startPosition, distance, duration);
        window.scrollTo(0, run);
        if (timeElapsed < duration) requestAnimationFrame(animation);
      }

      function ease(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
      }

      requestAnimationFrame(animation);
    }
  };

  // Analytics tracking
  const analytics = {
    // Track event with multiple analytics platforms
    track(eventName, parameters = {}) {
      const eventData = {
        event_name: eventName,
        timestamp: Date.now(),
        page_url: window.location.href,
        page_title: document.title,
        ...parameters
      };

      // Google Analytics 4
      if (typeof gtag !== 'undefined') {
        gtag('event', eventName, {
          event_category: parameters.category || 'engagement',
          event_label: parameters.label || '',
          value: parameters.value || 1,
          ...parameters
        });
      }

      // Shopify Analytics
      if (typeof ShopifyAnalytics !== 'undefined') {
        ShopifyAnalytics.track(eventName, eventData);
      }

      // DataLayer for GTM
      if (typeof window.dataLayer !== 'undefined') {
        window.dataLayer.push({
          event: eventName,
          ...eventData
        });
      }

      // Console logging for debugging
      if (window.location.hostname === 'localhost' || window.location.hostname.includes('myshopify.com')) {
        console.log('Analytics Event:', eventName, eventData);
      }
    },

    // Track scroll depth
    trackScrollDepth() {
      const currentDepth = utils.getScrollDepth();
      if (currentDepth > state.scrollDepth) {
        state.scrollDepth = currentDepth;
        
        // Track at 25%, 50%, 75%, 100%
        const milestones = [25, 50, 75, 100];
        milestones.forEach(milestone => {
          if (currentDepth >= milestone && !state[`scroll_${milestone}_tracked`]) {
            this.track('scroll_depth', {
              depth_percentage: milestone,
              category: 'engagement'
            });
            state[`scroll_${milestone}_tracked`] = true;
          }
        });
      }
    },

    // Track performance metrics
    trackPerformance() {
      if ('performance' in window) {
        // Largest Contentful Paint (LCP)
        if ('PerformanceObserver' in window) {
          try {
            const lcpObserver = new PerformanceObserver((list) => {
              const entries = list.getEntries();
              const lastEntry = entries[entries.length - 1];
              state.performanceMetrics.lcp = lastEntry.startTime;
              
              this.track('performance_lcp', {
                lcp_value: Math.round(lastEntry.startTime),
                category: 'performance'
              });
            });
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
          } catch (e) {
            console.warn('LCP tracking not supported');
          }

          // First Input Delay (FID)
          try {
            const fidObserver = new PerformanceObserver((list) => {
              const entries = list.getEntries();
              entries.forEach(entry => {
                state.performanceMetrics.fid = entry.processingStart - entry.startTime;
                
                this.track('performance_fid', {
                  fid_value: Math.round(entry.processingStart - entry.startTime),
                  category: 'performance'
                });
              });
            });
            fidObserver.observe({ entryTypes: ['first-input'] });
          } catch (e) {
            console.warn('FID tracking not supported');
          }

          // Cumulative Layout Shift (CLS)
          try {
            let clsValue = 0;
            const clsObserver = new PerformanceObserver((list) => {
              const entries = list.getEntries();
              entries.forEach(entry => {
                if (!entry.hadRecentInput) {
                  clsValue += entry.value;
                }
              });
              state.performanceMetrics.cls = clsValue;
              
              this.track('performance_cls', {
                cls_value: Math.round(clsValue * 1000) / 1000,
                category: 'performance'
              });
            });
            clsObserver.observe({ entryTypes: ['layout-shift'] });
          } catch (e) {
            console.warn('CLS tracking not supported');
          }
        }
      }
    }
  };

  // Mobile menu functionality
  const mobileMenu = {
    init() {
      const toggleButton = document.querySelector('.mobile-menu-toggle');
      const menu = document.getElementById('mobile-menu');
      
      if (!toggleButton || !menu) return;

      toggleButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggle();
      });

      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && !toggleButton.contains(e.target)) {
          this.close();
        }
      });

      // Close menu on escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && state.isMenuOpen) {
          this.close();
        }
      });
    },

    toggle() {
      if (state.isMenuOpen) {
        this.close();
      } else {
        this.open();
      }
    },

    open() {
      const menu = document.getElementById('mobile-menu');
      const header = document.getElementById('japanessie-header');
      
      if (menu && header) {
        menu.classList.add('active');
        header.classList.add('menu-open');
        state.isMenuOpen = true;
        
        // Track menu open
        analytics.track('mobile_menu_open', {
          category: 'navigation'
        });
      }
    },

    close() {
      const menu = document.getElementById('mobile-menu');
      const header = document.getElementById('japanessie-header');
      
      if (menu && header) {
        menu.classList.remove('active');
        header.classList.remove('menu-open');
        state.isMenuOpen = false;
        
        // Track menu close
        analytics.track('mobile_menu_close', {
          category: 'navigation'
        });
      }
    }
  };

  // Search functionality
  const search = {
    init() {
      const searchForms = document.querySelectorAll('.search-form');
      
      searchForms.forEach(form => {
        form.addEventListener('submit', (e) => {
          this.handleSubmit(e);
        });

        // Track search input focus
        const searchInput = form.querySelector('.search-input');
        if (searchInput) {
          searchInput.addEventListener('focus', () => {
            analytics.track('search_focus', {
              category: 'engagement'
            });
          });
        }
      });
    },

    handleSubmit(e) {
      const form = e.target;
      const input = form.querySelector('input[name="q"]');
      
      if (input && input.value.trim()) {
        const query = input.value.trim();
        
        // Track search query
        analytics.track('search_query', {
          search_term: query,
          category: 'engagement'
        });

        // Allow form to submit normally
        return true;
      } else {
        e.preventDefault();
        return false;
      }
    }
  };

  // Category card interactions
  const categoryCards = {
    init() {
      // Use event delegation for better performance
      document.addEventListener('click', (e) => {
        const card = e.target.closest('.category-card');
        if (!card) return;

        const categoryId = card.dataset.categoryId;
        const categoryTitle = card.dataset.categoryTitle;

        if (categoryId && categoryTitle) {
          analytics.track('category_card_click', {
            category_id: categoryId,
            category_title: categoryTitle,
            category: 'engagement'
          });
        }

        // Handle disabled/coming soon cards
        if (card.classList.contains('disabled')) {
          e.preventDefault();
          this.handleComingSoon(categoryTitle);
          return false;
        }
      });

      // Track card visibility
      this.trackVisibility();
    },

    handleComingSoon(title) {
      analytics.track('coming_soon_interaction', {
        category_title: title,
        category: 'engagement'
      });

      // Show notification (customize as needed)
      if (typeof window.alert !== 'undefined') {
        alert(`${title} is coming soon! We'll notify you when it's available.`);
      }
    },

    trackVisibility() {
      const cards = document.querySelectorAll('.category-card');
      
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const card = entry.target;
              const categoryId = card.dataset.categoryId;
              const categoryTitle = card.dataset.categoryTitle;

              if (categoryId && categoryTitle) {
                analytics.track('category_card_view', {
                  category_id: categoryId,
                  category_title: categoryTitle,
                  category: 'engagement'
                });
              }

              observer.unobserve(card);
            }
          });
        }, {
          threshold: CONFIG.intersectionThreshold
        });

        cards.forEach(card => observer.observe(card));
      }
    }
  };

  // Scroll reveal animations
  const scrollReveal = {
    init() {
      if (!('IntersectionObserver' in window)) {
        // Fallback for older browsers
        this.fallbackAnimation();
        return;
      }

      const animatedElements = document.querySelectorAll('.hero-content, .category-card, .hero-cta');
      
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate');
            
            // Track animation trigger
            analytics.track('scroll_reveal', {
              element: entry.target.className,
              category: 'engagement'
            });
            
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: CONFIG.intersectionThreshold,
        rootMargin: '0px 0px -50px 0px'
      });

      animatedElements.forEach(element => {
        observer.observe(element);
      });
    },

    fallbackAnimation() {
      // Simple fallback for older browsers
      const elements = document.querySelectorAll('.hero-content, .category-card');
      elements.forEach((element, index) => {
        setTimeout(() => {
          element.classList.add('animate');
        }, index * 100);
      });
    }
  };

  // Smooth scrolling for anchor links
  const smoothScroll = {
    init() {
      // Handle anchor links
      document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href^="#"]');
        if (!link) return;

        const href = link.getAttribute('href');
        if (href === '#') return;

        e.preventDefault();
        utils.smoothScrollTo(href);

        // Track smooth scroll
        analytics.track('smooth_scroll', {
          target: href,
          category: 'navigation'
        });
      });
    }
  };

  // Performance monitoring
  const performanceMonitor = {
    init() {
      // Track Core Web Vitals
      analytics.trackPerformance();

      // Monitor page load performance
      window.addEventListener('load', () => {
        setTimeout(() => {
          this.trackPageLoad();
        }, 1000);
      });

      // Monitor scroll performance
      let scrollTimeout;
      window.addEventListener('scroll', utils.throttle(() => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          analytics.trackScrollDepth();
        }, CONFIG.throttleDelay);
      }, CONFIG.throttleDelay));
    },

    trackPageLoad() {
      if ('performance' in window) {
        const perfData = performance.getEntriesByType('navigation')[0];
        
        if (perfData) {
          const metrics = {
            load_time: Math.round(perfData.loadEventEnd - perfData.fetchStart),
            dom_content_loaded: Math.round(perfData.domContentLoadedEventEnd - perfData.fetchStart),
            first_paint: Math.round(perfData.responseEnd - perfData.fetchStart)
          };

          analytics.track('page_load_performance', {
            ...metrics,
            category: 'performance'
          });

          // Check against thresholds
          this.checkPerformanceThresholds(metrics);
        }
      }
    },

    checkPerformanceThresholds(metrics) {
      const warnings = [];
      
      if (metrics.load_time > CONFIG.performanceThresholds.lcp) {
        warnings.push('LCP threshold exceeded');
      }

      if (metrics.dom_content_loaded > CONFIG.performanceThresholds.lcp) {
        warnings.push('DOM Content Loaded threshold exceeded');
      }

      if (warnings.length > 0) {
        analytics.track('performance_warning', {
          warnings: warnings.join(', '),
          category: 'performance'
        });
      }
    }
  };

  // Error handling
  const errorHandler = {
    init() {
      // Global error handler
      window.addEventListener('error', (e) => {
        this.logError('JavaScript Error', {
          message: e.message,
          filename: e.filename,
          lineno: e.lineno,
          colno: e.colno
        });
      });

      // Promise rejection handler
      window.addEventListener('unhandledrejection', (e) => {
        this.logError('Unhandled Promise Rejection', {
          reason: e.reason
        });
      });
    },

    logError(type, details) {
      console.error(`${type}:`, details);
      
      // Track error in analytics
      analytics.track('javascript_error', {
        error_type: type,
        error_details: JSON.stringify(details),
        category: 'error'
      });
    }
  };

  // Touch gesture support
  const touchSupport = {
    init() {
      // Handle touch events for better mobile experience
      document.addEventListener('touchstart', (e) => {
        const target = e.target.closest('.category-card, .hero-cta, .category-cta');
        if (target) {
          target.classList.add('touch-active');
        }
      }, { passive: true });

      document.addEventListener('touchend', (e) => {
        const target = e.target.closest('.category-card, .hero-cta, .category-cta');
        if (target) {
          setTimeout(() => {
            target.classList.remove('touch-active');
          }, 150);
        }
      }, { passive: true });
    }
  };

  // Initialize everything
  const init = () => {
    try {
      // Core functionality
      mobileMenu.init();
      search.init();
      categoryCards.init();
      scrollReveal.init();
      smoothScroll.init();
      performanceMonitor.init();
      errorHandler.init();
      touchSupport.init();

      // Track page view
      analytics.track('page_view', {
        page_url: window.location.href,
        page_title: document.title,
        category: 'page_view'
      });

      console.log('Japanessie custom JavaScript initialized successfully');
    } catch (error) {
      console.error('Error initializing Japanessie custom JavaScript:', error);
      errorHandler.logError('Initialization Error', { error: error.message });
    }
  };

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export for global access if needed
  window.JapanessieCustom = {
    analytics,
    utils,
    state,
    mobileMenu,
    search,
    categoryCards
  };

})();

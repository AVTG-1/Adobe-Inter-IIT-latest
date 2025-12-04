/**
 * Adobe Image Editor - Technical Documentation
 * Interactive Features JavaScript
 */

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  initializeNavigation();
  initializeSearch();
  initializeCodeCopy();
  initializeSmoothScroll();
  highlightCurrentPage();
});

/**
 * Navigation Management
 */
function initializeNavigation() {
  const navLinks = document.querySelectorAll('.nav-section a');

  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      // Remove active class from all links
      navLinks.forEach(l => l.classList.remove('active'));

      // Add active class to clicked link
      this.classList.add('active');

      // Store current page
      sessionStorage.setItem('currentPage', this.getAttribute('href'));
    });
  });
}

/**
 * Highlight current page in navigation
 */
function highlightCurrentPage() {
  const currentPage = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-section a');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (currentPage.endsWith(href) || (currentPage.endsWith('/') && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

/**
 * Search Functionality
 */
function initializeSearch() {
  const searchInput = document.querySelector('.search-bar input');

  if (!searchInput) return;

  searchInput.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const navSections = document.querySelectorAll('.nav-section');

    navSections.forEach(section => {
      const links = section.querySelectorAll('a');
      let hasVisibleLinks = false;

      links.forEach(link => {
        const text = link.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
          link.style.display = 'block';
          hasVisibleLinks = true;
        } else {
          link.style.display = 'none';
        }
      });

      // Show/hide section header
      const header = section.querySelector('h3');
      if (header) {
        header.style.display = hasVisibleLinks ? 'block' : 'none';
      }
    });
  });
}

/**
 * Code Block Copy Functionality
 */
function initializeCodeCopy() {
  const codeBlocks = document.querySelectorAll('pre code');

  codeBlocks.forEach((block, index) => {
    // Create copy button
    const button = document.createElement('button');
    button.className = 'copy-button';
    button.innerHTML = '📋 Copy';
    button.setAttribute('data-index', index);

    // Wrap code block
    const wrapper = document.createElement('div');
    wrapper.className = 'code-wrapper';
    block.parentNode.insertBefore(wrapper, block.parentNode);
    wrapper.appendChild(block.parentNode);
    wrapper.insertBefore(button, wrapper.firstChild);

    // Add click handler
    button.addEventListener('click', function() {
      const code = block.textContent;
      navigator.clipboard.writeText(code).then(() => {
        button.innerHTML = '✓ Copied!';
        button.style.background = 'rgba(16, 185, 129, 0.2)';

        setTimeout(() => {
          button.innerHTML = '📋 Copy';
          button.style.background = '';
        }, 2000);
      });
    });
  });
}

/**
 * Smooth Scrolling for Anchor Links
 */
function initializeSmoothScroll() {
  const anchorLinks = document.querySelectorAll('a[href^="#"]');

  anchorLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);

      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

/**
 * Toggle Sidebar on Mobile
 */
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.classList.toggle('mobile-open');
  }
}

/**
 * Table of Contents Generator
 */
function generateTableOfContents() {
  const content = document.querySelector('.main-content');
  const headings = content.querySelectorAll('h2, h3');

  if (headings.length === 0) return;

  const toc = document.createElement('div');
  toc.className = 'table-of-contents card';
  toc.innerHTML = '<h3>Table of Contents</h3><ul></ul>';

  const list = toc.querySelector('ul');

  headings.forEach((heading, index) => {
    const id = heading.id || `heading-${index}`;
    heading.id = id;

    const li = document.createElement('li');
    li.style.marginLeft = heading.tagName === 'H3' ? '1rem' : '0';

    const link = document.createElement('a');
    link.href = `#${id}`;
    link.textContent = heading.textContent;

    li.appendChild(link);
    list.appendChild(li);
  });

  // Insert after page header
  const pageHeader = content.querySelector('.page-header');
  if (pageHeader && pageHeader.nextSibling) {
    pageHeader.parentNode.insertBefore(toc, pageHeader.nextSibling);
  }
}

/**
 * Add Copy Button Styles Dynamically
 */
const style = document.createElement('style');
style.textContent = `
  .code-wrapper {
    position: relative;
  }

  .copy-button {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(124, 58, 237, 0.2);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.3s;
    z-index: 10;
  }

  .copy-button:hover {
    background: rgba(124, 58, 237, 0.4);
    transform: translateY(-2px);
  }

  .code-wrapper pre {
    margin-top: 0;
  }

  .table-of-contents ul {
    list-style: none;
    margin-left: 0;
  }

  .table-of-contents li {
    margin-bottom: 0.5rem;
  }

  .table-of-contents a {
    color: var(--text-secondary);
    text-decoration: none;
    transition: color 0.3s;
  }

  .table-of-contents a:hover {
    color: var(--primary-color);
  }

  @media (max-width: 768px) {
    .sidebar.mobile-open {
      display: block !important;
    }
  }
`;
document.head.appendChild(style);

/**
 * Print Page Functionality
 */
function printPage() {
  window.print();
}

/**
 * Export as PDF (requires browser print-to-PDF)
 */
function exportPDF() {
  window.print();
}

/**
 * Dark/Light Mode Toggle (if needed in future)
 */
function toggleTheme() {
  document.body.classList.toggle('light-mode');
  const theme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
  localStorage.setItem('theme', theme);
}

/**
 * Load Saved Theme
 */
function loadTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
  }
}

// Auto-generate TOC if element exists
if (document.querySelector('.auto-toc')) {
  generateTableOfContents();
}

// Load theme preference
loadTheme();

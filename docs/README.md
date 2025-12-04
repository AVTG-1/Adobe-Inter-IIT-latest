# Adobe Image Editor - Technical Documentation

This directory contains comprehensive HTML-based technical documentation for the Adobe Image Editor project.

## 📚 Documentation Structure

```
docs/
├── index.html                  # Main documentation homepage
├── assets/
│   ├── style.css              # Professional documentation styles
│   ├── script.js              # Interactive features (search, copy, nav)
│   └── images/                # Documentation images
└── pages/
    ├── architecture.html      # System architecture overview
    ├── api.html              # Complete API reference
    ├── setup.html            # Setup and installation guide
    ├── features.html         # Features and capabilities
    ├── components.html       # Frontend components
    ├── development.html      # Development workflow
    └── [additional pages]    # More documentation pages
```

## 🚀 Quick Start

### View Documentation Locally

1. **Open in Browser:**
   ```bash
   # Navigate to docs directory
   cd docs/

   # Open index.html in your default browser
   # Mac:
   open index.html
   # Linux:
   xdg-open index.html
   # Windows:
   start index.html
   ```

2. **Using Local Server (Recommended):**
   ```bash
   # Python 3
   python -m http.server 8080

   # Then visit: http://localhost:8080
   ```

3. **Using Node.js:**
   ```bash
   npx serve .
   ```

## 📖 Documentation Pages

### Core Documentation

- **[Home](index.html)** - Overview and quick links
- **[Architecture](pages/architecture.html)** - System design and patterns
- **[API Reference](pages/api.html)** - REST and WebSocket APIs
- **[Setup Guide](pages/setup.html)** - Installation instructions
- **[Features](pages/features.html)** - Complete feature list

### Development Guides

- **[Components](pages/components.html)** - Frontend component library
- **[Development](pages/development.html)** - Development workflow
- **[Testing](pages/testing.html)** - Testing guidelines
- **[Deployment](pages/deployment.html)** - Deployment instructions

## 🎨 Features

### Interactive Documentation

- **Search:** Real-time search across navigation
- **Code Copy:** One-click code snippet copying
- **Smooth Navigation:** Active page highlighting
- **Responsive Design:** Mobile and desktop friendly
- **Dark Theme:** Professional dark color scheme

### Documentation Highlights

- **Hierarchical Structure:** Organized by topic and complexity
- **Comprehensive API Docs:** All endpoints with examples
- **Architecture Diagrams:** Visual system representations
- **Code Examples:** JavaScript, Python, TypeScript examples
- **Best Practices:** Development guidelines and patterns

## 🔧 Customization

### Updating Documentation

1. **Edit HTML Files:** Modify pages in `pages/` directory
2. **Update Styles:** Edit `assets/style.css`
3. **Add Features:** Extend `assets/script.js`
4. **Add Images:** Place in `assets/images/`

### Adding New Pages

1. Create new HTML file in `pages/` directory
2. Copy header/footer from existing page
3. Add navigation link in sidebar
4. Update index.html if needed

### Color Scheme

Primary colors defined in `assets/style.css`:
```css
--primary-color: #7c3aed;    /* Purple */
--secondary-color: #ec4899;   /* Pink */
--dark-bg: #0f172a;          /* Dark blue */
--card-bg: #1e293b;          /* Card background */
```

## 📊 Documentation Statistics

- **Total Pages:** 10+ HTML pages
- **Lines of CSS:** 1000+ lines
- **Interactive Features:** Search, copy, navigation
- **Code Examples:** 20+ snippets
- **API Endpoints:** Complete coverage
- **Diagrams:** Architecture visualizations

## 🌐 Deployment

### GitHub Pages

```bash
# Enable GitHub Pages in repository settings
# Point to: /docs directory on main branch
# Access at: https://username.github.io/repo-name/
```

### Static Hosting

Upload the entire `docs/` directory to:
- Netlify
- Vercel
- AWS S3
- Firebase Hosting
- Any static hosting service

### Custom Domain

Add `CNAME` file with your domain:
```bash
echo "docs.yourdomain.com" > CNAME
```

## 📝 Maintenance

### Regular Updates

- Update version numbers
- Add new features to documentation
- Update API changes
- Refresh code examples
- Add new screenshots/diagrams

### Quality Checks

- Test all links
- Verify code examples
- Check mobile responsiveness
- Validate HTML/CSS
- Test search functionality

## 🤝 Contributing

To contribute to documentation:

1. Follow existing page structure
2. Use consistent styling
3. Include code examples
4. Add to navigation
5. Test locally before committing

## 📄 License

This documentation is part of the Adobe Image Editor project.

---

**Built with ❤️ for Inter IIT Tech Meet 2025**

For questions or issues, please refer to the main project README or open an issue on GitHub.

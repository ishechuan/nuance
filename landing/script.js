document.addEventListener('DOMContentLoaded', () => {
    // Internationalization Logic
    const langBtns = document.querySelectorAll('.lang-btn');
    let currentLang = 'en'; // Default language

    function updateLanguage(lang) {
        currentLang = lang;
        
        // Update active button state
        langBtns.forEach(btn => {
            if (btn.dataset.lang === lang) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update text content
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            if (translations[lang] && translations[lang][key]) {
                if(key === 'hero_title' || key === 'hero_desc' || key === 'footer_copyright') {
                     el.innerHTML = translations[lang][key];
                } else if (el.tagName === 'META') {
                    el.setAttribute('content', translations[lang][key]);
                } else {
                    el.textContent = translations[lang][key];
                }
            }
        });

        // Update document title if needed (though usually handled by data-i18n on title tag)
        if (translations[lang]['title']) {
            document.title = translations[lang]['title'];
        }
    }

    // Event Listeners for Language Switcher
    langBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.dataset.lang;
            updateLanguage(lang);
        });
    });

    // Mobile Menu Toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
            if (navLinks.style.display === 'flex') {
                navLinks.style.flexDirection = 'column';
                navLinks.style.position = 'absolute';
                navLinks.style.top = '100%';
                navLinks.style.left = '0';
                navLinks.style.width = '100%';
                navLinks.style.background = 'white';
                navLinks.style.padding = '1rem';
                navLinks.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
            }
        });
    }

    // Smooth Scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Intersection Observer for Fade-in Animation
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    const animateElements = document.querySelectorAll('.feature-card, .step, .hero-content > *, .section-header');
    
    animateElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(el);
    });

    // Mockup Tab Switching Animation
    const tabs = document.querySelectorAll('.sidebar-tabs span');
    const cards = document.querySelectorAll('.card');
    let currentTab = 0;

    // Initially hide the second card to simulate tab switching
    if(cards.length > 1) {
        cards[1].style.display = 'none';
    }

    function switchTab(index) {
        tabs.forEach(tab => tab.classList.remove('active'));
        // Note: We need to re-select the tabs here because the DOM might have been updated by translation logic? 
        // No, translation logic updates textContent, not classes. But let's be safe.
        // Actually, the translation logic replaces text content, it doesn't destroy elements.
        // However, the 'active' class on tabs is purely visual for the mockup.
        
        // Re-adding active class to the current tab
        if(tabs[index]) tabs[index].classList.add('active');
        
        // Simple mock behavior: Toggle visibility of cards based on tab
        // This is just a visual trick for the landing page
        if (index === 0) { // Idioms
            if(cards[0]) cards[0].style.display = 'block';
            if(cards[1]) cards[1].style.display = 'none';
        } else if (index === 1) { // Syntax
            if(cards[0]) cards[0].style.display = 'none';
            if(cards[1]) cards[1].style.display = 'block';
        } else { // Vocab
            if(cards[0]) cards[0].style.display = 'block'; // Fallback for visual density
            if(cards[1]) cards[1].style.display = 'block';
        }
    }

    // Auto-switch tabs every 3 seconds
    setInterval(() => {
        currentTab = (currentTab + 1) % 3;
        switchTab(currentTab);
    }, 3000);

    // Interactive tabs on click
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            currentTab = index;
            switchTab(index);
        });
    });
});

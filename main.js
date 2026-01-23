// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const tab = btn.dataset.tab;
        document.querySelectorAll('.feed-container').forEach(f => f.classList.remove('active'));
        document.getElementById(tab + '-feed').classList.add('active');
        
        if (typeof FB !== 'undefined') setTimeout(() => FB.XFBML.parse(), 100);
    });
});

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
});

// Reload FB widgets on load
window.addEventListener('load', () => {
    if (typeof FB !== 'undefined') FB.XFBML.parse();
});

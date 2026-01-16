// Restoboost JavaScript

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initStickyHeader();
    initLazyLoading();
    initFilterListeners();
    animateOnScroll();
});

// Sticky header on scroll
function initStickyHeader() {
    const header = document.querySelector('.sticky-header');
    if (!header) return;
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

// Lazy loading images
function initLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.add('fade-in-up');
                observer.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

// Time slot selection
function selectTimeSlot(element, time) {
    // Remove previous selection
    document.querySelectorAll('.timeslot').forEach(slot => {
        slot.classList.remove('selected');
    });
    
    // Add selection to clicked slot
    element.classList.add('selected');
    document.getElementById('selectedTime').value = time;
    
    // Smooth scroll to form bottom on mobile
    if (window.innerWidth < 768) {
        setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
}

// My bookings modal
function showMyBookings() {
    const phone = prompt('Введите ваш номер телефона:\n(например: +77771234567)');
    if (phone && phone.trim() !== '') {
        window.location.href = `/my-bookings?phone=${encodeURIComponent(phone.trim())}`;
    }
}

// Filter listeners for HTMX integration
function initFilterListeners() {
    const discountFilter = document.querySelector('select[name="discount"]');
    const cuisineFilter = document.querySelector('select[name="cuisine"]');
    const checkFilter = document.querySelector('select[name="avg_check"]');
    
    if (discountFilter) {
        discountFilter.addEventListener('change', filterRestaurants);
    }
    if (cuisineFilter) {
        cuisineFilter.addEventListener('change', filterRestaurants);
    }
    if (checkFilter) {
        checkFilter.addEventListener('change', filterRestaurants);
    }
}

// Filter restaurants (placeholder for HTMX)
function filterRestaurants() {
    // Will be enhanced with HTMX in next iteration
    console.log('Filters changed');
}

// Animate elements on scroll
function animateOnScroll() {
    const elements = document.querySelectorAll('.restaurant-card');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('fade-in-up');
                }, index * 100);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    elements.forEach(el => observer.observe(el));
}

// Form validation for booking
document.addEventListener('DOMContentLoaded', function() {
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(e) {
            const selectedTime = document.getElementById('selectedTime')?.value;
            const phone = document.querySelector('input[name="phone"]')?.value;
            
            if (!selectedTime) {
                e.preventDefault();
                alert('⚠️ Пожалуйста, выберите время бронирования');
                return false;
            }
            
            if (phone && !isValidPhone(phone)) {
                e.preventDefault();
                alert('⚠️ Пожалуйста, введите корректный номер телефона');
                return false;
            }
        });
    }
});

// Phone validation
function isValidPhone(phone) {
    const phoneRegex = /^[\+]?[0-9]{10,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
}

// Success message auto-hide
setTimeout(() => {
    const alerts = document.querySelectorAll('.alert-success, .alert-error');
    alerts.forEach(alert => {
        alert.style.transition = 'opacity 0.5s ease';
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), 500);
    });
}, 5000);

// Debug: проверка кликов
document.addEventListener('DOMContentLoaded', function() {
    const bookButtons = document.querySelectorAll('a[href^="/restaurant/"]');
    bookButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            console.log('Переход на:', this.href);
        });
    });
});

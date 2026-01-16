// Restaurant Page JavaScript

const photos = typeof restaurantPhotos !== 'undefined' ? restaurantPhotos : [];
let currentPhotoIndex = 0;

// Получаем restaurant_id из скрытого поля формы
function getRestaurantId() {
    const restaurantIdInput = document.querySelector('input[name="restaurant_id"]');
    if (restaurantIdInput) {
        return restaurantIdInput.value;
    }
    console.error('❌ restaurant_id не найден в форме');
    return null;
}

// Set default date
const today = new Date().toISOString().split('T')[0];
const dateInput = document.getElementById('dateInput');

if (dateInput) {
    dateInput.value = today;
    dateInput.min = today;
    
    // Загрузка слотов при смене даты (TheFork)
    dateInput.addEventListener('change', async function() {
        const date = this.value;
        if (!date) return;
        
        const restaurantId = getRestaurantId();
        if (!restaurantId) {
            console.error('❌ Не удалось получить ID ресторана');
            return;
        }
        
        const loader = document.getElementById('timeSlotsLoader');
        const container = document.getElementById('timeSlots');
        
        if (loader) loader.innerHTML = '⏳ Загрузка слотов...';
        if (container) {
            container.innerHTML = '';
            container.classList.add('hidden');
        }
        
        try {
            console.log(`📡 Запрос слотов: restaurant_id=${restaurantId}, date=${date}`);
            
            const res = await fetch(`/api/bookings/available-slots?restaurant_id=${restaurantId}&date=${date}&slot_step_minutes=60`);
            
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            
            const slots = await res.json();
            
            console.log(`✅ Получено ${slots.length} слотов:`, slots);
            
            if (!Array.isArray(slots)) {
                throw new Error('API вернул не массив. Ответ: ' + JSON.stringify(slots));
            }
            
            if (slots.length === 0) {
                if (loader) loader.innerHTML = '❌ Нет доступных слотов на эту дату';
                if (container) container.classList.add('hidden');
                return;
            }
            
            if (container) {
                container.innerHTML = slots.map(slot => `
                    <button 
                        class="slot-btn slot-${slot.status}" 
                        onclick="selectSlot('${slot.time}', ${slot.discount}, '${slot.status}')" 
                        ${slot.status === 'full' ? 'disabled' : ''}
                        title="${slot.description || 'Слот'}"
                    >
                        <div class="font-semibold">${slot.time}</div>
                        <div class="text-xs">-${slot.discount}%</div>
                        <div class="text-xs text-gray-600">${slot.bookings}/4</div>
                    </button>
                `).join('');
                container.classList.remove('hidden');
            }
            
            if (loader) loader.innerHTML = '';
            
        } catch (error) {
            console.error('❌ Slots error:', error);
            if (loader) {
                loader.innerHTML = `❌ Ошибка загрузки слотов: ${error.message}`;
            }
        }
    });

    // Загрузить слоты для сегодня
    dateInput.dispatchEvent(new Event('change'));
}

// 🔥 TheFork Dynamic Slots
window.selectSlot = function(time, discount, status) {
    if (status === 'full') {
        showToast('❌ Этот слот полностью забронирован', 'error');
        return;
    }
    
    document.querySelectorAll('.slot-btn').forEach(btn => btn.classList.remove('selected'));
    event.target.closest('.slot-btn').classList.add('selected');
    
    document.getElementById('selectedTime').value = time;
    document.getElementById('selectedDiscount').value = discount;
    
    document.getElementById('submitBtn').innerHTML = `🎉 Забронировать <strong>-${discount}%</strong>`;
    showToast(`✅ Выбран слот ${time} со скидкой ${discount}%`, 'success');
};


// Lightbox functions
function openLightbox(index) {
    if (photos.length === 0) return;
    currentPhotoIndex = index;
    document.getElementById('lightboxImage').src = photos[currentPhotoIndex];
    document.getElementById('lightbox').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    document.getElementById('lightbox').classList.remove('active');
    document.body.style.overflow = '';
}

function prevPhoto() {
    currentPhotoIndex = (currentPhotoIndex - 1 + photos.length) % photos.length;
    document.getElementById('lightboxImage').src = photos[currentPhotoIndex];
}

function nextPhoto() {
    currentPhotoIndex = (currentPhotoIndex + 1) % photos.length;
    document.getElementById('lightboxImage').src = photos[currentPhotoIndex];
}

// Keyboard navigation
document.addEventListener('keydown', function(e) {
    const lightbox = document.getElementById('lightbox');
    if (lightbox && lightbox.classList.contains('active')) {
        if (e.key === 'Escape') closeLightbox();
        else if (e.key === 'ArrowLeft') prevPhoto();
        else if (e.key === 'ArrowRight') nextPhoto();
    }
});

// Share functionality
function shareRestaurant() {
    if (navigator.share) {
        navigator.share({
            title: document.title,
            url: window.location.href
        }).catch(err => console.log('Share cancelled'));
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(window.location.href).then(() => {
            showToast('✅ Ссылка скопирована!', 'success');
        });
    }
}

// Favorite toggle
function toggleFavorite() {
    const btn = document.getElementById('favoriteBtn');
    btn.classList.toggle('active');
    const isFavorite = btn.classList.contains('active');
    showToast(isFavorite ? '❤️ Добавлено в избранное' : '💔 Удалено из избранного', 'success');
}

// Form submission
const bookingForm = document.getElementById('bookingForm');
if (bookingForm) {
    bookingForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const selectedTime = document.getElementById('selectedTime').value;
        if (!selectedTime) {
            showMessage('error', '⚠️ Пожалуйста, выберите время');
            return;
        }

        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '⏳ Бронируем...';

        const formData = new FormData(this);

        try {
            const response = await fetch('/api/bookings', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok && result.success) {
                const data = result.data;
                const discount = document.getElementById('selectedDiscount').value;

                document.getElementById('result').innerHTML = `
                    <div class="success-message bg-green-50 border-2 border-green-500 rounded-xl p-6">
                        <div class="flex items-start gap-4">
                            <svg class="w-10 h-10 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <div class="flex-1">
                                <h3 class="text-xl font-bold text-green-800 mb-3">✅ Бронь подтверждена!</h3>
                                <div class="space-y-2 text-sm text-gray-700">
                                    <p><strong>Гость:</strong> ${data.guest_name}</p>
                                    <p><strong>Дата:</strong> ${formatDate(data.date)} в ${data.time}</p>
                                    <p><strong>Гостей:</strong> ${data.party_size}</p>
                                    <p><strong>Скидка:</strong> <span class="text-green-600 font-bold">-${discount}%</span></p>
                                </div>
                                <div class="mt-4 flex gap-3">
                                    <a href="/my-bookings?phone=${encodeURIComponent(data.phone)}" class="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition">
                                        Мои брони
                                    </a>
                                    <a href="/" class="inline-block bg-gray-600 hover:bg-gray-700 text-white font-semibold px-6 py-2 rounded-lg transition">
                                        На главную
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                this.reset();
                document.querySelectorAll('.slot-btn').forEach(slot => slot.classList.remove('selected'));
                dateInput.value = today;
                document.getElementById('result').scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                showMessage('error', result.message || '❌ Ошибка при создании брони');
            }
        } catch (error) {
            console.error('❌ Booking error:', error);
            showMessage('error', '❌ Ошибка сети. Попробуйте снова.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '🎉 Забронировать со скидкой';
        }
    });
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('ru-RU', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function showMessage(type, text) {
    const bgColor = type === 'error' ? 'bg-red-50 border-red-500 text-red-800' : 'bg-green-50 border-green-500 text-green-800';
    const icon = type === 'error' ? '❌' : '✅';

    document.getElementById('result').innerHTML = `
        <div class="success-message ${bgColor} border-2 rounded-xl p-6">
            <div class="flex items-center gap-3">
                <span class="text-2xl">${icon}</span>
                <p class="font-semibold">${text}</p>
            </div>
        </div>
    `;
    document.getElementById('result').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white font-semibold z-50 ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    toast.textContent = message;
    toast.style.animation = 'slideIn 0.3s ease-out';
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

console.log('✅ Restaurant page loaded');

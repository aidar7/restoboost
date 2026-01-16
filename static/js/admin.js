// ========== GLOBAL VARIABLES ==========
let currentRestaurantId = null;
let newRestaurantPhotos = [];


// ========== CUISINE OPTIONS ==========
const cuisineOptions = [
    {value: "Европейская", emoji: "🍽️"},
    {value: "Итальянская", emoji: "🍕"},
    {value: "Азиатская", emoji: "🍜"},
    {value: "Японская", emoji: "🍣"},
    {value: "Русская", emoji: "🥟"},
    {value: "Грузинская", emoji: "🥘"},
    {value: "Узбекская", emoji: "🍛"},
    {value: "Мексиканская", emoji: "🌮"},
    {value: "Турецкая", emoji: "🥙"},
    {value: "Вегетарианская", emoji: "🥗"},
    {value: "Стейк-хаус", emoji: "🥩"},
    {value: "Бургеры", emoji: "🍔"}
];


// ========== NEW RESTAURANT PHOTO UPLOAD ==========

function handleAddRestaurantFiles(files) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    Array.from(files).forEach(file => {
        if (!validTypes.includes(file.type)) {
            showNotification(`Файл ${file.name} имеет неподдерживаемый формат`, 'error');
            return;
        }
        
        if (file.size > maxSize) {
            showNotification(`Файл ${file.name} слишком большой (макс 10MB)`, 'error');
            return;
        }
        
        newRestaurantPhotos.push(file);
    });
    
    updateAddRestaurantPhotoPreview();
}


function updateAddRestaurantPhotoPreview() {
    const previewContainer = document.getElementById('addRestaurantPhotoPreview');
    const countElement = document.getElementById('addRestaurantPhotoCount');
    
    if (newRestaurantPhotos.length === 0) {
        previewContainer.style.display = 'none';
        countElement.style.display = 'none';
        return;
    }
    
    previewContainer.style.display = 'grid';
    countElement.style.display = 'block';
    countElement.querySelector('span').textContent = newRestaurantPhotos.length;
    
    previewContainer.innerHTML = '';
    
    newRestaurantPhotos.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const photoItem = document.createElement('div');
            photoItem.className = 'photo-item';
            photoItem.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <div class="photo-overlay">
                    <button 
                        type="button"
                        onclick="removeAddRestaurantPhoto(${index})"
                        class="photo-delete"
                        title="Удалить"
                    >×</button>
                    <span class="photo-number">#${index + 1}</span>
                </div>
            `;
            previewContainer.appendChild(photoItem);
        };
        reader.readAsDataURL(file);
    });
}


function removeAddRestaurantPhoto(index) {
    newRestaurantPhotos.splice(index, 1);
    updateAddRestaurantPhotoPreview();
}


function handleAddRestaurantDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('addRestaurantDropZone').classList.add('drag-over');
}


function handleAddRestaurantDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('addRestaurantDropZone').classList.remove('drag-over');
}


function handleAddRestaurantDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('addRestaurantDropZone').classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    handleAddRestaurantFiles(files);
}


// ========== EXISTING RESTAURANT PHOTO UPLOAD ==========

function openPhotoUpload(restaurantId, restaurantName) {
    currentRestaurantId = restaurantId;
    document.getElementById('photoUploadRestaurantName').textContent = `Ресторан: ${restaurantName}`;
    document.getElementById('photoUploadModal').classList.add('show');
    
    loadCurrentPhotos(restaurantId);
}


function closePhotoUpload() {
    document.getElementById('photoUploadModal').classList.remove('show');
    currentRestaurantId = null;
    window.location.reload();
}


function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('dropZone').classList.add('drag-over');
}


function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('dropZone').classList.remove('drag-over');
}


function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('dropZone').classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    uploadPhotos(files);
}


function handleFileSelect(e) {
    const files = e.target.files;
    uploadPhotos(files);
}


async function uploadPhotos(files) {
    if (!currentRestaurantId) {
        alert('Ошибка: ресторан не выбран');
        return;
    }
    
    const progressDiv = document.getElementById('uploadProgress');
    const totalFiles = files.length;
    let uploaded = 0;
    let failed = 0;
    
    progressDiv.innerHTML = `
        <div class="upload-progress-bar">
            <div class="upload-progress-fill" style="width: 0%">0%</div>
        </div>
        <p style="text-align: center; color: #666; margin-top: 10px;">Загрузка 0/${totalFiles} фото...</p>
    `;
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (!file.type.startsWith('image/')) {
            failed++;
            continue;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetch(`/api/restaurants/${currentRestaurantId}/upload-photo`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                uploaded++;
                const progress = Math.round((uploaded + failed) / totalFiles * 100);
                progressDiv.innerHTML = `
                    <div class="upload-progress-bar">
                        <div class="upload-progress-fill" style="width: ${progress}%">${progress}%</div>
                    </div>
                    <p style="text-align: center; color: #666; margin-top: 10px;">
                        ✅ Загружено ${uploaded}/${totalFiles} фото
                        ${failed > 0 ? `<br><span style="color: #ff5722;">❌ Ошибок: ${failed}</span>` : ''}
                    </p>
                `;
            } else {
                failed++;
            }
        } catch (error) {
            failed++;
            console.error(`Error uploading ${file.name}:`, error);
        }
    }
    
    if (uploaded > 0) {
        progressDiv.innerHTML = `
            <p style="text-align: center; color: #4CAF50; font-size: 18px; font-weight: bold; margin-top: 20px;">
                ✅ Загружено ${uploaded} фото!
                ${failed > 0 ? `<br><span style="color: #ff5722;">❌ Ошибок: ${failed}</span>` : ''}
            </p>
        `;
        setTimeout(() => loadCurrentPhotos(currentRestaurantId), 500);
    }
    
    document.getElementById('photoInput').value = '';
}


async function loadCurrentPhotos(restaurantId) {
    try {
        const response = await fetch(`/api/restaurants/${restaurantId}`);
        const restaurant = await response.json();
        
        const photos = restaurant.photos || [];
        document.getElementById('photoCount').textContent = photos.length;
        
        const photosDiv = document.getElementById('currentPhotos');
        
        if (photos.length === 0) {
            photosDiv.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #999; background: #f5f5f5; border-radius: 8px; grid-column: 1 / -1;">
                    <div style="font-size: 48px; margin-bottom: 10px;">📸</div>
                    <p>Фото еще не загружены</p>
                </div>
            `;
            return;
        }
        
        photosDiv.innerHTML = photos.map((url, index) => `
            <div class="photo-item">
                <img src="${url}" alt="Фото ${index + 1}" loading="lazy">
                <div class="photo-overlay">
                    <button class="photo-delete" onclick="deletePhoto(${restaurantId}, ${index})" title="Удалить">
                        🗑️
                    </button>
                    <div class="photo-number">#${index + 1}</div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading photos:', error);
    }
}


async function deletePhoto(restaurantId, photoIndex) {
    if (!confirm('Удалить это фото?')) return;
    
    try {
        const response = await fetch(`/api/restaurants/${restaurantId}/photos/${photoIndex}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ Фото удалено', 'success');
            loadCurrentPhotos(restaurantId);
        } else {
            alert(`Ошибка: ${result.message}`);
        }
    } catch (error) {
        alert('Ошибка удаления фото');
    }
}


// ========== RESTAURANT CRUD OPERATIONS ==========

async function deleteRestaurant(id, name) {
    if (!confirm(`❌ Вы уверены, что хотите удалить "${name}"?\n\nЭто действие нельзя отменить!`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/restaurants/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            const card = document.getElementById(`restaurant-${id}`);
            if (card) {
                card.style.transition = 'all 0.3s ease';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.9)';
                
                setTimeout(() => {
                    card.remove();
                    updateRestaurantCount();
                }, 300);
            }
        } else {
            showNotification(`❌ Ошибка удаления: ${result.message}`, 'error');
        }
    } catch (error) {
        showNotification('❌ Ошибка сети при удалении', 'error');
    }
}


// ============================================
// ФУНКЦИЯ ДЛЯ ОТКРЫТИЯ MODAL РЕДАКТИРОВАНИЯ
// ============================================

function openEditModal(restaurantId) {
    fetch(`/api/restaurants/${restaurantId}`)
        .then(res => res.json())
        .then(restaurant => {
            // Заполняем основные поля
            document.getElementById('edit_restaurant_id').value = restaurant.id;
            document.getElementById('edit_name').value = restaurant.name;
            document.getElementById('edit_category').value = restaurant.category || 'restaurant';
            document.getElementById('edit_rating').value = restaurant.rating || 5.0;
            document.getElementById('edit_avg_check').value = restaurant.avg_check || 0;
            document.getElementById('edit_address').value = restaurant.address || '';
            document.getElementById('edit_phone').value = restaurant.phone || '';
            document.getElementById('edit_description').value = restaurant.description || '';

            // Заполняем кухню (checkboxes)
            const cuisines = restaurant.cuisine || [];
            document.querySelectorAll('#editCuisineContainer input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = cuisines.includes(checkbox.value);
                // Визуальная обратная связь
                const label = checkbox.nextElementSibling;
                if (checkbox.checked && label) {
                    label.classList.add('bg-purple-200', 'border-purple-500');
                } else if (label) {
                    label.classList.remove('bg-purple-200', 'border-purple-500');
                }
            });

            // Заполняем скидку
            document.getElementById('edit_discount').value = restaurant.discount || 20;

            // Заполняем даты и время
            document.getElementById('edit_valid_from').value = restaurant.valid_from || '';
            document.getElementById('edit_valid_to').value = restaurant.valid_to || '';
            document.getElementById('edit_time_start').value = restaurant.time_start || '15:00';
            document.getElementById('edit_time_end').value = restaurant.time_end || '22:00';

            // Устанавливаем значение в поле диапазона дат для Air Datepicker
            const dateRangeField = document.getElementById('editRestaurantDateRange');
            if (dateRangeField && restaurant.valid_from && restaurant.valid_to) {
                dateRangeField.value = `${restaurant.valid_from} — ${restaurant.valid_to}`;
            }

            // Показываем modal
            document.getElementById('editModal').style.display = 'block';
        })
        .catch(error => {
            console.error('Ошибка при загрузке ресторана:', error);
            showNotification('❌ Ошибка при загрузке данных ресторана', 'error');
        });
}


// ============================================
// ФУНКЦИЯ ДЛЯ ЗАКРЫТИЯ MODAL
// ============================================

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    document.getElementById('editRestaurantForm').reset();
}


// Закрытие modal при клике вне его
window.onclick = function(event) {
    const modal = document.getElementById('editModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};


// ========== UTILITY FUNCTIONS ==========

function updateRestaurantCount() {
    const count = document.querySelectorAll('[id^="restaurant-"]').length;
    const counterElements = document.querySelectorAll('.bg-blue-100.text-blue-800');
    counterElements.forEach(el => {
        if (el.textContent.includes('заведений')) {
            el.textContent = `${count} заведений`;
        }
    });
}


function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg transition-all duration-300 ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } text-white font-semibold`;
    notification.textContent = message;
    notification.style.opacity = '0';
    
    document.body.appendChild(notification);
    setTimeout(() => notification.style.opacity = '1', 10);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}


function showMessage(type, text) {
    const resultDiv = document.getElementById('formResult');
    const bgColor = type === 'error' ? 'bg-red-100 border-red-300 text-red-800' : 'bg-green-100 border-green-300 text-green-800';
    resultDiv.innerHTML = `
        <div class="${bgColor} border-2 p-4 rounded-lg">
            <p class="font-bold">${text}</p>
        </div>
    `;
    setTimeout(() => resultDiv.innerHTML = '', 3000);
}


// ========== EVENT LISTENERS (DOM Ready) ==========

document.addEventListener('DOMContentLoaded', function() {
    
    // Add Restaurant Photo Input
    const addPhotoInput = document.getElementById('addRestaurantPhotoInput');
    if (addPhotoInput) {
        addPhotoInput.addEventListener('change', function(e) {
            handleAddRestaurantFiles(e.target.files);
        });
    }
    
    // Add Restaurant Form Submit
    const addRestaurantForm = document.getElementById('addRestaurantForm');
    if (addRestaurantForm) {
        addRestaurantForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            
            // Collect selected cuisines
            const selectedCuisines = Array.from(document.querySelectorAll('input[name="cuisine"]:checked'))
                .map(cb => cb.value);

            if (selectedCuisines.length === 0) {
                showMessage('error', '⚠️ Выберите хотя бы один тип кухни!');
                return;
            }

            // ✅ Отправляем cuisine как JSON string (не массив!)
            formData.delete('cuisine');
            formData.append('cuisine', JSON.stringify(selectedCuisines));

            // Add photos
            newRestaurantPhotos.forEach((file) => {
                formData.append('photos', file);
            });

            
            const resultDiv = document.getElementById('formResult');
            
            resultDiv.innerHTML = `
                <div class="bg-blue-100 border-2 border-blue-300 text-blue-800 p-4 rounded-lg flex items-center gap-3">
                    <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span class="font-semibold">Добавление ресторана${newRestaurantPhotos.length > 0 ? ' и загрузка фото...' : '...'}</span>
                </div>
            `;

            // Debug: Log FormData
            console.log('📤 Отправляемые данные:');
            for (let [key, value] of formData.entries()) {
                console.log(`  ${key}:`, value);
            }

            try {
                const response = await fetch('/api/restaurants/', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();
                console.log('📥 Ответ сервера:', result);

                if (response.ok && result.success) {
                    resultDiv.innerHTML = `
                        <div class="bg-green-100 border-2 border-green-300 text-green-800 p-4 rounded-lg flex items-center gap-3">
                            <span class="text-2xl">✅</span>
                            <div>
                                <p class="font-bold">${result.message}</p>
                                <p class="text-sm mt-1">
                                    ${newRestaurantPhotos.length > 0 ? `📸 Загружено ${result.photos_uploaded || newRestaurantPhotos.length} фото • ` : ''}
                                    Кухня: ${selectedCuisines.join(', ')} • Скидка ${formData.get('discount')}%
                                </p>
                            </div>
                        </div>
                    `;

                    e.target.reset();
                    document.querySelectorAll('input[name="cuisine"]').forEach(cb => cb.checked = false);
                    newRestaurantPhotos = [];
                    updateAddRestaurantPhotoPreview();

                    setTimeout(() => window.location.reload(), 2000);
                } else {
                    resultDiv.innerHTML = `
                        <div class="bg-red-100 border-2 border-red-300 text-red-800 p-4 rounded-lg">
                            <p class="font-bold">❌ Ошибка: ${result.message || result.detail || 'Не удалось добавить ресторан'}</p>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('❌ Ошибка:', error);
                resultDiv.innerHTML = `
                    <div class="bg-red-100 border-2 border-red-300 text-red-800 p-4 rounded-lg">
                        <p class="font-bold">❌ Ошибка сети: ${error.message}</p>
                    </div>
                `;
            }

            setTimeout(() => resultDiv.innerHTML = '', 8000);
        });
    }
    
    // Edit Restaurant Form Submit
    const editRestaurantForm = document.getElementById('editRestaurantForm');
    if (editRestaurantForm) {
        editRestaurantForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const restaurantId = document.getElementById('edit_restaurant_id').value;
            
            const selectedCuisines = Array.from(document.querySelectorAll('#editCuisineContainer input[type="checkbox"]:checked'))
                .map(cb => cb.value);
            
            if (selectedCuisines.length === 0) {
                showNotification('⚠️ Выберите хотя бы один тип кухни!', 'error');
                return;
            }

            // Получаем даты из скрытых полей
            const valid_from = document.getElementById('edit_valid_from').value;
            const valid_to = document.getElementById('edit_valid_to').value;
            const time_start = document.getElementById('edit_time_start').value;
            const time_end = document.getElementById('edit_time_end').value;

            if (!valid_from || !valid_to || !time_start || !time_end) {
                showNotification('❌ Пожалуйста, заполните все поля даты и времени', 'error');
                return;
            }
            
            const data = {
                name: document.getElementById('edit_name').value,
                category: document.getElementById('edit_category').value,
                rating: parseFloat(document.getElementById('edit_rating').value),
                avg_check: parseInt(document.getElementById('edit_avg_check').value),
                cuisine: selectedCuisines,
                address: document.getElementById('edit_address').value,
                phone: document.getElementById('edit_phone').value,
                description: document.getElementById('edit_description').value || '',
                discount: parseInt(document.getElementById('edit_discount').value),
                time_start: time_start,
                time_end: time_end,
                valid_from: valid_from,
                valid_to: valid_to
            };
            
            try {
                const response = await fetch(`/api/restaurants/${restaurantId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    showNotification(`✅ Ресторан "${data.name}" обновлён!`, 'success');
                    closeEditModal();
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    showNotification(`❌ Ошибка: ${result.message}`, 'error');
                }
            } catch (error) {
                showNotification('❌ Ошибка сети при сохранении', 'error');
            }
        });
    }
});


// Event delegation для кнопок действий ресторанов
document.addEventListener('click', function(e) {
    if (e.target.closest('.restaurant-action-btn')) {
        const btn = e.target.closest('.restaurant-action-btn');
        const action = btn.dataset.action;
        const id = parseInt(btn.dataset.restaurantId);
        const name = btn.dataset.restaurantName;
        
        if (action === 'photo') {
            openPhotoUpload(id, name);
        } else if (action === 'edit') {
            openEditModal(id);  // ✅ ИСПРАВЛЕНО: используем openEditModal вместо editRestaurant
        } else if (action === 'delete') {
            deleteRestaurant(id, name);
        }
    }
});


// ============================================
// ОБРАБОТКА КУХНИ (CHECKBOXES) - ВИЗУАЛЬНАЯ ОБРАТНАЯ СВЯЗЬ
// ============================================

// Для формы добавления
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('#cuisineContainer .cuisine-tag-selector input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const label = this.nextElementSibling;
            if (this.checked) {
                label.classList.add('bg-purple-200', 'border-purple-500');
            } else {
                label.classList.remove('bg-purple-200', 'border-purple-500');
            }
        });
    });

    // Для modal редактирования
    document.querySelectorAll('#editCuisineContainer .cuisine-tag-selector input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const label = this.nextElementSibling;
            if (this.checked) {
                label.classList.add('bg-purple-200', 'border-purple-500');
            } else {
                label.classList.remove('bg-purple-200', 'border-purple-500');
            }
        });
    });
});

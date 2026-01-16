// Dashboard JavaScript - PRODUCTION VERSION (No dummy data)

console.log('📊 Dashboard.js loading...');

// Color status mapping
const statusColors = {
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-blue-100 text-blue-800',
    no_show: 'bg-yellow-100 text-yellow-800'
};

// Apply status colors on load
document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Dashboard.js loaded');
    updateStatusColors();

    // Задержка для гарантии что allBookings определен
    setTimeout(initCharts, 100);
});

function updateStatusColors() {
    document.querySelectorAll('.status-select').forEach(select => {
        const status = select.dataset.status || 'confirmed';
        select.className = `status-select px-3 py-1 rounded-full text-xs font-semibold border-0 cursor-pointer ${statusColors[status]}`;
    });
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg text-white font-semibold z-50 ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    notification.textContent = message;
    notification.style.transition = 'opacity 0.5s';

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// Initialize Charts
function initCharts() {
    console.log('📊 Initializing charts...');

    if (typeof allBookings === 'undefined') {
        console.error('❌ allBookings not defined!');
        setTimeout(initCharts, 500); // Повтори через 500ms
        return;
    }

    if (typeof allRestaurants === 'undefined') {
        console.error('❌ allRestaurants not defined!');
        setTimeout(initCharts, 500); // Повтори через 500ms
        return;
    }

    console.log(`✅ allBookings loaded: ${allBookings.length} bookings`);
    console.log(`✅ allRestaurants loaded: ${allRestaurants.length} restaurants`);

    initBookingsChart();
    initRestaurantsChart();
}


// Bookings Chart - За последние 7 дней
function initBookingsChart() {
    const bookingsCtx = document.getElementById('bookingsChart');
    if (!bookingsCtx) {
        console.warn('⚠️ bookingsChart canvas not found');
        return;
    }

    const last7Days = getLast7Days();
    const bookingsByDay = getBookingsByDay(last7Days);

    console.log('📊 Bookings by day:', bookingsByDay);

    new Chart(bookingsCtx, {
        type: 'line',
        data: {
            labels: last7Days.map(d => formatDate(d)),
            datasets: [{
                label: 'Брони',
                data: bookingsByDay,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function(context) {
                            return `Броней: ${context.parsed.y}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        precision: 0
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });

    console.log('✅ Bookings chart initialized');
}

// Restaurants Chart - Топ ресторанов
function initRestaurantsChart() {
    const restaurantsCtx = document.getElementById('restaurantsChart');
    if (!restaurantsCtx) {
        console.warn('⚠️ restaurantsChart canvas not found');
        return;
    }

    const restaurantStats = getRestaurantStats();

    console.log('🍽️ Restaurant stats:', restaurantStats);

    // Проверка на пустые данные
    if (restaurantStats.labels.length === 0) {
        console.warn('⚠️ No restaurant data available');

        // Показываем сообщение вместо пустого графика
        const parent = restaurantsCtx.parentElement;
        parent.innerHTML = '<div class="flex items-center justify-center h-64 text-gray-400"><p class="text-lg">📭 Нет данных о ресторанах</p></div>';
        return;
    }

    new Chart(restaurantsCtx, {
        type: 'bar',
        data: {
            labels: restaurantStats.labels,
            datasets: [{
                label: 'Количество броней',
                data: restaurantStats.data,
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(251, 146, 60, 0.8)',
                    'rgba(236, 72, 153, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(14, 165, 233, 0.8)'
                ],
                borderRadius: 6,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed.y / total) * 100).toFixed(1);
                            return `Броней: ${context.parsed.y} (${percentage}%)`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        precision: 0
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 0
                    }
                }
            }
        }
    });

    console.log('✅ Restaurants chart initialized');
}

// Helper: Get last 7 days
function getLast7Days() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        days.push(date.toISOString().split('T')[0]);
    }
    return days;
}

// Helper: Format date for chart labels
function formatDate(dateStr) {
    const date = new Date(dateStr + 'T12:00:00'); // Добавляем время чтобы избежать timezone issues
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const day = date.getDay();
    const dayNum = date.getDate();
    const month = date.getMonth() + 1;

    return `${days[day]} ${dayNum}/${month}`;
}

// Helper: Get bookings count by day
function getBookingsByDay(days) {
    if (typeof allBookings === 'undefined') {
        console.error('❌ allBookings not defined in getBookingsByDay');
        return days.map(() => 0); // Пустой массив вместо тестовых данных
    }

    console.log(`📊 Calculating bookings for ${days.length} days...`);

    return days.map(day => {
        const count = allBookings.filter(b => {
            // Пробуем получить дату из booking_datetime или created_at
            let bookingDate = null;

            if (b.booking_datetime) {
                bookingDate = b.booking_datetime.split('T')[0];
            } else if (b.created_at) {
                bookingDate = b.created_at.split('T')[0];
            }

            return bookingDate === day;
        }).length;

        console.log(`  ${day}: ${count} bookings`);
        return count;
    });
}

// Helper: Get restaurant statistics
function getRestaurantStats() {
    if (typeof allBookings === 'undefined') {
        console.error('❌ allBookings not defined in getRestaurantStats');
        return {
            labels: [],
            data: []
        };
    }

    console.log(`🍽️ Calculating restaurant stats for ${allBookings.length} bookings...`);
    console.log('Available restaurants:', allRestaurants.map(r => `${r.id}: ${r.name}`));
    console.log(`🍽️ Calculating restaurant stats for ${allBookings.length} bookings...`);

    // Подсчитываем количество броней по каждому ресторану
    const restaurantCounts = {};

    allBookings.forEach(booking => {
        // Получаем название ресторана по ID
        const restaurantId = booking.restaurant_id;
        const restaurant = allRestaurants.find(r => r.id === restaurantId);
        const restaurantName = restaurant ? restaurant.name : `Ресторан #${restaurantId}`;

        if (!restaurantCounts[restaurantName]) {
            restaurantCounts[restaurantName] = 0;
        }
        restaurantCounts[restaurantName]++;
    });

    console.log('  Restaurant counts:', restaurantCounts);

    // Сортируем по количеству броней (топ 8)
    const sorted = Object.entries(restaurantCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

    console.log('  Top 8 restaurants:', sorted);

    return {
        labels: sorted.map(item => item[0]),
        data: sorted.map(item => item[1])
    };
}

console.log('✅ Dashboard.js functions loaded');

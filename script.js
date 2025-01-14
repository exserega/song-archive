// Вставим базовую структуру кода для связи с таблицей

document.addEventListener('DOMContentLoaded', function() {
    const sheetSelect = document.getElementById('sheet-select');
    const songSelect = document.getElementById('song-select');
    const songContent = document.getElementById('song-content');

    sheetSelect.addEventListener('change', function() {
        const sheet = sheetSelect.value;
        
        if(sheet) {
            // Запросить песни из таблицы на основе выбранного листа (API взаимодействие)
            // Пример: fetchSongsFromSheet(sheet);
            songSelect.disabled = false;  // Разблокируем выбор песен
        } else {
            songSelect.disabled = true;
            songContent.innerHTML = 'Выберите песню, чтобы увидеть её текст и аккорды.';
        }
    });

    songSelect.addEventListener('change', function() {
        const song = songSelect.value;
        
        if(song) {
            // Отобразить текст и аккорды выбранной песни (API взаимодействие)
            // Пример: displaySongContent(song);
        } else {
            songContent.innerHTML = 'Выберите песню, чтобы увидеть её текст и аккорды.';
        }
    });
});

const API_KEY = 'Ваш_API_ключ'; // Вставьте сюда ваш API-ключ
const SHEET_ID = 'Ваш_ID_таблицы'; // Вставьте сюда ID вашей таблицы
const SHEETS = {
    'Быстрые (вертикаль)': 'Быстрые (вертикаль)',
    'Быстрые (горизонталь)': 'Быстрые (горизонталь)',
    'Поклонение (вертикаль)': 'Поклонение (вертикаль)',
    'Поклонение (горизонталь)': 'Поклонение (горизонталь)'
};

const sheetSelect = document.getElementById('sheet-select');
const songSelect = document.getElementById('song-select');
const songContent = document.getElementById('song-content');

async function fetchSheetData(sheetName) {
    const range = `${sheetName}!A2:E100`; // Ограничиваем до 100 строк
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`;
    const response = await fetch(url);
    return response.json();
}

sheetSelect.addEventListener('change', async () => {
    const sheetName = SHEETS[sheetSelect.value];
    if (!sheetName) {
        songSelect.disabled = true;
        songSelect.innerHTML = '<option value="">-- Сначала выберите лист --</option>';
        songContent.innerHTML = 'Выберите песню, чтобы увидеть её текст и аккорды.';
        return;
    }

    const data = await fetchSheetData(sheetName);
    const rows = data.values || [];

    // Очистка списка песен
    songSelect.innerHTML = '<option value="">-- Выберите песню --</option>';
    songSelect.disabled = true; // Делаем кнопку неактивной

    if (rows.length > 0) {
        rows.forEach((row, index) => {
            if (row.length > 0 && row[0]) { // Проверка на пустые строки
                const option = document.createElement('option');
                option.value = index;
                option.textContent = row[0]; // Название песни
                songSelect.appendChild(option);
            }
        });
        songSelect.disabled = false; // Включаем кнопку выбора песни, если строки есть
    }
});

songSelect.addEventListener('change', async () => {
    const sheetName = SHEETS[sheetSelect.value];
    const songIndex = songSelect.value;

    if (sheetName && songIndex !== '') {
        const data = await fetchSheetData(sheetName);
        const rows = data.values || [];
        const songData = rows[songIndex];
        if (songData) {
            const [title, lyrics, key, link, bpm] = songData;
            songContent.innerHTML = `
                <h2>${title} — ${key} (BPM: ${bpm || 'N/A'})</h2>
                <a href="${link}" target="_blank">Оригинал</a>
                <pre>${lyrics}</pre>
            `;
        }
    } else {
        songContent.innerHTML = 'Выберите песню, чтобы увидеть её текст и аккорды.';
    }
});

const API_KEY = 'AIzaSyDO2gwifAnZzC3ooJ0A_4vAD76iYakwzlk'; // Ваш API-ключ
const SHEET_ID = '1C3gFjj9LAub_Nk9ogqKp3LKpdAxq6j8xlPAsc8OmM5s'; // Ваш ID таблицы
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
    const range = `${sheetName}!A2:E`; // Увеличен диапазон до последней строки
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.values || [];
}

sheetSelect.addEventListener('change', async () => {
    const sheetName = SHEETS[sheetSelect.value];
    if (!sheetName) return;

    const rows = await fetchSheetData(sheetName);

    // Очистка списка песен
    songSelect.innerHTML = '<option value="">-- Выберите песню --</option>';
    rows.forEach((row, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = row[0]; // Название песни
        songSelect.appendChild(option);
    });

    songSelect.disabled = rows.length === 0;
});

songSelect.addEventListener('change', async () => {
    const sheetName = SHEETS[sheetSelect.value];
    const songIndex = songSelect.value;

    if (sheetName && songIndex !== '') {
        const rows = await fetchSheetData(sheetName);
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

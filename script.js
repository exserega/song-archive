const API_KEY = 'AIzaSyDO2gwifAnZzC3ooJ0A_4vAD76iYakwzlk'; // Ваш API-ключ
const SHEET_ID = '1C3gFjj9LAub_Nk9ogqKp3LKpdAxq6j8xlPAsc8OmM5s'; // Ваш ID таблицы
const SHEETS = {
    'Быстрые (вертикаль)': 'Быстрые (вертикаль)',
    'Быстрые (горизонталь)': 'Быстрые (горизонталь)',
    'Поклонение (вертикаль)': 'Поклонение (вертикаль)',
    'Поклонение (горизонталь)': 'Поклонение (горизонталь)'
};

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const REGEX_CHORD = /\b[A-G](#|b)?(m|M|dim|aug|sus[24]?|add\d?|7|9|11|13)?\b/g;

const sheetSelect = document.getElementById('sheet-select');
const songSelect = document.getElementById('song-select');
const songContent = document.getElementById('song-content');
const transposeControls = document.getElementById('transpose-controls');

async function fetchSheetData(sheetName) {
    const range = `${sheetName}!A2:E`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.values || [];
}

function transposeChord(chord, semitones) {
    return chord.replace(REGEX_CHORD, (match) => {
        const [note, modifier] = match.match(/^[A-G](#|b)?/)[0].split(/(?=#|b)/);
        const baseIndex = NOTES.indexOf(note + (modifier || ''));
        if (baseIndex === -1) return match; // Если аккорд не найден в списке
        const newIndex = (baseIndex + semitones + NOTES.length) % NOTES.length;
        return NOTES[newIndex] + match.slice((note + (modifier || '')).length);
    });
}

function renderSong(title, lyrics, key, link, bpm, transposeBy = 0) {
    const transposedLyrics = lyrics.replace(REGEX_CHORD, (chord) => transposeChord(chord, transposeBy));
    songContent.innerHTML = `
        <h2>${title} — ${key} (BPM: ${bpm || 'N/A'})</h2>
        <a href="${link}" target="_blank">Оригинал</a>
        <pre>${transposedLyrics}</pre>
    `;
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
    songContent.innerHTML = 'Выберите песню, чтобы увидеть её текст и аккорды.';
});

songSelect.addEventListener('change', async () => {
    const sheetName = SHEETS[sheetSelect.value];
    const songIndex = songSelect.value;

    if (sheetName && songIndex !== '') {
        const rows = await fetchSheetData(sheetName);
        const songData = rows[songIndex];
        if (songData) {
            const [title, lyrics, key, link, bpm] = songData;

            // Отображение текста песни
            renderSong(title, lyrics, key, link, bpm);

            // Показ контролов транспонирования
            transposeControls.style.display = 'flex';

            // Сброс транспонирования
            transposeControls.dataset.key = key;
            transposeControls.dataset.lyrics = lyrics;
        }
    } else {
        songContent.innerHTML = 'Выберите песню, чтобы увидеть её текст и аккорды.';
        transposeControls.style.display = 'none';
    }
});

// Добавление событий для транспонирования
document.getElementById('transpose-up').addEventListener('click', () => {
    const transposeBy = 1;
    const lyrics = transposeControls.dataset.lyrics;
    const key = transposeControls.dataset.key;
    const transposedKey = transposeChord(key, transposeBy);
    renderSong(songSelect.options[songSelect.selectedIndex].textContent, lyrics, transposedKey, '', '', transposeBy);
});

document.getElementById('transpose-down').addEventListener('click', () => {
    const transposeBy = -1;
    const lyrics = transposeControls.dataset.lyrics;
    const key = transposeControls.dataset.key;
    const transposedKey = transposeChord(key, transposeBy);
    renderSong(songSelect.options[songSelect.selectedIndex].textContent, lyrics, transposedKey, '', '', transposeBy);
});

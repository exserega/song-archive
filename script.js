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
const transposeControls = document.getElementById('transpose-controls');
const keySelect = document.getElementById('key-select');
const transposeUp = document.getElementById('transpose-up');
const transposeDown = document.getElementById('transpose-down');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

const chords = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "H"];
let cachedData = {}; // Кэш для данных таблицы

// Функция для получения данных из Google Sheets с кэшированием
async function fetchSheetData(sheetName) {
    if (cachedData[sheetName]) return cachedData[sheetName]; // Если данные уже есть в кэше, возвращаем их

    const range = `${sheetName}!A2:E`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    cachedData[sheetName] = data.values || []; // Сохраняем в кэш
    return cachedData[sheetName];
}

// Функция для поиска песен по названию
async function searchSongs(query) {
    const sheetName = SHEETS[sheetSelect.value];
    if (!sheetName) return;

    const rows = await fetchSheetData(sheetName); // Используем кэшированные данные
    const matchingSongs = rows.filter(row => row[0].toLowerCase().includes(query.toLowerCase()));

    searchResults.innerHTML = ''; // Очищаем результаты поиска

    if (matchingSongs.length === 0) {
        searchResults.innerHTML = '<p>Ничего не найдено</p>';
    } else {
        matchingSongs.forEach((song, index) => {
            const resultItem = document.createElement('div');
            resultItem.textContent = song[0];
            resultItem.className = 'search-result';
            resultItem.addEventListener('click', () => {
                songSelect.value = index;
                displaySongDetails(song, index);
                searchResults.innerHTML = ''; // Убираем результаты поиска после выбора песни
            });
            searchResults.appendChild(resultItem);
        });
    }
}

function getTransposition(originalKey, newKey) {
    const originalIndex = chords.indexOf(originalKey);
    const newIndex = chords.indexOf(newKey);
    return newIndex - originalIndex;
}

function transposeChord(chord, transposition) {
    let chordType = '';
    let baseChord = chord;
    let bassNote = '';

    const suffixes = ['maj7', 'm7', '7', 'm', 'dim', 'aug', 'sus2', 'sus4', 'add9', 'dim7', 'aug7', 'sus'];

    if (chord.includes('/')) {
        [baseChord, bassNote] = chord.split('/');
    }

    for (let suffix of suffixes) {
        if (baseChord.endsWith(suffix)) {
            baseChord = baseChord.slice(0, -suffix.length);
            chordType = suffix;
            break;
        }
    }

    const currentIndex = chords.indexOf(baseChord);
    if (currentIndex === -1) return chord;

    const newIndex = (currentIndex + transposition + chords.length) % chords.length;
    const transposedBaseChord = chords[newIndex] + chordType;

    if (bassNote) {
        const bassIndex = chords.indexOf(bassNote);
        if (bassIndex !== -1) {
            const newBassIndex = (bassIndex + transposition + chords.length) % chords.length;
            return `${transposedBaseChord}/${chords[newBassIndex]}`;
        }
    }

    return transposedBaseChord;
}

function transposeLyrics(lyrics, transposition) {
    return lyrics.split('\n').map(line =>
        line.split(' ').map(word =>
            chords.some(ch => word.startsWith(ch)) ? transposeChord(word, transposition) : word
        ).join(' ')
    ).join('\n');
}

function updateTransposedLyrics() {
    const sheetName = SHEETS[sheetSelect.value];
    const songIndex = songSelect.value;
    const newKey = keySelect.value;

    if (!sheetName || songIndex === '' || !newKey) return;

    fetchSheetData(sheetName).then(rows => {
        const songData = rows[songIndex];
        if (songData) {
            const [, lyrics, originalKey] = songData;
            const transposition = getTransposition(originalKey, newKey);
            const transposedLyrics = transposeLyrics(lyrics, transposition);
            songContent.innerHTML = `<h2>${songData[0]} — ${newKey}</h2><pre>${transposedLyrics}</pre>`;
        }
    });
}

sheetSelect.addEventListener('change', async () => {
    const sheetName = SHEETS[sheetSelect.value];
    if (!sheetName) return;

    const rows = await fetchSheetData(sheetName);
    songSelect.innerHTML = '<option value="">-- Выберите песню --</option>';
    rows.forEach((row, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = row[0];
        songSelect.appendChild(option);
    });

    songSelect.disabled = rows.length === 0;
    searchInput.value = ''; // Сбрасываем поле поиска
    searchResults.innerHTML = ''; // Очищаем результаты поиска

    // Показать первый аккорд, если доступен
    if (rows.length > 0) {
        displaySongDetails(rows[0], 0);
    }
});

songSelect.addEventListener('change', async () => {
    const sheetName = SHEETS[sheetSelect.value];
    const songIndex = songSelect.value;

    if (sheetName && songIndex !== '') {
        const rows = await fetchSheetData(sheetName);
        const songData = rows[songIndex];
        if (songData) {
            displaySongDetails(songData, songIndex);
        }
    } else {
        songContent.innerHTML = 'Выберите песню, чтобы увидеть её текст и аккорды.';
        transposeControls.style.display = 'none';
    }
});

searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim();
    if (query) {
        searchSongs(query);
    } else {
        searchResults.innerHTML = ''; // Скрываем результаты, если поле пустое
    }
});

songSelect.addEventListener('change', async () => {
    const sheetName = SHEETS[sheetSelect.value];
    const songIndex = songSelect.value;

    if (sheetName && songIndex !== '') {
        const rows = await fetchSheetData(sheetName);
        const songData = rows[songIndex];
        if (songData) {
            displaySongDetails(songData, songIndex);
        }
    } else {
        songContent.innerHTML = 'Выберите песню, чтобы увидеть её текст и аккорды.';
        transposeControls.style.display = 'none';
    }
});

transposeUp.addEventListener('click', () => {
    const currentKey = keySelect.value;
    const newKey = chords[(chords.indexOf(currentKey) + 1) % chords.length];
    keySelect.value = newKey;
    updateTransposedLyrics();
});

transposeDown.addEventListener('click', () => {
    const currentKey = keySelect.value;
    const newKey = chords[(chords.indexOf(currentKey) - 1 + chords.length) % chords.length];
    keySelect.value = newKey;
    updateTransposedLyrics();
});

function displaySongDetails(songData, songIndex) {
    const lyrics = songData[1]; // Текст песни
    const chords = songData[2]; // Аккорды из столбца C
    songContent.innerHTML = `<h2>${songData[0]}</h2><pre>${lyrics}\n\nАккорды: ${chords}</pre>`;
}

keySelect.addEventListener('change', () => {
    updateTransposedLyrics();
});

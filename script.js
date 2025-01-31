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
const bpmDisplay = document.getElementById('bpm-display'); // Новый элемент для отображения BPM
const holychordsButton = document.getElementById('holychords-button'); // Кнопка перехода

const chords = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "H"];
let cachedData = {};

document.addEventListener('DOMContentLoaded', () => {
    loadLastSession();
});

// Функция для получения данных из Google Sheets с кэшированием
async function fetchSheetData(sheetName) {
    if (cachedData[sheetName]) return cachedData[sheetName];

    const range = `${sheetName}!A2:E`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    cachedData[sheetName] = data.values || [];
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
    if (originalIndex === -1 || newIndex === -1) return 0; // Если тональности не найдены, возвращаем 0
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
    if (currentIndex === -1) return chord; // Если аккорд не найден, возвращаем его без изменений

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
            console.log('Original Key:', originalKey); // Отладка
            console.log('New Key:', newKey); // Отладка
            const transposition = getTransposition(originalKey, newKey);
            console.log('Transposition:', transposition); // Отладка
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
});

// Обработчики событий
songSelect.addEventListener('change', async () => {
    const sheetName = SHEETS[sheetSelect.value];
    const songIndex = songSelect.value;

    if (sheetName && songIndex !== '') {
        const rows = await fetchSheetData(sheetName);
        const songData = rows[songIndex];
        if (songData) {
            displaySongDetails(songData, songIndex);
            updateTransposedLyrics(); // Добавлен вызов функции
        }
    } else {
        songContent.innerHTML = 'Выберите песню, чтобы увидеть её текст и аккорды.';
        transposeControls.style.display = 'none';
    }
});

keySelect.addEventListener('change', () => {
    updateTransposedLyrics(); // Вызов функции при изменении тональности
});
searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim();
    if (query) {
        searchSongs(query);
    } else {
        searchResults.innerHTML = ''; // Скрываем результаты, если поле пустое
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
    const bpm = songData[4] || 'N/A'; // BPM из столбца E
    const holychordsLink = songData[3] || '#'; // Ссылка на Holychords из столбца D

    bpmDisplay.textContent = `BPM: ${bpm}`; // Отображаем BPM

    // Используем регулярное выражение для выделения аккордов и вставки их над строкой текста
    const formattedLyrics = lyrics.split('\n').map(line => {
        const chords = line.match(/([A-Ga-g#b/dm]+)(?:\s|$)/g) || [];
        return chords.reduce((formattedLine, chord) => 
            formattedLine.replace(chord.trim(), `<span class="chord">${chord.trim()}</span>`), line).replace(/\s+/g, ' '); // Убираем лишние пробелы
    }).join('\n');

    songContent.innerHTML = `
        <h2>${songData[0]}</h2>
        <pre>${formattedLyrics}</pre>
        <p><a href="${holychordsLink}" target="_blank">Посмотреть на Holychords</a></p>
    `;
    transposeControls.style.display = 'block';
}

// Обработчик кнопки Holychords
holychordsButton.addEventListener('click', () => {
    window.open('https://holychords.com', '_blank');
});

keySelect.addEventListener('change', () => {
    updateTransposedLyrics();
});

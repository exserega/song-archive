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

function cleanChord(chord) {
    return chord.replace(/\s+/g, ''); // Удаляет все пробелы внутри аккорда
}

// Обработка текста с аккордами и транспонирование
function transposeLyrics(lyrics, transposition) {
    return lyrics.split('\n').map(line => {
        if (line.trim() === '') return line;
        return line.split(/(\S+)/).map(word => {
            return chords.includes(cleanChord(word)) ? transposeChord(cleanChord(word), transposition) : word;
        }).join('');
    }).join('\n');
}

// Функция для обработки строк с аккордами и уменьшения пробелов
function processLyrics(lyrics) {
    return lyrics.split('\n').map(line => {
        return line.replace(/ {2,}/g, match => ' '.repeat(Math.ceil(match.length / 2)));
    }).join('\n');
}


// Функция обновления транспонированного текста
function updateTransposedLyrics() {
    const index = keySelect.dataset.index;
    if (!index) return;
    
    const sheetName = SHEETS[sheetSelect.value];
    if (!sheetName) return;
    
    const songData = cachedData[sheetName][index];
    const originalKey = songData[1];
    const lyrics = songData[2] || '';
    const newKey = keySelect.value;
    
    const transposition = getTransposition(originalKey, newKey);
    const transposedLyrics = transposeLyrics(lyrics, transposition);
    const processedLyrics = processLyrics(transposedLyrics);
    
    songContent.innerHTML = `<h2>${songData[0]} — ${newKey}</h2><pre>${processedLyrics}</pre>`;
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
searchInput.addEventListener('input', () => searchSongs(searchInput.value));
sheetSelect.addEventListener('change', loadSheetSongs);
songSelect.addEventListener('change', () => {
    const sheetName = SHEETS[sheetSelect.value];
    if (!sheetName) return;
    displaySongDetails(cachedData[sheetName][songSelect.value], songSelect.value);
});
keySelect.addEventListener('change', updateTransposedLyrics);
transposeUp.addEventListener('click', () => {
    keySelect.selectedIndex = (keySelect.selectedIndex + 1) % keySelect.options.length;
    updateTransposedLyrics();
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

// Функция отображения деталей песни
function displaySongDetails(songData, index) {
    const originalKey = songData[1];
    const bpm = songData[4] || 'N/A';
    const lyrics = songData[2] || '';
    const sourceUrl = songData[3] || '#';
    
    bpmDisplay.textContent = `BPM: ${bpm}`;
    holychordsButton.href = sourceUrl;
    
    songContent.innerHTML = `<h2>${songData[0]} — ${originalKey}</h2><pre>${processLyrics(lyrics)}</pre>`;
    keySelect.value = originalKey;
    keySelect.dataset.index = index;
    transposeControls.style.display = 'block';
    saveLastSession();
}

// Обработчик кнопки Holychords
holychordsButton.addEventListener('click', () => {
    window.open('https://holychords.com', '_blank');
});

keySelect.addEventListener('change', () => {
    updateTransposedLyrics();
});

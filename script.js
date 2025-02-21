const API_KEY = 'AIzaSyDO2gwifAnZzC3ooJ0A_4vAD76iYakwzlk'; // Ваш API-ключ
const SHEET_ID = '1C3gFjj9LAub_Nk9ogqKp3LKpdAxq6j8xlPAsc8OmM5s'; // Ваш ID таблицы
const SHEETS = {
    'Быстрые (вертикаль)': 'Быстрые (вертикаль)',
    'Быстрые (горизонталь)': 'Быстрые (горизонталь)',
    'Поклонение (вертикаль)': 'Поклонение (вертикаль)',
    'Поклонение (горизонталь)': 'Поклонение (горизонталь)'
};

const chords = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "H"];
let cachedData = {};
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

// Элементы DOM
const sheetSelect = document.getElementById('sheet-select');
const songSelect = document.getElementById('song-select');
const songContent = document.getElementById('song-content');
const keySelect = document.getElementById('key-select');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const bpmDisplay = document.getElementById('bpm-display');
const holychordsButton = document.getElementById('holychords-button');
const favoriteButton = document.getElementById('favorite-button');
const loadingIndicator = document.getElementById('loading-indicator');
const splitTextButton = document.getElementById('split-text-button'); // Добавлено здесь

// Загрузка данных при старте
document.addEventListener('DOMContentLoaded', () => {
    loadLastSession();
});

// Функция для загрузки данных из Google Sheets
async function fetchSheetData(sheetName) {
    if (cachedData[sheetName]) return cachedData[sheetName];

    loadingIndicator.style.display = 'block'; // Показываем индикатор загрузки

    try {
        const range = `${sheetName}!A2:E`;
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        cachedData[sheetName] = data.values || [];
        return cachedData[sheetName];
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        return [];
    } finally {
        loadingIndicator.style.display = 'none'; // Скрываем индикатор загрузки
    }
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
        // Разделяем строку на слова и пробелы
        return line.split(/(\S+)/).map(word => {
            // Если слово — это аккорд, транспонируем его
            if (chords.some(ch => word.startsWith(ch))) {
                return transposeChord(cleanChord(word), transposition);
            }
            // Иначе оставляем слово без изменений
            return word;
        }).join('');
    }).join('\n');
}


// Функция для обработки строк с аккордами и уменьшения пробелов
function processLyrics(lyrics) {
    return lyrics.split('\n').map(line => {
        return line.replace(/ {2,}/g, match => ' '.repeat(Math.ceil(match.length / 2)));
    }).join('\n');
}

// Функция для добавления песни в избранное
favoriteButton.addEventListener('click', () => {
    const sheetName = SHEETS[sheetSelect.value];
    const songIndex = songSelect.value;

    if (!sheetName || !songIndex) return;

    const songData = cachedData[sheetName][songIndex];
    if (!songData) return;

    const song = {
        name: songData[0],
        sheet: sheetName,
        index: songIndex
    };

    if (!favorites.some(fav => fav.name === song.name && fav.sheet === song.sheet)) {
        favorites.push(song);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        alert('Песня добавлена в избранное!');
    } else {
        alert('Песня уже в избранном!');
    }
});

function displayFavorites() {
    const favoritesContainer = document.createElement('div');
    favoritesContainer.id = 'favorites-container';
    favoritesContainer.innerHTML = '<h2>Избранное</h2>';

    favorites.forEach(fav => {
        const favoriteItem = document.createElement('div');
        favoriteItem.textContent = fav.name;
        favoriteItem.className = 'favorite-item';
        favoriteItem.addEventListener('click', () => {
            sheetSelect.value = fav.sheet;
            songSelect.value = fav.index;
            displaySongDetails(cachedData[fav.sheet][fav.index], fav.index);
        });
        favoritesContainer.appendChild(favoriteItem);
    });

    document.body.appendChild(favoritesContainer);
}


// Функция обновления транспонированного текста
function updateTransposedLyrics() {
    const index = keySelect.dataset.index;
    if (!index) return;

    const sheetName = SHEETS[sheetSelect.value];
    if (!sheetName) return;

    const songData = cachedData[sheetName][index];
    if (!songData) return;

    const originalKey = songData[2]; // Тональность из столбца C
    const lyrics = songData[1] || ''; // Текст песни из столбца B
    const newKey = keySelect.value;

    // Вычисляем транспозицию
    const transposition = getTransposition(originalKey, newKey);

    // Транспонируем текст песни
    const transposedLyrics = transposeLyrics(lyrics, transposition);

    // Обрабатываем текст для корректного отображения
    const processedLyrics = processLyrics(transposedLyrics);

    // Обновляем содержимое страницы
    songContent.innerHTML = `
        <h2>${songData[0]} — ${newKey}</h2>
        <pre>${processedLyrics}</pre>
    `;
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
    if (!sheetName || !cachedData[sheetName]) return;
    
    const songIndex = parseInt(songSelect.value); // Преобразуем в число
    if (isNaN(songIndex)) return;

    displaySongDetails(cachedData[sheetName][songIndex], songIndex);
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

// Добавляем отсутствующую функцию loadSheetSongs
async function loadSheetSongs() {
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
    songSelect.disabled = false;
}


// Функция для отображения текста песни
function displaySongDetails(songData, index) {
    if (!songData) return;

    const originalKey = songData[2];
    const bpm = songData[4] || 'N/A';
    const lyrics = songData[1] || '';
    const sourceUrl = songData[3] || '#';

    bpmDisplay.textContent = `: ${bpm}`;
    holychordsButton.href = sourceUrl;

    songContent.innerHTML = `
        <h2>${songData[0]} — ${originalKey}</h2>
        <pre>${processLyrics(lyrics)}</pre>
    `;

    keySelect.value = originalKey;
    keySelect.dataset.index = index;
}



// Элементы DOM
const splitTextButton = document.getElementById('split-text-button');
const songContent = document.getElementById('song-content');

if (!splitTextButton || !songContent) {
    console.error('Не удалось найти элементы с id "split-text-button" или "song-content".');
} else {
    splitTextButton.addEventListener('click', () => {
        const lyricsElement = document.querySelector('#song-content pre');
        if (!lyricsElement || !lyricsElement.textContent.trim()) {
            alert('Текст песни отсутствует или пуст.');
            return;
        }

        songContent.classList.toggle('split-columns');

        if (songContent.classList.contains('split-columns')) {
            splitTextButton.textContent = 'Объединить текст';
        } else {
            splitTextButton.textContent = 'Разделить текст';
        }
    });
}




// Обработчик кнопки Holychords
holychordsButton.addEventListener('click', () => {
    window.open('https://holychords.com', '_blank');
});

keySelect.addEventListener('change', () => {
    updateTransposedLyrics();
});

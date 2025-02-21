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

// Объявление всех элементов DOM в начале файла
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
const splitTextButton = document.getElementById('split-text-button');


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

// Функция для создания индекса поиска
function createSearchIndex() {
    searchIndex = [];
    
    allSheetsData.forEach(({sheetName, data}) => {
        data.forEach((row, index) => {
            if (row[0]) { // Проверяем, что название песни существует
                searchIndex.push({
                    name: row[0].toLowerCase(),
                    sheetName: sheetName,
                    index: index
                });
            }
        });
    });
    
    // Сортируем индекс для более быстрого поиска
    searchIndex.sort((a, b) => a.name.localeCompare(b.name));
}

// Модифицированная функция поиска
// Функция для поиска песен по названию
async function searchSongs(query) {
    const lowerQuery = query.trim().toLowerCase(); // Приводим запрос к нижнему регистру и удаляем лишние пробелы
    if (!lowerQuery) {
        searchResults.innerHTML = ''; // Очищаем результаты, если запрос пустой
        return;
    }

    // Получаем данные со всех листов
    const allRows = Object.values(SHEETS).flatMap(sheetName => cachedData[sheetName] || []);

    // Фильтруем песни по запросу
    const matchingSongs = allRows.filter(row => {
        const name = row[0]?.trim().toLowerCase(); // Приводим название песни к нижнему регистру
        return name && name.includes(lowerQuery); // Проверяем, содержит ли название запрос
    });

    // Очищаем предыдущие результаты
    searchResults.innerHTML = '';

    if (matchingSongs.length === 0) {
        searchResults.innerHTML = '<div class="search-result">Ничего не найдено</div>';
        return;
    }

    // Отображаем результаты поиска
    matchingSongs.forEach((song, index) => {
        const resultItem = document.createElement('div');
        resultItem.textContent = song[0]; // Название песни
        resultItem.className = 'search-result';
        resultItem.addEventListener('click', () => {
            // Находим лист, к которому относится песня
            const sheetName = Object.keys(SHEETS).find(sheet =>
                cachedData[SHEETS[sheet]]?.some(row => row[0] === song[0])
            );

            if (sheetName) {
                sheetSelect.value = sheetName; // Выбираем соответствующий лист
                loadSheetSongs().then(() => {
                    const songIndex = cachedData[SHEETS[sheetName]].findIndex(row => row[0] === song[0]);
                    if (songIndex !== -1) {
                        songSelect.value = songIndex; // Выбираем песню
                        displaySongDetails(song, songIndex);
                        searchResults.innerHTML = ''; // Очищаем результаты поиска
                    }
                });
            }
        });
        searchResults.appendChild(resultItem);
    });
}

// Функция отображения результатов поиска
/ Функция для отображения результатов поиска
function displaySearchResults(results) {
    searchResults.innerHTML = ''; // Очищаем предыдущие результаты

    if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-result">Ничего не найдено</div>';
        return;
    }

    results.forEach(result => {
        const resultItem = document.createElement('div');
        resultItem.textContent = result.name; // Название песни
        resultItem.className = 'search-result'; // Добавляем класс для стилизации

        resultItem.addEventListener('click', () => {
            // Логика выбора песни
            sheetSelect.value = result.sheetName; // Выбираем соответствующий лист
            loadSheetSongs().then(() => {
                songSelect.value = result.index; // Выбираем песню
                displaySongDetails(cachedData[result.sheetName][result.index], result.index);
                searchResults.innerHTML = ''; // Очищаем результаты поиска
            });
        });

        searchResults.appendChild(resultItem); // Добавляем элемент в контейнер
    });
}

// Загружаем данные при старте
document.addEventListener('DOMContentLoaded', () => {
    loadAllSheetsData();
});


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


// Обработчик кнопки Holychords
holychordsButton.addEventListener('click', () => {
    window.open('https://holychords.com', '_blank');
});

keySelect.addEventListener('change', () => {
    updateTransposedLyrics();
});

// Функционал кнопки "Разделить текст"
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

// Добавьте массив для хранения данных всех листов
let allSheetsData = [];
let searchIndex = [];

// Функция для загрузки данных со всех листов
async function loadAllSheetsData() {
    loadingIndicator.style.display = 'block';
    
    try {
        // Получаем все листы параллельно
        const sheetPromises = Object.values(SHEETS).map(sheetName => fetchSheetData(sheetName));
        const results = await Promise.all(sheetPromises);
        
        // Сохраняем данные всех листов
        allSheetsData = results.map((data, index) => ({
            sheetName: Object.keys(SHEETS)[index],
            data: data
        }));
        
        // Создаем индекс для поиска
        createSearchIndex();
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

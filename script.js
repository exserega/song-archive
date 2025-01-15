const API_KEY = 'AIzaSyDO2gwifAnZzC3ooJ0A_4vAD76iYakwzlk'; // Ваш API-ключ';
const SHEET_ID = 'const SHEET_ID = '1C3gFjj9LAub_Nk9ogqKp3LKpdAxq6j8xlPAsc8OmM5s';
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

const chords = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "H"];

async function fetchSheetData(sheetName) {
    const range = `${sheetName}!A2:E`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.values || [];
}

function getTransposition(originalKey, newKey) {
    const originalIndex = chords.indexOf(originalKey);
    const newIndex = chords.indexOf(newKey);
    return newIndex - originalIndex;
}

function transposeChord(chord, transposition) {
    // Логика транспонирования аккорда
}

function transposeLyrics(lyrics, transposition) {
    return lyrics.split('\n').map(line =>
        line.split(' ').map(word =>
            chords.some(ch => word.startsWith(ch)) ? transposeChord(word, transposition) : word
        ).join(' ')
    ).join('\n');
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
});

songSelect.addEventListener('change', async () => {
    const sheetName = SHEETS[sheetSelect.value];
    const songIndex = songSelect.value;

    if (sheetName && songIndex !== '') {
        const rows = await fetchSheetData(sheetName);
        const songData = rows[songIndex];
        if (songData) {
            const [title, lyrics, key] = songData;
            songContent.innerHTML = `<h2>${title} — ${key}</h2><pre>${lyrics}</pre>`;
            keySelect.value = key;
            transposeControls.style.display = 'block';
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

function updateTransposedLyrics() {
    const sheetName = SHEETS[sheetSelect.value];
    const songIndex = songSelect.value;
    const newKey = keySelect.value;

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

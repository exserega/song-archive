const searchInput = document.getElementById('search');
const songList = document.getElementById('song-list');

// Функция поиска песен
searchInput.addEventListener('input', async () => {
  const query = searchInput.value.trim();
  if (query.length > 0) {
    // Ищем песни по названию в Firebase
    const snapshot = await db.collection('songs')
      .where("title", "==", query)
      .get();
    
    songList.innerHTML = ''; // Очистить предыдущие результаты
    snapshot.forEach(doc => {
      const song = doc.data();
      const songItem = document.createElement('div');
      songItem.innerHTML = `
        <h3>${song.title}</h3>
        <p>Аккорды: ${song.chords}</p>
        <p>${song.lyrics}</p>
      `;
      songList.appendChild(songItem);
    });
  } else {
    songList.innerHTML = '';
  }
});

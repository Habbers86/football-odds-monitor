document.addEventListener('DOMContentLoaded', () => {
  const refreshBtn = document.getElementById('refreshBtn');
  const loadingElement = document.getElementById('loading');
  const matchesContainer = document.getElementById('matchesContainer');
  
  // Загружаем данные при загрузке страницы
  loadMatches();
  
  // Обработчик кнопки обновления
  refreshBtn.addEventListener('click', loadMatches);
  
  // Функция загрузки матчей
  async function loadMatches() {
    try {
      loadingElement.style.display = 'block';
      matchesContainer.innerHTML = '';
      
      const response = await fetch('http://localhost:3000/matches');
      const data = await response.json();
      
      if (data.status === 'success') {
        displayMatches(data.data);
      } else {
        matchesContainer.innerHTML = `<div class="error">Ошибка: ${data.message}</div>`;
      }
    } catch (error) {
      matchesContainer.innerHTML = `<div class="error">Ошибка при загрузке данных: ${error.message}</div>`;
    } finally {
      loadingElement.style.display = 'none';
    }
  }
  
  // Функция отображения матчей
  function displayMatches(matches) {
    if (!matches || matches.length === 0) {
      matchesContainer.innerHTML = '<div class="no-matches">Нет матчей с коэффициентами</div>';
      return;
    }
    
    matches.forEach(match => {
      const matchCard = document.createElement('div');
      matchCard.className = 'match-card';
      
      const matchHeader = document.createElement('div');
      matchHeader.className = 'match-header';
      
      const matchTeams = document.createElement('div');
      matchTeams.className = 'match-teams';
      matchTeams.textContent = `${match.homeTeam.name} vs ${match.awayTeam.name}`;
      
      const matchDate = document.createElement('div');
      matchDate.className = 'match-date';
      matchDate.textContent = new Date(match.date).toLocaleString();
      
      matchHeader.appendChild(matchTeams);
      matchHeader.appendChild(matchDate);
      
      const oddsContainer = document.createElement('div');
      oddsContainer.className = 'odds-container';
      
      // Коэффициент открытия
      const openingOddsItem = createOddsItem(
        'Открытие', 
        match.openingOdds ? match.openingOdds.toFixed(2) : 'N/A',
        ''
      );
      
      // Текущий коэффициент
      const currentOddsItem = createOddsItem(
        'Текущий', 
        match.currentOdds ? match.currentOdds.toFixed(2) : 'N/A',
        ''
      );
      
      // Изменение
      let diffText = 'N/A';
      let diffClass = '';
      
      if (match.diffPercentage !== null) {
        diffText = `${match.diffPercentage > 0 ? '+' : ''}${match.diffPercentage.toFixed(2)}%`;
        diffClass = match.diffPercentage > 0 ? 'diff-positive' : 'diff-negative';
      }
      
      const diffOddsItem = createOddsItem(
        'Изменение', 
        diffText,
        diffClass
      );
      
      oddsContainer.appendChild(openingOddsItem);
      oddsContainer.appendChild(currentOddsItem);
      oddsContainer.appendChild(diffOddsItem);
      
      matchCard.appendChild(matchHeader);
      matchCard.appendChild(oddsContainer);
      
      matchesContainer.appendChild(matchCard);
    });
  }
  
  // Вспомогательная функция для создания элемента коэффициента
  function createOddsItem(label, value, valueClass) {
    const item = document.createElement('div');
    item.className = 'odds-item';
    
    const labelElement = document.createElement('div');
    labelElement.className = 'odds-label';
    labelElement.textContent = label;
    
    const valueElement = document.createElement('div');
    valueElement.className = `odds-value ${valueClass}`;
    valueElement.textContent = value;
    
    item.appendChild(labelElement);
    item.appendChild(valueElement);
    
    return item;
  }
});

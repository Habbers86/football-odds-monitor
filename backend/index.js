require('dotenv').config();
const express = require('express');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'qf4iqoxskcv8dbpp';
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '7816438293:AAFMT4tP5yc81cDczATVlAG3zeXVlrGFmHs';
const CHAT_ID = process.env.CHAT_ID || '-1002751995841';

const bot = new TelegramBot(TELEGRAM_TOKEN, {polling: false});

// Функция для получения предстоящих матчей
async function getUpcomingMatches() {
  try {
    const response = await axios.get(`https://api.sstats.net/games/list?upcoming=true&limit=100`, {
      headers: {
        'apikey': API_KEY
      }
    });
    return response.data.data || [];
  } catch (error) {
    console.error('Ошибка при получении матчей:', error.message);
    return [];
  }
}

// Функция для получения коэффициентов
async function getMatchOdds(matchId, opening = false) {
  try {
    const response = await axios.get(`https://api.sstats.net/odds/${matchId}?opening=${opening}`, {
      headers: {
        'apikey': API_KEY
      }
    });
    return response.data.data || [];
  } catch (error) {
    console.error(`Ошибка при получении коэффициентов для матча ${matchId}:`, error.message);
    return [];
  }
}

// Функция для поиска коэффициента "Победа" (Match Winner)
function findMatchWinnerOdds(oddsData) {
  if (!oddsData || !oddsData.length) return null;
  
  for (const bookmaker of oddsData) {
    for (const market of bookmaker.odds) {
      if (market.marketName.toLowerCase().includes('match winner') || 
          market.marketName.toLowerCase().includes('1x2')) {
        return market.odds.find(odd => odd.name === '1')?.value || null;
      }
    }
  }
  return null;
}

// Основная функция мониторинга
async function monitorOddsChanges() {
  console.log('Запуск мониторинга коэффициентов...');
  
  const matches = await getUpcomingMatches();
  console.log(`Найдено ${matches.length} предстоящих матчей`);
  
  // Фильтруем матчи без коэффициентов
  const matchesWithOdds = [];
  
  for (const match of matches) {
    if (match.odds && match.odds.length > 0) {
      matchesWithOdds.push(match);
    }
  }
  
  console.log(`Из них ${matchesWithOdds.length} с коэффициентами`);
  
  // Анализируем изменения коэффициентов
  for (const match of matchesWithOdds) {
    const openingOddsData = await getMatchOdds(match.id, true);
    const currentOddsData = match.odds;
    
    const openingOdds = findMatchWinnerOdds(openingOddsData);
    const currentOdds = findMatchWinnerOdds(currentOddsData);
    
    if (openingOdds && currentOdds) {
      const diffPercentage = ((currentOdds - openingOdds) / openingOdds) * 100;
      
      if (Math.abs(diffPercentage) > 10) {
        const message = `📊 Значительное изменение коэффициентов!\n\n` +
                        `⚽ ${match.homeTeam.name} vs ${match.awayTeam.name}\n` +
                        `📅 ${new Date(match.date).toLocaleString()}\n\n` +
                        `Коэффициент на победу ${match.homeTeam.name}:\n` +
                        `Открытие: ${openingOdds.toFixed(2)}\n` +
                        `Текущий: ${currentOdds.toFixed(2)}\n` +
                        `Изменение: ${diffPercentage > 0 ? '+' : ''}${diffPercentage.toFixed(2)}%`;
        
        console.log(message);
        
        // Отправляем уведомление в Telegram
        try {
          await bot.sendMessage(CHAT_ID, message);
          console.log('Уведомление отправлено в Telegram');
        } catch (error) {
          console.error('Ошибка при отправке в Telegram:', error.message);
        }
      }
    }
  }
  
  console.log('Мониторинг завершен');
}

// Роут для запуска мониторинга вручную
app.get('/monitor', async (req, res) => {
  try {
    await monitorOddsChanges();
    res.json({status: 'success', message: 'Мониторинг коэффициентов выполнен'});
  } catch (error) {
    res.status(500).json({status: 'error', message: error.message});
  }
});

// Роут для получения списка матчей для фронтенда
app.get('/matches', async (req, res) => {
  try {
    const matches = await getUpcomingMatches();
    const matchesWithOdds = matches.filter(match => match.odds && match.odds.length > 0);
    
    // Добавляем информацию о коэффициентах
    const enrichedMatches = await Promise.all(matchesWithOdds.map(async match => {
      const openingOddsData = await getMatchOdds(match.id, true);
      const openingOdds = findMatchWinnerOdds(openingOddsData);
      const currentOdds = findMatchWinnerOdds(match.odds);
      
      let diffPercentage = null;
      if (openingOdds && currentOdds) {
        diffPercentage = ((currentOdds - openingOdds) / openingOdds) * 100;
      }
      
      return {
        ...match,
        openingOdds,
        currentOdds,
        diffPercentage
      };
    }));
    
    res.json({status: 'success', data: enrichedMatches});
  } catch (error) {
    res.status(500).json({status: 'error', message: error.message});
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  
  // Запускаем мониторинг при старте
  monitorOddsChanges();
  
  // И каждые 30 минут
  setInterval(monitorOddsChanges, 30 * 60 * 1000);
});

class SportsManager {
  constructor() {
    this.currentGameIndex = 0;
    this.games = [];
    this.updateInterval = null;
    this.cycleInterval = null;
    this.lastUpdate = 0;
    this.updateFrequency = 30000; // 30 seconds
    this.cycleFrequency = 10000; // 10 seconds
    this.isPaused = false;

    // League IDs for different sports
    this.leagues = {
      nfl: '4391',
      nba: '4387',
      nhl: '4380',
      mlb: '4424',
      mls: '4346'
    };
  }

  init() {
    this.updateGames();

    // Update games data every 30 seconds
    this.updateInterval = setInterval(() => {
      if (!this.isPaused) {
        this.updateGames();
      }
    }, this.updateFrequency);

    // Cycle through games every 10 seconds
    this.cycleInterval = setInterval(() => {
      if (!this.isPaused && this.games.length > 1) {
        this.nextGame();
      }
    }, this.cycleFrequency);

    console.log('Sports Manager initialized');
  }

  async updateGames() {
    try {
      const response = await fetch('/api/sports/events');

      if (!response.ok) {
        throw new Error(`Sports API error: ${response.status}`);
      }

      const data = await response.json();
      this.games = this.processGamesData(data);
      this.lastUpdate = Date.now();

      if (this.games.length > 0) {
        this.displayCurrentGame();
      } else {
        this.displayNoGames();
      }

    } catch (error) {
      console.error('Failed to update games:', error);
      this.displayError();
    }
  }

  processGamesData(data) {
    const games = [];

    // Process livescores data
    if (data.livescores && data.livescores.length > 0) {
      data.livescores.forEach(game => {
        // Only include games that are in progress or recently finished
        if (this.isRelevantGame(game)) {
          games.push({
            homeTeam: this.formatTeamName(game.strHomeTeam),
            awayTeam: this.formatTeamName(game.strAwayTeam),
            homeTeamFull: game.strHomeTeam,
            awayTeamFull: game.strAwayTeam,
            homeScore: parseInt(game.intHomeScore) || 0,
            awayScore: parseInt(game.intAwayScore) || 0,
            status: this.formatStatus(game.strProgress),
            league: game.strLeague || this.getLeagueFromSport(game.strSport),
            date: game.dateEvent,
            time: game.strEventTime,
            updated: game.updated
          });
        }
      });
    }

    return games;
  }

  isRelevantGame(game) {
    // Include games that are:
    // - In progress (quarters, periods, halfs, etc.)
    // - Recently finished (within last 4 hours)
    // - Starting soon (today's games)

    const progress = game.strProgress?.toLowerCase();

    // Game is in progress - look for quarter, period, half indicators
    if (progress && (
      progress.includes('q') ||  // Q1, Q2, Q3, Q4
      progress.includes('period') ||
      progress.includes('half') ||
      progress.includes('inning') ||
      progress.includes(':') // Time format like "12:45"
    )) {
      return true;
    }

    // Recently finished games
    if (progress === 'final' || progress === 'ft') {
      // Check if updated recently (within 4 hours)
      if (game.updated) {
        const updatedTime = new Date(game.updated);
        const now = new Date();
        const hoursDiff = (now - updatedTime) / (1000 * 60 * 60);
        if (hoursDiff <= 4) {
          return true;
        }
      }
    }

    // Today's games
    const today = new Date().toISOString().split('T')[0];
    if (game.dateEvent === today) {
      return true;
    }

    return false;
  }

  formatTeamName(teamName) {
    if (!teamName) return '???';

    // Use city names for common teams
    const teamCityNames = {
      // NFL Teams
      'New York Giants': 'NYC',
      'Dallas Cowboys': 'DAL',
      'New York Jets': 'NYC',
      'Buffalo Bills': 'BUF',
      'New England Patriots': 'NE',
      'Miami Dolphins': 'MIA',
      'Pittsburgh Steelers': 'PIT',
      'Baltimore Ravens': 'BAL',
      'Cleveland Browns': 'CLE',
      'Cincinnati Bengals': 'CIN',
      'Houston Texans': 'HOU',
      'Indianapolis Colts': 'IND',
      'Tennessee Titans': 'TEN',
      'Jacksonville Jaguars': 'JAX',
      'Kansas City Chiefs': 'KC',
      'Las Vegas Raiders': 'LV',
      'Denver Broncos': 'DEN',
      'Los Angeles Chargers': 'LA',
      'Green Bay Packers': 'GB',
      'Chicago Bears': 'CHI',
      'Minnesota Vikings': 'MIN',
      'Detroit Lions': 'DET',
      'Philadelphia Eagles': 'PHI',
      'Washington Commanders': 'WAS',
      'Atlanta Falcons': 'ATL',
      'Carolina Panthers': 'CAR',
      'New Orleans Saints': 'NO',
      'Tampa Bay Buccaneers': 'TB',
      'San Francisco 49ers': 'SF',
      'Seattle Seahawks': 'SEA',
      'Los Angeles Rams': 'LA',
      'Arizona Cardinals': 'ARI',

      // NBA Teams
      'Los Angeles Lakers': 'LA',
      'Boston Celtics': 'BOS',
      'Golden State Warriors': 'GS',
      'Miami Heat': 'MIA',
      'Chicago Bulls': 'CHI',
      'New York Knicks': 'NYC',
      'Brooklyn Nets': 'BKN',

      // NHL Teams
      'New York Rangers': 'NYC',
      'Boston Bruins': 'BOS',
      'Montreal Canadiens': 'MTL',
      'Toronto Maple Leafs': 'TOR',

      // MLB Teams
      'New York Yankees': 'NYC',
      'Boston Red Sox': 'BOS',
      'Los Angeles Dodgers': 'LA',
      'San Francisco Giants': 'SF'
    };

    // Check if we have a known city name
    if (teamCityNames[teamName]) {
      return teamCityNames[teamName];
    }

    // Extract city abbreviation for unknown teams
    const words = teamName.split(' ');
    if (words.length > 1) {
      // Use first word (city) for most teams
      const city = words[0];
      if (city.length >= 3) {
        return city.substring(0, 3).toUpperCase();
      }
    }

    // Fallback to first 3-4 characters
    return teamName.substring(0, 3).toUpperCase();
  }

  formatStatus(progress) {
    if (!progress) return 'SCHEDULED';

    const progressLower = progress.toLowerCase();

    // Game in progress with time/quarter info
    if (progressLower.includes('q') ||
        progressLower.includes('period') ||
        progressLower.includes('half') ||
        progressLower.includes('inning') ||
        progressLower.includes(':')) {
      return progress;
    }

    // Finished game
    if (progressLower === 'final' || progressLower === 'ft') {
      return 'FINAL';
    }

    // Default to the progress value
    return progress;
  }

  getLeagueFromSport(sport) {
    if (!sport) return '';

    const sportLower = sport.toLowerCase();

    if (sportLower.includes('football')) return 'NFL';
    if (sportLower.includes('basketball')) return 'NBA';
    if (sportLower.includes('hockey')) return 'NHL';
    if (sportLower.includes('baseball')) return 'MLB';
    if (sportLower.includes('soccer')) return 'MLS';

    return sport.substring(0, 3).toUpperCase();
  }

  getTeamColor(teamName) {
    const teamColors = {
      // NFL Team Colors
      'New York Giants': '#0B2265',
      'Dallas Cowboys': '#041E42',
      'New York Jets': '#125740',
      'Buffalo Bills': '#00338D',
      'New England Patriots': '#002244',
      'Miami Dolphins': '#008E97',
      'Pittsburgh Steelers': '#FFB612',
      'Baltimore Ravens': '#241773',
      'Cleveland Browns': '#311D00',
      'Cincinnati Bengals': '#FB4F14',
      'Houston Texans': '#03202F',
      'Indianapolis Colts': '#002C5F',
      'Tennessee Titans': '#0C2340',
      'Jacksonville Jaguars': '#101820',
      'Kansas City Chiefs': '#E31837',
      'Las Vegas Raiders': '#000000',
      'Denver Broncos': '#FB4F14',
      'Los Angeles Chargers': '#0080C6',
      'Green Bay Packers': '#203731',
      'Chicago Bears': '#0B162A',
      'Minnesota Vikings': '#4F2683',
      'Detroit Lions': '#0076B6',
      'Philadelphia Eagles': '#004C54',
      'Washington Commanders': '#5A1414',
      'Atlanta Falcons': '#A71930',
      'Carolina Panthers': '#0085CA',
      'New Orleans Saints': '#D3BC8D',
      'Tampa Bay Buccaneers': '#D50A0A',
      'San Francisco 49ers': '#AA0000',
      'Seattle Seahawks': '#002244',
      'Los Angeles Rams': '#003594',
      'Arizona Cardinals': '#97233F'
    };

    return teamColors[teamName] || '#FFFFFF';
  }

  getTeamIcon(teamName) {
    // Use simple ASCII characters that work well on LED displays
    const teamIcons = {
      // NFL Teams - using single characters or simple symbols
      'New York Giants': 'G',
      'Dallas Cowboys': '*',
      'New York Jets': 'J',
      'Buffalo Bills': 'B',
      'New England Patriots': 'P',
      'Miami Dolphins': 'D',
      'Pittsburgh Steelers': 'S',
      'Baltimore Ravens': 'R',
      'Cleveland Browns': 'C',
      'Cincinnati Bengals': 'B',
      'Houston Texans': 'T',
      'Indianapolis Colts': 'C',
      'Tennessee Titans': 'T',
      'Jacksonville Jaguars': 'J',
      'Kansas City Chiefs': 'K',
      'Las Vegas Raiders': 'R',
      'Denver Broncos': 'D',
      'Los Angeles Chargers': 'L',
      'Green Bay Packers': 'P',
      'Chicago Bears': 'B',
      'Minnesota Vikings': 'V',
      'Detroit Lions': 'L',
      'Philadelphia Eagles': 'E',
      'Washington Commanders': 'W',
      'Atlanta Falcons': 'F',
      'Carolina Panthers': 'P',
      'New Orleans Saints': 'S',
      'Tampa Bay Buccaneers': 'B',
      'San Francisco 49ers': '4',
      'Seattle Seahawks': 'S',
      'Los Angeles Rams': 'R',
      'Arizona Cardinals': 'A'
    };

    return teamIcons[teamName] || '';
  }

  displayCurrentGame() {
    if (this.games.length === 0) {
      this.displayNoGames();
      return;
    }

    const game = this.games[this.currentGameIndex];
    const scoresElement = document.querySelector('.scores-display');
    const statusElement = document.querySelector('.status-display');

    if (scoresElement && statusElement) {
      // Get team colors only
      const awayColor = this.getTeamColor(game.awayTeamFull);
      const homeColor = this.getTeamColor(game.homeTeamFull);

      // Format: "NYC 14-21 DAL" - just city names
      scoresElement.innerHTML = `<span style="color: ${awayColor}">${game.awayTeam}</span> <span style="color: #ffffff">${game.awayScore}-${game.homeScore}</span> <span style="color: ${homeColor}">${game.homeTeam}</span>`;
      scoresElement.className = 'scores-display';

      // Format: "Q3 12:45 NFL" or "FINAL NFL"
      const statusText = `${game.status} ${game.league}`;
      statusElement.textContent = statusText;
      statusElement.className = 'status-display';
    }
  }

  displayNoGames() {
    const scoresElement = document.querySelector('.scores-display');
    const statusElement = document.querySelector('.status-display');

    if (scoresElement && statusElement) {
      scoresElement.textContent = 'NO GAMES';
      scoresElement.className = 'scores-display no-games';
      statusElement.textContent = 'ACTIVE';
      statusElement.className = 'status-display';
    }
  }

  displayError() {
    const scoresElement = document.querySelector('.scores-display');
    const statusElement = document.querySelector('.status-display');

    if (scoresElement && statusElement) {
      scoresElement.textContent = 'ERROR';
      scoresElement.className = 'scores-display error';
      statusElement.textContent = 'SPORTS API';
      statusElement.className = 'status-display error';
    }
  }

  nextGame() {
    if (this.games.length > 0) {
      this.currentGameIndex = (this.currentGameIndex + 1) % this.games.length;
      this.displayCurrentGame();
    }
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
    // Force immediate update when resuming
    this.updateGames();
  }

  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.cycleInterval) {
      clearInterval(this.cycleInterval);
      this.cycleInterval = null;
    }
  }
}

// Initialize global sports manager
window.sportsManager = new SportsManager();

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
  if (window.sportsManager) {
    window.sportsManager.destroy();
  }
});
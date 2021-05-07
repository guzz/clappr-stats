const playerElement = document.getElementById('player-wrapper')
Clappr.Log.setLevel(Clappr.Log.LEVEL_INFO);

const player = new Clappr.Player({
  source: 'http://clappr.io/highline.mp4',
  poster: 'http://clappr.io/poster.png',
  plugins: [
    window.ClapprStats,
    window.DashShakaPlayback,
    window.LevelSelector
  ],
})

player.attachTo(playerElement)

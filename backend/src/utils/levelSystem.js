function calculateLevel(points) {
  let level = 1;
  let required = 100;

  while (points >= required) {
    level++;
    required = level * level * 100; // exponential growth
  }

  return level;
}

module.exports = { calculateLevel };

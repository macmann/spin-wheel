import { readJSON, filePaths } from './fileStorage.js';

export async function getRewardStats(rewardId) {
  const codes = await readJSON(filePaths.codes);
  let unused = 0;
  let used = 0;
  for (const code of codes) {
    if (code.rewardId === rewardId) {
      if (code.used) used++;
      else unused++;
    }
  }
  return { unusedCodes: unused, usedCodes: used };
}

export async function getAllRewardStats() {
  const codes = await readJSON(filePaths.codes);
  const stats = {};
  for (const code of codes) {
    const id = code.rewardId;
    if (!stats[id]) stats[id] = { unusedCodes: 0, usedCodes: 0 };
    if (code.used) stats[id].usedCodes++;
    else stats[id].unusedCodes++;
  }
  return stats;
}

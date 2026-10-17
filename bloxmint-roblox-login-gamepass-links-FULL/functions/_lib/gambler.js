import { GAMBLER_ROLE_IDS, isCoinPass } from './passes.js';
import { ownsAnyPass } from './ownership.js';

export { isCoinPass };
export async function hasGamblerRole(env, userId) {
  return ownsAnyPass(env, userId, GAMBLER_ROLE_IDS);
}

export const GAMBLER_REQUIRED_MESSAGE =
  'You must own a Gambler role gamepass (Fish, Sharp Card, or Whale) to buy coin gamepasses.';

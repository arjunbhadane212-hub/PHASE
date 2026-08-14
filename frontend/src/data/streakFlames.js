// The 5-stage flame glyph family. Replaces every Lucide <Flame> on the profile.
//
// The stage keys are the STREAK_TIERS keys in profileIdentity.js, so a streak
// tier maps 1:1 onto a flame that has visibly more structure than the one below
// it: cold is a broken outline, ember gains an inner core, amber adds updraft
// wisps, gold adds a second core plus sparks, incandescent adds a third core
// and a white-hot spire. Colour is applied by the caller — the shape alone has
// to read the tier, greyscale.
//
// Drawn in the same 24×24 space as the title sigils and rendered through the
// same viewBox="-1 -1 26 26" / stroke="currentColor" convention.

export const STREAK_FLAMES = {
  cold:         'M12 20.6 C9 20.6 7 18.6 7 15.8 C7 13.6 8.6 11.3 10 9.4 M14 9.4 C15.4 11.3 17 13.6 17 15.8 C17 17.5 16.3 18.9 15.1 19.8 M12 4.6 C12 6 13 7.4 14 8.8 M9.6 17.2 L14.4 12.8',
  ember:        'M12 20.6 C9 20.6 7 18.6 7 15.8 C7 11.9 12 7.6 12 4.6 C12 7.6 17 11.9 17 15.8 C17 18.6 15 20.6 12 20.6 Z M12 20.4 C10.6 20.4 9.8 19.4 9.8 18.2 C9.8 16.6 12 14.8 12 13.4 C12 14.8 14.2 16.6 14.2 18.2 C14.2 19.4 13.4 20.4 12 20.4 Z',
  amber:        'M12 21.2 C8.4 21.2 6 18.8 6 15.6 C6 11 12 6.4 12 2.8 C12 6.4 18 11 18 15.6 C18 18.8 15.6 21.2 12 21.2 Z M12 21 C10.3 21 9.3 19.8 9.3 18.3 C9.3 16.3 12 14.2 12 12.4 C12 14.2 14.7 16.3 14.7 18.3 C14.7 19.8 13.7 21 12 21 Z M4.6 9.5 C3.4 11 3.2 12.6 3.6 14 M19.4 9.5 C20.6 11 20.8 12.6 20.4 14',
  gold:         'M12 21.5 C8.1 21.5 5.5 18.9 5.5 15.4 C5.5 10.4 12 5.6 12 1.8 C12 5.6 18.5 10.4 18.5 15.4 C18.5 18.9 15.9 21.5 12 21.5 Z M12 21.3 C10.1 21.3 9 20 9 18.3 C9 16.1 12 13.9 12 11.9 C12 13.9 15 16.1 15 18.3 C15 20 13.9 21.3 12 21.3 Z M3.6 8 C1.9 10.4 1.7 13.4 2.6 15.6 M20.4 8 C22.1 10.4 22.3 13.4 21.4 15.6 M7.5 4.5 L8.6 6.4 M16.5 4.5 L15.4 6.4',
  incandescent: 'M12 22 C7.8 22 5 19.2 5 15.3 C5 9.9 12 4.8 12 0.9 C12 4.8 19 9.9 19 15.3 C19 19.2 16.2 22 12 22 Z M12 21.8 C9.9 21.8 8.7 20.3 8.7 18.5 C8.7 16.1 12 13.7 12 11.5 C12 13.7 15.3 16.1 15.3 18.5 C15.3 20.3 14.1 21.8 12 21.8 Z M12 21.6 C11 21.6 10.5 20.9 10.5 20 C10.5 18.9 12 17.7 12 16.6 C12 17.7 13.5 18.9 13.5 20 C13.5 20.9 13 21.6 12 21.6 Z M2.8 7 C0.7 10 0.5 13.8 1.7 16.5 M21.2 7 C23.3 10 23.5 13.8 22.3 16.5 M6.8 3 L8.1 5.3 M17.2 3 L15.9 5.3 M12 1.4 L12 -0.6',
};

export const FLAME_FALLBACK = 'ember';
export const flameFor = (stage) => STREAK_FLAMES[stage] || STREAK_FLAMES[FLAME_FALLBACK];

// Streak-source titles borrow the stage that matches their rarity, so a Mythic
// streak title burns at the same heat as a 100-day streak.
export const FLAME_STAGE_FOR_RARITY = {
  common: 'ember',
  rare: 'amber',
  epic: 'amber',
  legendary: 'gold',
  mythic: 'incandescent',
};

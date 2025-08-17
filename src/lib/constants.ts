import { RGBTuple } from 'discord.js';
import { join } from 'path';

export const rootDir = join(__dirname, '..', '..');
export const srcDir = join(rootDir, 'src');

export const DROPOUT_YELLOW: RGBTuple = [254, 234, 59];

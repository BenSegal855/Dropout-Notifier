import EventEmitter from 'node:events';
import { schedule } from 'node-cron';
import { Dropout, Season, Video } from './dropout';
import { container } from '@sapphire/framework';
import { inspect } from 'node:util';

const CRON = process.env.NODE_ENV === 'development' ? '*/30 * * * * *' : '45 */30 * * * *' as const;

export class VideoEmitter extends EventEmitter<Record<'NEW_VIDEO', { video: Video, season: Season|null }[]>> {
	private static _instance: VideoEmitter;
	public static get Emitter()
	{
		return this._instance || (this._instance = new this());
	}

    private constructor() {
		super();
		schedule(CRON, async () => {
			container.logger.debug('Checking for new videos');
			const videos = (await Dropout.API.getLatestVideos(5));

			const vidsFound: number[] = await Promise.all(videos.map(async video => {
				const isOld = (await container.db.videos.countDocuments(video)) > 0;
	
				if (!isOld) {
					container.logger.debug('New video found', inspect(video, { depth: 2 }));
					let season: Season|null = null;
					if (video.series.id && video.season.number)
						season = await Dropout.API.getSeason({ seriesId: video.series.id, seasonNumber: video.season.number });
	
					await container.db.videos.insertOne(video);
	
					this.emit('NEW_VIDEO', { video, season });
					return 1;
				} else {
					return 0;
				}
			}));
			container.logger.debug(`Found ${vidsFound.reduce((a, b) => a + b, 0)} video(s)`)
		});
	}
}


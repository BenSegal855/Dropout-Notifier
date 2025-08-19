import EventEmitter from 'node:events';
import { schedule } from 'node-cron';
import { Dropout, Season, Video } from './dropout';
import { container } from '@sapphire/framework';
import { inspect } from 'node:util';

export class VideoEmitter extends EventEmitter<Record<'NEW_VIDEO', { video: Video, season: Season }[]>> {
	private static _instance: VideoEmitter;
	public static get Emitter()
	{
		return this._instance || (this._instance = new this());
	}

    private constructor() {
		super();
		schedule('45 */30 * * * *', async () => {
		// schedule('*/30 * * * * *', async () => {
			container.logger.debug('Checking for new videos');
			const video = (await Dropout.API.getLatestVideos(1))[0];

			const isOld = (await container.db.videos.countDocuments(video)) > 0;

			if (!isOld) {
				container.logger.debug('New video found', inspect(video, { depth: 2 }));

				const season = await Dropout.API.getSeason({ seriesId: video.series.id, seasonNumber: video.season.number });

				await container.db.videos.insertOne(video);

				this.emit('NEW_VIDEO', { video, season });
			} else {
				container.logger.debug('No new videos found');
			}
		});
	}
}


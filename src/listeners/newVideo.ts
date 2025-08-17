import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { VideoEmitter } from '../lib/videoEmitter';
import { Dropout, Season, Video } from '../lib/dropout';
import { MessageFlags } from 'discord.js';

@ApplyOptions<Listener.Options>({
	emitter: VideoEmitter.Emitter,
	event: 'NEW_VIDEO'
})
export class NewVideoListener extends Listener {
	public override async run({ video, season }: {video: Video, season: Season}) {
		const components = Dropout.buildComponents(video, season);

		const allUsers = await this.container.db.users.find().toArray();
		const notifyUsers = allUsers.filter(user => {
			if (user.tags.length === 0) {
				return true
			}
			return user.tags.some(tag => video.tags.includes(tag))
		})

		const channels = await Promise.all(notifyUsers.map(({ channelId }) => this.container.client.channels.fetch(channelId)));

		await Promise.all(channels.map(channel => {
			if (!channel || !channel.isSendable()) {
				return;
			}
			return channel.send({
				components,
				flags: MessageFlags.IsComponentsV2
			})
		}))
	}
}

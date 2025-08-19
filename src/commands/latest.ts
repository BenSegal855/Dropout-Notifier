import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { Dropout, Season } from '../lib/dropout';
import { MessageFlags } from 'discord.js';

@ApplyOptions<Command.Options>({
	description: 'See the latest release from Dropout.tv'
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const video = (await Dropout.API.getLatestVideos(1))[0]
		let season: Season|null = null;
		if (video.series.id && video.season.number)
			season = await Dropout.API.getSeason({ seriesId: video.series.id, seasonNumber: video.season.number });
		
		return interaction.reply({
			components: Dropout.buildComponents(video, season),
			flags: MessageFlags.IsComponentsV2
		});
	}
}

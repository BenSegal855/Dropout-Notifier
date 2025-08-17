import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { InteractionContextType } from 'discord.js';

@ApplyOptions<Command.Options>({
	description: 'Enroll in new episode notifications'
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setContexts([InteractionContextType.BotDM])
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		await this.container.db.users.findOneAndUpdate(
			{ id: interaction.user.id },
			{ $set: { id: interaction.user.id, channelId: interaction.channelId, tags: [] } },
			{ upsert: true }
		)
		return interaction.reply({ content: 'You\'re enrolled!' });
	}
}

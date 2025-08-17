import { Collection, MongoClient } from 'mongodb';
import { Video } from './dropout';
import { container } from '@sapphire/framework';

declare module '@sapphire/pieces' {
	interface Container {
		db: {
			users: Collection<User>,
			videos: Collection<Video>
		};
		mongo: MongoClient;
	}
}

export type User = {
	id: string,
	channelId: string,
	tags: string[]
}

export async function startMongo() {
	console.log('Connecting to MongoDB...');
	if (!process.env.MONGO_CONNECTION) {
		throw new Error('No database connection string provided.');
	}
	const mongo = new MongoClient(process.env.MONGO_CONNECTION);

	await mongo.connect();

	const database = mongo.db(process.env.NODE_ENV);

	const db = {
		users: database.collection<User>('users'),
		videos: database.collection<Video>('videos')
	};

	container.mongo = mongo;
	container.db = db;

	console.log('Connected to MongoDB');
}
